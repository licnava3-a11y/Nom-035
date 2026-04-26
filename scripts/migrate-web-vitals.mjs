import { createConnection } from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await createConnection(url);
const sql = `CREATE TABLE IF NOT EXISTS \`web_vitals_metrics\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`metric_name\` varchar(20) NOT NULL,
  \`value\` decimal(12,3) NOT NULL,
  \`rating\` enum('good','needs-improvement','poor') NOT NULL,
  \`delta\` decimal(12,3) NOT NULL DEFAULT '0',
  \`metric_id\` varchar(100) NOT NULL,
  \`page\` varchar(500) DEFAULT '/',
  \`user_agent\` varchar(500),
  \`session_id\` varchar(100),
  \`created_at\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`web_vitals_metrics_id\` PRIMARY KEY(\`id\`)
)`;
try {
  await conn.execute(sql);
  console.log("OK: tabla web_vitals_metrics creada");
} catch(e) {
  if (e.code === "ER_TABLE_EXISTS_ERROR") console.log("OK: tabla ya existe");
  else { console.error(e.message); process.exit(1); }
} finally { await conn.end(); }
