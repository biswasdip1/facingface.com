import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb, getUserByEmail, getUserById, saveWebauthnChallenge } from "./db";
import { createRateLimiter } from "./rateLimit";
import { sendAccountDeletionCode } from "./email";
import { redactSelfAccount, type DeletionDatabase } from "./accountDeletion";
import bcrypt from "bcryptjs";
import { verifyTotpCode, consumeBackupCode } from "./totp";

const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000, action: "account-deletion attempts" });
export async function getDeletionRequirements(userId: number) {
  const user = await getUserById(userId);
  const credential = user?.email ? await getUserByEmail(user.email) : undefined;
  return { passwordRequired: Boolean(credential?.id === userId && credential.passwordHash), emailConfirmationAvailable: Boolean(user?.email && user.emailVerified) };
}
export async function requestDeletionCode(userId: number): Promise<{ challengeId: number }> {
  limiter.check(`send:${userId}`);
  const user = await getUserById(userId);
  if (!user?.email || !user.emailVerified) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A verified email is required for deletion confirmation. Contact support if you cannot verify your email." });
  const code = randomBytes(4).toString("hex").toUpperCase();
  const challengeId = await saveWebauthnChallenge({ userId, challenge: createHash("sha256").update(code).digest("hex"), type: "account_deletion", expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  await sendAccountDeletionCode({ to: user.email, code }); // Delivery failure is not reported as success.
  return { challengeId };
}
export async function deleteOwnAccount(userId: number, input: { currentPassword?: string; challengeId?: number; emailCode?: string; twoFactorCode?: string }) {
  limiter.check(`delete:${userId}`);
  const database = await getDb();
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Deletion is temporarily unavailable." });
  const user = await getUserById(userId);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const credential = user.email ? await getUserByEmail(user.email) : undefined;
  const passwordHash = credential?.id === userId ? credential.passwordHash : null;
  if (passwordHash) {
    if (!input.currentPassword || !(await bcrypt.compare(input.currentPassword, passwordHash))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
    }
  } else if (!user.emailVerified || !user.email || !input.challengeId || !input.emailCode) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Confirm deletion with the code sent to your verified email." });
  }
  // Verification and redaction share one transaction; any failure rolls back both.
  const wrapped: DeletionDatabase = {
    transaction: (work) => database.transaction(async (tx) => {
      const [lockedUser] = await tx.execute(sql`SELECT "passwordHash", "email", "emailVerified" FROM "users" WHERE "id" = ${userId} AND "deletedAt" IS NULL FOR UPDATE`) as unknown as Array<{ passwordHash: string | null; email: string | null; emailVerified: boolean }>;
      if (!lockedUser || lockedUser.passwordHash !== passwordHash || lockedUser.email !== user.email || lockedUser.emailVerified !== user.emailVerified) throw new TRPCError({ code: "UNAUTHORIZED", message: "Account changed. Please confirm again." });
      const [totp] = await tx.execute(sql`SELECT "secret", "backupCodes", "enabled" FROM "totp_secrets" WHERE "userId" = ${userId} FOR UPDATE`) as unknown as Array<{ secret: string; backupCodes: string | null; enabled: boolean }>;
      if (totp?.enabled) {
        const code = input.twoFactorCode ?? "";
        const valid = verifyTotpCode(totp.secret, code);
        const remaining = !valid && totp.backupCodes ? consumeBackupCode(JSON.parse(totp.backupCodes), code) : null;
        if (!valid && remaining === null) throw new TRPCError({ code: "UNAUTHORIZED", message: "A valid authenticator or backup code is required." });
      }
      if (!passwordHash) {
        const [challenge] = await tx.execute(sql`SELECT "challenge", "expiresAt" FROM "webauthn_challenges" WHERE "id" = ${input.challengeId!} AND "userId" = ${userId} AND "type" = 'account_deletion' FOR UPDATE`) as unknown as Array<{ challenge: string; expiresAt: Date }>;
        const hash = createHash("sha256").update((input.emailCode ?? "").trim().toUpperCase()).digest("hex");
        if (!challenge || new Date(challenge.expiresAt).getTime() <= Date.now() || challenge.challenge.length !== hash.length || !timingSafeEqual(Buffer.from(challenge.challenge), Buffer.from(hash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired email confirmation code." });
      }
      return work(tx as unknown as Parameters<Parameters<DeletionDatabase["transaction"]>[0]>[0]);
    }),
  };
  await redactSelfAccount(wrapped, userId);
}
