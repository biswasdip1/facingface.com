import mysql from 'mysql2/promise';
import { writeFileSync } from 'fs';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  
  const conn = await mysql.createConnection(url);
  const [tables] = await conn.query('SHOW TABLES') as any;
  const tableNames: string[] = tables.map((r: any) => Object.values(r)[0] as string);

  let sql = '-- FacingFace Full Data Export\n-- Generated: ' + new Date().toISOString() + '\n\nSET FOREIGN_KEY_CHECKS=0;\n\n';

  for (const table of tableNames) {
    const [rows] = await conn.query('SELECT * FROM `' + table + '`') as any;
    if (rows.length > 0) {
      const cols = Object.keys(rows[0]).map((c: string) => '`' + c + '`').join(', ');
      sql += '-- ' + table + ' (' + rows.length + ' rows)\n';
      for (const row of rows) {
        const vals = Object.values(row).map((v: any) => {
          if (v === null) return 'NULL';
          if (v instanceof Date) return "'" + v.toISOString().slice(0,19).replace('T',' ') + "'";
          if (typeof v === 'number' || typeof v === 'bigint') return String(v);
          return "'" + String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'\\r') + "'";
        }).join(', ');
        sql += 'INSERT IGNORE INTO `' + table + '` (' + cols + ') VALUES (' + vals + ');\n';
      }
      sql += '\n';
    }
  }
  sql += 'SET FOREIGN_KEY_CHECKS=1;\n';
  writeFileSync('/home/ubuntu/facingface-export/database/data_export.sql', sql);
  console.log('Done: ' + tableNames.length + ' tables, ' + Math.round(sql.length/1024) + 'KB');
  await conn.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
