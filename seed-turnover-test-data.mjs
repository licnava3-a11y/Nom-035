/**
 * Script para generar datos de prueba del sistema de rotación
 * Crea empleados con diferentes estados y eventos de terminación
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { employees, employeeHistory } from './drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log('🌱 Iniciando seed de datos de prueba para rotación...\n');

// Motivos de terminación según la NOM
const terminationReasons = [
  'Renuncia voluntaria',
  'Despido justificado',
  'Fin de contrato',
  'Mutuo acuerdo',
  'Jubilación',
  'Abandono de empleo',
  'Incapacidad permanente'
];

// Departamentos de prueba
const departments = ['Recursos Humanos', 'Ventas', 'Operaciones', 'TI', 'Finanzas'];

try {
  // 1. Crear 15 empleados de prueba (algunos activos, algunos terminados)
  console.log('📋 Creando empleados de prueba...');
  
  const testEmployees = [];
  for (let i = 1; i <= 15; i++) {
    const isTerminated = i <= 10; // Primeros 10 están terminados
    const hireDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    
    const employee = {
      firstName: `Empleado${i}`,
      lastName: `Prueba${i}`,
      curp: `PRXX${String(i).padStart(6, '0')}XXXXXX${String(i).padStart(2, '0')}`,
      email: `empleado${i}@prueba.com`,
      phone: `55${String(i).padStart(8, '0')}`,
      hireDate: hireDate.toISOString().split('T')[0],
      department: departments[Math.floor(Math.random() * departments.length)],
      position: i % 3 === 0 ? 'Gerente' : i % 2 === 0 ? 'Supervisor' : 'Operador',
      isActive: !isTerminated,
      reentryCount: i <= 3 ? i : 0, // Primeros 3 tienen reingresos
      previousHireDates: i <= 3 ? JSON.stringify([
        new Date(2022, i, 15).toISOString().split('T')[0],
        new Date(2023, i + 3, 20).toISOString().split('T')[0]
      ]) : null
    };
    
    testEmployees.push(employee);
  }
  
  const insertedEmployees = await db.insert(employees).values(testEmployees);
  console.log(`✅ ${testEmployees.length} empleados creados\n`);
  
  // 2. Crear eventos de terminación para los empleados dados de baja
  console.log('📝 Creando eventos de terminación...');
  
  // Obtener IDs de los empleados insertados
  const allEmployees = await db.select().from(employees).where(employees.isActive.eq(false));
  
  const terminationEvents = [];
  for (const emp of allEmployees) {
    const hireDate = new Date(emp.hireDate);
    const terminationDate = new Date(
      2025,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    );
    
    // Asegurar que la fecha de terminación sea después de la contratación
    if (terminationDate < hireDate) {
      terminationDate.setFullYear(hireDate.getFullYear() + 1);
    }
    
    const reason = terminationReasons[Math.floor(Math.random() * terminationReasons.length)];
    
    terminationEvents.push({
      employeeId: emp.id,
      eventType: 'termination',
      eventDate: terminationDate.toISOString().split('T')[0],
      description: `Terminación por: ${reason}`,
      metadata: JSON.stringify({
        reason,
        department: emp.department,
        position: emp.position,
        evidenceUrls: []
      }),
      createdBy: 'system-seed'
    });
  }
  
  if (terminationEvents.length > 0) {
    await db.insert(employeeHistory).values(terminationEvents);
    console.log(`✅ ${terminationEvents.length} eventos de terminación creados\n`);
  }
  
  // 3. Crear algunos eventos de contratación para empleados activos
  console.log('📝 Creando eventos de contratación...');
  
  const activeEmployees = await db.select().from(employees).where(employees.isActive.eq(true));
  
  const hireEvents = activeEmployees.map(emp => ({
    employeeId: emp.id,
    eventType: 'hire',
    eventDate: emp.hireDate,
    description: `Contratación como ${emp.position}`,
    metadata: JSON.stringify({
      department: emp.department,
      position: emp.position,
      isReentry: emp.reentryCount > 0
    }),
    createdBy: 'system-seed'
  }));
  
  if (hireEvents.length > 0) {
    await db.insert(employeeHistory).values(hireEvents);
    console.log(`✅ ${hireEvents.length} eventos de contratación creados\n`);
  }
  
  // 4. Resumen de datos creados
  console.log('📊 Resumen de datos de prueba:');
  console.log(`   - Total empleados: ${testEmployees.length}`);
  console.log(`   - Empleados activos: ${activeEmployees.length}`);
  console.log(`   - Empleados terminados: ${allEmployees.length}`);
  console.log(`   - Empleados con reingresos: ${testEmployees.filter(e => e.reentryCount > 0).length}`);
  console.log(`   - Eventos de terminación: ${terminationEvents.length}`);
  console.log(`   - Eventos de contratación: ${hireEvents.length}\n`);
  
  console.log('✨ Seed completado exitosamente!');
  
} catch (error) {
  console.error('❌ Error durante el seed:', error);
  process.exit(1);
} finally {
  await connection.end();
}
