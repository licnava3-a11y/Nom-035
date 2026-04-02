/**
 * seed-guia3.mjs
 * Carga preguntas completas de la Guía III NOM-035 y respuestas realistas
 * con variación de riesgo por departamento para alimentar el módulo de IA.
 */
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
console.log('✅ Conectado a la base de datos');

// ── IDs de referencia ─────────────────────────────────────────────────────────
const [surveyRows] = await conn.execute("SELECT id FROM surveys WHERE type='guia_iii' LIMIT 1");
if (!surveyRows.length) { console.error('❌ No se encontró la encuesta Guía III'); process.exit(1); }
const SURVEY_ID = surveyRows[0].id;

const [periodRows] = await conn.execute("SELECT id FROM survey_periods WHERE name LIKE '%Guía III%' OR name LIKE '%guia_iii%' OR name LIKE '%III%' LIMIT 1");
const PERIOD_ID = periodRows.length ? periodRows[0].id : null;

const [userRows] = await conn.execute("SELECT u.id, e.departmentId FROM users u JOIN employees e ON e.userId = u.id WHERE u.email LIKE '%@empresa.com' ORDER BY u.id");
console.log(`📋 ${userRows.length} empleados encontrados`);

// ── Limpiar preguntas y respuestas anteriores de Guía III ─────────────────────
console.log('🧹 Limpiando datos anteriores de Guía III...');
const [existingQIds] = await conn.execute('SELECT id FROM survey_questions WHERE survey_id=?', [SURVEY_ID]);
if (existingQIds.length) {
  const qIds = existingQIds.map(r => r.id);
  // Borrar answers de respuestas de esta encuesta
  await conn.execute('DELETE sa FROM survey_answers sa JOIN survey_responses sr ON sa.response_id=sr.id WHERE sr.survey_id=?', [SURVEY_ID]);
  await conn.execute('DELETE FROM survey_responses WHERE survey_id=?', [SURVEY_ID]);
  await conn.execute('DELETE FROM survey_questions WHERE survey_id=?', [SURVEY_ID]);
}
console.log('  ✓ Datos anteriores eliminados');

// ── 47 Preguntas completas de la Guía III NOM-035 ────────────────────────────
// Dominios: ambiente_trabajo, actividad, tiempo_trabajo, liderazgo, violencia
const preguntas = [
  // DOMINIO 1: Condiciones del ambiente de trabajo (10 preguntas)
  { text: 'El espacio donde trabajo es suficiente para realizar mis actividades.', domain: 'ambiente_trabajo', order: 1 },
  { text: 'Mi área de trabajo cuenta con la iluminación adecuada.', domain: 'ambiente_trabajo', order: 2 },
  { text: 'El nivel de ruido en mi lugar de trabajo me permite concentrarme.', domain: 'ambiente_trabajo', order: 3 },
  { text: 'La temperatura en mi área de trabajo es confortable.', domain: 'ambiente_trabajo', order: 4 },
  { text: 'Cuento con el equipo y herramientas necesarios para realizar mi trabajo.', domain: 'ambiente_trabajo', order: 5 },
  { text: 'Mi lugar de trabajo está limpio y ordenado.', domain: 'ambiente_trabajo', order: 6 },
  { text: 'Las instalaciones físicas de mi área de trabajo son seguras.', domain: 'ambiente_trabajo', order: 7 },
  { text: 'Tengo acceso a los recursos tecnológicos que necesito para mi trabajo.', domain: 'ambiente_trabajo', order: 8 },
  { text: 'El mobiliario de mi área de trabajo es adecuado para mis actividades.', domain: 'ambiente_trabajo', order: 9 },
  { text: 'Las condiciones físicas de mi trabajo no afectan negativamente mi salud.', domain: 'ambiente_trabajo', order: 10 },

  // DOMINIO 2: Factores propios de la actividad (10 preguntas)
  { text: 'Tengo claridad sobre las responsabilidades y tareas de mi puesto.', domain: 'actividad', order: 11 },
  { text: 'La cantidad de trabajo que tengo es manejable dentro de mi jornada.', domain: 'actividad', order: 12 },
  { text: 'Puedo tomar decisiones sobre cómo realizar mis tareas.', domain: 'actividad', order: 13 },
  { text: 'Mi trabajo me permite desarrollar mis habilidades y conocimientos.', domain: 'actividad', order: 14 },
  { text: 'Recibo retroalimentación sobre la calidad de mi trabajo.', domain: 'actividad', order: 15 },
  { text: 'Las metas y objetivos de mi puesto son claros y alcanzables.', domain: 'actividad', order: 16 },
  { text: 'Cuento con la información necesaria para realizar bien mi trabajo.', domain: 'actividad', order: 17 },
  { text: 'Mi trabajo requiere atención constante sin posibilidad de pausas.', domain: 'actividad', order: 18 },
  { text: 'Puedo organizar mis actividades de acuerdo con mis prioridades.', domain: 'actividad', order: 19 },
  { text: 'El nivel de responsabilidad de mi puesto es adecuado a mis capacidades.', domain: 'actividad', order: 20 },

  // DOMINIO 3: Organización del tiempo de trabajo (9 preguntas)
  { text: 'Mi jornada de trabajo tiene una duración adecuada.', domain: 'tiempo_trabajo', order: 21 },
  { text: 'Puedo tomar descansos durante mi jornada laboral.', domain: 'tiempo_trabajo', order: 22 },
  { text: 'Los horarios de trabajo me permiten atender mis responsabilidades personales y familiares.', domain: 'tiempo_trabajo', order: 23 },
  { text: 'Rara vez tengo que trabajar horas extra no planificadas.', domain: 'tiempo_trabajo', order: 24 },
  { text: 'Tengo tiempo suficiente para completar mis tareas sin apresurarme.', domain: 'tiempo_trabajo', order: 25 },
  { text: 'Los cambios de turno o de horario se comunican con suficiente anticipación.', domain: 'tiempo_trabajo', order: 26 },
  { text: 'Puedo desconectarme del trabajo durante mis días de descanso.', domain: 'tiempo_trabajo', order: 27 },
  { text: 'El ritmo de trabajo es sostenible a lo largo de la jornada.', domain: 'tiempo_trabajo', order: 28 },
  { text: 'Se respetan mis períodos de vacaciones y días de descanso.', domain: 'tiempo_trabajo', order: 29 },

  // DOMINIO 4: Liderazgo y relaciones en el trabajo (10 preguntas)
  { text: 'Mi jefe inmediato me trata con respeto y consideración.', domain: 'liderazgo', order: 30 },
  { text: 'Recibo apoyo de mi jefe cuando enfrento dificultades en el trabajo.', domain: 'liderazgo', order: 31 },
  { text: 'Mi jefe reconoce cuando realizo bien mi trabajo.', domain: 'liderazgo', order: 32 },
  { text: 'La comunicación con mi jefe es clara y efectiva.', domain: 'liderazgo', order: 33 },
  { text: 'Mis compañeros de trabajo me tratan con respeto.', domain: 'liderazgo', order: 34 },
  { text: 'Existe un buen ambiente de colaboración en mi equipo de trabajo.', domain: 'liderazgo', order: 35 },
  { text: 'Puedo expresar mis opiniones sin temor a represalias.', domain: 'liderazgo', order: 36 },
  { text: 'Mi jefe escucha y considera mis propuestas e ideas.', domain: 'liderazgo', order: 37 },
  { text: 'Las decisiones de mi jefe son justas y consistentes.', domain: 'liderazgo', order: 38 },
  { text: 'Me siento parte de un equipo que trabaja hacia objetivos comunes.', domain: 'liderazgo', order: 39 },

  // DOMINIO 5: Violencia laboral (8 preguntas)
  { text: 'En mi trabajo no he sido objeto de insultos, burlas o comentarios ofensivos.', domain: 'violencia', order: 40 },
  { text: 'No he sido ignorado, excluido o marginado por mis compañeros o jefes.', domain: 'violencia', order: 41 },
  { text: 'No me han asignado tareas humillantes o degradantes.', domain: 'violencia', order: 42 },
  { text: 'No he recibido amenazas o intimidaciones en mi lugar de trabajo.', domain: 'violencia', order: 43 },
  { text: 'No he sido víctima de acoso sexual en el trabajo.', domain: 'violencia', order: 44 },
  { text: 'La empresa cuenta con mecanismos para reportar situaciones de violencia laboral.', domain: 'violencia', order: 45 },
  { text: 'La empresa toma medidas efectivas ante reportes de violencia o acoso.', domain: 'violencia', order: 46 },
  { text: 'Me siento seguro/a en mi lugar de trabajo.', domain: 'violencia', order: 47 },
];

// ── Insertar preguntas ────────────────────────────────────────────────────────
console.log(`📝 Insertando ${preguntas.length} preguntas de la Guía III...`);
const questionIds = [];
for (const p of preguntas) {
  const [res] = await conn.execute(
    'INSERT INTO survey_questions (survey_id, question_text, question_type, domain, `order`, created_at) VALUES (?,?,?,?,?,NOW())',
    [SURVEY_ID, p.text, 'scale', p.domain, p.order]
  );
  questionIds.push(res.insertId);
}
console.log(`  ✓ ${questionIds.length} preguntas insertadas`);

// ── Perfiles de riesgo por departamento ──────────────────────────────────────
// Escala 1-5: 1=Siempre negativo (alto riesgo), 5=Siempre positivo (bajo riesgo)
// Distribución realista: Operaciones tiene más riesgo, RH y Dirección menos
const deptRiskProfiles = {
  // [base, varianza] por dominio: ambiente, actividad, tiempo, liderazgo, violencia
  'Operaciones':                { base: [2.8, 3.2, 2.5, 3.0, 3.8], variance: 0.8 },
  'Recursos Humanos':           { base: [4.2, 4.0, 3.8, 4.3, 4.7], variance: 0.4 },
  'Finanzas':                   { base: [3.8, 3.5, 3.2, 3.9, 4.5], variance: 0.5 },
  'Tecnología de Información':  { base: [4.0, 3.8, 2.9, 3.7, 4.6], variance: 0.6 },
  'Ventas y Comercial':         { base: [3.5, 3.3, 2.7, 3.4, 4.2], variance: 0.7 },
  'Calidad y Cumplimiento':     { base: [3.7, 3.6, 3.4, 3.8, 4.4], variance: 0.5 },
  'Dirección General':          { base: [4.5, 4.2, 3.5, 4.6, 4.8], variance: 0.3 },
  'Administración':             { base: [4.0, 3.9, 3.6, 4.1, 4.6], variance: 0.4 },
};

// Obtener departamentos de los empleados
const [deptRows] = await conn.execute('SELECT id, name FROM departments');
const deptMap = {};
deptRows.forEach(d => deptMap[d.id] = d.name);

// ── Función para generar respuesta realista ───────────────────────────────────
function getRiskScore(domainBase, variance) {
  const noise = (Math.random() - 0.5) * variance * 2;
  return Math.min(5, Math.max(1, Math.round((domainBase + noise) * 10) / 10));
}

function getDomainIndex(domain) {
  const map = { ambiente_trabajo: 0, actividad: 1, tiempo_trabajo: 2, liderazgo: 3, violencia: 4 };
  return map[domain] ?? 2;
}

// ── Insertar respuestas de la Guía III ───────────────────────────────────────
console.log(`📊 Generando respuestas de la Guía III para ${userRows.length} empleados...`);
let totalResponses = 0;
let totalAnswers = 0;

const year = new Date().getFullYear();

for (const user of userRows) {
  const deptName = deptMap[user.departmentId] || 'Administración';
  const profile = deptRiskProfiles[deptName] || deptRiskProfiles['Administración'];

  // Generar fecha de respuesta aleatoria en los últimos 90 días
  const daysAgo = Math.floor(Math.random() * 90);
  const completedAt = new Date(Date.now() - daysAgo * 86400000);
  const token = crypto.randomBytes(32).toString('hex');

  // Calcular resultados por dominio
  const domainScores = {
    ambiente_trabajo: 0, actividad: 0, tiempo_trabajo: 0, liderazgo: 0, violencia: 0
  };
  const domainCounts = { ambiente_trabajo: 0, actividad: 0, tiempo_trabajo: 0, liderazgo: 0, violencia: 0 };

  // Insertar respuesta
  const [respRes] = await conn.execute(
    `INSERT INTO survey_responses (survey_id, user_id, token, completed_at, started_at, period_id, fecha, periodo, version_nom)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      SURVEY_ID, user.id, token,
      completedAt, new Date(completedAt.getTime() - 20 * 60000),
      PERIOD_ID,
      `${year}-${String(completedAt.getMonth()+1).padStart(2,'0')}-${String(completedAt.getDate()).padStart(2,'0')}`,
      `${year}-${completedAt.getMonth() < 6 ? '1' : '2'}`,
      'NOM-035-STPS-2018'
    ]
  );
  const responseId = respRes.insertId;
  totalResponses++;

  // Insertar respuestas por pregunta
  for (let i = 0; i < preguntas.length; i++) {
    const p = preguntas[i];
    const domIdx = getDomainIndex(p.domain);
    const score = getRiskScore(profile.base[domIdx], profile.variance);
    const answerValue = String(Math.round(score)); // 1-5

    await conn.execute(
      'INSERT INTO survey_answers (response_id, question_id, answer_value, answered_at) VALUES (?,?,?,?)',
      [responseId, questionIds[i], answerValue, completedAt]
    );
    totalAnswers++;

    domainScores[p.domain] = (domainScores[p.domain] || 0) + score;
    domainCounts[p.domain] = (domainCounts[p.domain] || 0) + 1;
  }

  // Calcular promedios por dominio y nivel de riesgo general
  const avgScores = {};
  let totalScore = 0;
  let domainCount = 0;
  for (const [dom, sum] of Object.entries(domainScores)) {
    const avg = sum / (domainCounts[dom] || 1);
    avgScores[dom] = Math.round(avg * 100) / 100;
    totalScore += avg;
    domainCount++;
  }
  const overallAvg = totalScore / domainCount;
  // Nivel de riesgo: <2.5=alto, 2.5-3.5=medio, >3.5=bajo
  const riskLevel = overallAvg < 2.5 ? 'alto' : overallAvg < 3.5 ? 'medio' : 'bajo';

  // Actualizar results en la respuesta
  const results = JSON.stringify({
    domainScores: avgScores,
    overallScore: Math.round(overallAvg * 100) / 100,
    riskLevel,
    department: deptName,
    completedAt: completedAt.toISOString()
  });
  await conn.execute('UPDATE survey_responses SET results=? WHERE id=?', [results, responseId]);
}

console.log(`  ✓ ${totalResponses} respuestas de Guía III insertadas`);
console.log(`  ✓ ${totalAnswers} respuestas individuales (${preguntas.length} preguntas × ${userRows.length} empleados)`);

// ── Resumen por departamento ──────────────────────────────────────────────────
console.log('\n📈 Resumen de riesgo por departamento:');
const [summary] = await conn.execute(`
  SELECT 
    d.name as dept,
    COUNT(sr.id) as responses,
    AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(sr.results, '$.overallScore')) AS DECIMAL(4,2))) as avg_score,
    JSON_UNQUOTE(JSON_EXTRACT(sr.results, '$.riskLevel')) as risk_level
  FROM survey_responses sr
  JOIN users u ON sr.user_id = u.id
  JOIN employees e ON e.userId = u.id
  JOIN departments d ON d.id = e.departmentId
  WHERE sr.survey_id = ?
  GROUP BY d.name, JSON_UNQUOTE(JSON_EXTRACT(sr.results, '$.riskLevel'))
  ORDER BY avg_score ASC
`, [SURVEY_ID]);

summary.forEach(row => {
  const icon = row.risk_level === 'alto' ? '🔴' : row.risk_level === 'medio' ? '🟡' : '🟢';
  console.log(`  ${icon} ${row.dept}: ${row.responses} respuestas, score promedio ${row.avg_score} (${row.risk_level})`);
});

console.log('\n✅ ¡Guía III cargada exitosamente!');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  📝 ${preguntas.length} preguntas en 5 dominios NOM-035`);
console.log(`  📊 ${totalResponses} respuestas de empleados con variación realista`);
console.log(`  🧠 Datos listos para análisis de sentimiento con Forge LLM`);
console.log('═══════════════════════════════════════════════════════════════');

await conn.end();
