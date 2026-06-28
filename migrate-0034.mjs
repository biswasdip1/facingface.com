import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);
await conn.execute("ALTER TABLE `posts` ADD `scheduledAt` timestamp;");
console.log("Migration 0034 applied: scheduledAt column added to posts");
await conn.end();
