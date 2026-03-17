import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, createNotification } from "../db";
import { recommendationsTracking, rootCauseAnalysis, users, departments, workplaceViolenceCases } from "../../drizzle/schema";
import { eq, and, desc, sql, gte, lte, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const recommendationsTrackingRouter = router({
  /**
   * Listar recomendaciones con filtros
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        assignedTo: z.number().optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [];
      if (input.status) conditions.push(eq(recommendationsTracking.status, input.status));
      if (input.priority) conditions.push(eq(recommendationsTracking.priority, input.priority));
      if (input.assignedTo) conditions.push(eq(recommendationsTracking.assignedTo, input.assignedTo));
      if (input.category) conditions.push(eq(recommendationsTracking.category, input.category));

      const results = await db
        .select({
          recommendation: recommendationsTracking,
          analysis: rootCauseAnalysis,
          assignee: users,
          department: departments,
        })
        .from(recommendationsTracking)
        .leftJoin(rootCauseAnalysis, eq(recommendationsTracking.analysisId, rootCauseAnalysis.id))
        .leftJoin(users, eq(recommendationsTracking.assignedTo, users.id))
        .leftJoin(departments, eq(recommendationsTracking.targetDepartmentId, departments.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(recommendationsTracking.createdAt));

      return results;
    }),

  /**
   * Obtener recomendación por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [result] = await db
        .select({
          recommendation: recommendationsTracking,
          analysis: rootCauseAnalysis,
          assignee: users,
          department: departments,
        })
        .from(recommendationsTracking)
        .leftJoin(rootCauseAnalysis, eq(recommendationsTracking.analysisId, rootCauseAnalysis.id))
        .leftJoin(users, eq(recommendationsTracking.assignedTo, users.id))
        .leftJoin(departments, eq(recommendationsTracking.targetDepartmentId, departments.id))
        .where(eq(recommendationsTracking.id, input.id));

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recomendación no encontrada" });
      }

      return result;
    }),

  /**
   * Crear nueva recomendación
   */
  create: protectedProcedure
    .input(
      z.object({
        analysisId: z.number(),
        recommendation: z.string(),
        priority: z.enum(["low", "medium", "high", "critical"]),
        category: z.string().optional(),
        assignedTo: z.number().optional(),
        dueDate: z.string().optional(),
        targetCaseType: z.string().optional(),
        targetDepartmentId: z.number().optional(),
        baselineCaseCount: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [newRecommendation] = await db.insert(recommendationsTracking).values({
        analysisId: input.analysisId,
        recommendation: input.recommendation,
        priority: input.priority,
        category: input.category,
        assignedTo: input.assignedTo,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        targetCaseType: input.targetCaseType,
        targetDepartmentId: input.targetDepartmentId,
        baselineCaseCount: input.baselineCaseCount,
        notes: input.notes,
      });

      // Notificar al responsable asignado
      if (input.assignedTo) {
        await createNotification({
          userId: input.assignedTo,
          type: "system",
          title: "Nueva Recomendación Asignada",
          message: `Se te ha asignado una nueva recomendación: ${input.recommendation.substring(0, 100)}...`,
        });
      }

      return { id: newRecommendation.insertId, message: "Recomendación creada exitosamente" };
    }),

  /**
   * Actualizar recomendación
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        recommendation: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        category: z.string().optional(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        assignedTo: z.number().optional(),
        dueDate: z.string().optional(),
        completionDate: z.string().optional(),
        currentCaseCount: z.number().optional(),
        notes: z.string().optional(),
        evidenceUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener recomendación actual
      const [current] = await db
        .select()
        .from(recommendationsTracking)
        .where(eq(recommendationsTracking.id, input.id));

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recomendación no encontrada" });
      }

      // Calcular porcentaje de reducción si se actualiza currentCaseCount
      let reductionPercentage = current.reductionPercentage;
      if (input.currentCaseCount !== undefined && current.baselineCaseCount) {
        const reduction = ((current.baselineCaseCount - input.currentCaseCount) / current.baselineCaseCount) * 100;
        reductionPercentage = reduction.toFixed(2);
      }

      const updateData: any = {};
      if (input.recommendation !== undefined) updateData.recommendation = input.recommendation;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
      if (input.completionDate !== undefined) updateData.completionDate = input.completionDate;
      if (input.currentCaseCount !== undefined) updateData.currentCaseCount = input.currentCaseCount;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.evidenceUrls !== undefined) updateData.evidenceUrls = input.evidenceUrls;
      if (reductionPercentage !== current.reductionPercentage) updateData.reductionPercentage = reductionPercentage;

      await db
        .update(recommendationsTracking)
        .set(updateData)
        .where(eq(recommendationsTracking.id, input.id));

      // Notificar si se cambió el responsable
      if (input.assignedTo && input.assignedTo !== current.assignedTo) {
        await createNotification({
          userId: input.assignedTo,
          type: "system",
          title: "Recomendación Reasignada",
          message: `Se te ha asignado una recomendación: ${current.recommendation.substring(0, 100)}...`,
        });
      }

      return { message: "Recomendación actualizada exitosamente" };
    }),

  /**
   * Eliminar recomendación
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.delete(recommendationsTracking).where(eq(recommendationsTracking.id, input.id));

      return { message: "Recomendación eliminada exitosamente" };
    }),

  /**
   * Obtener dashboard de KPIs
   */
  getDashboard: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Estadísticas generales
    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        pending: sql<number>`SUM(CASE WHEN ${recommendationsTracking.status} = 'pending' THEN 1 ELSE 0 END)`,
        inProgress: sql<number>`SUM(CASE WHEN ${recommendationsTracking.status} = 'in_progress' THEN 1 ELSE 0 END)`,
        completed: sql<number>`SUM(CASE WHEN ${recommendationsTracking.status} = 'completed' THEN 1 ELSE 0 END)`,
        cancelled: sql<number>`SUM(CASE WHEN ${recommendationsTracking.status} = 'cancelled' THEN 1 ELSE 0 END)`,
        critical: sql<number>`SUM(CASE WHEN ${recommendationsTracking.priority} = 'critical' THEN 1 ELSE 0 END)`,
        high: sql<number>`SUM(CASE WHEN ${recommendationsTracking.priority} = 'high' THEN 1 ELSE 0 END)`,
        avgReduction: sql<number>`AVG(${recommendationsTracking.reductionPercentage})`,
      })
      .from(recommendationsTracking);

    // Recomendaciones próximas a vencer (7 días)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingDeadlines = await db
      .select({
        recommendation: recommendationsTracking,
        assignee: users,
      })
      .from(recommendationsTracking)
      .leftJoin(users, eq(recommendationsTracking.assignedTo, users.id))
      .where(
        and(
          sql`${recommendationsTracking.status} IN ('pending', 'in_progress')`,
          sql`${recommendationsTracking.dueDate} IS NOT NULL`,
          sql`${recommendationsTracking.dueDate} <= ${sevenDaysFromNow.toISOString().split("T")[0]}`
        )
      )
      .orderBy(recommendationsTracking.dueDate)
      .limit(10);

    // Recomendaciones más efectivas (mayor reducción)
    const topEffective = await db
      .select({
        recommendation: recommendationsTracking,
        department: departments,
      })
      .from(recommendationsTracking)
      .leftJoin(departments, eq(recommendationsTracking.targetDepartmentId, departments.id))
      .where(
        and(
          eq(recommendationsTracking.status, "completed"),
          sql`${recommendationsTracking.reductionPercentage} IS NOT NULL`
        )
      )
      .orderBy(desc(recommendationsTracking.reductionPercentage))
      .limit(5);

    // Distribución por categoría
    const byCategory = await db
      .select({
        category: recommendationsTracking.category,
        count: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN ${recommendationsTracking.status} = 'completed' THEN 1 ELSE 0 END)`,
      })
      .from(recommendationsTracking)
      .groupBy(recommendationsTracking.category)
      .orderBy(desc(sql`COUNT(*)`));

    return {
      stats,
      upcomingDeadlines,
      topEffective,
      byCategory,
    };
  }),

  /**
   * Actualizar métricas de efectividad manualmente
   */
  updateEffectiveness: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        currentCaseCount: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [current] = await db
        .select()
        .from(recommendationsTracking)
        .where(eq(recommendationsTracking.id, input.id));

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recomendación no encontrada" });
      }

      if (!current.baselineCaseCount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No se ha establecido un baseline de casos" });
      }

      const reduction = ((current.baselineCaseCount - input.currentCaseCount) / current.baselineCaseCount) * 100;
      const reductionPercentage = reduction.toFixed(2);

      await db
        .update(recommendationsTracking)
        .set({
          currentCaseCount: input.currentCaseCount,
          reductionPercentage,
        })
        .where(eq(recommendationsTracking.id, input.id));

      return {
        message: "Métricas actualizadas exitosamente",
        reductionPercentage: parseFloat(reductionPercentage),
      };
    }),

  /**
   * Calcular efectividad automáticamente
   */
  calculateEffectiveness: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [recommendation] = await db
        .select()
        .from(recommendationsTracking)
        .where(eq(recommendationsTracking.id, input.id));

      if (!recommendation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recomendación no encontrada" });
      }

      if (!recommendation.targetCaseType) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No se ha especificado un tipo de caso objetivo" });
      }

      // Contar casos actuales del tipo objetivo en workplace_violence_cases
      // Nota: Esta es una implementación simplificada. Ajustar según la estructura real de casos.
      const [caseCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workplaceViolenceCases)
        .where(sql`1=1`);

      const currentCount = caseCount.count || 0;

      // Calcular reducción si hay baseline
      let reductionPercentage = null;
      if (recommendation.baselineCaseCount) {
        const reduction = ((recommendation.baselineCaseCount - currentCount) / recommendation.baselineCaseCount) * 100;
        reductionPercentage = reduction.toFixed(2);
      }

      await db
        .update(recommendationsTracking)
        .set({
          currentCaseCount: currentCount,
          reductionPercentage,
        })
        .where(eq(recommendationsTracking.id, input.id));

      return {
        message: "Efectividad calculada exitosamente",
        currentCaseCount: currentCount,
        reductionPercentage: reductionPercentage ? parseFloat(reductionPercentage) : null,
      };
    }),
});
