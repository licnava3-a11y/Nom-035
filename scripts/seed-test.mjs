/**
 * Script de Seed con Datos de Prueba
 * Para ejecutar: pnpm run seed:test
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/nom035_db';

async function seed() {
  console.log('🌱 Iniciando seed de datos de prueba...\n');

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // 0. Limpiar datos de prueba existentes
    console.log('🧹 Limpiando datos de prueba existentes...');
    await connection.execute('DELETE FROM committee_minutes WHERE folio LIKE "MC-%"');
    await connection.execute('DELETE FROM nom035_cases WHERE folio LIKE "CASO-%"');
    await connection.execute('DELETE FROM users WHERE openId LIKE "test-user-%"');
    await connection.execute('DELETE FROM employees WHERE employeeNumber LIKE "EMP0%"');
    await connection.execute('DELETE FROM departments WHERE name IN ("Recursos Humanos", "Tecnología", "Operaciones", "Ventas", "Marketing")');
    console.log('✅ Datos de prueba anteriores eliminados\n');

    // 1. Crear departamentos
    console.log('📁 Creando departamentos...');
    const departments = [
      { name: 'Recursos Humanos', description: 'Gestión de personal y desarrollo organizacional' },
      { name: 'Tecnología', description: 'Desarrollo de software y sistemas' },
      { name: 'Operaciones', description: 'Gestión de operaciones diarias' },
      { name: 'Ventas', description: 'Equipo comercial y atención a clientes' },
      { name: 'Marketing', description: 'Estrategia de marketing y comunicación' },
    ];
    
    const deptIds = [];
    for (const dept of departments) {
      const [result] = await connection.execute(
        'INSERT INTO departments (name, description, isActive, createdAt) VALUES (?, ?, ?, ?)',
        [dept.name, dept.description, true, new Date()]
      );
      deptIds.push(result.insertId);
    }
    console.log(`✅ ${departments.length} departamentos creados\n`);

    // 2. Crear empleados
    console.log('👥 Creando empleados...');
    const employees = [
      { firstName: 'Juan', lastName: 'Pérez', employeeNumber: 'EMP001', email: 'juan.perez@test.com', departmentId: deptIds[0], hireDate: '2020-01-15' },
      { firstName: 'María', lastName: 'García', employeeNumber: 'EMP002', email: 'maria.garcia@test.com', departmentId: deptIds[1], hireDate: '2019-03-20' },
      { firstName: 'Carlos', lastName: 'López', employeeNumber: 'EMP003', email: 'carlos.lopez@test.com', departmentId: deptIds[2], hireDate: '2021-06-10' },
      { firstName: 'Ana', lastName: 'Martínez', employeeNumber: 'EMP004', email: 'ana.martinez@test.com', departmentId: deptIds[3], hireDate: '2018-09-05' },
      { firstName: 'Luis', lastName: 'Rodríguez', employeeNumber: 'EMP005', email: 'luis.rodriguez@test.com', departmentId: deptIds[4], hireDate: '2022-02-28' },
      { firstName: 'Sofia', lastName: 'Hernández', employeeNumber: 'EMP006', email: 'sofia.hernandez@test.com', departmentId: deptIds[0], hireDate: '2020-11-12' },
      { firstName: 'Pedro', lastName: 'González', employeeNumber: 'EMP007', email: 'pedro.gonzalez@test.com', departmentId: deptIds[1], hireDate: '2023-01-08' },
      { firstName: 'Laura', lastName: 'Díaz', employeeNumber: 'EMP008', email: 'laura.diaz@test.com', departmentId: deptIds[2], hireDate: '2021-04-22' },
      { firstName: 'Miguel', lastName: 'Torres', employeeNumber: 'EMP009', email: 'miguel.torres@test.com', departmentId: deptIds[3], hireDate: '2019-07-30' },
      { firstName: 'Carmen', lastName: 'Ramírez', employeeNumber: 'EMP010', email: 'carmen.ramirez@test.com', departmentId: deptIds[4], hireDate: '2020-05-18' },
    ];

    const empIds = [];
    for (const emp of employees) {
      const [result] = await connection.execute(
        'INSERT INTO employees (firstName, lastName, employeeNumber, email, departmentId, hireDate, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [emp.firstName, emp.lastName, emp.employeeNumber, emp.email, emp.departmentId, emp.hireDate, true, new Date()]
      );
      empIds.push(result.insertId);
    }
    console.log(`✅ ${employees.length} empleados creados\n`);

    // 3. Crear usuarios para minutas y casos
    console.log('👤 Creando usuarios...');
    const testUsers = [
      { openId: 'test-user-001', name: 'Juan Pérez', email: 'juan.perez@test.com', role: 'committee_coordinator', departamento: 'Recursos Humanos' },
      { openId: 'test-user-002', name: 'María García', email: 'maria.garcia@test.com', role: 'committee_member', departamento: 'Tecnología' },
    ];

    const userIds = [];
    for (const user of testUsers) {
      const [result] = await connection.execute(
        'INSERT INTO users (openId, name, email, role, departamento, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [user.openId, user.name, user.email, user.role, user.departamento, new Date()]
      );
      userIds.push(result.insertId);
    }
    console.log(`✅ ${testUsers.length} usuarios creados\n`);

    // 4. Crear casos NOM-035
    console.log('📋 Creando casos NOM-035...');
    const cases = [
      { folio: 'CASO-001', employeeId: empIds[3], riskLevel: 'medio', riskCategory: 'Carga de trabajo', description: 'Conflicto entre compañeros en equipo de ventas', identifiedDate: '2026-01-10', deadline: '2026-02-10', status: 'open', source: 'manual' },
      { folio: 'CASO-002', employeeId: empIds[1], riskLevel: 'alto', riskCategory: 'Jornada de trabajo', description: 'Estrés laboral excesivo por carga de trabajo alta', identifiedDate: '2026-01-12', deadline: '2026-02-12', status: 'in_progress', source: 'survey' },
      { folio: 'CASO-003', employeeId: empIds[7], riskLevel: 'alto', riskCategory: 'Violencia laboral', description: 'Reporte de conducta inapropiada y acoso verbal', identifiedDate: '2026-01-15', deadline: '2026-02-15', status: 'open', source: 'manual' },
      { folio: 'CASO-004', employeeId: empIds[2], riskLevel: 'medio', riskCategory: 'Liderazgo negativo', description: 'Ambiente de trabajo tenso en operaciones', identifiedDate: '2026-01-18', deadline: '2026-02-18', status: 'in_progress', source: 'sentiment_analysis_auto' },
      { folio: 'CASO-005', employeeId: empIds[8], riskLevel: 'bajo', riskCategory: 'Falta de control', description: 'Desmotivación por falta de reconocimiento', identifiedDate: '2026-01-20', deadline: '2026-02-20', status: 'open', source: 'manual' },
      { folio: 'CASO-006', employeeId: empIds[6], riskLevel: 'medio', riskCategory: 'Jornada de trabajo', description: 'Jornadas laborales extensas sin compensación', identifiedDate: '2025-12-15', deadline: '2026-01-15', status: 'closed', source: 'survey' },
      { folio: 'CASO-007', employeeId: empIds[5], riskLevel: 'alto', riskCategory: 'Violencia laboral', description: 'Discriminación por edad hacia empleado senior', identifiedDate: '2026-01-22', deadline: '2026-02-22', status: 'open', source: 'manual' },
      { folio: 'CASO-008', employeeId: empIds[9], riskLevel: 'bajo', riskCategory: 'Falta de control', description: 'Necesidad de capacitación en nuevas herramientas', identifiedDate: '2026-01-25', deadline: '2026-02-25', status: 'in_progress', source: 'survey' },
      { folio: 'CASO-009', employeeId: empIds[4], riskLevel: 'medio', riskCategory: 'Liderazgo negativo', description: 'Comunicación deficiente y falta de claridad', identifiedDate: '2026-01-28', deadline: '2026-02-28', status: 'open', source: 'sentiment_analysis_auto' },
      { folio: 'CASO-010', employeeId: empIds[3], riskLevel: 'medio', riskCategory: 'Carga de trabajo', description: 'Preocupación por estabilidad laboral', identifiedDate: '2026-02-01', deadline: '2026-03-01', status: 'open', source: 'manual' },
    ];

    for (const caseData of cases) {
      await connection.execute(
        'INSERT INTO nom035_cases (folio, employee_id, risk_level, risk_category, description, identified_date, deadline, status, source, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [caseData.folio, caseData.employeeId, caseData.riskLevel, caseData.riskCategory, caseData.description, caseData.identifiedDate, caseData.deadline, caseData.status, caseData.source, userIds[0], new Date()]
      );
    }
    console.log(`✅ ${cases.length} casos NOM-035 creados\n`);

    // 5. Crear minutas del comité
    console.log('📝 Creando minutas del comité...');
    const minutes = [
      { folio: 'MC-001/2026', sessionNumber: 1, meetingDate: '2026-01-15', meetingTime: '10:00', meetingPlace: 'Sala de Juntas A', meetingType: 'ordinaria', status: 'finalizada', objective: 'Revisión de casos abiertos y plan de acción 2026' },
      { folio: 'MC-002/2025', sessionNumber: 12, meetingDate: '2025-12-10', meetingTime: '14:00', meetingPlace: 'Sala de Juntas B', meetingType: 'ordinaria', status: 'finalizada', objective: 'Evaluación anual y resultados de encuestas' },
      { folio: 'MC-003/2025', sessionNumber: 11, meetingDate: '2025-11-20', meetingTime: '09:30', meetingPlace: 'Sala de Juntas A', meetingType: 'extraordinaria', status: 'finalizada', objective: 'Capacitación en NOM-035 y actualización de políticas' },
      { folio: 'MC-004/2025', sessionNumber: 10, meetingDate: '2025-10-18', meetingTime: '11:00', meetingPlace: 'Sala de Juntas C', meetingType: 'ordinaria', status: 'finalizada', objective: 'Análisis de riesgos psicosociales identificados' },
      { folio: 'MC-005/2025', sessionNumber: 9, meetingDate: '2025-09-12', meetingTime: '15:30', meetingPlace: 'Sala de Juntas A', meetingType: 'seguimiento', status: 'finalizada', objective: 'Seguimiento de casos cerrados y lecciones aprendidas' },
    ];

    for (const minute of minutes) {
      await connection.execute(
        'INSERT INTO committee_minutes (folio, session_number, meeting_date, meeting_time, meeting_place, meeting_type, status, objective, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [minute.folio, minute.sessionNumber, minute.meetingDate, minute.meetingTime, minute.meetingPlace, minute.meetingType, minute.status, minute.objective, userIds[0], new Date()]
      );
    }
    console.log(`✅ ${minutes.length} minutas del comité creadas\n`);

    console.log('✅ ¡Seed completado exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`   - ${departments.length} departamentos`);
    console.log(`   - ${employees.length} empleados`);
    console.log(`   - ${testUsers.length} usuarios`);
    console.log(`   - ${cases.length} casos NOM-035`);
    console.log(`   - ${minutes.length} minutas del comité\n`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
