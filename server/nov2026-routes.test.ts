import { beforeEach, describe, it, expect, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
vi.mock("./accountDeletionAuth", () => ({ deleteOwnAccount: vi.fn().mockResolvedValue(undefined), getDeletionRequirements: vi.fn().mockResolvedValue({ passwordRequired: true }), requestDeletionCode: vi.fn() }));
vi.mock("./accountMediaPurge", () => ({ processAccountMediaPurge: vi.fn().mockResolvedValue(true) }));
vi.mock("./pushNotifications", () => ({ sendDmPushNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), getConversationsForUser: vi.fn().mockResolvedValue([{ id: 10, participant1Id: 1, participant2Id: 2 }]), isUserBlocked: vi.fn().mockResolvedValue(false), getOrCreateConversation: vi.fn().mockResolvedValue({ id: 10 }), sendMessage: vi.fn().mockResolvedValue({ id: 90 }), getUserById: vi.fn().mockResolvedValue({ id: 2, phone: "PRIVATE", email: "PRIVATE", passwordHash: "SECRET", verificationToken: "SECRET" }), getFollowerCount: vi.fn().mockResolvedValue(0), getFollowingCount: vi.fn().mockResolvedValue(0), getPostCount: vi.fn().mockResolvedValue(0) }));
import { appRouter } from "./routers";
import { deleteOwnAccount } from "./accountDeletionAuth";
import { isUserBlocked, sendMessage, getOrCreateConversation } from "./db";
const context = (id = 1) => ({ user: { id, name: "Test", email: "test@test.invalid", role: "user" }, req: { protocol: "https", headers: {} }, res: { clearCookie: vi.fn() } } as unknown as TrpcContext);
beforeEach(() => vi.clearAllMocks());
describe("November 2026 route guards", () => {
  it("binds deletion target to context user and clears cookie only after server success", async () => {
    const ctx = context(); const result = await appRouter.createCaller(ctx).auth.deleteAccount({ confirmation: "DELETE MY ACCOUNT", currentPassword: "pw" });
    expect(deleteOwnAccount).toHaveBeenCalledWith(1, expect.objectContaining({ currentPassword: "pw" }));
    expect(ctx.res.clearCookie).toHaveBeenCalledTimes(1); expect(result.success).toBe(true);
  });
  it("rejects wrong typed confirmation and attempts to supply another user's ID", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.auth.deleteAccount({ confirmation: "DELETE" } as any)).rejects.toThrow();
    await expect(caller.auth.deleteAccount({ confirmation: "DELETE MY ACCOUNT", userId: 2 } as any)).rejects.toThrow();
    expect(deleteOwnAccount).not.toHaveBeenCalled();
  });
  it("does not clear cookie when transaction fails", async () => {
    const ctx = context(); vi.mocked(deleteOwnAccount).mockRejectedValueOnce(Error("rollback"));
    await expect(appRouter.createCaller(ctx).auth.deleteAccount({ confirmation: "DELETE MY ACCOUNT", currentPassword: "pw" })).rejects.toThrow("rollback");
    expect(ctx.res.clearCookie).not.toHaveBeenCalled();
  });
  it.each([[true, false], [false, true]])("prevents blocked DM send/create (%s, %s) before persistence", async (a, b) => {
    const caller = appRouter.createCaller(context());
    vi.mocked(isUserBlocked).mockResolvedValueOnce(a).mockResolvedValueOnce(b);
    await expect(caller.dm.send({ conversationId: 10, text: "hello" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(sendMessage).not.toHaveBeenCalled();
    vi.mocked(isUserBlocked).mockResolvedValueOnce(a).mockResolvedValueOnce(b);
    await expect(caller.dm.getOrCreate({ otherUserId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getOrCreateConversation).not.toHaveBeenCalled();
  });
  it("profile API hides phone and credentials from other users", async () => {
    const result = await appRouter.createCaller(context()).users.getProfile({ userId: 2 });
    expect(result.user.phone).toBeNull(); expect(result.user).not.toHaveProperty("email"); expect(result.user).not.toHaveProperty("passwordHash"); expect(result.user).not.toHaveProperty("verificationToken");
  });
});
