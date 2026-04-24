import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);

const sql1 = `CREATE TABLE IF NOT EXISTS \`annual_training_plans\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`year\` int NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`description\` text,
  \`department_id\` int,
  \`responsible_id\` int,
  \`status\` enum('borrador','aprobado','en_ejecucion','cerrado') NOT NULL DEFAULT 'borrador',
  \`total_budget\` int,
  \`approved_at\` timestamp NULL,
  \`approved_by\` int,
  \`created_at\` timestamp NOT NULL DEFAULT (now()),
  \`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
)`;

const sql2 = `CREATE TABLE IF NOT EXISTS \`annual_training_plan_items\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`plan_id\` int NOT NULL,
  \`course_name\` varchar(255) NOT NULL,
  \`course_id\` int,
  \`objective\` text,
  \`target_audience\` varchar(255),
  \`modality\` enum('presencial','virtual','mixta','e_learning') NOT NULL DEFAULT 'presencial',
  \`duration_hours\` int,
  \`planned_date\` date,
  \`completed_date\` date,
  \`instructor\` varchar(255),
  \`estimated_cost\` int,
  \`actual_cost\` int,
  \`participants_target\` int,
  \`participants_actual\` int,
  \`normative_reference\` varchar(100),
  \`status\` enum('pendiente','en_proceso','completado','cancelado') NOT NULL DEFAULT 'pendiente',
  \`notes\` text,
  \`created_at\` timestamp NOT NULL DEFAULT (now()),
  \`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`atp_items_plan_fk\` FOREIGN KEY (\`plan_id\`) REFERENCES \`annual_training_plans\`(\`id\`) ON DELETE CASCADE
)`;

// Insert demo data
const sqlDemo = `INSERT INTO annual_training_plans (year, title, description, status) VALUES
  (2025, 'PAC 2025 - NOM-035 STPS', 'Programa Anual de Capacitación para cumplimiento NOM-035 STPS 2018', 'en_ejecucion'),
  (2025, 'PAC 2025 - Habilidades Directivas', 'Capacitación en liderazgo y gestión para mandos medios', 'aprobado'),
  (2026, 'PAC 2026 - Seguridad e Higiene', 'Programa de capacitación en seguridad laboral y prevención de riesgos', 'borrador'),
  (2026, 'PAC 2026 - Competencias Técnicas', 'Actualización de competencias técnicas por área funcional', 'borrador'),
  (2025, 'PAC 2025 - Inducción', 'Programa de inducción para nuevos ingresos', 'cerrado')
ON DUPLICATE KEY UPDATE title=title`;

try {
  await conn.execute(sql1);
  console.log('✅ Tabla annual_training_plans creada');
  await conn.execute(sql2);
  console.log('✅ Tabla annual_training_plan_items creada');
  await conn.execute(sqlDemo);
  console.log('✅ Datos de demostración insertados');
} catch(e) {
  console.error('Error:', e.message);
} finally {
  await conn.end();
}
