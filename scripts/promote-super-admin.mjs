import { createConnection } from "mysql2/promise";
const url = process.env.DATABASE_URL ?? "";
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!m) { console.log("No DATABASE_URL"); process.exit(1); }
const conn = await createConnection({ host: m[3], port: parseInt(m[4]), user: m[1], password: m[2], database: m[5], ssl: { rejectUnauthorized: false } });

// Step 1: Migrate enum to add super_admin
console.log("Running migration...");
await conn.query("ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin') NOT NULL DEFAULT 'user'");
console.log("Migration applied.");

// Step 2: Promote user ID 1 (Biswasdip Tigela) to super_admin
await conn.query("UPDATE users SET role = 'super_admin' WHERE id = 1");
console.log("User ID 1 promoted to super_admin.");

// Verify
const [rows] = await conn.query("SELECT id, name, email, role FROM users WHERE id = 1");
console.log("Verified:", JSON.stringify(rows));

await conn.end();
