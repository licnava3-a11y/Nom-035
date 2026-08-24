import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { rootCauseAnalysis, cases, departments } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const rootCauseAnalysisRouter = router({
  /**
   * Analizar casos cerrados con IA para identificar causas raíz y patrones
   */
  analyzeClosedCases: protectedProcedure
    .input(
      z.object({
        periodStart: z.string(), // ISO date
        periodEnd: z.string(), // ISO date
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar que el usuario sea admin
      if (ctx.user.role !== "admin") {
        throw new Error("Solo administradores pueden ejecutar análisis");
      }

      const periodStart = new Date(input.periodStart);
      const periodEnd = new Date(input.periodEnd);

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
          // resolution: cases.resolution, // Campo no existe en schema
          createdAt: cases.createdAt,
          closedAt: cases.closedAt,
        })
        .from(cases)
        .where(
          and(
            sql`${cases.status} = 'closed'`,
            gte(cases.closedAt, periodStart),
            lte(cases.closedAt, periodEnd)
          )
        );

      if (closedCases.length === 0) {
        throw new Error("No hay casos cerrados en el período seleccionado");
      }

      // Obtener departamentos para mapeo
      const depts = await db.select().from(departments);
      const deptMap = new Map(depts.map(d => [d.id, d.name]));

      // Preparar datos para el LLM
      const casesForAnalysis = closedCases.map(c => ({
        caseNumber: c.caseNumber,
        type: c.caseType,
        priority: c.priority,
        department: deptMap.get(c.departmentId || 0) || "Desconocido",
        description: c.description,
        // resolution: "Caso cerrado", // Campo no disponible
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
      const [analysisRecord] = await (
        db.insert(rootCauseAnalysis) as any
      ).values({
        analysisDate: new Date(),
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        totalCasesAnalyzed: closedCases.length,
        rootCauses: [],
        patterns: [],
        correlations: [],
        recommendations: [],
        departmentInsights: {},
        analysisStatus: "pending",
      } as any);

      const analysisId = analysisRecord.insertId;

      try {
        // Llamar al LLM para análisis
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Eres un experto en psicología organizacional y análisis de riesgos psicosociales según la NOM-035 STPS 2018. Tu tarea es analizar casos cerrados de riesgos psicosociales para identificar causas raíz, patrones recurrentes y generar recomendaciones preventivas.`,
            },
            {
              role: "user",
              content: `Analiza los siguientes ${closedCases.length} casos cerrados de riesgos psicosociales del período ${input.periodStart} al ${input.periodEnd}:

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
                    description:
                      "Causas raíz identificadas ordenadas por frecuencia",
                    items: {
                      type: "object",
                      properties: {
                        cause: {
                          type: "string",
                          description: "Descripción de la causa raíz",
                        },
                        frequency: {
                          type: "number",
                          description: "Número de casos afectados",
                        },
                        percentage: {
                          type: "number",
                          description: "Porcentaje del total de casos",
                        },
                        affectedDepartments: {
                          type: "array",
                          items: { type: "string" },
                          description: "Departamentos afectados",
                        },
                        severity: {
                          type: "string",
                          enum: ["low", "medium", "high", "critical"],
                          description: "Nivel de severidad",
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
                    description: "Patrones detectados en los casos",
                    items: {
                      type: "object",
                      properties: {
                        pattern: {
                          type: "string",
                          description: "Nombre del patrón",
                        },
                        description: {
                          type: "string",
                          description: "Descripción detallada",
                        },
                        casesAffected: {
                          type: "number",
                          description: "Casos afectados",
                        },
                        departments: {
                          type: "array",
                          items: { type: "string" },
                          description: "Departamentos donde se observa",
                        },
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
                    description: "Correlaciones entre factores de riesgo",
                    items: {
                      type: "object",
                      properties: {
                        factor1: {
                          type: "string",
                          description: "Primer factor",
                        },
                        factor2: {
                          type: "string",
                          description: "Segundo factor",
                        },
                        correlationStrength: {
                          type: "number",
                          description: "Fuerza de correlación (0-1)",
                        },
                        description: {
                          type: "string",
                          description: "Descripción de la correlación",
                        },
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
                    description: "Recomendaciones preventivas priorizadas",
                    items: {
                      type: "object",
                      properties: {
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                          description: "Prioridad de la recomendación",
                        },
                        recommendation: {
                          type: "string",
                          description: "Recomendación específica",
                        },
                        targetDepartments: {
                          type: "array",
                          items: { type: "string" },
                          description: "Departamentos objetivo",
                        },
                        expectedImpact: {
                          type: "string",
                          description: "Impacto esperado",
                        },
                        actionItems: {
                          type: "array",
                          items: { type: "string" },
                          description: "Acciones concretas a realizar",
                        },
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
                    description: "Insights específicos por departamento",
                    additionalProperties: {
                      type: "object",
                      properties: {
                        totalCases: {
                          type: "number",
                          description: "Total de casos",
                        },
                        topCauses: {
                          type: "array",
                          items: { type: "string" },
                          description: "Principales causas",
                        },
                        riskLevel: {
                          type: "string",
                          enum: ["low", "medium", "high", "critical"],
                          description: "Nivel de riesgo",
                        },
                        specificRecommendations: {
                          type: "array",
                          items: { type: "string" },
                          description: "Recomendaciones específicas",
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

        return {
          success: true,
          analysisId,
          casesAnalyzed: closedCases.length,
          ...analysisResult,
        };
      } catch (error: any) {
        // Marcar análisis como fallido
        await db
          .update(rootCauseAnalysis)
          .set({
            analysisStatus: "failed",
            errorMessage: error.message,
          } as any)
          .where(eq(rootCauseAnalysis.id, analysisId));

        throw new Error(`Error al analizar casos: ${error.message}`);
      }
    }),

  /**
   * Obtener el análisis más reciente
   */
  getLatestAnalysis: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [latest] = await db
      .select()
      .from(rootCauseAnalysis)
      .where(eq(rootCauseAnalysis.analysisStatus, "completed"))
      .orderBy(desc(rootCauseAnalysis.analysisDate))
      .limit(1);

    return latest || null;
  }),

  /**
   * Obtener historial de análisis con paginación
   */
  getAnalysisHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.pageSize;

      const [items, totalCount] = await Promise.all([
        db
          .select()
          .from(rootCauseAnalysis)
          .orderBy(desc(rootCauseAnalysis.analysisDate))
          .limit(input.pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(rootCauseAnalysis)
          .then(r => r[0]?.count || 0),
      ]);

      return {
        items,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / input.pageSize),
        },
      };
    }),

  /**
   * Obtener análisis por ID
   */
  getAnalysisById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [analysis] = await db
        .select()
        .from(rootCauseAnalysis)
        .where(eq(rootCauseAnalysis.id, input.id))
        .limit(1);

      if (!analysis) {
        throw new Error("Análisis no encontrado");
      }

      return analysis;
    }),
});
