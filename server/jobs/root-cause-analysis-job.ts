import { getDb, createNotification } from "../db";
import {
  rootCauseAnalysis,
  cases,
  departments,
  users,
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * Job automático para análisis mensual de causas raíz
 * Se ejecuta el primer día de cada mes a las 3:00 AM
 * Analiza casos cerrados del mes anterior
 */
export async function runRootCauseAnalysisJob() {
  console.log("[Root Cause Analysis Job] Starting monthly analysis...");

  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Calcular período del mes anterior
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const periodStart = lastMonth.toISOString().split("T")[0];
    const periodEnd = lastMonthEnd.toISOString().split("T")[0];

    console.log(
      `[Root Cause Analysis Job] Analyzing period: ${periodStart} to ${periodEnd}`
    );

    // Verificar si ya existe análisis para este período
    const [existingAnalysis] = await db
      .select()
      .from(rootCauseAnalysis)
      .where(
        and(
          sql`${rootCauseAnalysis.periodStart} = ${periodStart}`,
          sql`${rootCauseAnalysis.periodEnd} = ${periodEnd}`,
          eq(rootCauseAnalysis.analysisStatus, "completed")
        )
      )
      .limit(1);

    if (existingAnalysis) {
      console.log(
        "[Root Cause Analysis Job] Analysis already exists for this period, skipping..."
      );
      return {
        success: true,
        message: "Analysis already exists for this period",
        analysisId: existingAnalysis.id,
      };
    }

    // Obtener casos cerrados en el período
    const closedCases = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        caseType: cases.caseType,
        description: cases.description,
        priority: cases.priority,
        status: cases.status,
        departmentId: cases.departmentId,
        createdAt: cases.createdAt,
        closedAt: cases.closedAt,
      })
      .from(cases)
      .where(
        and(
          sql`${cases.status} = 'closed'`,
          gte(cases.closedAt, new Date(periodStart)),
          lte(cases.closedAt, new Date(periodEnd))
        )
      );

    if (closedCases.length === 0) {
      console.log(
        "[Root Cause Analysis Job] No closed cases found for this period"
      );
      return {
        success: true,
        message: "No closed cases to analyze",
        casesAnalyzed: 0,
      };
    }

    console.log(
      `[Root Cause Analysis Job] Found ${closedCases.length} closed cases`
    );

    // Obtener departamentos para mapeo
    const depts = await db.select().from(departments);
    const deptMap = new Map(depts.map((d: any) => [d.id, d.name]));

    // Preparar datos para el LLM
    const casesForAnalysis = closedCases.map((c: any) => ({
      caseNumber: c.caseNumber,
      type: c.caseType,
      priority: c.priority,
      department: deptMap.get(c.departmentId || 0) || "Desconocido",
      description: c.description,
      daysToResolve:
        c.closedAt && c.createdAt
          ? Math.ceil(
              (new Date(c.closedAt).getTime() -
                new Date(c.createdAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
    }));

    // Crear análisis pendiente
    const [analysisRecord] = await (db.insert(rootCauseAnalysis) as any).values(
      {
        analysisDate: new Date(),
        periodStart,
        periodEnd,
        totalCasesAnalyzed: closedCases.length,
        rootCauses: [],
        patterns: [],
        correlations: [],
        recommendations: [],
        departmentInsights: {},
        analysisStatus: "pending",
      } as any
    );

    const analysisId = analysisRecord.insertId;

    try {
      // Llamar al LLM para análisis
      console.log("[Root Cause Analysis Job] Calling LLM for analysis...");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Eres un experto en psicología organizacional y análisis de riesgos psicosociales según la NOM-035 STPS 2018. Tu tarea es analizar casos cerrados de riesgos psicosociales para identificar causas raíz, patrones recurrentes y generar recomendaciones preventivas.`,
          },
          {
            role: "user",
            content: `Analiza los siguientes ${closedCases.length} casos cerrados de riesgos psicosociales del período ${periodStart} al ${periodEnd}:

${JSON.stringify(casesForAnalysis, null, 2)}

Identifica:
1. Las causas raíz más frecuentes (mínimo 5, máximo 10)
2. Patrones recurrentes en los casos
3. Correlaciones entre tipo de caso, prioridad y departamento
4. Recomendaciones preventivas priorizadas (top 5)
5. Insights específicos por departamento

Responde ÚNICAMENTE con un JSON válido siguiendo exactamente esta estructura.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "root_cause_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                rootCauses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      cause: { type: "string" },
                      frequency: { type: "number" },
                      percentage: { type: "number" },
                      affectedDepartments: {
                        type: "array",
                        items: { type: "string" },
                      },
                      severity: {
                        type: "string",
                        enum: ["low", "medium", "high", "critical"],
                      },
                    },
                    required: [
                      "cause",
                      "frequency",
                      "percentage",
                      "affectedDepartments",
                      "severity",
                    ],
                    additionalProperties: false,
                  },
                },
                patterns: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      pattern: { type: "string" },
                      description: { type: "string" },
                      casesAffected: { type: "number" },
                      departments: { type: "array", items: { type: "string" } },
                    },
                    required: [
                      "pattern",
                      "description",
                      "casesAffected",
                      "departments",
                    ],
                    additionalProperties: false,
                  },
                },
                correlations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      factor1: { type: "string" },
                      factor2: { type: "string" },
                      correlationStrength: { type: "number" },
                      description: { type: "string" },
                    },
                    required: [
                      "factor1",
                      "factor2",
                      "correlationStrength",
                      "description",
                    ],
                    additionalProperties: false,
                  },
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                      },
                      recommendation: { type: "string" },
                      targetDepartments: {
                        type: "array",
                        items: { type: "string" },
                      },
                      expectedImpact: { type: "string" },
                      actionItems: { type: "array", items: { type: "string" } },
                    },
                    required: [
                      "priority",
                      "recommendation",
                      "targetDepartments",
                      "expectedImpact",
                      "actionItems",
                    ],
                    additionalProperties: false,
                  },
                },
                departmentInsights: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      totalCases: { type: "number" },
                      topCauses: { type: "array", items: { type: "string" } },
                      riskLevel: {
                        type: "string",
                        enum: ["low", "medium", "high", "critical"],
                      },
                      specificRecommendations: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: [
                      "totalCases",
                      "topCauses",
                      "riskLevel",
                      "specificRecommendations",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "rootCauses",
                "patterns",
                "correlations",
                "recommendations",
                "departmentInsights",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      // Parsear respuesta del LLM
      const content = response.choices[0].message.content;
      const contentStr =
        typeof content === "string" ? content : JSON.stringify(content);
      const analysisResult = JSON.parse(contentStr || "{}");

      console.log(
        "[Root Cause Analysis Job] LLM analysis completed successfully"
      );

      // Actualizar registro con resultados
      await db
        .update(rootCauseAnalysis)
        .set({
          rootCauses: analysisResult.rootCauses,
          patterns: analysisResult.patterns,
          correlations: analysisResult.correlations,
          recommendations: analysisResult.recommendations,
          departmentInsights: analysisResult.departmentInsights,
          llmModel: response.model,
          analysisStatus: "completed",
        } as any)
        .where(eq(rootCauseAnalysis.id, analysisId));

      // Enviar notificación a administradores
      const admins = await db
        .select()
        .from(users)
        .where(eq(users.role, "admin"));

      const criticalCauses = analysisResult.rootCauses.filter(
        (c: any) => c.severity === "critical" || c.severity === "high"
      ).length;

      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "system",
          title: "Análisis de Causas Raíz Completado",
          message: `Se completó el análisis automático del período ${periodStart} al ${periodEnd}. Se analizaron ${closedCases.length} casos cerrados, identificando ${analysisResult.rootCauses.length} causas raíz (${criticalCauses} críticas) y ${analysisResult.recommendations.length} recomendaciones preventivas. Ver detalles en Análisis de Causas Raíz.`,
        });
      }

      console.log(
        `[Root Cause Analysis Job] Analysis completed successfully. ID: ${analysisId}`
      );

      return {
        success: true,
        analysisId,
        casesAnalyzed: closedCases.length,
        rootCausesFound: analysisResult.rootCauses.length,
        recommendationsGenerated: analysisResult.recommendations.length,
      };
    } catch (error: any) {
      console.error(
        "[Root Cause Analysis Job] Error during LLM analysis:",
        error
      );

      // Marcar análisis como fallido
      await db
        .update(rootCauseAnalysis)
        .set({
          analysisStatus: "failed",
          errorMessage: error.message,
        } as any)
        .where(eq(rootCauseAnalysis.id, analysisId));

      throw error;
    }
  } catch (error: any) {
    console.error("[Root Cause Analysis Job] Fatal error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
