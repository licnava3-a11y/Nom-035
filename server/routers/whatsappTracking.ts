import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { whatsappTrackingEvents } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq, sql, and, gte, lte } from "drizzle-orm";

/**
 * Router para tracking de conversiones de WhatsApp
 * Registra clics, normativas solicitadas y genera métricas
 */
export const whatsappTrackingRouter = router({
  /**
   * Registrar evento de tracking (público, puede ser anónimo)
   */
  trackEvent: publicProcedure
    .input(
      z.object({
        eventType: z.enum(["click", "demo_request", "contact_request"]),
        normativas: z.array(z.string()).optional(),
        userData: z
          .object({
            nombre: z.string().optional(),
            email: z.string().optional(),
            empresa: z.string().optional(),
            telefono: z.string().optional(),
          })
          .optional(),
        metadata: z
          .object({
            userAgent: z.string().optional(),
            referrer: z.string().optional(),
            source: z.string().optional(),
            buttonVariant: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener userId si está autenticado
      const userId = ctx.user?.id || null;

      // Insertar evento de tracking
      const [result] = await db.insert(whatsappTrackingEvents).values({
        userId,
        eventType: input.eventType,
        normativas: input.normativas || null,
        userData: input.userData || null,
        metadata: input.metadata || null,
        userAgent: input.metadata?.userAgent || null,
        ipAddress: null, // Se puede obtener del request en producción
        conversionStatus: "pending",
      });

      return {
        success: true,
        eventId: result.insertId,
      };
    }),

  /**
   * Obtener métricas generales de conversión
   */
  getConversionMetrics: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          eventType: z.enum(["click", "demo_request", "contact_request"]).optional(),
          conversionStatus: z.enum(["pending", "converted", "lost"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Construir condiciones de filtros
      const conditions = [];
      if (input?.startDate) {
        conditions.push(gte(whatsappTrackingEvents.createdAt, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(whatsappTrackingEvents.createdAt, new Date(input.endDate)));
      }
      if (input?.eventType) {
        conditions.push(eq(whatsappTrackingEvents.eventType, input.eventType));
      }
      if (input?.conversionStatus) {
        conditions.push(eq(whatsappTrackingEvents.conversionStatus, input.conversionStatus));
      }

      // Total de eventos
      const [totalResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(whatsappTrackingEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const totalEvents = Number(totalResult?.count || 0);

      // Eventos por tipo
      const eventsByType = await db
        .select({
          eventType: whatsappTrackingEvents.eventType,
          count: sql<number>`COUNT(*)`,
        })
        .from(whatsappTrackingEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(whatsappTrackingEvents.eventType);

      // Conversiones (solo si no se filtra por conversionStatus)
      const convertedConditions = [...conditions];
      if (!input?.conversionStatus) {
        convertedConditions.push(eq(whatsappTrackingEvents.conversionStatus, "converted"));
      }
      
      const [convertedResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(whatsappTrackingEvents)
        .where(convertedConditions.length > 0 ? and(...convertedConditions) : undefined);

      const totalConverted = Number(convertedResult?.count || 0);
      const conversionRate = totalEvents > 0 ? (totalConverted / totalEvents) * 100 : 0;

      return {
        totalEvents,
        totalConverted,
        conversionRate: Number(conversionRate.toFixed(2)),
        eventsByType: eventsByType.map((e) => ({
          eventType: e.eventType,
          count: Number(e.count),
        })),
      };
    }),

  /**
   * Obtener popularidad de normativas
   */
  getNormativasPopularity: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          eventType: z.enum(["click", "demo_request", "contact_request"]).optional(),
          conversionStatus: z.enum(["pending", "converted", "lost"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Construir condiciones de filtros
      const conditions = [];
      if (input?.startDate) {
        conditions.push(gte(whatsappTrackingEvents.createdAt, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(whatsappTrackingEvents.createdAt, new Date(input.endDate)));
      }
      if (input?.eventType) {
        conditions.push(eq(whatsappTrackingEvents.eventType, input.eventType));
      }
      if (input?.conversionStatus) {
        conditions.push(eq(whatsappTrackingEvents.conversionStatus, input.conversionStatus));
      }

      // Obtener todos los eventos con normativas
      const events = await db
        .select({
          normativas: whatsappTrackingEvents.normativas,
        })
        .from(whatsappTrackingEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Contar normativas manualmente (JSON array)
      const normativasCount: Record<string, number> = {};

      events.forEach((event) => {
        if (event.normativas && Array.isArray(event.normativas)) {
          event.normativas.forEach((normativa: string) => {
            normativasCount[normativa] = (normativasCount[normativa] || 0) + 1;
          });
        }
      });

      // Convertir a array y ordenar por popularidad
      const normativasArray = Object.entries(normativasCount)
        .map(([normativa, count]) => ({
          normativa,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      return normativasArray;
    }),

  /**
   * Obtener tendencias de conversión por período
   */
  getConversionTrends: protectedProcedure
    .input(
      z.object({
        period: z.enum(["day", "week", "month"]).default("day"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        eventType: z.enum(["click", "demo_request", "contact_request"]).optional(),
        conversionStatus: z.enum(["pending", "converted", "lost"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Construir condiciones de filtros
      const conditions = [];
      if (input.startDate) {
        conditions.push(gte(whatsappTrackingEvents.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(whatsappTrackingEvents.createdAt, new Date(input.endDate)));
      }
      if (input.eventType) {
        conditions.push(eq(whatsappTrackingEvents.eventType, input.eventType));
      }
      if (input.conversionStatus) {
        conditions.push(eq(whatsappTrackingEvents.conversionStatus, input.conversionStatus));
      }

      // Formato de fecha según período
      let dateFormat: string;
      switch (input.period) {
        case "day":
          dateFormat = "%Y-%m-%d";
          break;
        case "week":
          dateFormat = "%Y-%u"; // Año-semana
          break;
        case "month":
          dateFormat = "%Y-%m";
          break;
      }

      // Agrupar por período
      const trends = await db
        .select({
          period: sql<string>`DATE_FORMAT(${whatsappTrackingEvents.createdAt}, ${dateFormat})`,
          totalEvents: sql<number>`COUNT(*)`,
          conversions: sql<number>`SUM(CASE WHEN ${whatsappTrackingEvents.conversionStatus} = 'converted' THEN 1 ELSE 0 END)`,
        })
        .from(whatsappTrackingEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sql`DATE_FORMAT(${whatsappTrackingEvents.createdAt}, ${dateFormat})`)
        .orderBy(sql`DATE_FORMAT(${whatsappTrackingEvents.createdAt}, ${dateFormat})`);

      return trends.map((t) => ({
        period: t.period,
        totalEvents: Number(t.totalEvents),
        conversions: Number(t.conversions),
        conversionRate:
          Number(t.totalEvents) > 0
            ? Number(((Number(t.conversions) / Number(t.totalEvents)) * 100).toFixed(2))
            : 0,
      }));
    }),

  /**
   * Obtener eventos recientes
   */
  getRecentEvents: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        eventType: z.enum(["click", "demo_request", "contact_request"]).optional(),
        conversionStatus: z.enum(["pending", "converted", "lost"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Construir condiciones de filtros
      const conditions = [];
      if (input.startDate) {
        conditions.push(gte(whatsappTrackingEvents.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(whatsappTrackingEvents.createdAt, new Date(input.endDate)));
      }
      if (input.eventType) {
        conditions.push(eq(whatsappTrackingEvents.eventType, input.eventType));
      }
      if (input.conversionStatus) {
        conditions.push(eq(whatsappTrackingEvents.conversionStatus, input.conversionStatus));
      }

      const events = await db
        .select()
        .from(whatsappTrackingEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(whatsappTrackingEvents.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Contar total con filtros
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(whatsappTrackingEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = Number(countResult?.count || 0);

      return {
        events,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Actualizar estado de conversión de un evento
   */
  updateConversionStatus: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        status: z.enum(["pending", "converted", "lost"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Solo admin puede actualizar estado
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden actualizar estado de conversión",
        });
      }

      await db
        .update(whatsappTrackingEvents)
        .set({
          conversionStatus: input.status,
          convertedAt: input.status === "converted" ? new Date() : null,
          notes: input.notes || null,
        })
        .where(eq(whatsappTrackingEvents.id, input.eventId));

      return { success: true };
    }),
});
