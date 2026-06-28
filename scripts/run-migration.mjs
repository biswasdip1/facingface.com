import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(__dirname, "../drizzle/0015_glamorous_archangel.sql");
const sql = readFileSync(sqlFile, "utf-8");

// Split on --> statement-breakpoint
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const conn = await mysql.createConnection(process.env.DATABASE_URL);
console.log("Connected to database");

for (const stmt of statements) {
  const clean = stmt.replace(/;$/, "").trim();
  if (!clean) continue;
  try {
    console.log("Running:", clean.substring(0, 80) + "...");
    await conn.execute(clean);
    console.log("  ✓ OK");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("  ⚠ Already exists, skipping");
    } else {
      console.error("  ✗ Error:", err.message);
    }
  }
}

await conn.end();
console.log("Migration complete");
