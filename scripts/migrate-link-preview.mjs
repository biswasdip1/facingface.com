import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(url);

const columns = [
  ["linkUrl", "TEXT"],
  ["linkTitle", "TEXT"],
  ["linkDescription", "TEXT"],
  ["linkImage", "TEXT"],
  ["linkSiteName", "VARCHAR(100)"],
];

for (const [col, type] of columns) {
  try {
    await conn.execute(`ALTER TABLE posts ADD COLUMN \`${col}\` ${type}`);
    console.log(`Added column: ${col}`);
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log(`Column already exists: ${col}`);
    } else {
      throw err;
    }
  }
}

await conn.end();
console.log("Migration complete.");
