import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { interventionImpactAnalysis, workplaceViolenceCases, departments, trainingEvaluations } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const interventionImpactRouter = router({
  // Listar análisis de impacto con filtros
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "completed", "archived"]).optional(),
        interventionType: z.enum(["training", "policy_change", "organizational_change", "corrective_action", "awareness_campaign", "other"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const conditions = [];
      if (input.status) conditions.push(eq(interventionImpactAnalysis.status, input.status));
      if (input.interventionType) conditions.push(eq(interventionImpactAnalysis.interventionType, input.interventionType));

      const analyses = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(interventionImpactAnalysis.createdAt));

      return analyses;
    }),

  // Obtener análisis por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const analysis = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(eq(interventionImpactAnalysis.id, input.id))
        .limit(1);

      return analysis[0] || null;
    }),

  // Crear nuevo análisis de impacto
  create: protectedProcedure
    .input(
      z.object({
        interventionType: z.enum(["training", "policy_change", "organizational_change", "corrective_action", "awareness_campaign", "other"]),
        interventionName: z.string(),
        description: z.string().optional(),
        implementationDate: z.string(),
        targetDepartmentId: z.number().optional(),
        targetArea: z.string().optional(),
        measurementPeriodMonths: z.number().default(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [result] = await db.insert(interventionImpactAnalysis).values({
        ...input,
        implementationDate: new Date(input.implementationDate),
        createdBy: ctx.user.id,
      });

      return { id: result.insertId, success: true };
    }),

  // Calcular métricas de efectividad
  calculateMetrics: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const analysis = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(eq(interventionImpactAnalysis.id, input.id))
        .limit(1);

      if (!analysis[0]) throw new Error("Analysis not found");

      const intervention = analysis[0];
      const implementationDate = new Date(intervention.implementationDate);
      const measurementEndDate = new Date(implementationDate);
      measurementEndDate.setMonth(measurementEndDate.getMonth() + (intervention.measurementPeriodMonths || 3));

      // Calcular métricas ANTES de la intervención
      const beforeStartDate = new Date(implementationDate);
      beforeStartDate.setMonth(beforeStartDate.getMonth() - (intervention.measurementPeriodMonths || 3));

      const casesBeforeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(workplaceViolenceCases)
        .where(
          and(
            gte(workplaceViolenceCases.createdAt, beforeStartDate),
            lte(workplaceViolenceCases.createdAt, implementationDate),
            intervention.targetDepartmentId
              ? eq(workplaceViolenceCases.complainantId, intervention.targetDepartmentId)
              : undefined
          )
        );

      const casesBeforeCount = casesBeforeResult[0]?.count || 0;

      // Calcular métricas DESPUÉS de la intervención
      const casesAfterResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(workplaceViolenceCases)
        .where(
          and(
            gte(workplaceViolenceCases.createdAt, implementationDate),
            lte(workplaceViolenceCases.createdAt, measurementEndDate),
            intervention.targetDepartmentId
              ? eq(workplaceViolenceCases.complainantId, intervention.targetDepartmentId)
              : undefined
          )
        );

      const casesAfterCount = casesAfterResult[0]?.count || 0;

      // Calcular satisfacción de capacitaciones (si aplica)
      let satisfactionBefore = null;
      let satisfactionAfter = null;

      if (intervention.interventionType === "training") {
        const evalsBefore = await db
          .select({ avg: sql<number>`AVG(${trainingEvaluations.overallSatisfaction})` })
          .from(trainingEvaluations)
          .where(
            and(
              gte(trainingEvaluations.createdAt, beforeStartDate),
              lte(trainingEvaluations.createdAt, implementationDate)
            )
          );

        const evalsAfter = await db
          .select({ avg: sql<number>`AVG(${trainingEvaluations.overallSatisfaction})` })
          .from(trainingEvaluations)
          .where(
            and(
              gte(trainingEvaluations.createdAt, implementationDate),
              lte(trainingEvaluations.createdAt, measurementEndDate)
            )
          );

        satisfactionBefore = evalsBefore[0]?.avg || null;
        satisfactionAfter = evalsAfter[0]?.avg || null;
      }

      // Calcular porcentajes de mejora
      const caseReductionPercentage =
        casesBeforeCount > 0
          ? ((casesBeforeCount - casesAfterCount) / casesBeforeCount) * 100
          : 0;

      const satisfactionImprovement =
        satisfactionBefore && satisfactionAfter
          ? satisfactionAfter - satisfactionBefore
          : 0;

      // Calcular score de efectividad (0-100)
      const effectivenessScore = Math.max(
        0,
        Math.min(
          100,
          (caseReductionPercentage * 0.6) + (satisfactionImprovement * 20 * 0.4)
        )
      );

      // Actualizar análisis con métricas calculadas
      await db
        .update(interventionImpactAnalysis)
        .set({
          casesBeforeCount,
          casesAfterCount,
          satisfactionScoreBefore: satisfactionBefore ? String(satisfactionBefore) : null,
          satisfactionScoreAfter: satisfactionAfter ? String(satisfactionAfter) : null,
          caseReductionPercentage: String(caseReductionPercentage.toFixed(2)),
          satisfactionScoreImprovement: String(satisfactionImprovement.toFixed(2)),
          effectivenessScore: String(effectivenessScore.toFixed(2)),
        })
        .where(eq(interventionImpactAnalysis.id, input.id));

      return {
        success: true,
        metrics: {
          casesBeforeCount,
          casesAfterCount,
          caseReductionPercentage: Number(caseReductionPercentage.toFixed(2)),
          satisfactionBefore,
          satisfactionAfter,
          satisfactionImprovement: Number(satisfactionImprovement.toFixed(2)),
          effectivenessScore: Number(effectivenessScore.toFixed(2)),
        },
      };
    }),

  // Generar insights con IA
  generateInsights: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const analysis = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(eq(interventionImpactAnalysis.id, input.id))
        .limit(1);

      if (!analysis[0]) throw new Error("Analysis not found");

      const intervention = analysis[0];

      // Generar insights con LLM
      const prompt = `Analiza el impacto de la siguiente intervención de prevención de riesgos psicosociales:

Tipo: ${intervention.interventionType}
Nombre: ${intervention.interventionName}
Descripción: ${intervention.description || "N/A"}

Métricas:
- Casos antes: ${intervention.casesBeforeCount}
- Casos después: ${intervention.casesAfterCount}
- Reducción: ${intervention.caseReductionPercentage}%
- Satisfacción antes: ${intervention.satisfactionScoreBefore || "N/A"}
- Satisfacción después: ${intervention.satisfactionScoreAfter || "N/A"}
- Score de efectividad: ${intervention.effectivenessScore}/100

Genera un análisis completo con factores de éxito, desafíos, recomendaciones y predicción de impacto futuro.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Eres un experto en análisis de intervenciones de prevención de riesgos psicosociales. Genera insights accionables y basados en datos.",
          },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "intervention_insights",
            strict: true,
            schema: {
              type: "object",
              properties: {
                successFactors: {
                  type: "array",
                  items: { type: "string" },
                  description: "Factores que contribuyeron al éxito (máximo 5)",
                },
                challenges: {
                  type: "array",
                  items: { type: "string" },
                  description: "Desafíos encontrados durante la implementación (máximo 5)",
                },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                  description: "Recomendaciones para futuras intervenciones (máximo 5)",
                },
                predictedImpact: {
                  type: "string",
                  description: "Predicción del impacto a largo plazo (1-2 párrafos)",
                },
              },
              required: ["successFactors", "challenges", "recommendations", "predictedImpact"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const insights = JSON.parse(typeof content === "string" ? content : "{}");

      // Actualizar análisis con insights
      await db
        .update(interventionImpactAnalysis)
        .set({
          aiInsights: insights,
        })
        .where(eq(interventionImpactAnalysis.id, input.id));

      return { success: true, insights };
    }),

  // Dashboard de impacto
  getDashboard: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const totalInterventions = await db
      .select({ count: sql<number>`count(*)` })
      .from(interventionImpactAnalysis);

    const avgEffectiveness = await db
      .select({ avg: sql<number>`AVG(${interventionImpactAnalysis.effectivenessScore})` })
      .from(interventionImpactAnalysis)
      .where(eq(interventionImpactAnalysis.status, "active"));

    const totalCasesAvoided = await db
      .select({ sum: sql<number>`SUM(${interventionImpactAnalysis.casesBeforeCount} - ${interventionImpactAnalysis.casesAfterCount})` })
      .from(interventionImpactAnalysis);

    const topInterventions = await db
      .select()
      .from(interventionImpactAnalysis)
      .orderBy(desc(interventionImpactAnalysis.effectivenessScore))
      .limit(5);

    return {
      totalInterventions: totalInterventions[0]?.count || 0,
      avgEffectiveness: avgEffectiveness[0]?.avg || 0,
      totalCasesAvoided: totalCasesAvoided[0]?.sum || 0,
      topInterventions,
    };
  }),
});
