import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  intelligentAlerts,
  workplaceViolenceCases,
  trainingEvaluations,
  trainingAssignments,
  recommendationsTracking,
  departments,
  users,
} from "../../drizzle/schema";
import { eq, and, desc, sql, gte, lt, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";

export const intelligentAlertsRouter = router({
  /**
   * Ejecutar análisis predictivo completo
   */
  runPredictiveAnalysis: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const alerts = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 1. Detectar aumento anormal de casos por departamento
    const caseSurgeAlerts = await detectCaseSurge(
      db,
      thirtyDaysAgo,
      sixtyDaysAgo
    );
    alerts.push(...caseSurgeAlerts);

    // 2. Detectar caída en satisfacción de capacitaciones
    const satisfactionDropAlerts = await detectSatisfactionDrop(
      db,
      thirtyDaysAgo
    );
    alerts.push(...satisfactionDropAlerts);

    // 3. Detectar recomendaciones sin implementar >30 días
    const pendingRecommendationsAlerts = await detectPendingRecommendations(
      db,
      thirtyDaysAgo
    );
    alerts.push(...pendingRecommendationsAlerts);

    // Insertar alertas en la base de datos
    for (const alert of alerts) {
      await (db.insert(intelligentAlerts) as any).values(alert);
    }

    return {
      success: true,
      alertsGenerated: alerts.length,
      breakdown: {
        caseSurge: caseSurgeAlerts.length,
        satisfactionDrop: satisfactionDropAlerts.length,
        pendingRecommendations: pendingRecommendationsAlerts.length,
      },
    };
  }),

  /**
   * Listar alertas con filtros
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "resolved", "dismissed"]).optional(),
        severity: z.enum(["critical", "high", "medium", "low"]).optional(),
        alertType: z
          .enum([
            "case_surge",
            "training_satisfaction_drop",
            "pending_recommendations",
            "department_risk",
            "compliance_issue",
            "other",
          ])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [];
      if (input.status)
        conditions.push(eq(intelligentAlerts.status, input.status));
      if (input.severity)
        conditions.push(eq(intelligentAlerts.severity, input.severity));
      if (input.alertType)
        conditions.push(eq(intelligentAlerts.alertType, input.alertType));

      const alerts = await db
        .select({
          alert: intelligentAlerts,
          assignedUser: users,
        })
        .from(intelligentAlerts)
        .leftJoin(users, eq(intelligentAlerts.assignedTo, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(intelligentAlerts.createdAt));

      return alerts;
    }),

  /**
   * Obtener alerta por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [alert] = await db
        .select({
          alert: intelligentAlerts,
          assignedUser: users,
          resolvedUser: users,
        })
        .from(intelligentAlerts)
        .leftJoin(users, eq(intelligentAlerts.assignedTo, users.id))
        .where(eq(intelligentAlerts.id, input.id));

      if (!alert) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alerta no encontrada",
        });
      }

      return alert;
    }),

  /**
   * Marcar alerta como resuelta
   */
  resolve: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        resolutionNotes: z.string(),
        effectivenessScore: z.number().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(intelligentAlerts)
        .set({
          status: "resolved",
          resolutionNotes: input.resolutionNotes,
          resolvedAt: new Date(),
          resolvedBy: ctx.user.id,
          effectivenessScore: input.effectivenessScore,
        } as any)
        .where(eq(intelligentAlerts.id, input.id));

      return { success: true, message: "Alerta marcada como resuelta" };
    }),

  /**
   * Descartar alerta
   */
  dismiss: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(intelligentAlerts)
        .set({
          status: "dismissed",
          resolutionNotes: input.reason,
          resolvedAt: new Date(),
          resolvedBy: ctx.user.id,
        } as any)
        .where(eq(intelligentAlerts.id, input.id));

      return { success: true, message: "Alerta descartada" };
    }),

  /**
   * Asignar responsable a alerta
   */
  assign: adminProcedure
    .input(z.object({ id: z.number(), userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(intelligentAlerts)
        .set({ assignedTo: input.userId } as any)
        .where(eq(intelligentAlerts.id, input.id));

      return { success: true, message: "Responsable asignado" };
    }),

  /**
   * Dashboard de alertas
   */
  getDashboard: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    // Contar alertas por estado
    const [activeCount] = await db
      .select({ count: count() })
      .from(intelligentAlerts)
      .where(eq(intelligentAlerts.status, "active"));

    const [criticalCount] = await db
      .select({ count: count() })
      .from(intelligentAlerts)
      .where(
        and(
          eq(intelligentAlerts.status, "active"),
          eq(intelligentAlerts.severity, "critical")
        )
      );

    const [resolvedCount] = await db
      .select({ count: count() })
      .from(intelligentAlerts)
      .where(eq(intelligentAlerts.status, "resolved"));

    const [totalCount] = await db
      .select({ count: count() })
      .from(intelligentAlerts);

    // Calcular tasa de resolución
    const resolutionRate =
      totalCount.count > 0 ? (resolvedCount.count / totalCount.count) * 100 : 0;

    // Obtener alertas críticas activas
    const criticalAlerts = await db
      .select({
        alert: intelligentAlerts,
        assignedUser: users,
      })
      .from(intelligentAlerts)
      .leftJoin(users, eq(intelligentAlerts.assignedTo, users.id))
      .where(
        and(
          eq(intelligentAlerts.status, "active"),
          eq(intelligentAlerts.severity, "critical")
        )
      )
      .orderBy(desc(intelligentAlerts.createdAt))
      .limit(5);

    // Distribución por tipo
    const distributionByType = await db
      .select({
        alertType: intelligentAlerts.alertType,
        count: count(),
      })
      .from(intelligentAlerts)
      .where(eq(intelligentAlerts.status, "active"))
      .groupBy(intelligentAlerts.alertType);

    return {
      activeCount: activeCount.count,
      criticalCount: criticalCount.count,
      resolvedCount: resolvedCount.count,
      resolutionRate: resolutionRate.toFixed(2),
      criticalAlerts,
      distributionByType,
    };
  }),
});

/**
 * Detectar aumento anormal de casos por departamento
 */
async function detectCaseSurge(
  db: any,
  thirtyDaysAgo: Date,
  sixtyDaysAgo: Date
) {
  const alerts = [];

  // Obtener casos por tipo en los últimos 30 días
  const recentCases = await db
    .select({
      caseType: workplaceViolenceCases.currentPhase,
      count: count(),
    })
    .from(workplaceViolenceCases)
    .where(gte(workplaceViolenceCases.createdAt, thirtyDaysAgo))
    .groupBy(workplaceViolenceCases.currentPhase);

  // Obtener casos por tipo en los 30 días anteriores
  const previousCases = await db
    .select({
      caseType: workplaceViolenceCases.currentPhase,
      count: count(),
    })
    .from(workplaceViolenceCases)
    .where(
      and(
        gte(workplaceViolenceCases.createdAt, sixtyDaysAgo),
        lt(workplaceViolenceCases.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(workplaceViolenceCases.currentPhase);

  // Comparar y detectar aumentos >50%
  for (const recent of recentCases) {
    const previous = previousCases.find(
      (p: any) => p.caseType === recent.caseType
    );
    const previousCount = previous?.count || 0;
    const increase =
      previousCount > 0
        ? ((recent.count - previousCount) / previousCount) * 100
        : 100;

    if (increase > 50 && recent.count >= 3) {
      // Generar sugerencias con IA
      const suggestions = await generateSuggestions({
        type: "case_surge",
        caseType: recent.caseType,
        recentCount: recent.count,
        previousCount,
        increase: increase.toFixed(2),
      });

      const severity =
        increase > 100 ? "critical" : increase > 75 ? "high" : "medium";

      alerts.push({
        alertType: "case_surge" as const,
        severity: severity as "critical" | "high" | "medium" | "low",
        title: `Aumento anormal de casos en fase ${recent.caseType}`,
        description: `Se detectó un aumento del ${increase.toFixed(2)}% en casos en fase ${recent.caseType} (${previousCount} → ${recent.count} casos en los últimos 30 días).`,
        context: {
          caseType: recent.caseType,
          recentCount: recent.count,
          previousCount,
          increase: increase.toFixed(2),
          period: "30 días",
        },
        suggestions,
        status: "active" as const,
      });
    }
  }

  return alerts;
}

/**
 * Detectar caída en satisfacción de capacitaciones
 */
async function detectSatisfactionDrop(db: any, thirtyDaysAgo: Date) {
  const alerts = [];

  // Obtener evaluaciones recientes por capacitación
  const recentEvaluations = await db
    .select({
      trainingId: trainingAssignments.trainingId,
      avgSatisfaction: sql<number>`AVG(${trainingEvaluations.overallSatisfaction})`,
      count: count(),
    })
    .from(trainingEvaluations)
    .leftJoin(
      trainingAssignments,
      eq(trainingEvaluations.assignmentId, trainingAssignments.id)
    )
    .where(gte(trainingEvaluations.createdAt, thirtyDaysAgo))
    .groupBy(trainingAssignments.trainingId);

  // Detectar capacitaciones con satisfacción <3.5
  for (const evaluation of recentEvaluations) {
    if (evaluation.avgSatisfaction < 3.5 && evaluation.count >= 3) {
      // Generar sugerencias con IA
      const suggestions = await generateSuggestions({
        type: "training_satisfaction_drop",
        trainingId: evaluation.trainingId,
        avgSatisfaction: evaluation.avgSatisfaction,
        evaluationCount: evaluation.count,
      });

      const severity =
        evaluation.avgSatisfaction < 2.5
          ? "critical"
          : evaluation.avgSatisfaction < 3
            ? "high"
            : "medium";

      alerts.push({
        alertType: "training_satisfaction_drop" as const,
        severity: severity as "critical" | "high" | "medium" | "low",
        title: `Baja satisfacción en capacitación`,
        description: `La capacitación tiene una calificación promedio de ${evaluation.avgSatisfaction.toFixed(2)}/5 en las últimas ${evaluation.count} evaluaciones.`,
        context: {
          trainingId: evaluation.trainingId,
          avgSatisfaction: evaluation.avgSatisfaction,
          evaluationCount: evaluation.count,
          threshold: 3.5,
        },
        suggestions,
        status: "active" as const,
      });
    }
  }

  return alerts;
}

/**
 * Detectar recomendaciones sin implementar >30 días
 */
async function detectPendingRecommendations(db: any, thirtyDaysAgo: Date) {
  const alerts = [];

  // Obtener recomendaciones pendientes >30 días
  const pendingRecommendations = await db
    .select()
    .from(recommendationsTracking)
    .where(
      and(
        eq(recommendationsTracking.status, "pending"),
        lt(recommendationsTracking.createdAt, thirtyDaysAgo)
      )
    );

  if (pendingRecommendations.length >= 5) {
    // Generar sugerencias con IA
    const suggestions = await generateSuggestions({
      type: "pending_recommendations",
      count: pendingRecommendations.length,
      oldestDate: pendingRecommendations[0]?.createdAt,
    });

    const severity = pendingRecommendations.length > 10 ? "high" : "medium";

    alerts.push({
      alertType: "pending_recommendations" as const,
      severity: severity as "critical" | "high" | "medium" | "low",
      title: `Recomendaciones sin implementar`,
      description: `Hay ${pendingRecommendations.length} recomendaciones preventivas sin implementar desde hace más de 30 días.`,
      context: {
        count: pendingRecommendations.length,
        oldestDate: pendingRecommendations[0]?.createdAt,
        recommendations: pendingRecommendations.slice(0, 5).map((r: any) => ({
          id: r.id,
          title: r.title,
          priority: r.priority,
          createdAt: r.createdAt,
        })),
      },
      suggestions,
      status: "active" as const,
    });
  }

  return alerts;
}

/**
 * Generar sugerencias de intervención con IA
 */
async function generateSuggestions(context: any): Promise<any> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Eres un experto en prevención de riesgos psicosociales y gestión de recursos humanos. Genera sugerencias concretas y accionables para intervenir en situaciones de riesgo laboral.",
        },
        {
          role: "user",
          content: `Genera 3-5 sugerencias específicas de intervención para el siguiente contexto:\n\n${JSON.stringify(context, null, 2)}\n\nLas sugerencias deben ser concretas, accionables y priorizadas por impacto.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intervention_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description: "Título breve de la sugerencia",
                    },
                    description: {
                      type: "string",
                      description: "Descripción detallada de la acción",
                    },
                    priority: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                      description: "Prioridad de implementación",
                    },
                    estimatedImpact: {
                      type: "string",
                      description: "Impacto esperado de la intervención",
                    },
                  },
                  required: [
                    "title",
                    "description",
                    "priority",
                    "estimatedImpact",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return { suggestions: [] };

    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return {
      suggestions: [
        {
          title: "Revisar situación manualmente",
          description:
            "Se recomienda revisar la situación manualmente y tomar acciones apropiadas.",
          priority: "high",
          estimatedImpact: "Depende de las acciones tomadas",
        },
      ],
    };
  }
}
