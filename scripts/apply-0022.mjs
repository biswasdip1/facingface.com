import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const sql = fs.readFileSync('drizzle/0022_married_kabuki.sql', 'utf8');
const stmts = sql.split('--> statement-breakpoint')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

for (const stmt of stmts) {
  await conn.execute(stmt);
  console.log('OK:', stmt.slice(0, 60));
}
await conn.end();
console.log('Migration 0022 applied successfully');
