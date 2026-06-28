/**
 * promote-admin.ts — Promote an admin user to super_admin
 * Usage: npx tsx server/promote-admin.ts direct.letter@gmail.com
 */
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function promoteToSuperAdmin(email: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Failed to connect to database");
      process.exit(1);
    }

    // Find the user
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user || user.length === 0) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    const targetUser = user[0];
    console.log(`Found user: ${targetUser.name} (${targetUser.email}) - Current role: ${targetUser.role}`);

    if (targetUser.role === "super_admin") {
      console.log(`✅ User is already a super admin`);
      process.exit(0);
    }

    // Promote to super_admin
    await db.update(users).set({ role: "super_admin" }).where(eq(users.id, targetUser.id));
    
    console.log(`✅ Successfully promoted ${targetUser.name} (${targetUser.email}) to super_admin`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx server/promote-admin.ts <email>");
  process.exit(1);
}

promoteToSuperAdmin(email);
