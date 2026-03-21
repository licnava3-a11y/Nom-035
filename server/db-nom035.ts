import { getDb } from "./db";
import { nom035Questions, nom035Responses, nom035Results, nom035SurveyPeriods } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Obtener todas las preguntas del cuestionario NOM-035
 */
export async function getNOM035Questions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(nom035Questions).orderBy(nom035Questions.questionNumber);
}

/**
 * Guardar una respuesta individual del cuestionario
 */
export async function saveNOM035Response(data: {
  employeeId: number;
  surveyPeriodId: number;
  questionId: number;
  response: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Verificar si ya existe una respuesta para esta pregunta en este período
  const existing = await db
    .select()
    .from(nom035Responses)
    .where(
      and(
        eq(nom035Responses.employeeId, data.employeeId),
        eq(nom035Responses.surveyPeriodId, data.surveyPeriodId),
        eq(nom035Responses.questionId, data.questionId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Actualizar respuesta existente
    await db
      .update(nom035Responses)
      .set({ response: data.response, timestamp: new Date() } as any)
      .where(eq(nom035Responses.id, existing[0].id));
    return existing[0].id;
  } else {
    // Insertar nueva respuesta
    const result = await (db.insert(nom035Responses) as any).values(data);
    return result[0].insertId;
  }
}

/**
 * Obtener progreso del cuestionario para un empleado
 */
export async function getNOM035Progress(employeeId: number, surveyPeriodId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const totalQuestions = await db.select().from(nom035Questions);
  const answeredQuestions = await db
    .select()
    .from(nom035Responses)
    .where(
      and(
        eq(nom035Responses.employeeId, employeeId),
        eq(nom035Responses.surveyPeriodId, surveyPeriodId)
      )
    );

  return {
    total: totalQuestions.length,
    answered: answeredQuestions.length,
    percentage: Math.round((answeredQuestions.length / totalQuestions.length) * 100),
  };
}

/**
 * Obtener respuestas de un empleado para un período
 */
export async function getNOM035Responses(employeeId: number, surveyPeriodId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(nom035Responses)
    .where(
      and(
        eq(nom035Responses.employeeId, employeeId),
        eq(nom035Responses.surveyPeriodId, surveyPeriodId)
      )
    );
}

/**
 * Calcular resultados del cuestionario NOM-035
 * Implementa la lógica de calificación según la normativa oficial
 */
export async function calculateNOM035Results(employeeId: number, surveyPeriodId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Obtener todas las respuestas del empleado
  const responses = await db
    .select({
      response: nom035Responses.response,
      category: nom035Questions.category,
      domain: nom035Questions.domain,
      dimension: nom035Questions.dimension,
    })
    .from(nom035Responses)
    .innerJoin(nom035Questions, eq(nom035Responses.questionId, nom035Questions.id))
    .where(
      and(
        eq(nom035Responses.employeeId, employeeId),
        eq(nom035Responses.surveyPeriodId, surveyPeriodId)
      )
    );

  if (responses.length === 0) {
    throw new Error("No hay respuestas para calcular resultados");
  }

  // Calcular puntaje global
  const globalScore = responses.reduce((sum: number, r: any) => sum + r.response, 0);

  // Calcular puntajes por categoría
  const categoryScores: Record<string, number> = {};
  responses.forEach((r: any) => {
    if (!categoryScores[r.category]) {
      categoryScores[r.category] = 0;
    }
    categoryScores[r.category] += r.response;
  });

  // Calcular puntajes por dominio
  const domainScores: Record<string, number> = {};
  responses.forEach((r: any) => {
    if (r.domain) {
      if (!domainScores[r.domain]) {
        domainScores[r.domain] = 0;
      }
      domainScores[r.domain] += r.response;
    }
  });

  // Calcular puntajes por dimensión
  const dimensionScores: Record<string, number> = {};
  responses.forEach((r: any) => {
    if (r.dimension) {
      if (!dimensionScores[r.dimension]) {
        dimensionScores[r.dimension] = 0;
      }
      dimensionScores[r.dimension] += r.response;
    }
  });

  // Determinar nivel de riesgo global según normativa NOM-035
  // Escala: Nulo (<50), Bajo (50-75), Medio (75-99), Alto (100-140), Muy Alto (>140)
  let globalRiskLevel: "nulo" | "bajo" | "medio" | "alto" | "muy_alto";
  if (globalScore < 50) {
    globalRiskLevel = "nulo";
  } else if (globalScore < 75) {
    globalRiskLevel = "bajo";
  } else if (globalScore < 99) {
    globalRiskLevel = "medio";
  } else if (globalScore < 140) {
    globalRiskLevel = "alto";
  } else {
    globalRiskLevel = "muy_alto";
  }

  // Generar recomendaciones automáticas
  const recommendations = generateRecommendations(globalRiskLevel, categoryScores);

  // Guardar resultados en la base de datos
  const result = await (db.insert(nom035Results) as any).values({
    employeeId,
    surveyPeriodId,
    globalScore,
    globalRiskLevel,
    categoryScores: JSON.stringify(categoryScores),
    domainScores: JSON.stringify(domainScores),
    dimensionScores: JSON.stringify(dimensionScores),
    recommendations,
  });

  return {
    id: result[0].insertId,
    globalScore,
    globalRiskLevel,
    categoryScores,
    domainScores,
    dimensionScores,
    recommendations,
  };
}

/**
 * Generar recomendaciones según nivel de riesgo
 */
function generateRecommendations(
  riskLevel: string,
  categoryScores: Record<string, number>
): string {
  const recommendations: string[] = [];

  switch (riskLevel) {
    case "muy_alto":
      recommendations.push(
        "Se requiere intervención inmediata. Es necesario implementar acciones correctivas urgentes."
      );
      recommendations.push(
        "Se recomienda evaluación psicológica individual y seguimiento continuo."
      );
      break;
    case "alto":
      recommendations.push(
        "Se requieren acciones correctivas prioritarias para reducir los factores de riesgo identificados."
      );
      recommendations.push(
        "Implementar programas de apoyo psicológico y capacitación en manejo del estrés."
      );
      break;
    case "medio":
      recommendations.push(
        "Se recomienda implementar medidas preventivas para evitar el incremento del riesgo."
      );
      recommendations.push("Realizar seguimiento periódico y evaluaciones de control.");
      break;
    case "bajo":
      recommendations.push(
        "Mantener las condiciones actuales y realizar evaluaciones periódicas de seguimiento."
      );
      break;
    case "nulo":
      recommendations.push(
        "Las condiciones actuales son favorables. Continuar con las prácticas actuales."
      );
      break;
  }

  // Recomendaciones específicas por categoría con puntajes altos
  Object.entries(categoryScores).forEach(([category, score]: [string, any]) => {
    if (score > 20) {
      // Umbral para considerar categoría de riesgo
      switch (category) {
        case "Condiciones en el ambiente de trabajo":
          recommendations.push(
            "Mejorar las condiciones físicas del espacio de trabajo y equipamiento de seguridad."
          );
          break;
        case "Carga de trabajo":
          recommendations.push(
            "Revisar la distribución de cargas de trabajo y considerar redistribución de tareas."
          );
          break;
        case "Falta de control sobre el trabajo":
          recommendations.push(
            "Incrementar la autonomía y participación del trabajador en la toma de decisiones."
          );
          break;
        case "Jornada de trabajo":
          recommendations.push(
            "Revisar y ajustar las jornadas laborales para garantizar el equilibrio trabajo-vida."
          );
          break;
        case "Liderazgo":
          recommendations.push(
            "Implementar programas de capacitación en liderazgo y comunicación efectiva."
          );
          break;
        case "Relaciones en el trabajo":
          recommendations.push(
            "Fomentar el trabajo en equipo y mejorar el clima organizacional."
          );
          break;
        case "Violencia":
          recommendations.push(
            "Activar protocolos de prevención y atención de violencia laboral de manera inmediata."
          );
          break;
      }
    }
  });

  return recommendations.join("\n\n");
}

/**
 * Obtener resultados de un empleado
 */
export async function getNOM035Results(employeeId: number, surveyPeriodId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db
    .select()
    .from(nom035Results)
    .where(
      and(
        eq(nom035Results.employeeId, employeeId),
        eq(nom035Results.surveyPeriodId, surveyPeriodId)
      )
    )
    .orderBy(desc(nom035Results.createdAt))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const result = results[0];
  return {
    ...result,
    categoryScores: JSON.parse(result.categoryScores as string),
    domainScores: JSON.parse(result.domainScores as string),
    dimensionScores: JSON.parse(result.dimensionScores as string),
  };
}

/**
 * Crear un nuevo período de evaluación
 */
export async function createSurveyPeriod(data: {
  name: string;
  startDate: Date;
  endDate: Date;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await (db.insert(nom035SurveyPeriods) as any).values({
    ...data,
    status: "draft",
  });
  return result[0].insertId;
}

/**
 * Obtener período activo
 */
export async function getActiveSurveyPeriod() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const periods = await db
    .select()
    .from(nom035SurveyPeriods)
    .where(eq(nom035SurveyPeriods.status, "active"))
    .orderBy(desc(nom035SurveyPeriods.createdAt))
    .limit(1);

  return periods.length > 0 ? periods[0] : null;
}
