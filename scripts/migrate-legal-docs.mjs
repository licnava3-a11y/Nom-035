import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`case_investigation_docs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`folio\` varchar(30) NOT NULL,
    \`titulo\` varchar(500) NOT NULL DEFAULT 'Investigación de caso',
    \`version\` varchar(20) NOT NULL DEFAULT '1.0',
    \`estado\` enum('borrador','final','aprobado') NOT NULL DEFAULT 'borrador',
    \`empresa\` varchar(500),
    \`area\` varchar(255),
    \`fecha_investigacion\` varchar(50),
    \`responsable_sst\` varchar(255),
    \`contenido\` json,
    \`qr_code\` text,
    \`creado_por\` int NOT NULL,
    \`aprobado_por\` int,
    \`fecha_aprobacion\` timestamp NULL,
    \`created_at\` timestamp NOT NULL DEFAULT (now()),
    \`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`dictamen_docs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`folio\` varchar(30) NOT NULL,
    \`numero_dictamen\` varchar(50) NOT NULL,
    \`titulo\` varchar(500) NOT NULL DEFAULT 'Dictamen',
    \`version\` varchar(20) NOT NULL DEFAULT '1.0',
    \`estado\` enum('borrador','final','aprobado') NOT NULL DEFAULT 'borrador',
    \`investigation_doc_id\` int,
    \`razon_social\` varchar(500),
    \`domicilio\` text,
    \`total_trabajadores\` int,
    \`trabajadores_hombres\` int,
    \`trabajadores_mujeres\` int,
    \`periodo_evaluado\` varchar(100),
    \`responsable_tecnico\` varchar(255),
    \`cedula_profesional\` varchar(50),
    \`representante_legal\` varchar(255),
    \`contenido\` json,
    \`nivel_riesgo_global\` enum('ausente','bajo','medio','alto','muy_alto'),
    \`qr_code\` text,
    \`anexos_list\` json,
    \`creado_por\` int NOT NULL,
    \`aprobado_por\` int,
    \`fecha_aprobacion\` timestamp NULL,
    \`created_at\` timestamp NOT NULL DEFAULT (now()),
    \`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`doc_format_config\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`doc_type\` varchar(50) NOT NULL,
    \`codigo_formato\` varchar(30) NOT NULL,
    \`version\` varchar(20) NOT NULL DEFAULT '1.0',
    \`fecha_version\` varchar(20),
    \`referencia_normativa\` varchar(200),
    \`updated_at\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(\`id\`),
    UNIQUE KEY \`doc_format_config_doc_type_unique\` (\`doc_type\`)
  )`,
  `INSERT IGNORE INTO \`doc_format_config\` (\`doc_type\`, \`codigo_formato\`, \`version\`, \`fecha_version\`, \`referencia_normativa\`) VALUES
    ('investigacion', 'INV', '1.0', '2026-04-11', 'NOM-035-STPS-2018 Punto 7 y 8'),
    ('dictamen', 'DIC', '1.0', '2026-04-11', 'NOM-035-STPS-2018 Punto 9 y 10')`
];

for (const sql of statements) {
  try {
    await connection.execute(sql);
    console.log('✓ Executed:', sql.trim().split('\n')[0].substring(0, 60));
  } catch (err) {
    console.error('✗ Error:', err.message);
  }
}

await connection.end();
console.log('\n✅ Migration complete: case_investigation_docs, dictamen_docs, doc_format_config');
