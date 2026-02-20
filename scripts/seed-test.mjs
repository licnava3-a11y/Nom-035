/**
 * Script de Seed con Datos de Prueba
 * Para ejecutar: node scripts/seed-test.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/nom035_db';

async function seed() {
  console.log('🌱 Iniciando seed de datos de prueba...\n');

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // 1. Crear departamentos
    console.log('📁 Creando departamentos...');
    const departments = [
      { name: 'Recursos Humanos', description: 'Gestión de personal', isActive: true, createdAt: new Date() },
      { name: 'Tecnología', description: 'Desarrollo y sistemas', isActive: true, createdAt: new Date() },
      { name: 'Operaciones', description: 'Operaciones diarias', isActive: true, createdAt: new Date() },
      { name: 'Ventas', description: 'Equipo comercial', isActive: true, createdAt: new Date() },
      { name: 'Marketing', description: 'Estrategia y comunicación', isActive: true, createdAt: new Date() },
    ];
    
    for (const dept of departments) {
      await connection.execute(
        'INSERT INTO departments (name, description, is_active, created_at) VALUES (?, ?, ?, ?)',
        [dept.name, dept.description, dept.isActive, dept.createdAt]
      );
    }
    console.log(`✅ ${departments.length} departamentos creados\n`);

    // 2. Crear empleados
    console.log('👥 Creando empleados...');
    const employees = [
      { firstName: 'Juan', lastName: 'Pérez', employeeNumber: 'EMP001', email: 'juan.perez@test.com', departmentId: 1, position: 'Gerente de RRHH', status: 'active' },
      { firstName: 'María', lastName: 'García', employeeNumber: 'EMP002', email: 'maria.garcia@test.com', departmentId: 2, position: 'Desarrollador Senior', status: 'active' },
      { firstName: 'Carlos', lastName: 'López', employeeNumber: 'EMP003', email: 'carlos.lopez@test.com', departmentId: 3, position: 'Supervisor de Operaciones', status: 'active' },
      { firstName: 'Ana', lastName: 'Martínez', employeeNumber: 'EMP004', email: 'ana.martinez@test.com', departmentId: 4, position: 'Ejecutivo de Ventas', status: 'active' },
      { firstName: 'Luis', lastName: 'Rodríguez', employeeNumber: 'EMP005', email: 'luis.rodriguez@test.com', departmentId: 5, position: 'Coordinador de Marketing', status: 'active' },
      { firstName: 'Sofia', lastName: 'Hernández', employeeNumber: 'EMP006', email: 'sofia.hernandez@test.com', departmentId: 1, position: 'Analista de RRHH', status: 'active' },
      { firstName: 'Pedro', lastName: 'González', employeeNumber: 'EMP007', email: 'pedro.gonzalez@test.com', departmentId: 2, position: 'Desarrollador Junior', status: 'active' },
      { firstName: 'Laura', lastName: 'Díaz', employeeNumber: 'EMP008', email: 'laura.diaz@test.com', departmentId: 3, position: 'Asistente de Operaciones', status: 'active' },
      { firstName: 'Miguel', lastName: 'Torres', employeeNumber: 'EMP009', email: 'miguel.torres@test.com', departmentId: 4, position: 'Vendedor', status: 'active' },
      { firstName: 'Carmen', lastName: 'Ramírez', employeeNumber: 'EMP010', email: 'carmen.ramirez@test.com', departmentId: 5, position: 'Diseñadora Gráfica', status: 'active' },
    ];

    for (const emp of employees) {
      await connection.execute(
        'INSERT INTO employees (first_name, last_name, employee_number, email, department_id, position, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [emp.firstName, emp.lastName, emp.employeeNumber, emp.email, emp.departmentId, emp.position, emp.status, new Date()]
      );
    }
    console.log(`✅ ${employees.length} empleados creados\n`);

    // 3. Crear casos NOM-035
    console.log('📋 Creando casos NOM-035...');
    const cases = [
      { title: 'Conflicto entre compañeros', description: 'Desacuerdo en equipo de ventas', status: 'open', priority: 'medium', reportedById: 4, assignedToId: 1 },
      { title: 'Estrés laboral excesivo', description: 'Carga de trabajo alta en desarrollo', status: 'in_progress', priority: 'high', reportedById: 2, assignedToId: 1 },
      { title: 'Acoso verbal', description: 'Reporte de conducta inapropiada', status: 'open', priority: 'high', reportedById: 8, assignedToId: 1 },
      { title: 'Ambiente de trabajo tenso', description: 'Clima laboral negativo en operaciones', status: 'in_progress', priority: 'medium', reportedById: 3, assignedToId: 1 },
      { title: 'Falta de reconocimiento', description: 'Desmotivación por falta de feedback', status: 'open', priority: 'low', reportedById: 9, assignedToId: 1 },
      { title: 'Jornadas laborales extensas', description: 'Horas extras frecuentes sin compensación', status: 'closed', priority: 'medium', reportedById: 7, assignedToId: 1 },
      { title: 'Discriminación por edad', description: 'Trato diferenciado a empleado senior', status: 'open', priority: 'high', reportedById: 6, assignedToId: 1 },
      { title: 'Falta de capacitación', description: 'Necesidad de entrenamiento en nuevas herramientas', status: 'in_progress', priority: 'low', reportedById: 10, assignedToId: 1 },
      { title: 'Comunicación deficiente', description: 'Falta de claridad en instrucciones', status: 'open', priority: 'medium', reportedById: 5, assignedToId: 1 },
      { title: 'Inseguridad en el trabajo', description: 'Preocupación por estabilidad laboral', status: 'open', priority: 'medium', reportedById: 4, assignedToId: 1 },
    ];

    for (const caseData of cases) {
      await connection.execute(
        'INSERT INTO nom035_cases (title, description, status, priority, reported_by_id, assigned_to_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [caseData.title, caseData.description, caseData.status, caseData.priority, caseData.reportedById, caseData.assignedToId, new Date()]
      );
    }
    console.log(`✅ ${cases.length} casos NOM-035 creados\n`);

    // 4. Crear minutas del comité
    console.log('📝 Creando minutas del comité...');
    const minutes = [
      { meetingDate: new Date('2026-01-15'), attendees: 'Juan Pérez, María García, Carlos López', topics: 'Revisión de casos abiertos, Plan de acción 2026', agreements: 'Implementar programa de bienestar', nextMeetingDate: new Date('2026-02-15') },
      { meetingDate: new Date('2025-12-10'), attendees: 'Juan Pérez, Ana Martínez, Luis Rodríguez', topics: 'Evaluación anual, Resultados de encuestas', agreements: 'Mejorar comunicación interna', nextMeetingDate: new Date('2026-01-15') },
      { meetingDate: new Date('2025-11-20'), attendees: 'Juan Pérez, María García, Sofia Hernández', topics: 'Capacitación en NOM-035, Actualización de políticas', agreements: 'Programar talleres trimestrales', nextMeetingDate: new Date('2025-12-10') },
      { meetingDate: new Date('2025-10-18'), attendees: 'Juan Pérez, Carlos López, Pedro González', topics: 'Análisis de riesgos psicosociales', agreements: 'Realizar evaluación semestral', nextMeetingDate: new Date('2025-11-20') },
      { meetingDate: new Date('2025-09-12'), attendees: 'Juan Pérez, Laura Díaz, Miguel Torres', topics: 'Seguimiento de casos cerrados', agreements: 'Documentar lecciones aprendidas', nextMeetingDate: new Date('2025-10-18') },
    ];

    for (const minute of minutes) {
      await connection.execute(
        'INSERT INTO committee_minutes (meeting_date, attendees, topics, agreements, next_meeting_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [minute.meetingDate, minute.attendees, minute.topics, minute.agreements, minute.nextMeetingDate, new Date()]
      );
    }
    console.log(`✅ ${minutes.length} minutas del comité creadas\n`);

    console.log('✅ ¡Seed completado exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`   - ${departments.length} departamentos`);
    console.log(`   - ${employees.length} empleados`);
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
