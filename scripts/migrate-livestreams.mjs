import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
await conn.execute(`CREATE TABLE IF NOT EXISTS \`live_streams\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`hostId\` int NOT NULL,
  \`title\` varchar(200),
  \`status\` enum('active','ended') NOT NULL DEFAULT 'active',
  \`viewerCount\` int NOT NULL DEFAULT 0,
  \`startedAt\` timestamp NOT NULL DEFAULT (now()),
  \`endedAt\` timestamp NULL,
  CONSTRAINT \`live_streams_id\` PRIMARY KEY(\`id\`)
)`);
console.log("live_streams table created");
await conn.end();
