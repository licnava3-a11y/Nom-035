/**
 * Router de Cumplimiento NOM-035 por Numeral
 * Gestiona checklist de requisitos y porcentajes de cumplimiento
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { complianceChecklist, complianceChecks } from "../../drizzle/schema";
import { eq, and, count, sql } from "drizzle-orm";

export const complianceNOM035Router = router({
  /**
   * Obtener porcentaje de cumplimiento por numeral
   */
  getComplianceByNumeral: protectedProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Obtener todos los items del checklist agrupados por fundamento (numeral)
        const items = await db
          .select({
            fundament: complianceChecklist.fundament,
            section: complianceChecklist.section,
            sectionName: complianceChecklist.sectionName,
            itemCode: complianceChecklist.itemCode,
            requirement: complianceChecklist.requirement,
            evidence: complianceChecklist.evidence,
          })
          .from(complianceChecklist);

        // Obtener checks completados
        const checks = await db
          .select({
            checklistItemId: complianceChecks.checklistItemId,
            isCompliant: complianceChecks.isCompliant,
          })
          .from(complianceChecks)
          .where(eq(complianceChecks.isCompliant, true));

        // Mapear checks por item ID
        const checksMap = new Map(checks.map(c => [c.checklistItemId, c.isCompliant]));

        // Agrupar por numeral (fundamento)
        const byNumeral: Record<string, { total: number; completed: number; items: any[] }> = {};

        items.forEach((item, index) => {
          const numeral = item.fundament || "Sin clasificar";
          if (!byNumeral[numeral]) {
            byNumeral[numeral] = { total: 0, completed: 0, items: [] };
          }

          const itemId = index + 1; // Asumiendo IDs secuenciales
          const isCompleted = checksMap.has(itemId);

          byNumeral[numeral].total++;
          if (isCompleted) {
            byNumeral[numeral].completed++;
          }

          byNumeral[numeral].items.push({
            ...item,
            id: itemId,
            isCompleted,
          });
        });

        // Calcular porcentajes
        const result = Object.entries(byNumeral).map(([numeral, data]) => ({
          numeral,
          total: data.total,
          completed: data.completed,
          percentage: data.total > 0 ? (data.completed / data.total) * 100 : 0,
          items: data.items,
        }));

        return result;
      } catch (error) {
        console.error("[ComplianceNOM035] Error getting compliance by numeral:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener cumplimiento",
        });
      }
    }),

  /**
   * Obtener estadísticas globales de cumplimiento
   */
  getGlobalStats: protectedProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Total de items
        const totalItems = await db
          .select({ count: count() })
          .from(complianceChecklist);

        // Items completados
        const completedItems = await db
          .select({ count: count() })
          .from(complianceChecks)
          .where(eq(complianceChecks.isCompliant, true));

        const total = totalItems[0]?.count || 0;
        const completed = completedItems[0]?.count || 0;
        const percentage = total > 0 ? (completed / total) * 100 : 0;

        // Determinar nivel de cumplimiento
        let level: "low" | "medium" | "high" = "low";
        if (percentage >= 80) {
          level = "high";
        } else if (percentage >= 50) {
          level = "medium";
        }

        return {
          total,
          completed,
          pending: total - completed,
          percentage,
          level,
        };
      } catch (error) {
        console.error("[ComplianceNOM035] Error getting global stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener estadísticas",
        });
      }
    }),

  /**
   * Marcar item como completado
   */
  markAsCompleted: protectedProcedure
    .input(
      z.object({
        checklistItemId: z.number(),
        notes: z.string().optional(),
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

        // Verificar si ya existe un check
        const existing = await db
          .select()
          .from(complianceChecks)
          .where(eq(complianceChecks.checklistItemId, input.checklistItemId))
          .limit(1);

        if (existing.length > 0) {
          // Actualizar existente
          await db
            .update(complianceChecks)
            .set({
              isCompliant: true,
              verifiedBy: ctx.user.id,
              verifiedAt: new Date(),
              notes: input.notes || null,
              updatedAt: new Date(),
            })
            .where(eq(complianceChecks.id, existing[0].id));
        } else {
          // Crear nuevo
          await db.insert(complianceChecks).values({
            checklistItemId: input.checklistItemId,
            isCompliant: true,
            verifiedBy: ctx.user.id,
            verifiedAt: new Date(),
            notes: input.notes || null,
          });
        }

        return { success: true };
      } catch (error) {
        console.error("[ComplianceNOM035] Error marking as completed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al marcar como completado",
        });
      }
    }),

  /**
   * Desmarcar item como completado
   */
  markAsIncomplete: protectedProcedure
    .input(
      z.object({
        checklistItemId: z.number(),
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

        // Buscar check existente
        const existing = await db
          .select()
          .from(complianceChecks)
          .where(eq(complianceChecks.checklistItemId, input.checklistItemId))
          .limit(1);

        if (existing.length > 0) {
          // Actualizar a no compliant
          await db
            .update(complianceChecks)
            .set({
              isCompliant: false,
              updatedAt: new Date(),
            })
            .where(eq(complianceChecks.id, existing[0].id));
        }

        return { success: true };
      } catch (error) {
        console.error("[ComplianceNOM035] Error marking as incomplete:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al desmarcar",
        });
      }
    }),
});
