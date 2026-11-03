import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const email = "biswasdip@ymail.com";
const password = "WElcome12345=3";
const name = "biswasdip";

// Check if user already exists
const [existing] = await conn.execute("SELECT id FROM users WHERE email = ?", [email]);
if (existing.length > 0) {
  console.log("User already exists with id:", existing[0].id);
  // Update role to admin and set password
  const hash = await bcrypt.hash(password, 12);
  await conn.execute(
    "UPDATE users SET role = 'admin', passwordHash = ?, emailVerified = 1 WHERE email = ?",
    [hash, email]
  );
  console.log("Updated existing user to admin with new password hash.");
} else {
  const hash = await bcrypt.hash(password, 12);
  await conn.execute(
    `INSERT INTO users (email, name, passwordHash, emailVerified, loginMethod, role, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, 'email', 'admin', NOW(), NOW())`,
    [email, name, hash]
  );
  console.log("Created admin user:", email);
}

await conn.end();
console.log("Done.");
