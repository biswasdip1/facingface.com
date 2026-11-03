import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, mediaUrl, mediaType, text FROM posts WHERE mediaUrl IS NOT NULL LIMIT 10"
);
for (const row of rows) {
  console.log(`id=${row.id} type=${row.mediaType} url=${String(row.mediaUrl).substring(0, 80)} text=${String(row.text || '').substring(0, 40)}`);
}
await conn.end();
