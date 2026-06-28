import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("Applying migration 0015 to production database...");

const statements = [
  `CREATE TABLE IF NOT EXISTS \`hashtags\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`tag\` varchar(100) NOT NULL,
    \`postId\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`hashtags_id\` PRIMARY KEY(\`id\`)
  )`,
  `ALTER TABLE \`posts\` ADD COLUMN IF NOT EXISTS \`editedAt\` timestamp`,
  `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`hometown\` varchar(100)`,
  `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`currentLocation\` varchar(100)`,
  `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`currentRole\` varchar(100)`,
  `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`phone\` varchar(30)`,
  `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`website\` varchar(255)`,
  `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`youtubeChannel\` varchar(255)`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log("✓ OK:", sql.slice(0, 60).replace(/\n/g, " ").trim());
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_TABLE_EXISTS_ERROR" || err.message?.includes("Duplicate column")) {
      console.log("⚠ Already exists (skip):", sql.slice(0, 60).replace(/\n/g, " ").trim());
    } else {
      console.error("✗ ERROR:", err.message);
      console.error("  SQL:", sql.slice(0, 120));
    }
  }
}

await conn.end();
console.log("Migration complete.");
