import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);
const sqls = [
  `ALTER TABLE \`company_general_data\` ADD COLUMN IF NOT EXISTS \`conflict_threshold\` decimal(5,2) DEFAULT 30.00 COMMENT '% de ausencias simultaneas para alerta'`,
];
for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.slice(0, 60));
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('SKIP (already exists):', sql.slice(0, 60));
    else { console.error('ERROR:', e.message); process.exit(1); }
  }
}
await conn.end();
console.log('Migration complete.');
