import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = postgres(url, { ssl: { rejectUnauthorized: false }, max: 1, connect_timeout: 30 });
const db = drizzle(client);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, './drizzle/migrations');
console.log('Running migrations from:', migrationsFolder);
try {
  await migrate(db, { migrationsFolder });
  console.log('Migrations applied successfully!');
} catch (err) {
  console.error('Migration error:', err.message);
} finally {
  await client.end();
}
