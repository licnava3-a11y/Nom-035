import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.ts';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🌱 Iniciando generación de datos demo...\n');

// Función auxiliar para generar fechas aleatorias
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Función auxiliar para seleccionar elemento aleatorio
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

try {
  // 1. USUARIOS
  console.log('👥 Creando usuarios de ejemplo...');
  
  const users = [
    {
      openId: 'admin-demo-001',
      name: 'María González',
      email: 'maria.gonzalez@empresa.com',
      role: 'admin',
      avatarUrl: null,
    },
    {
      openId: 'instructor-demo-001',
      name: 'Carlos Ramírez',
      email: 'carlos.ramirez@empresa.com',
      role: 'instructor',
      avatarUrl: null,
    },
    {
      openId: 'instructor-demo-002',
      name: 'Ana López',
      email: 'ana.lopez@empresa.com',
      role: 'instructor',
      avatarUrl: null,
    },
    {
      openId: 'student-demo-001',
      name: 'Pedro Martínez',
      email: 'pedro.martinez@empresa.com',
      role: 'student',
      avatarUrl: null,
    },
    {
      openId: 'student-demo-002',
      name: 'Laura Sánchez',
      email: 'laura.sanchez@empresa.com',
      role: 'student',
      avatarUrl: null,
    },
    {
      openId: 'student-demo-003',
      name: 'Roberto Torres',
      email: 'roberto.torres@empresa.com',
      role: 'student',
      avatarUrl: null,
    },
    {
      openId: 'student-demo-004',
      name: 'Carmen Flores',
      email: 'carmen.flores@empresa.com',
      role: 'student',
      avatarUrl: null,
    },
    {
      openId: 'comite-demo-001',
      name: 'Dr. José Hernández',
      email: 'jose.hernandez@empresa.com',
      role: 'committee',
      avatarUrl: null,
    },
    {
      openId: 'comite-demo-002',
      name: 'Lic. Patricia Morales',
      email: 'patricia.morales@empresa.com',
      role: 'committee',
      avatarUrl: null,
    },
    {
      openId: 'comite-demo-003',
      name: 'Psic. Miguel Ángel Ruiz',
      email: 'miguel.ruiz@empresa.com',
      role: 'committee',
      avatarUrl: null,
    },
  ];

  for (const user of users) {
    try {
      await db.insert(schema.users).values(user).onDuplicateKeyUpdate({ set: { name: user.name } });
    } catch (error) {
      // Ignorar errores de duplicados
    }
  }
  console.log(`✅ ${users.length} usuarios creados\n`);

  // 2. CURSOS
  console.log('📚 Creando cursos...');
  
  const courses = [
    {
      title: 'Introducción a la NOM-035-STPS-2018',
      description: 'Curso fundamental sobre los factores de riesgo psicosocial en el trabajo y las obligaciones del patrón según la norma oficial mexicana.',
      category: 'fundamentos',
      duration: 120,
      isPublished: true,
      createdBy: 2, // Carlos Ramírez
      createdAt: new Date('2024-01-15'),
    },
    {
      title: 'Identificación y Análisis de Factores de Riesgo Psicosocial',
      description: 'Aprende a identificar, evaluar y analizar los factores de riesgo psicosocial en tu organización utilizando las herramientas de la NOM-035.',
      category: 'categorias_dominios',
      duration: 180,
      isPublished: true,
      createdBy: 2,
      createdAt: new Date('2024-02-01'),
    },
    {
      title: 'Prevención del Mobbing y Acoso Laboral',
      description: 'Curso especializado en la prevención, detección y atención de casos de mobbing y acoso laboral en el entorno de trabajo.',
      category: 'mobbing',
      duration: 150,
      isPublished: true,
      createdBy: 3, // Ana López
      createdAt: new Date('2024-02-15'),
    },
    {
      title: 'Gestión del Síndrome de Burnout',
      description: 'Identificación, prevención y manejo del síndrome de burnout en trabajadores. Estrategias de intervención organizacional.',
      category: 'burnout',
      duration: 135,
      isPublished: true,
      createdBy: 3,
      createdAt: new Date('2024-03-01'),
    },
    {
      title: 'Comité de Atención de Casos: Funciones y Protocolos',
      description: 'Capacitación especializada para miembros del comité de atención de casos de riesgo psicosocial.',
      category: 'comite',
      duration: 200,
      isPublished: true,
      createdBy: 2,
      createdAt: new Date('2024-03-15'),
    },
  ];

  const courseIds = [];
  for (const course of courses) {
    const [result] = await db.insert(schema.courses).values(course);
    courseIds.push(result.insertId);
  }
  console.log(`✅ ${courses.length} cursos creados\n`);

  // 3. MÓDULOS
  console.log('📖 Creando módulos...');
  
  const modules = [
    // Curso 1: Introducción a la NOM-035
    { courseId: courseIds[0], title: 'Fundamentos de la NOM-035-STPS-2018', description: 'Conoce los antecedentes, objetivos y alcance de la norma.', orderIndex: 1 },
    { courseId: courseIds[0], title: 'Obligaciones del Patrón', description: 'Comprende las obligaciones legales del empleador según la norma.', orderIndex: 2 },
    { courseId: courseIds[0], title: 'Derechos de los Trabajadores', description: 'Conoce los derechos que protege la NOM-035 para los trabajadores.', orderIndex: 3 },
    
    // Curso 2: Identificación y Análisis
    { courseId: courseIds[1], title: 'Categorías y Dominios de la NOM-035', description: 'Aprende las categorías y dominios de factores de riesgo psicosocial.', orderIndex: 1 },
    { courseId: courseIds[1], title: 'Herramientas de Evaluación', description: 'Conoce los cuestionarios y herramientas de evaluación de la norma.', orderIndex: 2 },
    { courseId: courseIds[1], title: 'Análisis de Resultados', description: 'Interpreta los resultados de las evaluaciones y genera planes de acción.', orderIndex: 3 },
    
    // Curso 3: Prevención del Mobbing
    { courseId: courseIds[2], title: '¿Qué es el Mobbing?', description: 'Definición, tipos y características del acoso laboral.', orderIndex: 1 },
    { courseId: courseIds[2], title: 'Detección de Casos', description: 'Aprende a identificar señales de alerta y casos potenciales.', orderIndex: 2 },
    { courseId: courseIds[2], title: 'Protocolos de Intervención', description: 'Procedimientos para atender casos de acoso laboral.', orderIndex: 3 },
    
    // Curso 4: Gestión del Burnout
    { courseId: courseIds[3], title: 'Síndrome de Burnout: Definición', description: 'Conoce qué es el burnout y sus dimensiones.', orderIndex: 1 },
    { courseId: courseIds[3], title: 'Factores de Riesgo', description: 'Identifica los factores organizacionales que generan burnout.', orderIndex: 2 },
    { courseId: courseIds[3], title: 'Estrategias de Prevención', description: 'Implementa medidas preventivas a nivel organizacional.', orderIndex: 3 },
    
    // Curso 5: Comité de Atención
    { courseId: courseIds[4], title: 'Integración del Comité', description: 'Aprende cómo integrar y organizar el comité de atención.', orderIndex: 1 },
    { courseId: courseIds[4], title: 'Funciones y Responsabilidades', description: 'Conoce las funciones específicas de cada miembro del comité.', orderIndex: 2 },
    { courseId: courseIds[4], title: 'Documentación y Seguimiento', description: 'Manejo de expedientes, actas y seguimiento de casos.', orderIndex: 3 },
  ];

  const moduleIds = [];
  for (const module of modules) {
    const [result] = await db.insert(schema.modules).values(module);
    moduleIds.push(result.insertId);
  }
  console.log(`✅ ${modules.length} módulos creados\n`);

  // 4. EVALUACIONES
  console.log('📝 Creando evaluaciones...');
  
  const evaluations = [];
  for (let i = 0; i < moduleIds.length; i++) {
    evaluations.push({
      moduleId: moduleIds[i],
      title: `Evaluación del Módulo ${i + 1}`,
      description: 'Evaluación de conocimientos adquiridos en este módulo.',
      passingScore: 70,
      timeLimit: 30,
      maxAttempts: 3,
    });
  }

  const evaluationIds = [];
  for (const evaluation of evaluations) {
    const [result] = await db.insert(schema.evaluations).values(evaluation);
    evaluationIds.push(result.insertId);
  }
  console.log(`✅ ${evaluations.length} evaluaciones creadas\n`);

  // 5. PREGUNTAS
  console.log('❓ Creando preguntas de evaluación...');
  
  const questions = [
    // Evaluación 1
    { evaluationId: evaluationIds[0], questionText: '¿En qué año entró en vigor la NOM-035-STPS-2018?', questionType: 'multiple_choice', points: 10, orderIndex: 1 },
    { evaluationId: evaluationIds[0], questionText: 'La NOM-035 aplica únicamente a empresas con más de 50 trabajadores.', questionType: 'true_false', points: 10, orderIndex: 2 },
    { evaluationId: evaluationIds[0], questionText: '¿Cuál es el objetivo principal de la NOM-035?', questionType: 'multiple_choice', points: 10, orderIndex: 3 },
    
    // Evaluación 2
    { evaluationId: evaluationIds[1], questionText: 'Las obligaciones del patrón incluyen identificar y analizar los factores de riesgo psicosocial.', questionType: 'true_false', points: 10, orderIndex: 1 },
    { evaluationId: evaluationIds[1], questionText: '¿Cuál de las siguientes NO es una obligación del patrón según la NOM-035?', questionType: 'multiple_choice', points: 10, orderIndex: 2 },
    
    // Evaluación 3
    { evaluationId: evaluationIds[2], questionText: 'Los trabajadores tienen derecho a un entorno organizacional favorable.', questionType: 'true_false', points: 10, orderIndex: 1 },
    { evaluationId: evaluationIds[2], questionText: '¿Qué puede hacer un trabajador si identifica factores de riesgo psicosocial?', questionType: 'multiple_choice', points: 10, orderIndex: 2 },
  ];

  const questionIds = [];
  for (const question of questions) {
    const [result] = await db.insert(schema.questions).values(question);
    questionIds.push(result.insertId);
  }
  console.log(`✅ ${questions.length} preguntas creadas\n`);

  // 6. OPCIONES DE RESPUESTA
  console.log('✔️ Creando opciones de respuesta...');
  
  const answerOptions = [
    // Pregunta 1
    { questionId: questionIds[0], optionText: '2016', isCorrect: false, orderIndex: 1 },
    { questionId: questionIds[0], optionText: '2018', isCorrect: true, orderIndex: 2 },
    { questionId: questionIds[0], optionText: '2019', isCorrect: false, orderIndex: 3 },
    { questionId: questionIds[0], optionText: '2020', isCorrect: false, orderIndex: 4 },
    
    // Pregunta 2 (verdadero/falso)
    { questionId: questionIds[1], optionText: 'Verdadero', isCorrect: false, orderIndex: 1 },
    { questionId: questionIds[1], optionText: 'Falso', isCorrect: true, orderIndex: 2 },
    
    // Pregunta 3
    { questionId: questionIds[2], optionText: 'Aumentar la productividad', isCorrect: false, orderIndex: 1 },
    { questionId: questionIds[2], optionText: 'Prevenir y controlar factores de riesgo psicosocial', isCorrect: true, orderIndex: 2 },
    { questionId: questionIds[2], optionText: 'Reducir costos operativos', isCorrect: false, orderIndex: 3 },
    { questionId: questionIds[2], optionText: 'Cumplir con requisitos internacionales', isCorrect: false, orderIndex: 4 },
    
    // Pregunta 4 (verdadero/falso)
    { questionId: questionIds[3], optionText: 'Verdadero', isCorrect: true, orderIndex: 1 },
    { questionId: questionIds[3], optionText: 'Falso', isCorrect: false, orderIndex: 2 },
    
    // Pregunta 5
    { questionId: questionIds[4], optionText: 'Realizar evaluaciones médicas', isCorrect: false, orderIndex: 1 },
    { questionId: questionIds[4], optionText: 'Proporcionar capacitación', isCorrect: false, orderIndex: 2 },
    { questionId: questionIds[4], optionText: 'Garantizar vacaciones pagadas', isCorrect: true, orderIndex: 3 },
    { questionId: questionIds[4], optionText: 'Establecer políticas de prevención', isCorrect: false, orderIndex: 4 },
    
    // Pregunta 6 (verdadero/falso)
    { questionId: questionIds[5], optionText: 'Verdadero', isCorrect: true, orderIndex: 1 },
    { questionId: questionIds[5], optionText: 'Falso', isCorrect: false, orderIndex: 2 },
    
    // Pregunta 7
    { questionId: questionIds[6], optionText: 'Ignorarlos', isCorrect: false, orderIndex: 1 },
    { questionId: questionIds[6], optionText: 'Reportarlos al patrón o comité', isCorrect: true, orderIndex: 2 },
    { questionId: questionIds[6], optionText: 'Renunciar inmediatamente', isCorrect: false, orderIndex: 3 },
    { questionId: questionIds[6], optionText: 'Publicarlos en redes sociales', isCorrect: false, orderIndex: 4 },
  ];

  for (const option of answerOptions) {
    await db.insert(schema.answerOptions).values(option);
  }
  console.log(`✅ ${answerOptions.length} opciones de respuesta creadas\n`);

  // 7. PROGRESO DE ESTUDIANTES
  console.log('🎓 Creando progreso de estudiantes...');
  
  const studentProgressData = [
    // Pedro Martínez - 3 cursos
    { userId: 4, courseId: courseIds[0], status: 'completed', progressPercentage: 100, startedAt: new Date('2024-01-20'), completedAt: new Date('2024-02-05') },
    { userId: 4, courseId: courseIds[1], status: 'in_progress', progressPercentage: 75, startedAt: new Date('2024-02-10'), completedAt: null },
    { userId: 4, courseId: courseIds[2], status: 'in_progress', progressPercentage: 30, startedAt: new Date('2024-03-01'), completedAt: null },
    
    // Laura Sánchez - 2 cursos
    { userId: 5, courseId: courseIds[0], status: 'completed', progressPercentage: 100, startedAt: new Date('2024-01-22'), completedAt: new Date('2024-02-08') },
    { userId: 5, courseId: courseIds[3], status: 'in_progress', progressPercentage: 50, startedAt: new Date('2024-03-05'), completedAt: null },
    
    // Roberto Torres - 4 cursos
    { userId: 6, courseId: courseIds[0], status: 'completed', progressPercentage: 100, startedAt: new Date('2024-01-25'), completedAt: new Date('2024-02-10') },
    { userId: 6, courseId: courseIds[1], status: 'completed', progressPercentage: 100, startedAt: new Date('2024-02-15'), completedAt: new Date('2024-03-10') },
    { userId: 6, courseId: courseIds[2], status: 'in_progress', progressPercentage: 60, startedAt: new Date('2024-03-01'), completedAt: null },
    { userId: 6, courseId: courseIds[3], status: 'in_progress', progressPercentage: 20, startedAt: new Date('2024-03-10'), completedAt: null },
    
    // Carmen Flores - 1 curso
    { userId: 7, courseId: courseIds[0], status: 'in_progress', progressPercentage: 45, startedAt: new Date('2024-02-01'), completedAt: null },
  ];

  for (const progress of studentProgressData) {
    await db.insert(schema.studentProgress).values(progress);
  }
  console.log(`✅ ${studentProgressData.length} registros de progreso creados\n`);

  // 8. CASOS PSICOSOCIALES
  console.log('📋 Creando casos psicosociales...');
  
  const cases = [
    {
      caseNumber: 'CASO-2024-001',
      reporterName: 'Laura Sánchez',
      reporterEmail: 'laura.sanchez@empresa.com',
      reporterPhone: '5551234567',
      isAnonymous: false,
      description: 'Empleada reporta comentarios ofensivos y exclusión por parte de su supervisor directo.',
      caseType: 'violence',
      priority: 'high',
      status: 'closed',
      assignedTo: 8, // Dr. José Hernández
      closedAt: new Date('2024-02-28'),
      createdAt: new Date('2024-01-15'),
    },
    {
      caseNumber: 'CASO-2024-002',
      reporterName: 'Roberto Torres',
      reporterEmail: 'roberto.torres@empresa.com',
      reporterPhone: '5559876543',
      isAnonymous: false,
      description: 'Gerente presenta síntomas de agotamiento extremo, despersonalización y baja realización personal.',
      caseType: 'burnout',
      priority: 'high',
      status: 'investigating',
      assignedTo: 9, // Lic. Patricia Morales
      closedAt: null,
      createdAt: new Date('2024-02-10'),
    },
    {
      caseNumber: 'CASO-2024-003',
      reporterName: 'Pedro Martínez',
      reporterEmail: 'pedro.martinez@empresa.com',
      reporterPhone: '5556543210',
      isAnonymous: false,
      description: 'Empleado reporta hostigamiento sistemático por parte de compañeros de trabajo.',
      caseType: 'mobbing',
      priority: 'high',
      status: 'investigating',
      assignedTo: 10, // Psic. Miguel Ángel Ruiz
      closedAt: null,
      createdAt: new Date('2024-03-01'),
    },
    {
      caseNumber: 'CASO-2024-004',
      reporterName: 'Carmen Flores',
      reporterEmail: 'carmen.flores@empresa.com',
      reporterPhone: '5554567890',
      isAnonymous: false,
      description: 'Equipo de contabilidad reporta jornadas laborales extendidas y carga de trabajo no manejable.',
      caseType: 'stress',
      priority: 'medium',
      status: 'open',
      assignedTo: 8,
      closedAt: null,
      createdAt: new Date('2024-03-15'),
    },
    {
      caseNumber: 'CASO-2024-005',
      reporterName: null,
      reporterEmail: null,
      reporterPhone: null,
      isAnonymous: true,
      description: 'Empleados reportan estilo de liderazgo autoritario y falta de comunicación efectiva.',
      caseType: 'other',
      priority: 'medium',
      status: 'open',
      assignedTo: null,
      closedAt: null,
      createdAt: new Date('2024-03-20'),
    },
  ];

  const caseIds = [];
  for (const caseItem of cases) {
    try {
      const [result] = await db.insert(schema.cases).values(caseItem);
      caseIds.push(result.insertId);
    } catch (error) {
      // Si ya existe, buscar el ID
      const existing = await db.select().from(schema.cases).where(sql`caseNumber = ${caseItem.caseNumber}`).limit(1);
      if (existing.length > 0) {
        caseIds.push(existing[0].id);
      }
    }
  }
  console.log(`✅ ${cases.length} casos creados\n`);

  // 9. SEGUIMIENTOS DE CASOS
  console.log('📝 Creando seguimientos de casos...');
  
  const caseFollowUps = [
    // Caso 1 (cerrado)
    { caseId: caseIds[0], userId: 1, action: 'Caso recibido y asignado al comité', createdAt: new Date('2024-01-15') },
    { caseId: caseIds[0], userId: 8, action: 'Entrevista inicial con la afectada realizada', createdAt: new Date('2024-01-18') },
    { caseId: caseIds[0], userId: 8, action: 'Entrevistas con testigos completadas', createdAt: new Date('2024-01-25') },
    { caseId: caseIds[0], userId: 8, action: 'Entrevista con el supervisor acusado', createdAt: new Date('2024-02-01') },
    { caseId: caseIds[0], userId: 8, action: 'Análisis de evidencias y elaboración de dictamen', createdAt: new Date('2024-02-10') },
    { caseId: caseIds[0], userId: 1, action: 'Aplicación de medidas disciplinarias al supervisor', createdAt: new Date('2024-02-20') },
    { caseId: caseIds[0], userId: 8, action: 'Caso cerrado con resolución favorable', createdAt: new Date('2024-02-28') },
    
    // Caso 2 (en proceso)
    { caseId: caseIds[1], userId: 1, action: 'Caso recibido y asignado', createdAt: new Date('2024-02-10') },
    { caseId: caseIds[1], userId: 9, action: 'Evaluación psicológica inicial realizada', createdAt: new Date('2024-02-15') },
    { caseId: caseIds[1], userId: 9, action: 'Plan de intervención elaborado', createdAt: new Date('2024-02-25') },
    { caseId: caseIds[1], userId: 9, action: 'Primera sesión de seguimiento psicológico', createdAt: new Date('2024-03-05') },
    
    // Caso 3 (en investigación)
    { caseId: caseIds[2], userId: 1, action: 'Caso recibido y asignado', createdAt: new Date('2024-03-01') },
    { caseId: caseIds[2], userId: 10, action: 'Entrevista inicial con el afectado', createdAt: new Date('2024-03-05') },
    { caseId: caseIds[2], userId: 10, action: 'Recopilación de evidencias documentales', createdAt: new Date('2024-03-10') },
    
    // Caso 4 (asignado)
    { caseId: caseIds[3], userId: 1, action: 'Caso recibido y asignado', createdAt: new Date('2024-03-15') },
    { caseId: caseIds[3], userId: 8, action: 'Análisis de cargas de trabajo iniciado', createdAt: new Date('2024-03-18') },
    
    // Caso 5 (nuevo)
    { caseId: caseIds[4], userId: 1, action: 'Caso recibido', createdAt: new Date('2024-03-20') },
  ];

  for (const followUp of caseFollowUps) {
    try {
      await db.insert(schema.caseFollowUps).values(followUp);
    } catch (error) {
      // Ignorar errores de duplicados
    }
  }
  console.log(`✅ ${caseFollowUps.length} seguimientos creados\n`);

  // 10. BUZÓN ELECTRÓNICO
  console.log('📬 Creando solicitudes del buzón...');
  
  const mailboxEntries = [
    {
      folio: 'BUZ-2024-001',
      subject: 'Queja por Acoso Laboral',
      message: 'Deseo reportar una situación de acoso laboral que he estado experimentando en mi área de trabajo.',
      senderName: 'Laura Sánchez',
      senderEmail: 'laura.sanchez@empresa.com',
      senderPhone: '5551234567',
      isAnonymous: false,
      requestType: 'queja',
      complaintType: 'acoso_laboral',
      status: 'concluido',
      assignedTo: 8,
      receivedVia: 'web_form',
      createdAt: new Date('2024-01-15'),
      concludedAt: new Date('2024-02-28'),
    },
    {
      subject: 'Sugerencia para Mejorar el Ambiente Laboral',
      message: 'Me gustaría sugerir la implementación de espacios de descanso y actividades recreativas para mejorar el ambiente de trabajo.',
      folio: 'BUZ-2024-002',
      senderName: 'Pedro Martínez',
      senderEmail: 'pedro.martinez@empresa.com',
      senderPhone: '5559876543',
      receivedVia: 'web_form',
      createdAt: new Date('2024-02-01'),
      isAnonymous: false,
      requestType: 'sugerencia',
      complaintType: null,
      status: 'en_proceso',
      assignedTo: 1,
      createdAt: new Date('2024-02-01'),
      concludedAt: null,
    },
    {
      subject: 'Queja por Carga de Trabajo Excesiva',
      message: 'El equipo de contabilidad está sobrecargado de trabajo. Necesitamos más personal o redistribución de tareas.',
      folio: 'BUZ-2024-003',
      senderName: 'Carmen Flores',
      senderEmail: 'carmen.flores@empresa.com',
      senderPhone: '5556543210',
      receivedVia: 'web_form',
      createdAt: new Date('2024-03-15'),
      isAnonymous: false,
      requestType: 'queja',
      complaintType: 'carga_trabajo',
      status: 'asignado',
      assignedTo: 8,
      createdAt: new Date('2024-03-15'),
      concludedAt: null,
    },
    {
      subject: 'Solicitud de Capacitación en Manejo del Estrés',
      message: 'Solicito capacitación sobre técnicas de manejo del estrés laboral para mi equipo.',
      folio: 'BUZ-2024-004',
      senderName: 'Roberto Torres',
      senderEmail: 'roberto.torres@empresa.com',
      senderPhone: '5554567890',
      receivedVia: 'web_form',
      createdAt: new Date('2024-03-18'),
      isAnonymous: false,
      requestType: 'solicitud_capacitacion',
      complaintType: null,
      status: 'recibido',
      assignedTo: null,
      createdAt: new Date('2024-03-18'),
      concludedAt: null,
    },
    {
      subject: 'Queja Anónima por Liderazgo Negativo',
      message: 'El estilo de liderazgo en mi área es muy autoritario y genera un ambiente de trabajo tóxico.',
      folio: 'BUZ-2024-005',
      senderName: null,
      senderEmail: 'anonimo@sistema.com',
      senderPhone: null,
      receivedVia: 'web_form',
      createdAt: new Date('2024-03-20'),
      isAnonymous: true,
      requestType: 'queja',
      complaintType: 'liderazgo_negativo',
      status: 'recibido',
      assignedTo: null,
      createdAt: new Date('2024-03-20'),
      concludedAt: null,
    },
    {
      subject: 'Felicitación al Equipo de Recursos Humanos',
      message: 'Quiero felicitar al equipo de RH por la excelente organización del programa de bienestar.',
      folio: 'BUZ-2024-006',
      senderName: 'Ana López',
      senderEmail: 'ana.lopez@empresa.com',
      senderPhone: '5552345678',
      receivedVia: 'web_form',
      createdAt: new Date('2024-02-15'),
      concludedAt: new Date('2024-02-16'),
      isAnonymous: false,
      requestType: 'felicitacion',
      complaintType: null,
      status: 'concluido',
      assignedTo: 1,
      createdAt: new Date('2024-02-15'),
      concludedAt: new Date('2024-02-16'),
      response: 'Muchas gracias por sus comentarios. Los compartiremos con el equipo.',
    },
  ];

  for (const entry of mailboxEntries) {
    try {
      await db.insert(schema.mailbox).values(entry);
    } catch (error) {
      // Ignorar errores de duplicados
    }
  }
  console.log(`✅ ${mailboxEntries.length} solicitudes del buzón creadas\n`);

  // 11. RECURSOS
  console.log('📁 Creando recursos descargables...');
  
  const resources = [
    {
      title: 'Manual del Implementador NOM-035',
      description: 'Guía completa para implementar la NOM-035 en tu organización.',
      category: 'manual',
      resourceUrl: 'https://example.com/manual-implementador.pdf',
      fileKey: 'resources/manual-implementador.pdf',
      fileSize: 2500000,
      uploadedBy: 1,
      downloadCount: 45,
      createdAt: new Date('2024-01-10'),
    },
    {
      title: 'Protocolo de Atención de Casos',
      description: 'Procedimientos detallados para la atención de casos de riesgo psicosocial.',
      category: 'protocol',
      resourceUrl: 'https://example.com/protocolo-atencion.pdf',
      fileKey: 'resources/protocolo-atencion.pdf',
      fileSize: 1800000,
      uploadedBy: 1,
      downloadCount: 28,
      createdAt: new Date('2024-01-15'),
    },
    {
      title: 'Presentación: Introducción a la NOM-035',
      description: 'Presentación ejecutiva sobre los fundamentos de la norma.',
      category: 'presentation',
      resourceUrl: 'https://example.com/intro-nom035.pptx',
      fileKey: 'resources/intro-nom035.pptx',
      fileSize: 3200000,
      uploadedBy: 2,
      downloadCount: 67,
      createdAt: new Date('2024-01-20'),
    },
    {
      title: 'Caso de Estudio: Mobbing en Empresa Manufacturera',
      description: 'Análisis de caso real de mobbing y su resolución.',
      category: 'pdf',
      resourceUrl: 'https://example.com/caso-mobbing.pdf',
      fileKey: 'resources/caso-mobbing.pdf',
      fileSize: 1200000,
      uploadedBy: 3,
      downloadCount: 34,
      createdAt: new Date('2024-02-01'),
    },
    {
      title: 'Cuestionario de Evaluación de Factores de Riesgo',
      description: 'Formato oficial para evaluar factores de riesgo psicosocial.',
      category: 'form',
      resourceUrl: 'https://example.com/cuestionario-evaluacion.pdf',
      fileKey: 'resources/cuestionario-evaluacion.pdf',
      fileSize: 850000,
      uploadedBy: 1,
      downloadCount: 92,
      createdAt: new Date('2024-02-10'),
    },
  ];

  for (const resource of resources) {
    try {
      await db.insert(schema.resources).values(resource);
    } catch (error) {
      // Ignorar errores de duplicados
    }
  }
  console.log(`✅ ${resources.length} recursos creados\n`);

  // 12. NOTIFICACIONES
  console.log('🔔 Creando notificaciones...');
  
  const notifications = [
    {
      userId: 8,
      title: 'Nuevo caso asignado',
      message: 'Se le ha asignado el caso CASO-2024-001: Caso de Acoso Laboral en Área de Ventas',
      type: 'caso_asignado',
      isRead: true,
      createdAt: new Date('2024-01-15'),
    },
    {
      userId: 9,
      title: 'Nuevo caso asignado',
      message: 'Se le ha asignado el caso CASO-2024-002: Síndrome de Burnout en Gerente de Operaciones',
      type: 'caso_asignado',
      isRead: true,
      createdAt: new Date('2024-02-10'),
    },
    {
      userId: 10,
      title: 'Nuevo caso asignado',
      message: 'Se le ha asignado el caso CASO-2024-003: Mobbing en Equipo de Desarrollo',
      type: 'caso_asignado',
      isRead: false,
      createdAt: new Date('2024-03-01'),
    },
    {
      userId: 8,
      title: 'Nuevo caso asignado',
      message: 'Se le ha asignado el caso CASO-2024-004: Carga de Trabajo Excesiva en Contabilidad',
      type: 'caso_asignado',
      isRead: false,
      createdAt: new Date('2024-03-15'),
    },
    {
      userId: 4,
      title: 'Curso completado',
      message: 'Has completado exitosamente el curso: Introducción a la NOM-035-STPS-2018',
      type: 'curso_completado',
      isRead: true,
      createdAt: new Date('2024-02-05'),
    },
    {
      userId: 5,
      title: 'Curso completado',
      message: 'Has completado exitosamente el curso: Introducción a la NOM-035-STPS-2018',
      type: 'curso_completado',
      isRead: true,
      createdAt: new Date('2024-02-08'),
    },
    {
      userId: 6,
      title: 'Curso completado',
      message: 'Has completado exitosamente el curso: Identificación y Análisis de Factores de Riesgo Psicosocial',
      type: 'curso_completado',
      isRead: true,
      createdAt: new Date('2024-03-10'),
    },
    {
      userId: 1,
      title: 'Nueva solicitud en el buzón',
      message: 'Se ha recibido una nueva solicitud: Sugerencia para Mejorar el Ambiente Laboral',
      type: 'nueva_solicitud',
      isRead: true,
      createdAt: new Date('2024-02-01'),
    },
    {
      userId: 1,
      title: 'Nueva solicitud en el buzón',
      message: 'Se ha recibido una nueva solicitud: Solicitud de Capacitación en Manejo del Estrés',
      type: 'nueva_solicitud',
      isRead: false,
      createdAt: new Date('2024-03-18'),
    },
  ];

  for (const notification of notifications) {
    try {
      await db.insert(schema.notifications).values(notification);
    } catch (error) {
      // Ignorar errores de duplicados
    }
  }
  console.log(`✅ ${notifications.length} notificaciones creadas\n`);

  // 13. ASIGNACIONES DE COMITÉ
  console.log('👥 Creando asignaciones de comité...');
  
  const caseAssignments = [
    { caseId: caseIds[0], userId: 8, assignedAt: new Date('2024-01-15'), role: 'investigador_principal' },
    { caseId: caseIds[1], userId: 9, assignedAt: new Date('2024-02-10'), role: 'investigador_principal' },
    { caseId: caseIds[2], userId: 10, assignedAt: new Date('2024-03-01'), role: 'investigador_principal' },
    { caseId: caseIds[3], userId: 8, assignedAt: new Date('2024-03-15'), role: 'investigador_principal' },
  ];

  for (const assignment of caseAssignments) {
    try {
      await db.insert(schema.caseAssignments).values(assignment);
    } catch (error) {
      // Ignorar errores de duplicados
    }
  }
  console.log(`✅ ${caseAssignments.length} asignaciones de comité creadas\n`);

  console.log('✨ ¡Datos demo generados exitosamente!\n');
  console.log('📊 Resumen:');
  console.log(`   - ${users.length} usuarios`);
  console.log(`   - ${courses.length} cursos`);
  console.log(`   - ${modules.length} módulos`);
  console.log(`   - ${evaluations.length} evaluaciones`);
  console.log(`   - ${questions.length} preguntas`);
  console.log(`   - ${answerOptions.length} opciones de respuesta`);
  console.log(`   - ${studentProgressData.length} registros de progreso`);
  console.log(`   - ${cases.length} casos psicosociales`);
  console.log(`   - ${caseFollowUps.length} seguimientos`);
  console.log(`   - ${mailboxEntries.length} solicitudes del buzón`);
  console.log(`   - ${resources.length} recursos`);
  console.log(`   - ${notifications.length} notificaciones`);
  console.log(`   - ${caseAssignments.length} asignaciones de comité\n`);

} catch (error) {
  console.error('❌ Error generando datos demo:', error);
  process.exit(1);
} finally {
  await connection.end();
}
