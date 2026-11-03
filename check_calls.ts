import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const callTables = ['call_history', 'call_participants', 'call_rooms', 'call_signals'];
  for (const t of callTables) {
    const [[row]] = await conn.query('SELECT COUNT(*) as cnt FROM `' + t + '`') as any;
    console.log(t + ': ' + row.cnt + ' rows');
  }
  await conn.end();
}
main().catch(e => console.error(e.message));
