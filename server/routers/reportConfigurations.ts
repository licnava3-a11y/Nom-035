/**
 * Report Configurations Router
 * Gestiona configuración de reportes ejecutivos automatizados
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { reportConfigurations } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const reportConfigurationsRouter = router({
  /**
   * Obtener todas las configuraciones de reportes
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Solo administradores pueden ver configuraciones de reportes",
      });
    }

    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const configs = await db
      .select()
      .from(reportConfigurations)
      .orderBy(desc(reportConfigurations.createdAt));

    return configs;
  }),

  /**
   * Obtener configuración por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Solo administradores pueden ver configuraciones de reportes",
        });
      }

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [config] = await db
        .select()
        .from(reportConfigurations)
        .where(eq(reportConfigurations.id, input.id));

      if (!config) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Configuración de reporte no encontrada",
        });
      }

      return config;
    }),

  /**
   * Crear nueva configuración de reporte
   */
  create: protectedProcedure
    .input(
      z.object({
        reportType: z.string().min(1),
        frequency: z.enum(["weekly", "monthly", "quarterly", "custom"]),
        customSchedule: z.string().optional(),
        recipients: z.array(z.string().email()).min(1),
        ccRecipients: z.array(z.string().email()).optional(),
        enabled: z.boolean().default(true),
        includeCharts: z.boolean().default(true),
        includeTrends: z.boolean().default(true),
        includeRecommendations: z.boolean().default(true),
        departmentIds: z.array(z.number()).optional(),
        dateRangeType: z
          .enum(["auto", "custom", "last_7_days", "last_30_days"])
          .default("auto"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Solo administradores pueden crear configuraciones de reportes",
        });
      }

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Calcular próxima ejecución basado en frecuencia
      const nextExecutionAt = calculateNextExecution(
        input.frequency,
        input.customSchedule
      );

      const [newConfig] = await (db.insert(reportConfigurations) as any).values(
        {
          reportType: input.reportType,
          frequency: input.frequency,
          customSchedule: input.customSchedule || null,
          recipients: JSON.stringify(input.recipients),
          ccRecipients: input.ccRecipients
            ? JSON.stringify(input.ccRecipients)
            : null,
          enabled: input.enabled,
          includeCharts: input.includeCharts,
          includeTrends: input.includeTrends,
          includeRecommendations: input.includeRecommendations,
          departmentIds: input.departmentIds
            ? JSON.stringify(input.departmentIds)
            : null,
          dateRangeType: input.dateRangeType,
          nextExecutionAt,
          createdBy: ctx.user.id,
        }
      );

      return {
        success: true,
        configId: newConfig.insertId,
        message: "Configuración de reporte creada exitosamente",
      };
    }),

  /**
   * Actualizar configuración de reporte
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reportType: z.string().min(1).optional(),
        frequency: z
          .enum(["weekly", "monthly", "quarterly", "custom"])
          .optional(),
        customSchedule: z.string().optional(),
        recipients: z.array(z.string().email()).optional(),
        ccRecipients: z.array(z.string().email()).optional(),
        enabled: z.boolean().optional(),
        includeCharts: z.boolean().optional(),
        includeTrends: z.boolean().optional(),
        includeRecommendations: z.boolean().optional(),
        departmentIds: z.array(z.number()).optional(),
        dateRangeType: z
          .enum(["auto", "custom", "last_7_days", "last_30_days"])
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Solo administradores pueden actualizar configuraciones de reportes",
        });
      }

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verificar que existe
      const [existing] = await db
        .select()
        .from(reportConfigurations)
        .where(eq(reportConfigurations.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Configuración de reporte no encontrada",
        });
      }

      // Preparar datos de actualización
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.reportType) updateData.reportType = input.reportType;
      if (input.frequency) updateData.frequency = input.frequency;
      if (input.customSchedule !== undefined)
        updateData.customSchedule = input.customSchedule;
      if (input.recipients)
        updateData.recipients = JSON.stringify(input.recipients);
      if (input.ccRecipients !== undefined)
        updateData.ccRecipients = input.ccRecipients
          ? JSON.stringify(input.ccRecipients)
          : null;
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      if (input.includeCharts !== undefined)
        updateData.includeCharts = input.includeCharts;
      if (input.includeTrends !== undefined)
        updateData.includeTrends = input.includeTrends;
      if (input.includeRecommendations !== undefined)
        updateData.includeRecommendations = input.includeRecommendations;
      if (input.departmentIds !== undefined)
        updateData.departmentIds = input.departmentIds
          ? JSON.stringify(input.departmentIds)
          : null;
      if (input.dateRangeType) updateData.dateRangeType = input.dateRangeType;

      // Recalcular próxima ejecución si cambió frecuencia
      if (input.frequency || input.customSchedule !== undefined) {
        updateData.nextExecutionAt = calculateNextExecution(
          input.frequency || existing.frequency,
          input.customSchedule !== undefined
            ? input.customSchedule
            : existing.customSchedule
        );
      }

      await db
        .update(reportConfigurations)
        .set(updateData)
        .where(eq(reportConfigurations.id, input.id));

      return {
        success: true,
        message: "Configuración de reporte actualizada exitosamente",
      };
    }),

  /**
   * Eliminar configuración de reporte
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Solo administradores pueden eliminar configuraciones de reportes",
        });
      }

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .delete(reportConfigurations)
        .where(eq(reportConfigurations.id, input.id));

      return {
        success: true,
        message: "Configuración de reporte eliminada exitosamente",
      };
    }),

  /**
   * Toggle enabled/disabled
   */
  toggleEnabled: protectedProcedure
    .input(z.object({ id: z.number(), enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Solo administradores pueden modificar configuraciones de reportes",
        });
      }

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(reportConfigurations)
        .set({ enabled: input.enabled, updatedAt: new Date() } as any)
        .where(eq(reportConfigurations.id, input.id));

      return {
        success: true,
        message: `Reporte ${input.enabled ? "habilitado" : "deshabilitado"} exitosamente`,
      };
    }),
});

/**
 * Calcular próxima fecha de ejecución basado en frecuencia
 */
function calculateNextExecution(
  frequency: string,
  customSchedule?: string | null
): Date {
  const now = new Date();
  const next = new Date();

  switch (frequency) {
    case "weekly":
      // Próximo lunes a las 8am
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      next.setDate(now.getDate() + daysUntilMonday);
      next.setHours(8, 0, 0, 0);
      break;

    case "monthly":
      // Día 1 del próximo mes a las 8am
      next.setMonth(now.getMonth() + 1);
      next.setDate(1);
      next.setHours(8, 0, 0, 0);
      break;

    case "quarterly":
      // Primer día del próximo trimestre a las 8am
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const nextQuarterMonth = (currentQuarter + 1) * 3;
      next.setMonth(nextQuarterMonth);
      next.setDate(1);
      next.setHours(8, 0, 0, 0);
      break;

    case "custom":
      // Para custom schedule, retornar fecha actual + 1 día
      // (la lógica real de cron se maneja en el job)
      next.setDate(now.getDate() + 1);
      next.setHours(8, 0, 0, 0);
      break;

    default:
      next.setDate(now.getDate() + 7);
      next.setHours(8, 0, 0, 0);
  }

  return next;
}
