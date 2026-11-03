import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const sql = readFileSync(new URL("../drizzle/0016_previous_blur.sql", import.meta.url), "utf8");

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const stmt of sql.split(";").map(s => s.trim()).filter(Boolean)) {
    console.log("Executing:", stmt.slice(0, 60) + "...");
    await conn.execute(stmt);
  }
  console.log("Migration 0016 applied successfully.");
} catch (err) {
  if (err.code === "ER_TABLE_EXISTS_ERROR") {
    console.log("Table already exists — skipping.");
  } else {
    throw err;
  }
} finally {
  await conn.end();
}
