import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute("SELECT id, name, avatar, coverPhoto FROM users LIMIT 10");
console.log(JSON.stringify(rows, null, 2));
await conn.end();
