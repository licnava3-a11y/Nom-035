/**
 * Script de limpieza y carga de datos de prueba para NOM-035
 * Ejecutar: node scripts/seed-test-data.mjs
 */
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL no definida"); process.exit(1); }

const conn = await mysql.createConnection(DB_URL);
console.log("✅ Conectado a la base de datos");

// ─── 1. LIMPIEZA ──────────────────────────────────────────────────────────────
console.log("\n🧹 Limpiando datos demostrativos...");
await conn.execute("SET FOREIGN_KEY_CHECKS = 0");

const tablesToClean = [
  "sentiment_analysis","intelligent_alerts","executive_reports_history",
  "intervention_impact_analysis","report_cache","shared_reports_log",
  "risk_alert_history","report_history","scheduled_reports",
  "survey_answers","survey_responses","survey_tokens","survey_results",
  "survey_employee_tokens","surveyNotifications",
  "caseDocuments","caseFollowUps","caseAssignments",
  "correctiveActions","corrective_action_plans","action_evidences",
  "studentAnswers","evaluationAttempts","studentProgress",
  "evaluation_360_responses","evaluation_360_results",
  "evaluation_360_development_plans","evaluation_360_evaluators",
  "evaluation_360_assignments","performanceEvaluations",
  "employeeHistory","employeeCompetencies","trainingNeeds",
  "employeeDocuments","employee_career_plans","employee_turnover_history",
  "payroll_data","salary_history",
  "signatures","documents",
  "email_queue","notifications","alertLogs",
  "mailboxResponses","mailbox",
  "climate_survey_responses","organizational_climate_surveys",
  "recognitions","committeeMembers",
  "certificates","cases",
  "employees","departments","positions","jobPositions","jobFunctions",
  "jobProfiles","organizationalCompetencies",
  "survey_periods","surveys","survey_questions",
  "courses","modules","evaluations","questions","answerOptions",
  "resources",
];

for (const t of tablesToClean) {
  try {
    await conn.execute(`DELETE FROM \`${t}\``);
    await conn.execute(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`);
    process.stdout.write(`  ✓ ${t}\n`);
  } catch (e) {
    process.stdout.write(`  ⚠ ${t}: ${e.message.slice(0, 60)}\n`);
  }
}

// Limpiar usuarios demo (mantener el admin real id=1)
await conn.execute("DELETE FROM users WHERE id != 1");
await conn.execute("SET FOREIGN_KEY_CHECKS = 1");
console.log("✅ Limpieza completada\n");

// ─── 2. DATOS DE PRUEBA ───────────────────────────────────────────────────────
console.log("🌱 Cargando datos de prueba...\n");

const ADMIN_ID = 1; // ID del administrador real

// ── Departamentos ─────────────────────────────────────────────────────────────
console.log("📁 Departamentos...");
const depts = [
  { name: "Operaciones",              code: "OPS", desc: "Área de producción y operaciones" },
  { name: "Recursos Humanos",         code: "RH",  desc: "Gestión del capital humano" },
  { name: "Finanzas",                 code: "FIN", desc: "Control financiero y contabilidad" },
  { name: "Tecnología de Información",code: "TI",  desc: "Infraestructura y desarrollo tecnológico" },
  { name: "Ventas",                   code: "VEN", desc: "Comercialización y atención a clientes" },
  { name: "Logística",                code: "LOG", desc: "Cadena de suministro y distribución" },
  { name: "Calidad",                  code: "CAL", desc: "Control y aseguramiento de calidad" },
  { name: "Seguridad e Higiene",      code: "SEG", desc: "Prevención de riesgos laborales" },
];
for (const d of depts) {
  await conn.execute(
    "INSERT INTO departments (name, code, description, isActive, createdAt, updatedAt) VALUES (?,?,?,1,NOW(),NOW())",
    [d.name, d.code, d.desc]
  );
}
const [deptRows] = await conn.execute("SELECT id, name FROM departments ORDER BY id");
const deptMap = Object.fromEntries(deptRows.map(r => [r.name, r.id]));
console.log(`  ✓ ${depts.length} departamentos`);

// ── Puestos ───────────────────────────────────────────────────────────────────
console.log("💼 Puestos...");
const positions = [
  { title: "Director General",              dept: "Operaciones",               level: "executive" },
  { title: "Gerente de Operaciones",        dept: "Operaciones",               level: "management" },
  { title: "Supervisor de Producción",      dept: "Operaciones",               level: "supervisor" },
  { title: "Operador de Línea",             dept: "Operaciones",               level: "entry" },
  { title: "Gerente de RH",                 dept: "Recursos Humanos",          level: "management" },
  { title: "Especialista en Nómina",        dept: "Recursos Humanos",          level: "specialist" },
  { title: "Reclutador",                    dept: "Recursos Humanos",          level: "specialist" },
  { title: "Contador General",              dept: "Finanzas",                  level: "specialist" },
  { title: "Analista Financiero",           dept: "Finanzas",                  level: "specialist" },
  { title: "Desarrollador Senior",          dept: "Tecnología de Información", level: "specialist" },
  { title: "Soporte TI",                    dept: "Tecnología de Información", level: "entry" },
  { title: "Ejecutivo de Ventas",           dept: "Ventas",                    level: "specialist" },
  { title: "Coordinador de Logística",      dept: "Logística",                 level: "supervisor" },
  { title: "Inspector de Calidad",          dept: "Calidad",                   level: "entry" },
  { title: "Técnico en Seguridad",          dept: "Seguridad e Higiene",       level: "specialist" },
];
for (const p of positions) {
  await conn.execute(
    "INSERT INTO positions (title, departmentId, level, isActive, createdAt, updatedAt) VALUES (?,?,?,1,NOW(),NOW())",
    [p.title, deptMap[p.dept], p.level]
  );
}
const [posRows] = await conn.execute("SELECT id, title FROM positions ORDER BY id");
const posMap = Object.fromEntries(posRows.map(r => [r.title, r.id]));
console.log(`  ✓ ${positions.length} puestos`);

// ── Usuarios para empleados ─────────────────────────────────────────────────
console.log("👤 Usuarios de empleados...");
const employees = [
  // Operaciones
  { fn:"Carlos Alberto",  ln:"Martínez Rodríguez", email:"c.martinez@empresa.com", dept:"Operaciones",               pos:"Gerente de Operaciones",        no:"EMP-001", hire:"2019-03-15", gender:"male",   active:1 },
  { fn:"María Elena",     ln:"López Hernández",    email:"m.lopez@empresa.com",    dept:"Operaciones",               pos:"Supervisor de Producción",      no:"EMP-002", hire:"2020-06-01", gender:"female", active:1 },
  { fn:"José Luis",       ln:"García Pérez",       email:"j.garcia@empresa.com",   dept:"Operaciones",               pos:"Operador de Línea",             no:"EMP-003", hire:"2021-01-10", gender:"male",   active:1 },
  { fn:"Ana Patricia",    ln:"Sánchez Torres",     email:"a.sanchez@empresa.com",  dept:"Operaciones",               pos:"Operador de Línea",             no:"EMP-004", hire:"2021-08-20", gender:"female", active:1 },
  // Recursos Humanos
  { fn:"Roberto",         ln:"Jiménez Flores",     email:"r.jimenez@empresa.com",  dept:"Recursos Humanos",          pos:"Gerente de RH",                 no:"EMP-005", hire:"2018-02-01", gender:"male",   active:1 },
  { fn:"Claudia Beatriz", ln:"Ramírez Vega",       email:"c.ramirez@empresa.com",  dept:"Recursos Humanos",          pos:"Especialista en Nómina",        no:"EMP-006", hire:"2020-09-15", gender:"female", active:1 },
  { fn:"Fernando",        ln:"Cruz Morales",       email:"f.cruz@empresa.com",     dept:"Recursos Humanos",          pos:"Reclutador",                    no:"EMP-007", hire:"2022-04-01", gender:"male",   active:1 },
  // Finanzas
  { fn:"Laura Sofía",     ln:"Mendoza Castillo",   email:"l.mendoza@empresa.com",  dept:"Finanzas",                  pos:"Contador General",              no:"EMP-008", hire:"2017-11-01", gender:"female", active:1 },
  { fn:"Miguel Ángel",    ln:"Ortega Ruiz",        email:"m.ortega@empresa.com",   dept:"Finanzas",                  pos:"Analista Financiero",           no:"EMP-009", hire:"2021-03-01", gender:"male",   active:1 },
  // TI
  { fn:"Diana Paola",     ln:"Vargas Gutiérrez",   email:"d.vargas@empresa.com",   dept:"Tecnología de Información", pos:"Desarrollador Senior",          no:"EMP-010", hire:"2019-07-15", gender:"female", active:1 },
  { fn:"Alejandro",       ln:"Reyes Domínguez",    email:"a.reyes@empresa.com",    dept:"Tecnología de Información", pos:"Soporte TI",                    no:"EMP-011", hire:"2022-01-10", gender:"male",   active:1 },
  // Ventas
  { fn:"Gabriela",        ln:"Torres Medina",      email:"g.torres@empresa.com",   dept:"Ventas",                    pos:"Ejecutivo de Ventas",           no:"EMP-012", hire:"2020-11-01", gender:"female", active:1 },
  { fn:"Héctor Manuel",   ln:"Moreno Aguilar",     email:"h.moreno@empresa.com",   dept:"Ventas",                    pos:"Ejecutivo de Ventas",           no:"EMP-013", hire:"2021-05-15", gender:"male",   active:1 },
  // Logística
  { fn:"Patricia",        ln:"Núñez Serrano",      email:"p.nunez@empresa.com",    dept:"Logística",                 pos:"Coordinador de Logística",      no:"EMP-014", hire:"2019-09-01", gender:"female", active:1 },
  // Calidad
  { fn:"Ernesto",         ln:"Lara Espinoza",      email:"e.lara@empresa.com",     dept:"Calidad",                   pos:"Inspector de Calidad",          no:"EMP-015", hire:"2020-02-15", gender:"male",   active:1 },
  // Seguridad
  { fn:"Verónica",        ln:"Herrera Campos",     email:"v.herrera@empresa.com",  dept:"Seguridad e Higiene",       pos:"Técnico en Seguridad",          no:"EMP-016", hire:"2021-10-01", gender:"female", active:1 },
  // Baja
  { fn:"Rodrigo",         ln:"Fuentes Ibarra",     email:"r.fuentes@empresa.com",  dept:"Operaciones",               pos:"Operador de Línea",             no:"EMP-017", hire:"2020-04-01", gender:"male",   active:0 },
  // Licencia
  { fn:"Silvia",          ln:"Bravo Contreras",    email:"s.bravo@empresa.com",    dept:"Recursos Humanos",          pos:"Reclutador",                    no:"EMP-018", hire:"2021-07-01", gender:"female", active:1 },
];
// Primero crear usuarios en la tabla users
const empUserIds = [];
for (const e of employees) {
  const openId = `emp_${e.no.replace('-','').toLowerCase()}_${Date.now()}`;
  await conn.execute(
    `INSERT INTO users (openId, name, email, role, departamento, puesto, fechaIngreso, loginMethod, createdAt, updatedAt, lastSignedIn)
     VALUES (?,?,?,?,?,?,?,?,NOW(),NOW(),NOW())`,
    [openId, `${e.fn} ${e.ln}`, e.email, 'empleado', e.dept, e.pos, e.hire, 'local']
  );
  const [[u]] = await conn.execute("SELECT id FROM users ORDER BY id DESC LIMIT 1");
  empUserIds.push(u.id);
}
console.log(`  ✓ ${employees.length} usuarios creados`);

// Luego crear empleados vinculados a sus usuarios
for (let i = 0; i < employees.length; i++) {
  const e = employees[i];
  await conn.execute(
    `INSERT INTO employees 
     (firstName, lastName, email, employeeNumber, departmentId, positionId,
      hireDate, gender, isActive, userId, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [e.fn, e.ln, e.email, e.no, deptMap[e.dept], posMap[e.pos], e.hire, e.gender, e.active, empUserIds[i]]
  );
}
const [empRows] = await conn.execute("SELECT id, firstName, lastName, departmentId FROM employees ORDER BY id");
const empIds = empRows.map(r => r.id);
console.log(`  ✓ ${employees.length} empleados`);
// Usar empUserIds para survey_responses (necesitan user_id de la tabla users)
const surveyUserIds = empUserIds;

// Asignar manager al departamento Operaciones
await conn.execute("UPDATE departments SET managerId=? WHERE name='Operaciones'", [empIds[0]]);
await conn.execute("UPDATE departments SET managerId=? WHERE name='Recursos Humanos'", [empIds[4]]);

// ── Cursos NOM-035 ────────────────────────────────────────────────────────────
console.log("📚 Cursos...");
const courses = [
  { title:"Identificación y Prevención de Factores de Riesgo Psicosocial", desc:"Curso introductorio sobre la NOM-035-STPS-2018 y sus implicaciones en el entorno laboral.", cat:"fundamentos", dur:120 },
  { title:"Entornos Organizacionales Favorables",                           desc:"Estrategias para promover un clima laboral positivo y prevenir la violencia laboral.",         cat:"categorias_dominios", dur:90  },
  { title:"Guía de Referencia I: Acontecimiento Traumático Severo",         desc:"Protocolo de actuación ante eventos traumáticos severos en el trabajo.",                      cat:"protocolos", dur:60  },
  { title:"Guía de Referencia II: Factores de Riesgo Psicosocial",         desc:"Metodología para identificar y evaluar factores de riesgo psicosocial.",                       cat:"categorias_dominios", dur:180 },
  { title:"Guía de Referencia III: Entorno Organizacional Favorable",       desc:"Evaluación del entorno organizacional y planes de mejora.",                                    cat:"categorias_dominios", dur:150 },
  { title:"Manejo del Estrés Laboral",                                      desc:"Técnicas y herramientas para el manejo efectivo del estrés en el trabajo.",                    cat:"burnout", dur:90 },
  { title:"Liderazgo y Comunicación Efectiva",                              desc:"Desarrollo de habilidades de liderazgo y comunicación para supervisores.",                     cat:"otros", dur:120 },
  { title:"Seguridad e Higiene en el Trabajo",                              desc:"Normativas y procedimientos de seguridad laboral.",                                             cat:"otros", dur:60 },
  { title:"Primeros Auxilios Psicológicos",                                 desc:"Intervención inmediata ante crisis emocionales en el entorno laboral.",                        cat:"protocolos", dur:120 },
  { title:"Resolución de Conflictos",                                       desc:"Técnicas de mediación y resolución de conflictos interpersonales.",                             cat:"mobbing", dur:90 },
];
for (const c of courses) {
  await conn.execute(
    "INSERT INTO courses (title, description, category, duration, isPublished, createdBy, createdAt, updatedAt) VALUES (?,?,?,?,1,?,NOW(),NOW())",
    [c.title, c.desc, c.cat, c.dur, ADMIN_ID]
  );
}
const [courseRows] = await conn.execute("SELECT id FROM courses ORDER BY id");
const courseIds = courseRows.map(r => r.id);
console.log(`  ✓ ${courses.length} cursos`);

// ── Módulos para el primer curso ──────────────────────────────────────────────
const mods = [
  { title:"¿Qué es la NOM-035?",              desc:"Introducción a la norma, alcance y obligaciones del empleador.", order:1 },
  { title:"Factores de Riesgo Psicosocial",   desc:"Definición, tipos y ejemplos de factores de riesgo psicosocial.", order:2 },
  { title:"Efectos en la Salud",              desc:"Consecuencias del estrés laboral y la violencia en la salud.", order:3 },
  { title:"Medidas de Prevención",            desc:"Estrategias organizacionales e individuales para prevenir riesgos.", order:4 },
  { title:"Evaluación Final",                 desc:"Evaluación de conocimientos adquiridos durante el curso.", order:5 },
];
for (const m of mods) {
  await conn.execute(
    "INSERT INTO modules (courseId, title, description, content, orderIndex, duration, createdAt, updatedAt) VALUES (?,?,?,?,?,?,NOW(),NOW())",
    [courseIds[0], m.title, m.desc, m.desc, m.order, 20]
  );
}
const [[mod1]] = await conn.execute("SELECT id FROM modules WHERE courseId=? ORDER BY id LIMIT 1", [courseIds[0]]);

// Evaluación del módulo 5
await conn.execute(
  "INSERT INTO evaluations (moduleId, title, description, passingScore, maxAttempts, timeLimit, createdAt, updatedAt) VALUES (?,?,?,?,?,?,NOW(),NOW())",
  [mod1.id, "Evaluación: ¿Qué es la NOM-035?", "Evaluación de conocimientos básicos sobre la NOM-035-STPS-2018", 70, 3, 30]
);
const [[eval1]] = await conn.execute("SELECT id FROM evaluations ORDER BY id DESC LIMIT 1");

// Preguntas de la evaluación
const evalQs = [
  { text:"¿En qué año entró en vigor la NOM-035-STPS-2018?", type:"multiple_choice", opts:[{t:"2017",c:0},{t:"2018",c:0},{t:"2019",c:1},{t:"2020",c:0}] },
  { text:"¿Cuál es el objetivo principal de la NOM-035?", type:"multiple_choice", opts:[{t:"Aumentar la productividad",c:0},{t:"Identificar y prevenir factores de riesgo psicosocial",c:1},{t:"Regular los salarios",c:0},{t:"Controlar el ausentismo",c:0}] },
  { text:"¿Qué es un factor de riesgo psicosocial?", type:"multiple_choice", opts:[{t:"Un riesgo físico en el trabajo",c:0},{t:"Condiciones del trabajo que afectan la salud mental",c:1},{t:"Un accidente laboral",c:0},{t:"Una enfermedad profesional",c:0}] },
];
for (const q of evalQs) {
  await conn.execute(
    "INSERT INTO questions (evaluationId, questionType, questionText, orderIndex, points, createdAt, updatedAt) VALUES (?,?,?,?,?,NOW(),NOW())",
    [eval1.id, q.type, q.text, evalQs.indexOf(q)+1, 10]
  );
  const [[qRow]] = await conn.execute("SELECT id FROM questions ORDER BY id DESC LIMIT 1");
  for (const o of q.opts) {
    await conn.execute(
      "INSERT INTO answerOptions (questionId, optionText, isCorrect, orderIndex, createdAt) VALUES (?,?,?,?,NOW())",
      [qRow.id, o.t, o.c, q.opts.indexOf(o)+1]
    );
  }
}
console.log(`  ✓ ${mods.length} módulos, 1 evaluación con ${evalQs.length} preguntas`);

// ── Período de encuesta activo ────────────────────────────────────────────────
console.log("📋 Períodos de encuesta NOM-035...");
const year = new Date().getFullYear();
// Período Guía II
await conn.execute(
  "INSERT INTO survey_periods (name, survey_type, start_date, end_date, status, description, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,NOW(),NOW())",
  [`Período ${year} - Guía II`, "guia_ii", `${year}-01-01`, `${year}-12-31`, "active", "Evaluación de factores de riesgo psicosocial", ADMIN_ID]
);
const [[p1]] = await conn.execute("SELECT id FROM survey_periods ORDER BY id DESC LIMIT 1");

// Período Guía III
await conn.execute(
  "INSERT INTO survey_periods (name, survey_type, start_date, end_date, status, description, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,NOW(),NOW())",
  [`Período ${year} - Guía III`, "guia_iii", `${year}-01-01`, `${year}-12-31`, "active", "Evaluación del entorno organizacional", ADMIN_ID]
);
const [[p2]] = await conn.execute("SELECT id FROM survey_periods ORDER BY id DESC LIMIT 1");

// ── Encuestas ─────────────────────────────────────────────────────────────────
// Encuesta Guía II
await conn.execute(
  "INSERT INTO surveys (type, title, description, status, start_date, end_date, created_at, updated_at) VALUES (?,?,?,?,?,?,NOW(),NOW())",
  ["guia_ii", "Guía de Referencia II - Factores de Riesgo Psicosocial", "Evaluación conforme a la NOM-035-STPS-2018", "active", `${year}-01-01`, `${year}-12-31`]
);
const [[s1]] = await conn.execute("SELECT id FROM surveys ORDER BY id DESC LIMIT 1");

// Preguntas Guía II
const sqII = [
  { text:"¿Con qué frecuencia siente que su carga de trabajo es excesiva?",                 cat:"carga_trabajo",     dim:"condiciones_trabajo", ord:1 },
  { text:"¿Tiene control sobre cómo realiza su trabajo?",                                   cat:"control_trabajo",   dim:"condiciones_trabajo", ord:2 },
  { text:"¿Recibe apoyo de su jefe inmediato cuando tiene dificultades?",                   cat:"apoyo_social",      dim:"liderazgo",           ord:3 },
  { text:"¿Las relaciones con sus compañeros de trabajo son respetuosas?",                  cat:"relaciones_trabajo",dim:"relaciones_trabajo",  ord:4 },
  { text:"¿Ha presenciado o experimentado actos de violencia en su trabajo?",               cat:"violencia_laboral", dim:"violencia",           ord:5, rev:1 },
  { text:"¿Su trabajo le permite desarrollar sus habilidades y conocimientos?",             cat:"desarrollo",        dim:"reconocimiento",      ord:6 },
  { text:"¿Conoce claramente cuáles son sus responsabilidades en el trabajo?",              cat:"claridad_rol",      dim:"condiciones_trabajo", ord:7 },
  { text:"¿El ambiente físico de su trabajo es adecuado?",                                  cat:"condiciones_fisicas",dim:"condiciones_trabajo",ord:8 },
  { text:"¿Siente que su trabajo le genera estrés frecuentemente?",                         cat:"estres_laboral",    dim:"condiciones_trabajo", ord:9, rev:1 },
  { text:"¿Existe comunicación efectiva entre los diferentes niveles jerárquicos?",         cat:"comunicacion",      dim:"liderazgo",           ord:10 },
  { text:"¿Su jefe le reconoce cuando realiza bien su trabajo?",                            cat:"reconocimiento",    dim:"reconocimiento",      ord:11 },
  { text:"¿Puede expresar sus opiniones sin temor a represalias?",                          cat:"participacion",     dim:"liderazgo",           ord:12 },
];
for (const q of sqII) {
  await conn.execute(
    "INSERT INTO survey_questions (survey_id, question_text, question_type, domain, `order`, category, dimension, is_reverse_scored, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())",
    [s1.id, q.text, "scale", "psicosocial", q.ord, q.cat, q.dim, q.rev||0]
  );
}
const [sqRows] = await conn.execute("SELECT id FROM survey_questions WHERE survey_id=? ORDER BY id", [s1.id]);
const sqIds = sqRows.map(r => r.id);

// Encuesta Guía III
await conn.execute(
  "INSERT INTO surveys (type, title, description, status, start_date, end_date, created_at, updated_at) VALUES (?,?,?,?,?,?,NOW(),NOW())",
  ["guia_iii", "Guía de Referencia III - Entorno Organizacional", "Evaluación del entorno organizacional favorable", "active", `${year}-01-01`, `${year}-12-31`]
);
const [[s2]] = await conn.execute("SELECT id FROM surveys ORDER BY id DESC LIMIT 1");
const sqIII = [
  { text:"¿La empresa promueve un ambiente de trabajo libre de discriminación?",            cat:"politicas",    dim:"entorno_org", ord:1 },
  { text:"¿Existen canales formales para reportar situaciones de violencia laboral?",       cat:"prevencion",   dim:"entorno_org", ord:2 },
  { text:"¿La empresa realiza acciones para prevenir el estrés laboral?",                   cat:"prevencion",   dim:"entorno_org", ord:3 },
  { text:"¿Los trabajadores participan en la toma de decisiones que les afectan?",          cat:"participacion",dim:"entorno_org", ord:4 },
  { text:"¿La empresa proporciona capacitación sobre factores de riesgo psicosocial?",      cat:"capacitacion", dim:"entorno_org", ord:5 },
];
for (const q of sqIII) {
  await conn.execute(
    "INSERT INTO survey_questions (survey_id, question_text, question_type, domain, `order`, category, dimension, is_reverse_scored, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())",
    [s2.id, q.text, "scale", "organizacional", q.ord, q.cat, q.dim, 0]
  );
}
console.log(`  ✓ 2 períodos, 2 encuestas activas (Guía II: ${sqII.length} preguntas, Guía III: ${sqIII.length} preguntas)`);

// ── Respuestas de encuesta ────────────────────────────────────────────────────
console.log("📊 Respuestas de encuesta...");
const responses = [
  { empIdx:0,  answers:[4,3,4,5,1,4,5,3,2,4,4,4] }, // bajo riesgo
  { empIdx:1,  answers:[3,4,3,4,1,3,4,3,3,3,3,3] }, // riesgo medio
  { empIdx:2,  answers:[5,2,2,3,4,2,3,2,5,2,2,2] }, // alto riesgo
  { empIdx:3,  answers:[4,3,3,4,1,3,4,3,3,4,3,3] }, // riesgo medio
  { empIdx:4,  answers:[2,4,5,5,1,5,5,4,2,5,5,5] }, // muy bajo riesgo
  { empIdx:5,  answers:[3,4,4,5,1,4,4,4,2,4,4,4] }, // bajo riesgo
  { empIdx:6,  answers:[4,3,3,4,2,3,4,3,3,3,3,3] }, // riesgo medio
  { empIdx:7,  answers:[3,4,4,4,1,4,4,4,3,4,4,4] }, // bajo riesgo
  { empIdx:8,  answers:[5,2,3,3,3,3,3,2,4,3,3,2] }, // riesgo medio-alto
  { empIdx:9,  answers:[4,3,4,4,1,4,4,3,3,4,4,3] }, // bajo riesgo
  { empIdx:11, answers:[3,3,3,4,2,3,4,3,4,3,3,3] }, // riesgo medio
  { empIdx:12, answers:[5,2,2,3,3,2,3,2,5,2,2,2] }, // alto riesgo
];
for (const r of responses) {
  const userId = surveyUserIds[r.empIdx];
  await conn.execute(
    "INSERT INTO survey_responses (survey_id, user_id, period_id, token, completed_at, started_at) VALUES (?,?,?,?,NOW(),NOW())",
    [s1.id, userId, p1.id, `tok_${Date.now()}_${Math.random().toString(36).slice(2,8)}`]
  );
  const [[resp]] = await conn.execute("SELECT id FROM survey_responses ORDER BY id DESC LIMIT 1");
  for (let i = 0; i < sqIds.length && i < r.answers.length; i++) {
    await conn.execute(
      "INSERT INTO survey_answers (response_id, question_id, answer_value, answered_at) VALUES (?,?,?,NOW())",
      [resp.id, sqIds[i], r.answers[i]]
    );
  }
}
console.log(`  ✓ ${responses.length} respuestas completadas`);

// ── Casos NOM-035 ─────────────────────────────────────────────────────────────
console.log("⚠️  Casos NOM-035...");
const cases = [
  { num:"CASO-2024-001", type:"other",    status:"open",         priority:"high",   desc:"Trabajador reporta haber presenciado accidente grave en área de producción. Presenta síntomas de estrés postraumático.", empIdx:2,  deptName:"Operaciones" },
  { num:"CASO-2024-002", type:"violence", status:"investigating", priority:"high",   desc:"Denuncia de hostigamiento laboral por parte de supervisor inmediato. Se documentan 3 incidentes en el último mes.",       empIdx:12, deptName:"Ventas" },
  { num:"CASO-2024-003", type:"stress",   status:"investigating", priority:"medium", desc:"Empleado reporta carga de trabajo excesiva y presión constante por cumplimiento de metas.",                              empIdx:8,  deptName:"Finanzas" },
  { num:"CASO-2024-004", type:"other",    status:"resolved",     priority:"medium", desc:"Conflicto entre compañeros de trabajo por distribución inequitativa de tareas. Resuelto mediante mediación.",            empIdx:3,  deptName:"Operaciones" },
  { num:"CASO-2024-005", type:"stress",   status:"open",         priority:"low",    desc:"Empleado solicita apoyo por dificultades para conciliar vida laboral y personal.",                                       empIdx:16, deptName:"Operaciones" },
];
for (const c of cases) {
  await conn.execute(
    `INSERT INTO cases (caseNumber, caseType, status, priority, description, reporterName, reporterEmail, isAnonymous, departmentId, assignedTo, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,0,?,?,NOW(),NOW())`,
    [c.num, c.type, c.status, c.priority, c.desc,
     `${employees[c.empIdx].fn} ${employees[c.empIdx].ln}`,
     employees[c.empIdx].email,
     deptMap[c.deptName], ADMIN_ID]
  );
}
const [caseRows] = await conn.execute("SELECT id, caseNumber FROM cases ORDER BY id");
const caseMap = Object.fromEntries(caseRows.map(r => [r.caseNumber, r.id]));

// Seguimientos
await conn.execute(
  "INSERT INTO caseFollowUps (caseId, userId, action, notes, createdAt) VALUES (?,?,?,?,NOW())",
  [caseMap["CASO-2024-001"], ADMIN_ID, "Primera entrevista", "Primera entrevista con el trabajador. Se aplica protocolo de atención a acontecimiento traumático severo. Se programa seguimiento psicológico."]
);
await conn.execute(
  "INSERT INTO caseFollowUps (caseId, userId, action, notes, createdAt) VALUES (?,?,?,?,NOW())",
  [caseMap["CASO-2024-001"], ADMIN_ID, "Segunda sesión", "Segunda sesión de seguimiento. El trabajador muestra mejoría. Se recomienda continuar con apoyo psicológico por 4 semanas más."]
);
await conn.execute(
  "INSERT INTO caseFollowUps (caseId, userId, action, notes, createdAt) VALUES (?,?,?,?,NOW())",
  [caseMap["CASO-2024-002"], ADMIN_ID, "Recepción de denuncia", "Se recibe la denuncia formal. Se notifica al área de RH y se inicia investigación interna."]
);
console.log(`  ✓ ${cases.length} casos con seguimientos`);

// ── Acciones correctivas ──────────────────────────────────────────────────────
console.log("🔧 Acciones correctivas...");
const corrActions = [
  { caseId: caseMap["CASO-2024-002"], title:"Capacitación en liderazgo", desc:"Capacitación obligatoria al supervisor sobre liderazgo y prevención de violencia laboral.", dept:"Ventas", due:"2024-12-31", status:"en_proceso", level:"individual" },
  { caseId: caseMap["CASO-2024-002"], title:"Protocolo de denuncia anónima", desc:"Implementar protocolo de denuncia anónima para casos de violencia laboral.", dept:"Ventas", due:"2024-11-30", status:"completada", level:"organizational" },
  { caseId: caseMap["CASO-2024-003"], title:"Redistribución de carga de trabajo", desc:"Revisión y redistribución de carga de trabajo en el área de Finanzas.", dept:"Finanzas", due:"2024-12-15", status:"pendiente", level:"group" },
  { caseId: caseMap["CASO-2024-001"], title:"Apoyo psicológico especializado", desc:"Brindar apoyo psicológico especializado al trabajador afectado por el acontecimiento traumático.", dept:"Operaciones", due:"2024-12-01", status:"en_proceso", level:"individual" },
];
for (const a of corrActions) {
  await conn.execute(
    `INSERT INTO correctiveActions (title, description, departamento, dueDate, status, responsibleUserId, actionLevel, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,NOW(),NOW())`,
    [a.title, a.desc, a.dept, a.due, a.status, ADMIN_ID, a.level]
  );
}
console.log(`  ✓ ${corrActions.length} acciones correctivas`);

// ── Miembros del Comité ───────────────────────────────────────────────────────
console.log("🏛️  Comité de Seguridad y Salud...");
const committee = [
  { empIdx:4,  pos:"Presidente",  resp:"Presidir las reuniones del comité y coordinar las acciones de prevención." },
  { empIdx:0,  pos:"Secretario",  resp:"Levantar actas de reunión y dar seguimiento a los acuerdos." },
  { empIdx:15, pos:"Vocal",       resp:"Representar al área de Seguridad e Higiene en el comité." },
  { empIdx:2,  pos:"Vocal",       resp:"Representar a los trabajadores del área de Operaciones." },
  { empIdx:11, pos:"Vocal",       resp:"Representar a los trabajadores del área de Ventas." },
];
for (const m of committee) {
  await conn.execute(
    "INSERT INTO committeeMembers (employeeId, userId, position, responsibilities, isActive, assignedAt, createdAt, updatedAt) VALUES (?,?,?,?,1,NOW(),NOW(),NOW())",
    [empIds[m.empIdx], empUserIds[m.empIdx], m.pos, m.resp]
  );
}
console.log(`  ✓ ${committee.length} miembros del comité`);

// ── Recursos de apoyo ─────────────────────────────────────────────────────────
console.log("📎 Recursos de apoyo...");
const resources = [
  { title:"NOM-035-STPS-2018 (Texto Oficial)",                    cat:"pdf",          url:"https://www.dof.gob.mx/nota_detalle.php?codigo=5541828&fecha=23/10/2018", desc:"Norma Oficial Mexicana publicada en el DOF" },
  { title:"Guía de Referencia I - Acontecimiento Traumático",     cat:"manual",       url:"https://www.stps.gob.mx",                                                  desc:"Guía oficial para identificar trabajadores expuestos a ATS" },
  { title:"Protocolo de Atención a Crisis",                       cat:"protocol",     url:"#",                                                                        desc:"Procedimiento interno para atención inmediata de crisis emocionales" },
  { title:"Directorio de Apoyo Psicológico",                      cat:"other",        url:"#",                                                                        desc:"Contactos de profesionales de salud mental disponibles" },
  { title:"Presentación: Factores de Riesgo Psicosocial",         cat:"presentation", url:"#",                                                                        desc:"Material audiovisual de sensibilización para trabajadores" },
  { title:"Formulario de Reporte de Incidentes",                  cat:"form",         url:"#",                                                                        desc:"Resumen visual de los principales factores de riesgo" },
];
for (const r of resources) {
  await conn.execute(
    "INSERT INTO resources (title, description, category, resourceUrl, fileKey, uploadedBy, createdAt, updatedAt) VALUES (?,?,?,?,?,?,NOW(),NOW())",
    [r.title, r.desc, r.cat, r.url, `resources/seed_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, ADMIN_ID]
  );
}
console.log(`  ✓ ${resources.length} recursos`);

// ── Buzón de sugerencias ──────────────────────────────────────────────────────
console.log("📬 Buzón de sugerencias...");
const mailboxItems = [
  { subject:"Mejora en ventilación del área de producción",   msg:"El área de producción presenta problemas de ventilación que generan malestar. Se sugiere revisar el sistema de aire acondicionado.", type:"sugerencia",                   status:"recibido",   anon:0, empIdx:2  },
  { subject:"Horarios de descanso insuficientes",             msg:"Los tiempos de descanso durante el turno nocturno son insuficientes para recuperarse adecuadamente.",                                 type:"queja",                        status:"en_proceso", anon:1, empIdx:null },
  { subject:"Propuesta de programa de bienestar",             msg:"Propongo implementar sesiones semanales de mindfulness y yoga para reducir el estrés laboral.",                                       type:"sugerencia",                   status:"concluido",  anon:0, empIdx:5  },
  { subject:"Conflicto en área de ventas",                    msg:"Existe un ambiente tenso en el área de ventas por presión excesiva de metas. Solicito intervención del área de RH.",                 type:"queja",                        status:"recibido",   anon:1, empIdx:null },
  { subject:"Solicitud de capacitación en manejo de estrés",  msg:"Varios compañeros del área de finanzas hemos solicitado capacitación en manejo de estrés laboral.",                                  type:"solicitud_capacitacion",       status:"recibido",   anon:0, empIdx:8  },
];
for (const m of mailboxItems) {
  await conn.execute(
    `INSERT INTO mailbox (folio, requestType, subject, message, isAnonymous, status, senderName, senderEmail, receivedVia, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [`BUZ-2024-${String(mailboxItems.indexOf(m)+1).padStart(3,'0')}`, m.type, m.subject, m.msg, m.anon,
     m.status,
     m.empIdx !== null ? `${employees[m.empIdx].fn} ${employees[m.empIdx].ln}` : "Anónimo",
     m.empIdx !== null ? employees[m.empIdx].email : 'anonimo@empresa.com',
     "web_form"]
  );
}
console.log(`  ✓ ${mailboxItems.length} mensajes en el buzón`);

// ── Notificaciones ────────────────────────────────────────────────────────────
console.log("🔔 Notificaciones...");
const notifs = [
  { title:"Encuesta NOM-035 disponible",   msg:"La encuesta de factores de riesgo psicosocial del período 2024 ya está disponible.", type:"survey_expiring",  userId:ADMIN_ID },
  { title:"Nuevo caso asignado",           msg:"Se le ha asignado el caso CASO-2024-002 para seguimiento.",                           type:"case_assigned",    userId:ADMIN_ID },
  { title:"Acción correctiva próxima",     msg:"La acción correctiva del caso CASO-2024-003 vence el 15 de diciembre.",               type:"deadline_approaching", userId:ADMIN_ID },
  { title:"Capacitación pendiente",        msg:"Tiene pendiente completar el curso 'Identificación y Prevención de Factores de Riesgo Psicosocial'.", type:"training_due", userId:ADMIN_ID },
];
for (const n of notifs) {
  await conn.execute(
    "INSERT INTO notifications (userId, type, title, message, isRead, createdAt) VALUES (?,?,?,?,0,NOW())",
    [n.userId, n.type, n.title, n.msg]
  );
}
console.log(`  ✓ ${notifs.length} notificaciones`);

// ── Competencias organizacionales ─────────────────────────────────────────────
console.log("🧠 Competencias organizacionales...");
const competencies = [
  { name:"Trabajo en Equipo",         cat:"soft_skill",                desc:"Capacidad para colaborar efectivamente con otros",                   level:"intermedio" },
  { name:"Comunicación Efectiva",     cat:"soft_skill",                desc:"Habilidad para transmitir y recibir información de manera clara",    level:"intermedio" },
  { name:"Orientación a Resultados",  cat:"organizational",            desc:"Enfoque en el logro de objetivos y metas",                          level:"avanzado" },
  { name:"Adaptabilidad",             cat:"soft_skill",                desc:"Capacidad para ajustarse a cambios y nuevas situaciones",            level:"intermedio" },
  { name:"Liderazgo",                 cat:"leadership",               desc:"Habilidad para guiar y motivar a otros hacia objetivos comunes",     level:"avanzado" },
  { name:"Pensamiento Analítico",     cat:"technical_transversal",    desc:"Capacidad para analizar información y resolver problemas",           level:"intermedio" },
  { name:"Gestión del Tiempo",        cat:"soft_skill",                desc:"Habilidad para organizar y priorizar actividades eficientemente",    level:"basico" },
  { name:"Inteligencia Emocional",    cat:"soft_skill",                desc:"Capacidad para reconocer y gestionar las propias emociones",         level:"intermedio" },
];
for (const c of competencies) {
  await conn.execute(
    "INSERT INTO organizationalCompetencies (competencyName, competencyCategory, description, requiredLevel, isActive, createdAt, updatedAt) VALUES (?,?,?,?,1,NOW(),NOW())",
    [c.name, c.cat, c.desc, c.level]
  );
}

// Competencias de empleados
const empComps = [
  { empIdx:0,  comp:"Trabajo en Equipo",        level:4, cert:"2024-01-15" },
  { empIdx:0,  comp:"Liderazgo",                level:4, cert:"2024-01-15" },
  { empIdx:1,  comp:"Trabajo en Equipo",        level:3, cert:"2024-02-10" },
  { empIdx:1,  comp:"Orientación a Resultados", level:4, cert:"2024-02-10" },
  { empIdx:4,  comp:"Comunicación Efectiva",    level:5, cert:"2024-01-20" },
  { empIdx:4,  comp:"Liderazgo",                level:5, cert:"2024-01-20" },
  { empIdx:7,  comp:"Pensamiento Analítico",    level:4, cert:"2024-03-05" },
  { empIdx:9,  comp:"Pensamiento Analítico",    level:5, cert:"2024-03-05" },
  { empIdx:14, comp:"Trabajo en Equipo",        level:3, cert:"2024-04-01" },
  { empIdx:15, comp:"Adaptabilidad",            level:4, cert:"2024-04-01" },
];
for (const ec of empComps) {
  await conn.execute(
    "INSERT INTO employeeCompetencies (employeeId, competencyName, competencyType, currentLevel, certificationDate, createdAt, updatedAt) VALUES (?,?,?,?,?,NOW(),NOW())",
    [empIds[ec.empIdx], ec.comp, "transversal", ec.level <= 2 ? 'basico' : ec.level <= 3 ? 'intermedio' : ec.level <= 4 ? 'avanzado' : 'experto', ec.cert]
  );
}
console.log(`  ✓ ${competencies.length} competencias, ${empComps.length} evaluaciones de empleados`);

// ── Progreso de cursos ────────────────────────────────────────────────────────
console.log("🎓 Progreso de cursos...");
const progress = [
  { empIdx:0,  courseIdx:0, status:"completed",   pct:100 },
  { empIdx:1,  courseIdx:0, status:"in_progress", pct:60  },
  { empIdx:2,  courseIdx:0, status:"not_started", pct:0   },
  { empIdx:4,  courseIdx:0, status:"completed",   pct:100 },
  { empIdx:4,  courseIdx:1, status:"completed",   pct:100 },
  { empIdx:5,  courseIdx:0, status:"in_progress", pct:45  },
  { empIdx:7,  courseIdx:0, status:"completed",   pct:100 },
  { empIdx:9,  courseIdx:0, status:"not_started", pct:0   },
  { empIdx:11, courseIdx:0, status:"in_progress", pct:30  },
  { empIdx:14, courseIdx:0, status:"completed",   pct:100 },
  { empIdx:12, courseIdx:0, status:"not_started", pct:0   },
  { empIdx:8,  courseIdx:0, status:"in_progress", pct:75  },
];
for (const p of progress) {
  await conn.execute(
    "INSERT INTO studentProgress (userId, courseId, status, progressPercentage, startedAt, completedAt, lastAccessedAt, createdAt, updatedAt) VALUES (?,?,?,?,NOW(),?,NOW(),NOW(),NOW())",
    [empIds[p.empIdx], courseIds[p.courseIdx], p.status, p.pct, p.status === "completed" ? new Date() : null]
  );
}
console.log(`  ✓ ${progress.length} registros de progreso`);

// ── Encuesta de clima organizacional ─────────────────────────────────────────
console.log("🌡️  Encuesta de clima organizacional...");
await conn.execute(
  "INSERT INTO organizational_climate_surveys (title, description, dimensions, frequency, is_active, created_by, created_at, updated_at) VALUES (?,?,?,?,1,?,NOW(),NOW())",
  [
    "Encuesta de Clima Organizacional 2024",
    "Evaluación anual del clima laboral y satisfacción de los colaboradores",
    JSON.stringify(["comunicacion","liderazgo","trabajo_en_equipo","condiciones_laborales","desarrollo_profesional"]),
    "annually",
    ADMIN_ID
  ]
);
console.log("  ✓ 1 encuesta de clima organizacional activa");

// ── Puestos de trabajo (jobPositions) ─────────────────────────────────────────
console.log("📋 Catálogo de puestos de trabajo...");
const jobPos = [
  { name:"Operador de Producción",    dept:"Operaciones",               risk:"medium", desc:"Operación de maquinaria y equipo en línea de producción" },
  { name:"Técnico de Mantenimiento",  dept:"Operaciones",               risk:"high",   desc:"Mantenimiento preventivo y correctivo de equipos" },
  { name:"Analista de RH",            dept:"Recursos Humanos",          risk:"low",    desc:"Análisis y gestión de procesos de recursos humanos" },
  { name:"Auxiliar Contable",         dept:"Finanzas",                  risk:"low",    desc:"Apoyo en actividades contables y financieras" },
  { name:"Técnico en Redes",          dept:"Tecnología de Información", risk:"low",    desc:"Administración y mantenimiento de infraestructura de redes" },
];
for (const jp of jobPos) {
  await conn.execute(
    "INSERT INTO jobPositions (positionName, department, description, riskLevel, createdBy, createdAt, updatedAt) VALUES (?,?,?,?,?,NOW(),NOW())",
    [jp.name, jp.dept, jp.desc, jp.risk, ADMIN_ID]
  );
}
console.log(`  ✓ ${jobPos.length} puestos de trabajo`);

// ── Resumen final ─────────────────────────────────────────────────────────────
console.log("\n✅ ¡Datos de prueba cargados exitosamente!");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`  📁 ${depts.length} Departamentos (2 con manager asignado)`);
console.log(`  💼 ${positions.length} Puestos + ${jobPos.length} puestos de trabajo`);
console.log(`  👥 ${employees.length} Empleados (16 activos, 1 baja, 1 licencia)`);
console.log(`  📚 ${courses.length} Cursos NOM-035 con módulos y evaluación`);
console.log(`  📋 2 Períodos de encuesta activos`);
console.log(`  📊 ${responses.length} Respuestas de encuesta Guía II`);
console.log(`  ⚠️  ${cases.length} Casos NOM-035 (2 abiertos, 2 en proceso, 1 resuelto)`);
console.log(`  🔧 ${corrActions.length} Acciones correctivas`);
console.log(`  🏛️  ${committee.length} Miembros del comité`);
console.log(`  📎 ${resources.length} Recursos de apoyo`);
console.log(`  📬 ${mailboxItems.length} Mensajes en el buzón`);
console.log(`  🎓 ${progress.length} Registros de progreso de cursos`);
console.log(`  🧠 ${competencies.length} Competencias organizacionales`);
console.log("═══════════════════════════════════════════════════════════════");
console.log("\n🔐 Acceso: usa tu cuenta de administrador existente");
console.log("   URL: https://3000-iwovq6kb9a5es3xqkugri-d6097923.us2.manus.computer");

await conn.end();
