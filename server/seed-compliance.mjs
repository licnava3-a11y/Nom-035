import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { complianceChecklist } from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const checklistItems = [
  // Sección A: Identificación del centro de trabajo
  { section: 'A', sectionName: 'Identificación del centro de trabajo', itemCode: 'A1', requirement: 'Datos generales del centro de trabajo registrados', evidence: 'Módulo Empresa → Datos generales', fundament: 'NOM-035, numeral 5' },
  { section: 'A', sectionName: 'Identificación del centro de trabajo', itemCode: 'A2', requirement: 'Representante legal identificado', evidence: 'Empresa → Representante legal', fundament: 'NOM-035, numeral 5' },
  { section: 'A', sectionName: 'Identificación del centro de trabajo', itemCode: 'A3', requirement: 'Firma digital asociada a reportes', evidence: 'Empresa → Firma digital', fundament: 'NOM-035, numeral 5' },
  { section: 'A', sectionName: 'Identificación del centro de trabajo', itemCode: 'A4', requirement: 'Identificación del tipo de centro de trabajo', evidence: 'Datos estructurados', fundament: 'NOM-035, numeral 5' },
  
  // Sección B: Identificación y análisis de factores de riesgo psicosocial
  { section: 'B', sectionName: 'Identificación y análisis de factores de riesgo psicosocial', itemCode: 'B1', requirement: 'Aplicación de cuestionarios conforme a la norma', evidence: 'Bitácora de encuestas aplicadas', fundament: 'NOM-035, numerales 6 y 7' },
  { section: 'B', sectionName: 'Identificación y análisis de factores de riesgo psicosocial', itemCode: 'B2', requirement: 'Registro de fecha de aplicación', evidence: 'Campo obligatorio', fundament: 'NOM-035, numerales 6 y 7' },
  { section: 'B', sectionName: 'Identificación y análisis de factores de riesgo psicosocial', itemCode: 'B3', requirement: 'Número de cuestionario identificable', evidence: 'Campo obligatorio', fundament: 'NOM-035, numerales 6 y 7' },
  { section: 'B', sectionName: 'Identificación y análisis de factores de riesgo psicosocial', itemCode: 'B4', requirement: 'Segmentación por puesto y área', evidence: 'Catálogos estructurados', fundament: 'NOM-035, numerales 6 y 7' },
  { section: 'B', sectionName: 'Identificación y análisis de factores de riesgo psicosocial', itemCode: 'B5', requirement: 'Conservación histórica de resultados', evidence: 'Base de datos', fundament: 'NOM-035, numerales 6 y 7' },
  
  // Sección C: Evaluación del entorno organizacional
  { section: 'C', sectionName: 'Evaluación del entorno organizacional', itemCode: 'C1', requirement: 'Evaluación del entorno organizacional', evidence: 'Menú → Evaluaciones', fundament: 'NOM-035, numeral 7.1' },
  { section: 'C', sectionName: 'Evaluación del entorno organizacional', itemCode: 'C2', requirement: 'Resultados documentados', evidence: 'Reportes generados', fundament: 'NOM-035, numeral 7.1' },
  { section: 'C', sectionName: 'Evaluación del entorno organizacional', itemCode: 'C3', requirement: 'Métricas de seguimiento', evidence: 'Menú → Métricas', fundament: 'NOM-035, numeral 7.1' },
  
  // Sección D: Evaluación específica
  { section: 'D', sectionName: 'Evaluación específica', itemCode: 'D1', requirement: 'Evaluaciones específicas registradas', evidence: 'Evaluación específica', fundament: 'NOM-035, numeral 7.2' },
  { section: 'D', sectionName: 'Evaluación específica', itemCode: 'D2', requirement: 'Identificación de burnout', evidence: 'Instrumentos asociados', fundament: 'NOM-035, numeral 7.2' },
  { section: 'D', sectionName: 'Evaluación específica', itemCode: 'D3', requirement: 'Identificación de acoso (mobbing)', evidence: 'Casos documentados', fundament: 'NOM-035, numeral 7.2' },
  { section: 'D', sectionName: 'Evaluación específica', itemCode: 'D4', requirement: 'Asociación a trabajadores/áreas', evidence: 'Relación de datos', fundament: 'NOM-035, numeral 7.2' },
  { section: 'D', sectionName: 'Evaluación específica', itemCode: 'D5', requirement: 'Registro de medidas de control', evidence: 'Acciones documentadas', fundament: 'NOM-035, numeral 7.2' },
  
  // Sección E: Medidas de control y seguimiento
  { section: 'E', sectionName: 'Medidas de control y seguimiento', itemCode: 'E1', requirement: 'Comité de atención conformado', evidence: 'Comité → Formación', fundament: 'NOM-035, numeral 8' },
  { section: 'E', sectionName: 'Medidas de control y seguimiento', itemCode: 'E2', requirement: 'Bitácoras de seguimiento', evidence: 'Comité → Bitácoras', fundament: 'NOM-035, numeral 8' },
  { section: 'E', sectionName: 'Medidas de control y seguimiento', itemCode: 'E3', requirement: 'Minutas de reunión', evidence: 'Comité → Minutas', fundament: 'NOM-035, numeral 8' },
  { section: 'E', sectionName: 'Medidas de control y seguimiento', itemCode: 'E4', requirement: 'Canal de quejas/confidencialidad', evidence: 'Comité → Buzón', fundament: 'NOM-035, numeral 8' },
  { section: 'E', sectionName: 'Medidas de control y seguimiento', itemCode: 'E5', requirement: 'Registro y atención de casos', evidence: 'Comité → Casos', fundament: 'NOM-035, numeral 8' },
  
  // Sección F: Confidencialidad de la información
  { section: 'F', sectionName: 'Confidencialidad de la información', itemCode: 'F1', requirement: 'Accesos controlados por rol', evidence: 'Catálogos → Usuarios', fundament: 'NOM-035, numeral 10' },
  { section: 'F', sectionName: 'Confidencialidad de la información', itemCode: 'F2', requirement: 'Protección de datos personales', evidence: 'Roles y permisos', fundament: 'NOM-035, numeral 10' },
  { section: 'F', sectionName: 'Confidencialidad de la información', itemCode: 'F3', requirement: 'Acceso restringido a evaluaciones', evidence: 'Configuración de usuario', fundament: 'NOM-035, numeral 10' },
  
  // Sección G: Conservación de información
  { section: 'G', sectionName: 'Conservación de información', itemCode: 'G1', requirement: 'Resguardo mínimo 2 años', evidence: 'Historial del sistema', fundament: 'NOM-035, numeral 11' },
  { section: 'G', sectionName: 'Conservación de información', itemCode: 'G2', requirement: 'Exportación para inspección', evidence: 'PDF / Excel', fundament: 'NOM-035, numeral 11' },
];

console.log('Poblando tabla complianceChecklist...');

for (const item of checklistItems) {
  await db.insert(complianceChecklist).values(item);
  console.log(`✓ Insertado: ${item.itemCode} - ${item.requirement}`);
}

console.log(`\n✅ Se insertaron ${checklistItems.length} items del checklist NOM-035`);

await connection.end();
