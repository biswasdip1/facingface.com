import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { toPublicProfile, toProfileForViewer } from "./publicProfile";
import { assertDirectMessagingAllowed, directMessageRecipient } from "./dmSafety";
import { getPasskeyConfig } from "./passkeyConfig";
import { consumeBackupCode } from "./totp";
import { accountMediaPrefixes, mediaOwnerId } from "./accountMediaOwnership";
import type { User } from "../drizzle/schema";

const user = { id: 12, name: "Member", email: "private@test.invalid", phone: "+123", openId: "private", passwordHash: "HASH", verificationToken: "TOKEN", suspendedUntil: new Date(), role: "admin", avatar: null, createdAt: new Date(), unexpectedSecret: "future" } as unknown as User;
describe("November 2026 public-profile and DM policies", () => {
  it("allowlists public fields and never serializes credential/contact/admin metadata", () => {
    const result = toPublicProfile(user);
    for (const key of ["email", "phone", "openId", "passwordHash", "verificationToken", "role", "suspendedUntil", "unexpectedSecret"]) expect(result).not.toHaveProperty(key);
    expect(result.id).toBe(12);
  });
  it("reveals a phone only to its owner and suspension state only to administrators", () => {
    expect(toProfileForViewer(user, 99).phone).toBeNull();
    expect(toProfileForViewer(user, 12).phone).toBe("+123");
    expect(toProfileForViewer(user, 99).suspendedUntil).toBeNull();
    expect(toProfileForViewer(user, 99, "admin").suspendedUntil).toBe(user.suspendedUntil);
  });
  it.each([[1, 2], [2, 1]])("blocks DM when either %i blocks %i", async (a, b) => {
    await expect(assertDirectMessagingAllowed(1, 2, async (x, y) => x === a && y === b)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("fails closed on block lookup error and rejects nonparticipants/self-DMs", async () => {
    await expect(assertDirectMessagingAllowed(1, 2, async () => { throw Error("DB down"); })).rejects.toThrow("DB down");
    await expect(assertDirectMessagingAllowed(1, 1, async () => false)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(() => directMessageRecipient({ participant1Id: 1, participant2Id: 2 }, 3)).toThrow("Not a participant");
  });
  it("allows unblocked valid participants", async () => {
    await expect(assertDirectMessagingAllowed(1, 2, async () => false)).resolves.toBeUndefined();
    expect(directMessageRecipient({ participant1Id: 1, participant2Id: 2 }, 2)).toBe(1);
  });
});
describe("passkey and recovery configuration", () => {
  it("uses FacingFace web origins, not OAuth/Manus/localhost in production", () => {
    expect(getPasskeyConfig({ NODE_ENV: "production", PUBLIC_APP_URL: "https://www.facingface.com" })).toEqual({ rpID: "facingface.com", expectedOrigin: ["https://facingface.com", "https://www.facingface.com"] });
  });
  it("rejects unrelated/insecure configured origins", () => {
    expect(() => getPasskeyConfig({ NODE_ENV: "production", WEBAUTHN_ORIGINS: "https://evil.invalid" })).toThrow();
    expect(() => getPasskeyConfig({ NODE_ENV: "production", WEBAUTHN_ORIGINS: "http://facingface.com" })).toThrow();
  });
  it("accepts an alphanumeric backup code exactly once", () => {
    const hashed = createHash("sha256").update("A1B2C3D4").digest("hex");
    expect(consumeBackupCode([hashed], "a1b2c3d4")).toEqual([]);
    expect(consumeBackupCode([], "A1B2C3D4")).toBeNull();
  });
  it("media prefixes cannot collide with another user's ID or shared assets", () => {
    expect(accountMediaPrefixes(1)).not.toContain("media/12/");
    expect(mediaOwnerId("media/12/image.jpg")).toBe(12);
    expect(mediaOwnerId("page-covers/page-12-x.jpg")).toBeNull();
    expect(() => accountMediaPrefixes(-1)).toThrow();
  });
});
