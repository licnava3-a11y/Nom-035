import { getDb } from "../server/db";
import {
  surveyResponses,
  users,
  surveyPeriods,
  surveys,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Script para generar datos de prueba de encuestas NOM-035
 *
 * Genera 20+ respuestas de encuestas con diferentes niveles de riesgo
 * y distribuidas entre diferentes departamentos
 */

// Niveles de riesgo
const riskLevels = ["Nulo", "Bajo", "Medio", "Alto", "Muy Alto"];

// Departamentos
const departments = ["RRHH", "IT", "Ventas", "Operaciones", "Finanzas"];

// Función para generar puntaje aleatorio según nivel de riesgo
function generateScoreByRisk(surveyType: string, riskLevel: string): number {
  const ranges: Record<string, Record<string, [number, number]>> = {
    "Guía I": {
      Nulo: [0, 5],
      Bajo: [6, 9],
      Medio: [10, 13],
      Alto: [14, 17],
      "Muy Alto": [18, 20],
    },
    "Guía II": {
      Nulo: [0, 20],
      Bajo: [21, 30],
      Medio: [31, 45],
      Alto: [46, 60],
      "Muy Alto": [61, 72],
    },
    "Guía III": {
      Nulo: [0, 50],
      Bajo: [51, 75],
      Medio: [76, 99],
      Alto: [100, 125],
      "Muy Alto": [126, 138],
    },
  };

  const range = ranges[surveyType]?.[riskLevel] || [0, 10];
  return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

// Función para generar respuestas aleatorias
function generateAnswers(
  surveyType: string,
  totalScore: number
): Record<string, any> {
  const questionCounts: Record<string, number> = {
    "Guía I": 20,
    "Guía II": 72,
    "Guía III": 138,
  };

  const questionCount = questionCounts[surveyType] || 20;
  const answers: Record<string, number> = {};

  // Distribuir el puntaje entre las preguntas
  let remainingScore = totalScore;
  for (let i = 1; i <= questionCount; i++) {
    if (i === questionCount) {
      answers[`q${i}`] = remainingScore;
    } else {
      const maxForThisQuestion = Math.min(4, remainingScore);
      const score = Math.floor(Math.random() * (maxForThisQuestion + 1));
      answers[`q${i}`] = score;
      remainingScore -= score;
    }
  }

  return answers;
}

async function generateTestData() {
  try {
    console.log("🚀 Iniciando generación de datos de prueba...\n");

    // 1. Obtener instancia de base de datos
    const db = await getDb();
    if (!db) {
      console.error("❌ No se pudo conectar a la base de datos");
      return;
    }

    // 2. Obtener usuarios existentes
    const allUsers = await db.select().from(users);
    if (allUsers.length === 0) {
      console.error("❌ No hay usuarios en la base de datos");
      return;
    }

    console.log(`✅ Encontrados ${allUsers.length} usuarios\n`);

    // 3. Obtener periodo de prueba
    const periods = await db.select().from(surveyPeriods).limit(1);
    if (periods.length === 0) {
      console.error("❌ No hay periodos de aplicación en la base de datos");
      return;
    }

    const periodId = periods[0].id;
    console.log(`✅ Usando periodo: ${periods[0].name} (ID: ${periodId})\n`);

    // 4. Obtener IDs de encuestas
    const allSurveys = await db.select().from(surveys);
    const surveyMap: Record<string, number> = {};
    allSurveys.forEach(survey => {
      surveyMap[survey.type] = survey.id;
    });

    console.log(`✅ Encontradas ${allSurveys.length} encuestas\n`);
    allSurveys.forEach(s => {
      console.log(`   - ID: ${s.id}, Tipo: ${s.type}, Título: ${s.title}`);
    });
    console.log("");

    // 5. Generar respuestas
    const surveyTypes = ["guia_i", "guia_ii", "guia_iii"];
    const responseCounts = [10, 5, 5]; // 10 para Guía I, 5 para Guía II, 5 para Guía III

    let totalGenerated = 0;

    for (let typeIndex = 0; typeIndex < surveyTypes.length; typeIndex++) {
      const surveyType = surveyTypes[typeIndex];
      const count = responseCounts[typeIndex];

      console.log(`📝 Generando ${count} respuestas para ${surveyType}...`);

      for (let i = 0; i < count; i++) {
        // Seleccionar usuario aleatorio
        const user = allUsers[Math.floor(Math.random() * allUsers.length)];

        // Seleccionar nivel de riesgo aleatorio
        const riskLevel =
          riskLevels[Math.floor(Math.random() * riskLevels.length)];

        // Seleccionar departamento aleatorio
        const department =
          departments[Math.floor(Math.random() * departments.length)];

        // Generar puntaje según nivel de riesgo
        const totalScore = generateScoreByRisk(surveyType, riskLevel);

        // Generar respuestas
        const answers = generateAnswers(surveyType, totalScore);

        // Obtener surveyId
        const surveyId = surveyMap[surveyType];
        if (!surveyId) {
          console.warn(
            `  ⚠️ Encuesta tipo "${surveyType}" no encontrada, omitiendo...`
          );
          continue;
        }

        // Generar token único
        const token = crypto.randomBytes(32).toString("hex");

        // Crear registro de respuesta
        await db.insert(surveyResponses).values({
          surveyId,
          periodId,
          userId: user.id,
          token,
          results: JSON.stringify({
            totalScore,
            riskLevel,
            department,
            recommendations: [
              `Recomendación automática para nivel ${riskLevel}`,
            ],
          }),
          completedAt: new Date(),
          startedAt: new Date(),
        });

        totalGenerated++;
        console.log(
          `  ✓ Respuesta ${i + 1}/${count}: Usuario ${user.name} - ${riskLevel} (${totalScore} pts) - ${department}`
        );
      }

      console.log("");
    }

    console.log(
      `\n✅ Generación completada: ${totalGenerated} respuestas creadas exitosamente\n`
    );
    console.log("📊 Distribución:");
    console.log(`   - Guía I: 10 respuestas`);
    console.log(`   - Guía II: 5 respuestas`);
    console.log(`   - Guía III: 5 respuestas`);
    console.log(`   - Total: ${totalGenerated} respuestas\n`);
  } catch (error) {
    console.error("❌ Error al generar datos de prueba:", error);
    throw error;
  }
}

// Ejecutar script
generateTestData()
  .then(() => {
    console.log("✅ Script finalizado exitosamente");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });
