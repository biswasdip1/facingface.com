import mysql from "mysql2/promise";

const db = await mysql.createConnection(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`phone_verifications\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`phone\` varchar(30) NOT NULL,
    \`otp\` varchar(10) NOT NULL,
    \`expiresAt\` timestamp NOT NULL,
    \`verifiedAt\` timestamp,
    \`attempts\` int NOT NULL DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`phone_verifications_id\` PRIMARY KEY(\`id\`)
  )`,
  `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`phoneVerified\` boolean DEFAULT false NOT NULL`,
];

for (const sql of statements) {
  try {
    console.log("Executing:", sql.slice(0, 60) + "...");
    await db.execute(sql);
    console.log("OK");
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR" || e.code === "ER_DUP_FIELDNAME") {
      console.log("Already exists — skipping.");
    } else {
      console.error("Error:", e.message);
    }
  }
}

await db.end();
console.log("Migration 0017 complete.");
