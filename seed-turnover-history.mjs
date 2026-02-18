/**
 * Script de Seed para employee_turnover_history
 * Inserta 15 empleados ficticios que rotaron (mix de alto/bajo riesgo)
 * Para probar el dashboard de correlación predictiva
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users, employeeTurnoverHistory } from "./drizzle/schema.ts";

async function seedTurnoverHistory() {
  console.log("🌱 Iniciando seed de employee_turnover_history...");

  // Conectar a la base de datos
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { mode: "default" });

  // Obtener IDs de empleados existentes
  const employees = await db.select().from(users).limit(15);

  if (employees.length < 15) {
    console.error("❌ No hay suficientes empleados en la base de datos. Se necesitan al menos 15.");
    await connection.end();
    return;
  }

  // Datos de prueba: 15 empleados que rotaron
  const turnoverData = [
    // Alto riesgo + Rotaron (Verdaderos Positivos)
    {
      userId: employees[0].id,
      exitDate: new Date("2025-12-15"),
      exitReason: "voluntary",
      wasHighRisk: true,
      riskScoreAtExit: 85,
    },
    {
      userId: employees[1].id,
      exitDate: new Date("2025-11-20"),
      exitReason: "voluntary",
      wasHighRisk: true,
      riskScoreAtExit: 92,
    },
    {
      userId: employees[2].id,
      exitDate: new Date("2025-10-10"),
      exitReason: "voluntary",
      wasHighRisk: true,
      riskScoreAtExit: 78,
    },
    {
      userId: employees[3].id,
      exitDate: new Date("2025-09-05"),
      exitReason: "involuntary",
      wasHighRisk: true,
      riskScoreAtExit: 88,
    },
    {
      userId: employees[4].id,
      exitDate: new Date("2025-08-18"),
      exitReason: "voluntary",
      wasHighRisk: true,
      riskScoreAtExit: 95,
    },

    // Bajo riesgo + Rotaron (Falsos Negativos)
    {
      userId: employees[5].id,
      exitDate: new Date("2025-12-01"),
      exitReason: "voluntary",
      wasHighRisk: false,
      riskScoreAtExit: 35,
    },
    {
      userId: employees[6].id,
      exitDate: new Date("2025-11-10"),
      exitReason: "retirement",
      wasHighRisk: false,
      riskScoreAtExit: 20,
    },
    {
      userId: employees[7].id,
      exitDate: new Date("2025-10-22"),
      exitReason: "voluntary",
      wasHighRisk: false,
      riskScoreAtExit: 42,
    },
    {
      userId: employees[8].id,
      exitDate: new Date("2025-09-15"),
      exitReason: "involuntary",
      wasHighRisk: false,
      riskScoreAtExit: 38,
    },

    // Mix adicional
    {
      userId: employees[9].id,
      exitDate: new Date("2025-08-05"),
      exitReason: "voluntary",
      wasHighRisk: true,
      riskScoreAtExit: 82,
    },
    {
      userId: employees[10].id,
      exitDate: new Date("2025-07-20"),
      exitReason: "voluntary",
      wasHighRisk: false,
      riskScoreAtExit: 45,
    },
    {
      userId: employees[11].id,
      exitDate: new Date("2025-07-10"),
      exitReason: "voluntary",
      wasHighRisk: true,
      riskScoreAtExit: 90,
    },
    {
      userId: employees[12].id,
      exitDate: new Date("2025-06-25"),
      exitReason: "retirement",
      wasHighRisk: false,
      riskScoreAtExit: 25,
    },
    {
      userId: employees[13].id,
      exitDate: new Date("2025-06-15"),
      exitReason: "voluntary",
      wasHighRisk: true,
      riskScoreAtExit: 87,
    },
    {
      userId: employees[14].id,
      exitDate: new Date("2025-06-01"),
      exitReason: "involuntary",
      wasHighRisk: false,
      riskScoreAtExit: 40,
    },
  ];

  try {
    // Insertar datos de rotación
    for (const turnover of turnoverData) {
      await db.insert(employeeTurnoverHistory).values(turnover);
      console.log(`✅ Insertado: ${employees.find((e) => e.id === turnover.userId)?.nombre} - ${turnover.exitReason}`);
    }

    console.log(`\n🎉 Seed completado: ${turnoverData.length} registros insertados en employee_turnover_history`);
    console.log(`   - Verdaderos Positivos (Alto riesgo + Rotaron): 7`);
    console.log(`   - Falsos Negativos (Bajo riesgo + Rotaron): 8`);
  } catch (error) {
    console.error("❌ Error al insertar datos:", error);
  } finally {
    await connection.end();
  }
}

// Ejecutar seed
seedTurnoverHistory();
