/**
 * Script para generar respuestas de encuestas NOM-035 con datos de prueba
 * Correlaciona con departamentos reales de la tabla users
 */

import { getDb } from "../server/db";
import { surveyResponses, surveyPeriods, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function seedSurveyResponses() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos");
    process.exit(1);
  }

  console.log(
    "🌱 Iniciando generación de respuestas de encuestas NOM-035...\n"
  );

  try {
    // 1. Obtener o crear periodo activo
    console.log("📅 Verificando periodo activo...");
    let [activePeriod] = await db
      .select()
      .from(surveyPeriods)
      .where(eq(surveyPeriods.status, "active"))
      .limit(1);

    if (!activePeriod) {
      console.log("  ⚠️  No hay periodo activo, creando uno...");
      const [newPeriod] = await db
        .insert(surveyPeriods)
        .values({
          name: "Periodo de Prueba 2026",
          surveyType: "guia_i",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
          status: "active",
          createdBy: 1,
        })
        .$returningId();

      [activePeriod] = await db
        .select()
        .from(surveyPeriods)
        .where(eq(surveyPeriods.id, newPeriod.id))
        .limit(1);
    }

    console.log(
      `  ✅ Periodo activo: ${activePeriod.name} (ID: ${activePeriod.id})`
    );

    // 2. Obtener usuarios con departamentos
    console.log("\n👥 Obteniendo usuarios...");
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        departamento: users.departamento,
      })
      .from(users)
      .limit(20);

    console.log(`  ✅ ${allUsers.length} usuarios encontrados`);

    // 3. Definir departamentos para asignar
    const departamentos = [
      "Recursos Humanos",
      "Tecnología",
      "Producción",
      "Ventas",
      "Administración",
    ];

    // 4. Actualizar usuarios con departamentos si no tienen
    console.log("\n🏢 Asignando departamentos a usuarios...");
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      if (!user.departamento) {
        const dept = departamentos[i % departamentos.length];
        await db
          .update(users)
          .set({ departamento: dept })
          .where(eq(users.id, user.id));
        user.departamento = dept;
        console.log(`  ✅ ${user.name}: ${dept}`);
      }
    }

    // 5. Generar respuestas de Guía I (10 respuestas)
    console.log("\n📝 Generando respuestas de Guía I...");
    const guiaIResponses = [];

    for (let i = 0; i < Math.min(10, allUsers.length); i++) {
      const user = allUsers[i];
      const riskLevel = ["nulo", "bajo", "medio", "alto", "muy_alto"][i % 5];
      const score = [0, 25, 50, 75, 95][i % 5];

      const results = {
        surveyType: "guia_i",
        riskLevel: riskLevel,
        totalScore: score,
        department: user.departamento,
        completedDate: new Date().toISOString(),
        categories: {
          acontecimientos_traumaticos: {
            score: score,
            level: riskLevel,
          },
        },
      };

      const token = `test-token-guia-i-${i}-${Date.now()}`;

      guiaIResponses.push({
        surveyId: 1, // Guía I
        userId: user.id,
        periodId: activePeriod.id,
        token: token,
        results: JSON.stringify(results),
        completedAt: new Date(),
        startedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutos antes
      });
    }

    for (const response of guiaIResponses) {
      await db.insert(surveyResponses).values(response);
    }
    console.log(`  ✅ ${guiaIResponses.length} respuestas de Guía I generadas`);

    // 6. Generar respuestas de Guía II (5 respuestas)
    console.log("\n📝 Generando respuestas de Guía II...");
    const guiaIIResponses = [];

    for (let i = 10; i < Math.min(15, allUsers.length); i++) {
      const user = allUsers[i];
      const riskLevel = ["bajo", "medio", "alto"][i % 3];
      const score = [30, 60, 85][i % 3];

      const results = {
        surveyType: "guia_ii",
        riskLevel: riskLevel,
        totalScore: score,
        department: user.departamento,
        completedDate: new Date().toISOString(),
        domains: {
          ambiente_trabajo: { score: score * 0.3, level: riskLevel },
          factores_organizacion: { score: score * 0.4, level: riskLevel },
          liderazgo: { score: score * 0.3, level: riskLevel },
        },
      };

      const token = `test-token-guia-ii-${i}-${Date.now()}`;

      guiaIIResponses.push({
        surveyId: 2, // Guía II
        userId: user.id,
        periodId: activePeriod.id,
        token: token,
        results: JSON.stringify(results),
        completedAt: new Date(),
        startedAt: new Date(Date.now() - 1000 * 60 * 20), // 20 minutos antes
      });
    }

    for (const response of guiaIIResponses) {
      await db.insert(surveyResponses).values(response);
    }
    console.log(
      `  ✅ ${guiaIIResponses.length} respuestas de Guía II generadas`
    );

    // 7. Generar respuestas de Guía III (5 respuestas)
    console.log("\n📝 Generando respuestas de Guía III...");
    const guiaIIIResponses = [];

    for (let i = 15; i < Math.min(20, allUsers.length); i++) {
      const user = allUsers[i];
      const riskLevel = ["medio", "alto", "muy_alto"][i % 3];
      const score = [55, 75, 90][i % 3];

      const results = {
        surveyType: "guia_iii",
        riskLevel: riskLevel,
        totalScore: score,
        department: user.departamento,
        completedDate: new Date().toISOString(),
        domains: {
          ambiente_trabajo: { score: score * 0.25, level: riskLevel },
          factores_organizacion: { score: score * 0.35, level: riskLevel },
          liderazgo: { score: score * 0.25, level: riskLevel },
          entorno_organizacional: { score: score * 0.15, level: riskLevel },
        },
      };

      const token = `test-token-guia-iii-${i}-${Date.now()}`;

      guiaIIIResponses.push({
        surveyId: 3, // Guía III
        userId: user.id,
        periodId: activePeriod.id,
        token: token,
        results: JSON.stringify(results),
        completedAt: new Date(),
        startedAt: new Date(Date.now() - 1000 * 60 * 25), // 25 minutos antes
      });
    }

    for (const response of guiaIIIResponses) {
      await db.insert(surveyResponses).values(response);
    }
    console.log(
      `  ✅ ${guiaIIIResponses.length} respuestas de Guía III generadas`
    );

    console.log("\n✨ Respuestas de encuestas generadas exitosamente!\n");
    console.log("📊 Resumen:");
    console.log(`  - Periodo: ${activePeriod.name}`);
    console.log(`  - Respuestas Guía I: ${guiaIResponses.length}`);
    console.log(`  - Respuestas Guía II: ${guiaIIResponses.length}`);
    console.log(`  - Respuestas Guía III: ${guiaIIIResponses.length}`);
    console.log(
      `  - Total de respuestas: ${guiaIResponses.length + guiaIIResponses.length + guiaIIIResponses.length}`
    );
    console.log("\n📈 Distribución por departamento:");

    const deptCounts: Record<string, number> = {};
    for (const user of allUsers.slice(0, 20)) {
      if (user.departamento) {
        deptCounts[user.departamento] =
          (deptCounts[user.departamento] || 0) + 1;
      }
    }

    for (const [dept, count] of Object.entries(deptCounts)) {
      console.log(`  - ${dept}: ${count} respuestas`);
    }

    console.log(
      "\n✅ Ahora puedes visualizar los datos en el Panel de Administración NOM-035"
    );

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error al generar respuestas de encuestas:", error);
    console.error(error);
    process.exit(1);
  }
}

seedSurveyResponses();
