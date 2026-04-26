import { createConnection } from "mysql2/promise";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const conn = await createConnection(url);
try {
  await conn.execute("ALTER TABLE `alert_history` MODIFY COLUMN `alert_type` enum('critical_cases','low_coverage','excellent_compliance','performance_lcp') NOT NULL");
  console.log("OK: alert_history enum actualizado");
  await conn.execute("ALTER TABLE `notification_history` MODIFY COLUMN `alert_type` enum('critical_cases','low_coverage','excellent_compliance','performance_lcp') NOT NULL");
  console.log("OK: notification_history enum actualizado");
} catch(e) {
  console.error("Error:", e.message);
  process.exit(1);
} finally { await conn.end(); }
