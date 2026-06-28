import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute("ALTER TABLE `posts` ADD `videoViews` int DEFAULT 0 NOT NULL");
  console.log("✓ Migration 0032 applied: posts.videoViews column added");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("✓ Column videoViews already exists, skipping");
  } else {
    throw e;
  }
} finally {
  await conn.end();
}
