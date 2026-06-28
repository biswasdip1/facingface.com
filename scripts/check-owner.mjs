import { createConnection } from "mysql2/promise";
const url = process.env.DATABASE_URL ?? "";
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!m) { console.log("No DATABASE_URL"); process.exit(1); }
const conn = await createConnection({ host: m[3], port: parseInt(m[4]), user: m[1], password: m[2], database: m[5], ssl: { rejectUnauthorized: false } });
const [rows] = await conn.query("SELECT id, name, email, role FROM users ORDER BY id LIMIT 10");
console.log(JSON.stringify(rows, null, 2));
await conn.end();
