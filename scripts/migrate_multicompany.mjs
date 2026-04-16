import { createConnection } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  const conn = await createConnection(DATABASE_URL);
  
  const migrations = [
    {
      name: 'CREATE TABLE companies',
      sql: `CREATE TABLE IF NOT EXISTS \`companies\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`razon_social\` varchar(255) NOT NULL,
        \`rfc\` varchar(13) NOT NULL,
        \`direccion_fiscal\` text,
        \`giro\` varchar(255),
        \`actividades_preponderantes\` text,
        \`numero_trabajadores\` int,
        \`representante_legal\` varchar(255),
        \`telefono_contacto\` varchar(20),
        \`email_contacto\` varchar(320),
        \`pagina_web\` varchar(255),
        \`logo_url\` varchar(512),
        \`logo_key\` varchar(512),
        \`plan\` enum('trial','basic','professional','enterprise') NOT NULL DEFAULT 'trial',
        \`status\` enum('active','suspended','cancelled') NOT NULL DEFAULT 'active',
        \`trial_ends_at\` timestamp NULL,
        \`conflict_threshold\` decimal(5,2) DEFAULT '30.00',
        \`notification_email\` varchar(320),
        \`noreply_email\` varchar(320),
        \`internal_notes\` text,
        \`created_at\` timestamp NOT NULL DEFAULT (now()),
        \`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`companies_rfc_unique\` (\`rfc\`)
      )`
    },
    {
      name: 'MODIFY users.role enum to add super_admin',
      sql: `ALTER TABLE \`users\` MODIFY COLUMN \`role\` enum('super_admin','admin','instructor','student','committee','committee_member','committee_coordinator','administrativo','director','responsable_nom035','gerente','rh','supervisor','jefe_area','empleado','auxiliar_rh','recursos_humanos','demo') NOT NULL DEFAULT 'student'`
    },
    {
      name: 'ADD users.company_id',
      sql: `ALTER TABLE \`users\` ADD COLUMN \`company_id\` int`
    },
    {
      name: 'CREATE TABLE vacation_requests',
      sql: `CREATE TABLE IF NOT EXISTS \`vacation_requests\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`employee_id\` int NOT NULL,
        \`start_date\` date NOT NULL,
        \`end_date\` date NOT NULL,
        \`return_date\` date NOT NULL,
        \`requested_days\` int NOT NULL,
        \`status\` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
        \`approved_by\` int,
        \`approved_at\` timestamp NULL,
        \`rejection_reason\` text,
        \`notes\` text,
        \`available_days_at_request\` int,
        \`created_at\` timestamp NOT NULL DEFAULT (now()),
        \`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )`
    },
    {
      name: 'CREATE TABLE vacation_seniority',
      sql: `CREATE TABLE IF NOT EXISTS \`vacation_seniority\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`years_min\` int NOT NULL,
        \`years_max\` int,
        \`vacation_days\` int NOT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT (now()),
        \`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )`
    }
  ];

  for (const m of migrations) {
    try {
      await conn.execute(m.sql);
      console.log(`✅ ${m.name}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`⏭️  SKIP (already exists): ${m.name}`);
      } else {
        console.log(`❌ ERROR ${m.name}: ${e.message}`);
      }
    }
  }

  await conn.end();
  console.log('\n✅ Migration complete');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
