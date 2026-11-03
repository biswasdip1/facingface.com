import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(url);
const sql = readFileSync("drizzle/0031_amused_phantom_reporter.sql", "utf8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

for (const stmt of statements) {
  console.log("Executing:", stmt.slice(0, 80), "...");
  try {
    await conn.execute(stmt);
    console.log("  ✓ OK");
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("  ⚠ Table already exists, skipping");
    } else {
      console.error("  ✗ Error:", e.message);
    }
  }
}

await conn.end();
console.log("Migration complete.");
