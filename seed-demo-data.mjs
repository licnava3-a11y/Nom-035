import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { eq, count } from 'drizzle-orm';

// Conectar a la base de datos
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🌱 Iniciando población de datos demostrativos...\n');

// Verificar si ya existen datos
const [deptCount] = await db.select({ count: count() }).from(schema.departments).execute();
const [empCount] = await db.select({ count: count() }).from(schema.employees).execute();

console.log(`📊 Datos existentes: ${deptCount.count} departamentos, ${empCount.count} empleados\n`);

if (deptCount.count > 0 && empCount.count > 0) {
  console.log('✅ El sistema ya tiene datos demostrativos. Ejecutando pruebas de integridad...\n');
  
  // Verificar integridad de datos
  const departments = await db.select().from(schema.departments).execute();
  const employees = await db.select().from(schema.employees).execute();
  const positions = await db.select().from(schema.positions).execute();
  const competencies = await db.select().from(schema.organizationalCompetencies).execute();
  const courses = await db.select().from(schema.courses).execute();
  const cases = await db.select().from(schema.cases).execute();
  const surveys = await db.select().from(schema.surveyResponses).execute();
  const skillsMatrix = await db.select().from(schema.skillsMatrix).execute();
  
  console.log('📊 Resumen de datos existentes:');
  console.log(`   ✅ ${departments.length} departamentos`);
  console.log(`   ✅ ${positions.length} puestos`);
  console.log(`   ✅ ${competencies.length} competencias`);
  console.log(`   ✅ ${employees.length} empleados`);
  console.log(`   ✅ ${skillsMatrix.length} registros de matriz de habilidades`);
  console.log(`   ✅ ${courses.length} cursos`);
  console.log(`   ✅ ${cases.length} casos NOM-035`);
  console.log(`   ✅ ${surveys.length} respuestas de encuestas\n`);
  
  console.log('✅ Sistema poblado correctamente. Listo para pruebas.\n');
  await connection.end();
  process.exit(0);
}

// Si no hay datos, poblar desde cero
console.log('📝 No se encontraron datos. Poblando base de datos...\n');

// 1. DEPARTAMENTOS
console.log('📁 Creando departamentos...');
await db.insert(schema.departments).values([
  { name: 'Recursos Humanos', description: 'Gestión del talento humano' },
  { name: 'Tecnología de la Información', description: 'Desarrollo y soporte técnico' },
  { name: 'Operaciones', description: 'Gestión operativa y logística' },
  { name: 'Ventas', description: 'Gestión comercial y ventas' },
  { name: 'Marketing', description: 'Estrategia de marketing y comunicación' },
  { name: 'Finanzas', description: 'Gestión financiera y contable' },
  { name: 'Legal', description: 'Asuntos legales y cumplimiento' },
  { name: 'Producción', description: 'Manufactura y producción' },
  { name: 'Calidad', description: 'Aseguramiento de calidad' },
  { name: 'Compras', description: 'Adquisiciones y proveedores' },
  { name: 'Logística', description: 'Distribución y almacenamiento' },
  { name: 'Atención al Cliente', description: 'Servicio y soporte al cliente' }
]).execute();
const deptIds = await db.select().from(schema.departments).execute();
console.log(`✅ ${deptIds.length} departamentos creados\n`);

// 2. COMPETENCIAS ORGANIZACIONALES
console.log('🎯 Creando competencias organizacionales...');
await db.insert(schema.organizationalCompetencies).values([
  { competencyName: 'Liderazgo', description: 'Capacidad de dirigir equipos', category: 'blanda' },
  { competencyName: 'Comunicación Efectiva', description: 'Habilidad para transmitir ideas claramente', category: 'blanda' },
  { competencyName: 'Trabajo en Equipo', description: 'Colaboración efectiva con otros', category: 'blanda' },
  { competencyName: 'Resolución de Problemas', description: 'Análisis y solución de situaciones complejas', category: 'blanda' },
  { competencyName: 'Adaptabilidad', description: 'Flexibilidad ante cambios', category: 'blanda' },
  { competencyName: 'Programación en Python', description: 'Desarrollo de software en Python', category: 'tecnica' },
  { competencyName: 'Análisis de Datos', description: 'Interpretación de datos y métricas', category: 'tecnica' },
  { competencyName: 'Gestión de Proyectos', description: 'Planificación y ejecución de proyectos', category: 'tecnica' },
  { competencyName: 'Excel Avanzado', description: 'Uso avanzado de hojas de cálculo', category: 'tecnica' },
  { competencyName: 'Contabilidad Financiera', description: 'Conocimientos contables y financieros', category: 'tecnica' },
  { competencyName: 'Atención al Cliente', description: 'Servicio y soporte de calidad', category: 'especifica' },
  { competencyName: 'Ventas Consultivas', description: 'Técnicas de venta basadas en consultoría', category: 'especifica' },
  { competencyName: 'Marketing Digital', description: 'Estrategias de marketing en línea', category: 'especifica' },
  { competencyName: 'Operación de Maquinaria', description: 'Manejo de equipos industriales', category: 'especifica' },
  { competencyName: 'Control de Calidad', description: 'Inspección y aseguramiento de calidad', category: 'especifica' },
  { competencyName: 'Negociación', description: 'Habilidad para negociar acuerdos', category: 'blanda' },
  { competencyName: 'Pensamiento Crítico', description: 'Análisis objetivo de información', category: 'blanda' },
  { competencyName: 'Gestión del Tiempo', description: 'Organización y priorización efectiva', category: 'blanda' },
  { competencyName: 'SQL y Bases de Datos', description: 'Gestión de bases de datos relacionales', category: 'tecnica' },
  { competencyName: 'Diseño Gráfico', description: 'Creación de contenido visual', category: 'tecnica' }
]).execute();
const compIds = await db.select().from(schema.organizationalCompetencies).execute();
console.log(`✅ ${compIds.length} competencias creadas\n`);

// 3. PUESTOS
console.log('💼 Creando puestos...');
await db.insert(schema.positions).values([
  { title: 'Gerente de Recursos Humanos', departmentId: deptIds[0].id, description: 'Dirección del área de RH' },
  { title: 'Especialista en Capacitación', departmentId: deptIds[0].id, description: 'Diseño e implementación de programas de capacitación' },
  { title: 'Analista de Nómina', departmentId: deptIds[0].id, description: 'Procesamiento de nómina y prestaciones' },
  { title: 'Desarrollador Full Stack', departmentId: deptIds[1].id, description: 'Desarrollo de aplicaciones web' },
  { title: 'Analista de Datos', departmentId: deptIds[1].id, description: 'Análisis y visualización de datos' },
  { title: 'Soporte Técnico', departmentId: deptIds[1].id, description: 'Soporte a usuarios finales' },
  { title: 'Gerente de Operaciones', departmentId: deptIds[2].id, description: 'Supervisión de operaciones diarias' },
  { title: 'Coordinador de Logística', departmentId: deptIds[2].id, description: 'Gestión de distribución y almacenamiento' },
  { title: 'Ejecutivo de Ventas', departmentId: deptIds[3].id, description: 'Venta de productos y servicios' },
  { title: 'Gerente de Ventas', departmentId: deptIds[3].id, description: 'Dirección del equipo comercial' },
  { title: 'Especialista en Marketing Digital', departmentId: deptIds[4].id, description: 'Estrategias digitales y redes sociales' },
  { title: 'Diseñador Gráfico', departmentId: deptIds[4].id, description: 'Creación de contenido visual' },
  { title: 'Contador General', departmentId: deptIds[5].id, description: 'Gestión contable y financiera' },
  { title: 'Analista Financiero', departmentId: deptIds[5].id, description: 'Análisis de estados financieros' },
  { title: 'Abogado Corporativo', departmentId: deptIds[6].id, description: 'Asesoría legal y cumplimiento' }
]).execute();
const positionIds = await db.select().from(schema.positions).execute();
console.log(`✅ ${positionIds.length} puestos creados\n`);

// 4. EMPLEADOS
console.log('👥 Creando empleados...');
await db.insert(schema.employees).values([
  { firstName: 'María', lastName: 'González Rodríguez', email: 'maria.gonzalez@empresa.com', curp: 'GORM850315MDFNRD08', phone: '5551234567', personalEmail: 'maria.gonzalez@gmail.com', personalPhone: '5559876543', positionId: positionIds[0].id, departmentId: deptIds[0].id, hireDate: new Date('2020-01-15'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=1' },
  { firstName: 'Juan', lastName: 'Pérez Martínez', email: 'juan.perez@empresa.com', curp: 'PEMJ900520HDFRNN05', phone: '5551234568', personalEmail: 'juan.perez@gmail.com', personalPhone: '5559876544', positionId: positionIds[1].id, departmentId: deptIds[0].id, hireDate: new Date('2019-03-10'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=2' },
  { firstName: 'Ana', lastName: 'López Hernández', email: 'ana.lopez@empresa.com', curp: 'LOHA880712MDFPRN03', phone: '5551234569', personalEmail: 'ana.lopez@gmail.com', personalPhone: '5559876545', positionId: positionIds[2].id, departmentId: deptIds[0].id, hireDate: new Date('2021-06-01'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=3' },
  { firstName: 'Carlos', lastName: 'Ramírez García', email: 'carlos.ramirez@empresa.com', curp: 'RAGC920825HDFMRR01', phone: '5551234570', personalEmail: 'carlos.ramirez@gmail.com', personalPhone: '5559876546', positionId: positionIds[3].id, departmentId: deptIds[1].id, hireDate: new Date('2018-09-15'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=4' },
  { firstName: 'Laura', lastName: 'Sánchez Torres', email: 'laura.sanchez@empresa.com', curp: 'SATL950410MDFNRR07', phone: '5551234571', personalEmail: 'laura.sanchez@gmail.com', personalPhone: '5559876547', positionId: positionIds[4].id, departmentId: deptIds[1].id, hireDate: new Date('2020-11-20'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=5' },
  { firstName: 'Roberto', lastName: 'Fernández Ruiz', email: 'roberto.fernandez@empresa.com', curp: 'FERR870605HDFRNB02', phone: '5551234572', personalEmail: 'roberto.fernandez@gmail.com', personalPhone: '5559876548', positionId: positionIds[5].id, departmentId: deptIds[1].id, hireDate: new Date('2022-02-01'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=6' },
  { firstName: 'Patricia', lastName: 'Morales Jiménez', email: 'patricia.morales@empresa.com', curp: 'MOJP890920MDFRMR04', phone: '5551234573', personalEmail: 'patricia.morales@gmail.com', personalPhone: '5559876549', positionId: positionIds[6].id, departmentId: deptIds[2].id, hireDate: new Date('2017-05-10'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=7' },
  { firstName: 'Diego', lastName: 'Castro Mendoza', email: 'diego.castro@empresa.com', curp: 'CAMD931115HDFSNR06', phone: '5551234574', personalEmail: 'diego.castro@gmail.com', personalPhone: '5559876550', positionId: positionIds[7].id, departmentId: deptIds[2].id, hireDate: new Date('2021-08-15'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=8' },
  { firstName: 'Sofía', lastName: 'Vargas Ortiz', email: 'sofia.vargas@empresa.com', curp: 'VAOS940228MDFRRF09', phone: '5551234575', personalEmail: 'sofia.vargas@gmail.com', personalPhone: '5559876551', positionId: positionIds[8].id, departmentId: deptIds[3].id, hireDate: new Date('2019-12-01'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=9' },
  { firstName: 'Miguel', lastName: 'Herrera Domínguez', email: 'miguel.herrera@empresa.com', curp: 'HEDM910730HDFRMG03', phone: '5551234576', personalEmail: 'miguel.herrera@gmail.com', personalPhone: '5559876552', positionId: positionIds[9].id, departmentId: deptIds[3].id, hireDate: new Date('2016-04-20'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=10' },
  { firstName: 'Gabriela', lastName: 'Reyes Silva', email: 'gabriela.reyes@empresa.com', curp: 'RESG880515MDFRYL05', phone: '5551234577', personalEmail: 'gabriela.reyes@gmail.com', personalPhone: '5559876553', positionId: positionIds[10].id, departmentId: deptIds[4].id, hireDate: new Date('2020-07-10'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=11' },
  { firstName: 'Fernando', lastName: 'Flores Gutiérrez', email: 'fernando.flores@empresa.com', curp: 'FLOGF920901HDFLTG07', phone: '5551234578', personalEmail: 'fernando.flores@gmail.com', personalPhone: '5559876554', positionId: positionIds[11].id, departmentId: deptIds[4].id, hireDate: new Date('2021-10-05'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=12' },
  { firstName: 'Valeria', lastName: 'Medina Cruz', email: 'valeria.medina@empresa.com', curp: 'MECV950320MDFDRV02', phone: '5551234579', personalEmail: 'valeria.medina@gmail.com', personalPhone: '5559876555', positionId: positionIds[12].id, departmentId: deptIds[5].id, hireDate: new Date('2018-01-15'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=13' },
  { firstName: 'Alejandro', lastName: 'Romero Vega', email: 'alejandro.romero@empresa.com', curp: 'ROVA891205HDFMGL01', phone: '5551234580', personalEmail: 'alejandro.romero@gmail.com', personalPhone: '5559876556', positionId: positionIds[13].id, departmentId: deptIds[5].id, hireDate: new Date('2019-09-20'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=14' },
  { firstName: 'Daniela', lastName: 'Aguilar Núñez', email: 'daniela.aguilar@empresa.com', curp: 'AGND930615MDFGLN08', phone: '5551234581', personalEmail: 'daniela.aguilar@gmail.com', personalPhone: '5559876557', positionId: positionIds[14].id, departmentId: deptIds[6].id, hireDate: new Date('2020-03-10'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=15' },
  { firstName: 'Ricardo', lastName: 'Mendoza Paredes', email: 'ricardo.mendoza@empresa.com', curp: 'MEPR870820HDFNRD04', phone: '5551234582', personalEmail: 'ricardo.mendoza@gmail.com', personalPhone: '5559876558', positionId: positionIds[3].id, departmentId: deptIds[1].id, hireDate: new Date('2021-05-15'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=16' },
  { firstName: 'Mariana', lastName: 'Ortega Salazar', email: 'mariana.ortega@empresa.com', curp: 'ORSM940710MDFRSL06', phone: '5551234583', personalEmail: 'mariana.ortega@gmail.com', personalPhone: '5559876559', positionId: positionIds[8].id, departmentId: deptIds[3].id, hireDate: new Date('2019-11-01'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=17' },
  { firstName: 'Javier', lastName: 'Campos Ríos', email: 'javier.campos@empresa.com', curp: 'CARJ910425HDFMPR09', phone: '5551234584', personalEmail: 'javier.campos@gmail.com', personalPhone: '5559876560', positionId: positionIds[6].id, departmentId: deptIds[2].id, hireDate: new Date('2018-07-20'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=18' },
  { firstName: 'Andrea', lastName: 'Navarro Cortés', email: 'andrea.navarro@empresa.com', curp: 'NACA880905MDFVRT03', phone: '5551234585', personalEmail: 'andrea.navarro@gmail.com', personalPhone: '5559876561', positionId: positionIds[10].id, departmentId: deptIds[4].id, hireDate: new Date('2020-09-10'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=19' },
  { firstName: 'Héctor', lastName: 'Guzmán Ibarra', email: 'hector.guzman@empresa.com', curp: 'GUIH920130HDFZBR07', phone: '5551234586', personalEmail: 'hector.guzman@gmail.com', personalPhone: '5559876562', positionId: positionIds[4].id, departmentId: deptIds[1].id, hireDate: new Date('2021-02-15'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=20' },
  { firstName: 'Claudia', lastName: 'Rojas Espinoza', email: 'claudia.rojas@empresa.com', curp: 'ROEC950510MDFJSL01', phone: '5551234587', personalEmail: 'claudia.rojas@gmail.com', personalPhone: '5559876563', positionId: positionIds[1].id, departmentId: deptIds[0].id, hireDate: new Date('2019-06-01'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=21' },
  { firstName: 'Sergio', lastName: 'Delgado Ponce', email: 'sergio.delgado@empresa.com', curp: 'DEPS890815HDFLN02', phone: '5551234588', personalEmail: 'sergio.delgado@gmail.com', personalPhone: '5559876564', positionId: positionIds[7].id, departmentId: deptIds[2].id, hireDate: new Date('2020-04-20'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=22' },
  { firstName: 'Mónica', lastName: 'Fuentes Alvarado', email: 'monica.fuentes@empresa.com', curp: 'FUAM931220MDFLVN05', phone: '5551234589', personalEmail: 'monica.fuentes@gmail.com', personalPhone: '5559876565', positionId: positionIds[12].id, departmentId: deptIds[5].id, hireDate: new Date('2018-10-10'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=23' },
  { firstName: 'Arturo', lastName: 'Chávez Moreno', email: 'arturo.chavez@empresa.com', curp: 'CAMA870605HDFHRR08', phone: '5551234590', personalEmail: 'arturo.chavez@gmail.com', personalPhone: '5559876566', positionId: positionIds[9].id, departmentId: deptIds[3].id, hireDate: new Date('2017-12-01'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=24' },
  { firstName: 'Elena', lastName: 'Ríos Cabrera', email: 'elena.rios@empresa.com', curp: 'RICE940410MDFSBL03', phone: '5551234591', personalEmail: 'elena.rios@gmail.com', personalPhone: '5559876567', positionId: positionIds[11].id, departmentId: deptIds[4].id, hireDate: new Date('2021-07-15'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=25' },
  { firstName: 'Pablo', lastName: 'Vázquez Luna', email: 'pablo.vazquez@empresa.com', curp: 'VALP910925HDFSLN06', phone: '5551234592', personalEmail: 'pablo.vazquez@gmail.com', personalPhone: '5559876568', positionId: positionIds[5].id, departmentId: deptIds[1].id, hireDate: new Date('2022-01-10'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=26' },
  { firstName: 'Lucía', lastName: 'Peña Soto', email: 'lucia.pena@empresa.com', curp: 'PESL880730MDFNST09', phone: '5551234593', personalEmail: 'lucia.pena@gmail.com', personalPhone: '5559876569', positionId: positionIds[2].id, departmentId: deptIds[0].id, hireDate: new Date('2020-08-20'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=27' },
  { firstName: 'Raúl', lastName: 'Cortés Ramos', email: 'raul.cortes@empresa.com', curp: 'CORR920515HDFRMR04', phone: '5551234594', personalEmail: 'raul.cortes@gmail.com', personalPhone: '5559876570', positionId: positionIds[13].id, departmentId: deptIds[5].id, hireDate: new Date('2019-03-15'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=28' },
  { firstName: 'Beatriz', lastName: 'Maldonado Serrano', email: 'beatriz.maldonado@empresa.com', curp: 'MASB950820MDFLRT07', phone: '5551234595', personalEmail: 'beatriz.maldonado@gmail.com', personalPhone: '5559876571', positionId: positionIds[14].id, departmentId: deptIds[6].id, hireDate: new Date('2021-04-10'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=29' },
  { firstName: 'Ernesto', lastName: 'Sandoval Bravo', email: 'ernesto.sandoval@empresa.com', curp: 'SABE871105HDFNRR01', phone: '5551234596', personalEmail: 'ernesto.sandoval@gmail.com', personalPhone: '5559876572', positionId: positionIds[6].id, departmentId: deptIds[2].id, hireDate: new Date('2018-11-20'), status: 'active', profilePicture: 'https://i.pravatar.cc/150?img=30' }
]).execute();
const empIds = await db.select().from(schema.employees).execute();
console.log(`✅ ${empIds.length} empleados creados\n`);

console.log('✅ ¡Población de datos demostrativos completada exitosamente!\n');
await connection.end();
