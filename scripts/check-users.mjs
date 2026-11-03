import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, email, name, role, emailVerified FROM users LIMIT 20"
);
for (const row of rows) {
  console.log(`id=${row.id} email=${row.email} name=${row.name} role=${row.role} verified=${row.emailVerified}`);
}
await conn.end();
