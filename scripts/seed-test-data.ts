/**
 * Script para generar datos de prueba completos
 * Incluye: empleados, puestos, competencias, perfiles de puesto
 */

import { getDb } from "../server/db";
import {
  employees,
  jobPositions,
  employeeCompetencies,
  jobProfiles,
} from "../drizzle/schema";

async function seedTestData() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos");
    process.exit(1);
  }

  console.log("🌱 Iniciando generación de datos de prueba...\n");

  try {
    // 1. Crear puestos de trabajo
    console.log("📋 Creando puestos de trabajo...");
    const positions = [
      {
        positionName: "Ingeniero de Software Senior",
        department: "Tecnología",
        description:
          "Desarrollo y mantenimiento de sistemas de software empresarial",
        createdBy: 1, // Admin user
      },
      {
        positionName: "Analista de Recursos Humanos",
        department: "Recursos Humanos",
        description:
          "Gestión de personal, reclutamiento y desarrollo organizacional",
        createdBy: 1,
      },
      {
        positionName: "Coordinador de Producción",
        department: "Producción",
        description: "Supervisión de procesos productivos y control de calidad",
        createdBy: 1,
      },
    ];

    const insertedPositions = [];
    for (const pos of positions) {
      const [inserted] = await db
        .insert(jobPositions)
        .values(pos)
        .$returningId();
      insertedPositions.push({ ...pos, id: inserted.id });
      console.log(`  ✅ ${pos.positionName}`);
    }

    // 2. Crear perfiles de puesto con competencias requeridas
    console.log("\n🎯 Creando perfiles de puesto...");
    const profiles = [
      // Ingeniero de Software Senior
      {
        positionId: insertedPositions[0].id,
        competencyName: "Programación Avanzada",
        competencyType: "tecnica" as const,
        requiredLevel: "experto" as const,
      },
      {
        positionId: insertedPositions[0].id,
        competencyName: "Arquitectura de Software",
        competencyType: "tecnica" as const,
        requiredLevel: "experto" as const,
      },
      {
        positionId: insertedPositions[0].id,
        competencyName: "Trabajo en Equipo",
        competencyType: "transversal" as const,
        requiredLevel: "avanzado" as const,
      },
      {
        positionId: insertedPositions[0].id,
        competencyName: "Metodologías Ágiles",
        competencyType: "conocimiento" as const,
        requiredLevel: "avanzado" as const,
      },
      // Analista de Recursos Humanos
      {
        positionId: insertedPositions[1].id,
        competencyName: "Gestión de Talento",
        competencyType: "tecnica" as const,
        requiredLevel: "experto" as const,
      },
      {
        positionId: insertedPositions[1].id,
        competencyName: "Comunicación Efectiva",
        competencyType: "transversal" as const,
        requiredLevel: "experto" as const,
      },
      {
        positionId: insertedPositions[1].id,
        competencyName: "Legislación Laboral",
        competencyType: "conocimiento" as const,
        requiredLevel: "avanzado" as const,
      },
      // Coordinador de Producción
      {
        positionId: insertedPositions[2].id,
        competencyName: "Control de Calidad",
        competencyType: "tecnica" as const,
        requiredLevel: "experto" as const,
      },
      {
        positionId: insertedPositions[2].id,
        competencyName: "Liderazgo",
        competencyType: "transversal" as const,
        requiredLevel: "avanzado" as const,
      },
      {
        positionId: insertedPositions[2].id,
        competencyName: "Procesos de Manufactura",
        competencyType: "conocimiento" as const,
        requiredLevel: "avanzado" as const,
      },
    ];

    for (const profile of profiles) {
      await db.insert(jobProfiles).values(profile);
      console.log(
        `  ✅ ${insertedPositions.find(p => p.id === profile.positionId)?.positionName}: ${profile.competencyName}`
      );
    }

    // 3. Actualizar empleado de prueba existente
    console.log("\n👤 Actualizando empleado de prueba...");
    const { eq } = await import("drizzle-orm");

    await db
      .update(employees)
      .set({
        position: "Ingeniero de Software Senior",
        department: "Tecnología",
      })
      .where(eq(employees.email, "test.employee@example.com"));

    console.log("  ✅ Test Employee actualizado");

    // 4. Agregar competencias al empleado de prueba
    console.log("\n💪 Agregando competencias al empleado...");
    const [testEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.email, "test.employee@example.com"))
      .limit(1);

    if (testEmployee) {
      const employeeComps = [
        {
          employeeId: testEmployee.id,
          competencyName: "Programación Avanzada",
          competencyType: "tecnica" as const,
          currentLevel: "avanzado" as const,
        },
        {
          employeeId: testEmployee.id,
          competencyName: "Arquitectura de Software",
          competencyType: "tecnica" as const,
          currentLevel: "intermedio" as const,
        },
        {
          employeeId: testEmployee.id,
          competencyName: "Trabajo en Equipo",
          competencyType: "transversal" as const,
          currentLevel: "avanzado" as const,
        },
        {
          employeeId: testEmployee.id,
          competencyName: "Metodologías Ágiles",
          competencyType: "conocimiento" as const,
          currentLevel: "basico" as const,
        },
      ];

      for (const comp of employeeComps) {
        await db.insert(employeeCompetencies).values(comp);
        console.log(`  ✅ ${comp.competencyName}: ${comp.currentLevel}`);
      }
    }

    // 5. Crear empleados adicionales
    console.log("\n👥 Creando empleados adicionales...");
    const additionalEmployees = [
      {
        firstName: "María",
        lastName: "González López",
        email: "maria.gonzalez@example.com",
        position: "Analista de Recursos Humanos",
        department: "Recursos Humanos",
        phone: "+52 614 234 5678",
        curp: "GOLM850315MCHNNR08",
        employeeNumber: "EMP-RH-002",
        isActive: true,
      },
      {
        firstName: "Carlos",
        lastName: "Ramírez Sánchez",
        email: "carlos.ramirez@example.com",
        position: "Coordinador de Producción",
        department: "Producción",
        phone: "+52 614 345 6789",
        curp: "RASC900520HCHMMR05",
        employeeNumber: "EMP-PROD-003",
        isActive: true,
      },
      {
        firstName: "Ana",
        lastName: "Martínez Pérez",
        email: "ana.martinez@example.com",
        position: "Ingeniero de Software Senior",
        department: "Tecnología",
        phone: "+52 614 456 7890",
        curp: "MAPA920710MCHRRN03",
        employeeNumber: "EMP-TEC-004",
        isActive: true,
      },
    ];

    const insertedEmployees = [];
    for (const emp of additionalEmployees) {
      const [inserted] = await db.insert(employees).values(emp).$returningId();
      insertedEmployees.push({ ...emp, id: inserted.id });
      console.log(`  ✅ ${emp.firstName} ${emp.lastName} - ${emp.position}`);
    }

    // 6. Agregar competencias a empleados adicionales
    console.log("\n💪 Agregando competencias a empleados adicionales...");

    // María González (RRHH)
    const mariaComps = [
      {
        employeeId: insertedEmployees[0].id,
        competencyName: "Gestión de Talento",
        competencyType: "tecnica" as const,
        currentLevel: "avanzado" as const,
      },
      {
        employeeId: insertedEmployees[0].id,
        competencyName: "Comunicación Efectiva",
        competencyType: "transversal" as const,
        currentLevel: "experto" as const,
      },
      {
        employeeId: insertedEmployees[0].id,
        competencyName: "Legislación Laboral",
        competencyType: "conocimiento" as const,
        currentLevel: "intermedio" as const,
      },
    ];

    for (const comp of mariaComps) {
      await db.insert(employeeCompetencies).values(comp);
    }
    console.log(`  ✅ María González: ${mariaComps.length} competencias`);

    // Carlos Ramírez (Producción)
    const carlosComps = [
      {
        employeeId: insertedEmployees[1].id,
        competencyName: "Control de Calidad",
        competencyType: "tecnica" as const,
        currentLevel: "avanzado" as const,
      },
      {
        employeeId: insertedEmployees[1].id,
        competencyName: "Liderazgo",
        competencyType: "transversal" as const,
        currentLevel: "intermedio" as const,
      },
      {
        employeeId: insertedEmployees[1].id,
        competencyName: "Procesos de Manufactura",
        competencyType: "conocimiento" as const,
        currentLevel: "avanzado" as const,
      },
    ];

    for (const comp of carlosComps) {
      await db.insert(employeeCompetencies).values(comp);
    }
    console.log(`  ✅ Carlos Ramírez: ${carlosComps.length} competencias`);

    // Ana Martínez (Tecnología)
    const anaComps = [
      {
        employeeId: insertedEmployees[2].id,
        competencyName: "Programación Avanzada",
        competencyType: "tecnica" as const,
        currentLevel: "experto" as const,
      },
      {
        employeeId: insertedEmployees[2].id,
        competencyName: "Arquitectura de Software",
        competencyType: "tecnica" as const,
        currentLevel: "avanzado" as const,
      },
      {
        employeeId: insertedEmployees[2].id,
        competencyName: "Trabajo en Equipo",
        competencyType: "transversal" as const,
        currentLevel: "experto" as const,
      },
      {
        employeeId: insertedEmployees[2].id,
        competencyName: "Metodologías Ágiles",
        competencyType: "conocimiento" as const,
        currentLevel: "avanzado" as const,
      },
    ];

    for (const comp of anaComps) {
      await db.insert(employeeCompetencies).values(comp);
    }
    console.log(`  ✅ Ana Martínez: ${anaComps.length} competencias`);

    console.log("\n✨ Datos de prueba generados exitosamente!\n");
    console.log("📊 Resumen:");
    console.log(`  - Puestos creados: ${positions.length}`);
    console.log(`  - Perfiles de puesto: ${profiles.length}`);
    console.log(`  - Empleados actualizados: 1`);
    console.log(`  - Empleados creados: ${additionalEmployees.length}`);
    console.log(
      `  - Total de competencias asignadas: ${4 + mariaComps.length + carlosComps.length + anaComps.length}`
    );
    console.log(
      "\n✅ Ahora puedes probar las funcionalidades de DNC y perfiles de puesto"
    );

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error al generar datos de prueba:", error);
    process.exit(1);
  }
}

seedTestData();
