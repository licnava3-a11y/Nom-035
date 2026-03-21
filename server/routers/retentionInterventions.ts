/**
 * Router de Intervenciones de Retención
 * Gestiona intervenciones aplicadas a empleados de alto riesgo de rotación
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { retentionInterventions } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export const retentionInterventionsRouter = router({
  /**
   * Crear intervención de retención
   */
  createIntervention: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        employeeName: z.string(),
        employeePosition: z.string().optional(),
        department: z.string().optional(),
        interventionType: z.enum(["training", "salary_adjustment", "position_change", "benefits", "recognition", "other"]),
        interventionDescription: z.string(),
        cost: z.number().optional(),
        implementationDate: z.string(), // YYYY-MM-DD
        riskScoreBefore: z.number().optional(),
        turnoverProbabilityBefore: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        await (db.insert(retentionInterventions) as any).values({
          ...input,
          implementationDate: new Date(input.implementationDate),
          createdBy: ctx.user?.id,
        });

        return { success: true, message: "Intervención registrada exitosamente" };
      } catch (error: any) {
        console.error("Error al crear intervención:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al crear intervención",
        });
      }
    }),

  /**
   * Actualizar outcome de intervención
   */
  updateOutcome: protectedProcedure
    .input(
      z.object({
        interventionId: z.number(),
        riskScoreAfter: z.number().optional(),
        turnoverProbabilityAfter: z.number().optional(),
        outcome: z.enum(["retained", "left", "pending"]),
        outcomeDate: z.string().optional(),
        outcomeNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Obtener intervención actual
        const [intervention] = await db
          .select()
          .from(retentionInterventions)
          .where(eq(retentionInterventions.id, input.interventionId));

        if (!intervention) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Intervención no encontrada",
          });
        }

        // Calcular reducción de riesgo y efectividad
        let riskReduction = null;
        let effectivenessScore = null;

        if (input.riskScoreAfter && intervention.riskScoreBefore) {
          const before = parseFloat(intervention.riskScoreBefore);
          const after = input.riskScoreAfter;
          riskReduction = ((before - after) / before) * 100;
          
          // Effectiveness score basado en reducción de riesgo y outcome
          if (input.outcome === "retained") {
            effectivenessScore = Math.min(100, riskReduction + 20); // Bonus por retención
          } else if (input.outcome === "left") {
            effectivenessScore = Math.max(0, riskReduction - 30); // Penalización por salida
          } else {
            effectivenessScore = riskReduction;
          }
        }

        await db
          .update(retentionInterventions)
          .set({
            riskScoreAfter: input.riskScoreAfter?.toString(),
            turnoverProbabilityAfter: input.turnoverProbabilityAfter?.toString(),
            outcome: input.outcome,
            outcomeDate: input.outcomeDate ? new Date(input.outcomeDate) : undefined,
            outcomeNotes: input.outcomeNotes,
            riskReduction: riskReduction?.toFixed(2),
            effectivenessScore: effectivenessScore?.toFixed(2),
          } as any)
          .where(eq(retentionInterventions.id, input.interventionId));

        return { success: true, message: "Outcome actualizado exitosamente" };
      } catch (error: any) {
        console.error("Error al actualizar outcome:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al actualizar outcome",
        });
      }
    }),

  /**
   * Obtener intervenciones
   */
  getInterventions: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        outcome: z.enum(["retained", "left", "pending", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        let query: any = db.select().from(retentionInterventions);

        if (input.outcome !== "all") {
          query = query.where(eq(retentionInterventions.outcome, input.outcome)) as any;
        }

        const interventions = await query
          .orderBy(desc(retentionInterventions.implementationDate))
          .limit(input.limit);

        return interventions;
      } catch (error: any) {
        console.error("Error al obtener intervenciones:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al obtener intervenciones",
        });
      }
    }),

  /**
   * Obtener estadísticas de efectividad
   */
  getEffectivenessStats: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const allInterventions = await db.select().from(retentionInterventions);

      const totalInterventions = allInterventions.length;
      const retainedCount = allInterventions.filter(i => i.outcome === "retained").length;
      const leftCount = allInterventions.filter(i => i.outcome === "left").length;
      const pendingCount = allInterventions.filter(i => i.outcome === "pending" || !i.outcome).length;

      const retentionRate = totalInterventions > 0 
        ? ((retainedCount / (retainedCount + leftCount)) * 100).toFixed(1)
        : "0";

      // Efectividad promedio por tipo de intervención
      const interventionTypes = ["training", "salary_adjustment", "position_change", "benefits", "recognition", "other"];
      const effectivenessByType = interventionTypes.map(type => {
        const typeInterventions = allInterventions.filter(i => i.interventionType === type);
        const avgEffectiveness = typeInterventions.length > 0
          ? typeInterventions
              .filter(i => i.effectivenessScore)
              .reduce((acc: any, i: any) => acc + parseFloat(i.effectivenessScore || "0"), 0) / typeInterventions.length
          : 0;

        return {
          type,
          count: typeInterventions.length,
          avgEffectiveness: avgEffectiveness.toFixed(1),
          retainedCount: typeInterventions.filter(i => i.outcome === "retained").length,
        };
      });

      // Costo total y ROI
      const totalCost = allInterventions
        .filter(i => i.cost)
        .reduce((acc: any, i: any) => acc + parseFloat(i.cost || "0"), 0);

      const avgCostPerRetention = retainedCount > 0 ? (totalCost / retainedCount).toFixed(2) : "0";

      return {
        total: totalInterventions,
        retained: retainedCount,
        left: leftCount,
        pending: pendingCount,
        retentionRate,
        effectivenessByType,
        totalCost: totalCost.toFixed(2),
        avgCostPerRetention,
      };
    } catch (error: any) {
      console.error("Error al obtener estadísticas de efectividad:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Error al obtener estadísticas de efectividad",
      });
    }
  }),
});
