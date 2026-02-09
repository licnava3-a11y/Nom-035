/**
 * Router tRPC de Notificaciones
 * Gestión de notificaciones en tiempo real
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notifications, surveyResponses } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export const notificationsRouter = router({
  /**
   * Obtener todas las notificaciones del usuario actual
   */
  getAll: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id));

      return {
        notifications: userNotifications,
        total: total[0]?.count || 0,
      };
    }),

  /**
   * Obtener notificaciones no leídas
   */
  getUnread: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );

    return {
      notifications: unreadNotifications,
      count: unreadCount[0]?.count || 0,
    };
  }),

  /**
   * Marcar notificación como leída
   */
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  /**
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, ctx.user.id));

    return { success: true };
  }),

  /**
   * Eliminar notificación
   */
  delete: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  /**
   * Verificar casos críticos y crear notificaciones
   * (Se ejecutará automáticamente cada 5 minutos)
   */
  checkCriticalCases: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar casos críticos recientes (últimas 24 horas)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Nota: surveyResponses no tiene puntajeTotal, se calcula en results JSON
    // Por ahora retornamos casos recientes para demostración
    const criticalCases = await db
      .select()
      .from(surveyResponses)
      .where(gte(surveyResponses.startedAt, twentyFourHoursAgo))
      .limit(10);

    let notificationsCreated = 0;

    for (const caso of criticalCases) {
      // Verificar si ya existe notificación para este caso
      const existingNotification = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.user.id),
            eq(notifications.type, 'new_case'),
            eq(notifications.relatedEntityId, caso.id)
          )
        )
        .limit(1);

      if (existingNotification.length === 0) {
        // Crear notificación
        await db.insert(notifications).values({
          userId: caso.userId || ctx.user.id,
          type: 'new_case',
          title: 'Nueva Evaluación Completada',
          message: `Se ha completado una nueva evaluación. CURP: ${caso.curp || 'N/A'}`,
          relatedEntityType: 'survey_response',
          relatedEntityId: caso.id,
          isRead: false,
        });

        notificationsCreated++;
      }
    }

    return {
      success: true,
      casesChecked: criticalCases.length,
      notificationsCreated,
    };
  }),
});
