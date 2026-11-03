import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);
await conn.execute("ALTER TABLE `users` ADD `coverCropY` int DEFAULT 50");
console.log("Migration 0033 applied: added coverCropY to users");
await conn.end();
