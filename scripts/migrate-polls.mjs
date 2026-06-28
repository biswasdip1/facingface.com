import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`poll_options\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`pollId\` int NOT NULL,
    \`text\` varchar(200) NOT NULL,
    \`displayOrder\` int NOT NULL DEFAULT 0,
    CONSTRAINT \`poll_options_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`poll_votes\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`pollId\` int NOT NULL,
    \`optionId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`poll_votes_id\` PRIMARY KEY(\`id\`),
    UNIQUE KEY \`poll_votes_user_poll\` (\`pollId\`, \`userId\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`polls\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`postId\` int NOT NULL,
    \`question\` varchar(300) NOT NULL,
    \`expiresAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`polls_id\` PRIMARY KEY(\`id\`)
  )`,
];

for (const sql of statements) {
  await conn.execute(sql);
  console.log("Executed:", sql.trim().split("\n")[0]);
}

await conn.end();
console.log("Poll migration complete.");
