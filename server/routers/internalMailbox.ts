import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { internalMessages, notifications } from "../../drizzle/schema";
import { eq, desc, and, isNotNull, isNull, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { emitNotificationToUser } from "../_core/websocket";

export const internalMailboxRouter = router({
  list: protectedProcedure
    .input(z.object({
      category: z.enum(["sugerencia", "queja", "felicitacion", "capacitacion", "otro", "all"]).default("all"),
      status: z.enum(["nuevo", "en_proceso", "resuelto", "cerrado", "all"]).default("all"),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const rows = await db.select().from(internalMessages)
        .orderBy(desc(internalMessages.createdAt))
        .limit(input.limit);
      return rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [msg] = await db.select().from(internalMessages)
        .where(eq(internalMessages.id, input.id)).limit(1);
      if (!msg) throw new TRPCError({ code: "NOT_FOUND", message: "Mensaje no encontrado" });
      return msg;
    }),

  create: protectedProcedure
    .input(z.object({
      category: z.enum(["sugerencia", "queja", "felicitacion", "capacitacion", "otro"]),
      subject: z.string().min(3).max(200),
      body: z.string().min(10),
      priority: z.enum(["baja", "normal", "alta", "urgente"]).default("normal"),
      isAnonymous: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db.insert(internalMessages).values({
        senderId: input.isAnonymous ? null : ctx.user.id,
        category: input.category,
        subject: input.subject,
        body: input.body,
        priority: input.priority,
        isAnonymous: input.isAnonymous,
        status: "nuevo",
      });
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["nuevo", "en_proceso", "resuelto", "cerrado"]),
      assignedTo: z.number().optional(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [current] = await db.select().from(internalMessages)
        .where(eq(internalMessages.id, input.id)).limit(1);
      await db.update(internalMessages)
        .set({ status: input.status, assignedTo: input.assignedTo || null })
        .where(eq(internalMessages.id, input.id));
      if (current) {
        const prevStatus = current.status ?? "desconocido";
        const noteContent = [
          `Cambio de estado: ${prevStatus} → ${input.status}`,
          input.reason ? `Motivo: ${input.reason}` : null,
          `Por: ${ctx.user.name ?? ctx.user.id}`,
        ].filter(Boolean).join(" | ");
        await db.insert(notifications).values({
          userId: ctx.user.id,
          type: "mailbox_status_change",
          title: `Estado actualizado: ${input.status}`,
          message: noteContent,
          relatedEntityType: "mailbox",
          relatedEntityId: input.id,
          isRead: false,
        });
      }
      return { success: true };
    }),

  respond: protectedProcedure
    .input(z.object({
      id: z.number(),
      responseBody: z.string().min(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Update message with response
      await db.update(internalMessages)
        .set({
          responseBody: input.responseBody,
          respondedBy: ctx.user.id,
          respondedAt: new Date(),
          status: "resuelto",
        })
        .where(eq(internalMessages.id, input.id));

      // Fetch the updated message to get sender info
      const [msg] = await db.select().from(internalMessages)
        .where(eq(internalMessages.id, input.id)).limit(1);

      // Send WebSocket push notification to original sender (if not anonymous)
      if (msg && msg.senderId && !msg.isAnonymous) {
        const categoryLabels: Record<string, string> = {
          sugerencia: "Sugerencia",
          queja: "Queja",
          felicitacion: "Felicitación",
          capacitacion: "Solicitud de Capacitación",
          otro: "Mensaje",
        };
        const categoryLabel = categoryLabels[msg.category] || "Mensaje";
        const notifTitle = `Tu ${categoryLabel} ha sido respondida`;
        const notifMsg = `El responsable respondió tu mensaje "${msg.subject}": ${input.responseBody.substring(0, 120)}${input.responseBody.length > 120 ? "..." : ""}`;

        // Persist notification in BD
        const inserted = await db.insert(notifications).values({
          userId: msg.senderId,
          type: "mailbox_status_change",
          title: notifTitle,
          message: notifMsg,
          relatedEntityType: "mailbox",
          relatedEntityId: input.id,
          isRead: false,
        }).$returningId();

        const notifId = Array.isArray(inserted) ? inserted[0]?.id : (inserted as any)?.id;
        if (notifId) {
          emitNotificationToUser(msg.senderId, {
            id: notifId,
            type: "mailbox_status_change",
            title: notifTitle,
            message: `El responsable respondió tu mensaje "${msg.subject}".`,
            read: false,
            createdAt: new Date(),
          });
        }
      }

      return { success: true };
    }),

  // Employee view: see own messages with unread indicator
  myMessages: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const rows = await db.select().from(internalMessages)
        .where(eq(internalMessages.senderId, ctx.user.id))
        .orderBy(desc(internalMessages.createdAt))
        .limit(input.limit);
      return rows;
    }),

  // Mark a message response as read (clear unread indicator)
  markResponseRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db.update(internalMessages)
        .set({ responseReadAt: new Date() })
        .where(and(
          eq(internalMessages.id, input.id),
          eq(internalMessages.senderId, ctx.user.id)
        ));
      return { success: true };
    }),

  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
    const all = await db.select().from(internalMessages);
    const total = all.length;
    const nuevo = all.filter(m => m.status === "nuevo").length;
    const en_proceso = all.filter(m => m.status === "en_proceso").length;
    const resuelto = all.filter(m => m.status === "resuelto").length;
    const cerrado = all.filter(m => m.status === "cerrado").length;
    const byCategory = {
      sugerencia: all.filter(m => m.category === "sugerencia").length,
      queja: all.filter(m => m.category === "queja").length,
      felicitacion: all.filter(m => m.category === "felicitacion").length,
      capacitacion: all.filter(m => m.category === "capacitacion").length,
      otro: all.filter(m => m.category === "otro").length,
    };
    return { total, nuevo, en_proceso, resuelto, cerrado, byCategory };
  }),

  /**
   * Historial de notificaciones enviadas al empleado para un mensaje específico
   */
  getNotificationHistory: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Fetch the message to get senderId
      const [msg] = await db.select().from(internalMessages)
        .where(eq(internalMessages.id, input.messageId)).limit(1);
      if (!msg || !msg.senderId) return { history: [], total: 0 };

      const history = await db.select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        createdAt: notifications.createdAt,
        isRead: notifications.isRead,
      })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, msg.senderId),
            eq(notifications.type, "mailbox_status_change"),
            eq(notifications.relatedEntityId, input.messageId),
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(20);

      return { history, total: history.length };
    }),

  /**
   * Consultar la última notificación enviada al empleado para un mensaje (para el modal de aviso 24h)
   */
  getLastNotification: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [msg] = await db.select().from(internalMessages)
        .where(eq(internalMessages.id, input.messageId)).limit(1);
      if (!msg || !msg.senderId) return { lastNotification: null, blockedUntil: null, isBlocked: false };

      const [last] = await db.select({
        id: notifications.id,
        createdAt: notifications.createdAt,
      })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, msg.senderId),
            eq(notifications.type, "mailbox_status_change"),
            eq(notifications.relatedEntityId, input.messageId),
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      if (!last) return { lastNotification: null, blockedUntil: null, isBlocked: false };

      const lastTs = new Date(last.createdAt).getTime();
      const blockedUntil = new Date(lastTs + 24 * 60 * 60 * 1000);
      const isBlocked = Date.now() < blockedUntil.getTime();

      return { lastNotification: last.createdAt, blockedUntil: blockedUntil.toISOString(), isBlocked };
    }),

  /**
   * Enviar notificación push al empleado remitente indicando que tiene una respuesta pendiente en Mi Buzón
   */
  notifyEmployee: protectedProcedure
    .input(z.object({
      id: z.number(),
      customMessage: z.string().max(300).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [msg] = await db.select().from(internalMessages)
        .where(eq(internalMessages.id, input.id)).limit(1);
      if (!msg) throw new TRPCError({ code: "NOT_FOUND", message: "Mensaje no encontrado" });
      if (msg.isAnonymous || !msg.senderId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No se puede notificar a un remitente anónimo" });
      }

      // Validar límite de 24 horas entre notificaciones
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentNotif] = await db.select({ id: notifications.id, createdAt: notifications.createdAt })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, msg.senderId),
            eq(notifications.type, "mailbox_status_change"),
            eq(notifications.relatedEntityId, input.id),
            gte(notifications.createdAt, cutoff),
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      if (recentNotif) {
        const blockedUntil = new Date(new Date(recentNotif.createdAt).getTime() + 24 * 60 * 60 * 1000);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Ya se envió una notificación a este empleado. Próximo envío permitido: ${blockedUntil.toLocaleString("es-MX")}.`,
        });
      }

      const categoryLabels: Record<string, string> = {
        sugerencia: "Sugerencia",
        queja: "Queja",
        felicitacion: "Felicitación",
        capacitacion: "Solicitud de Capacitación",
        otro: "Mensaje",
      };
      const categoryLabel = categoryLabels[msg.category] || "Mensaje";
      const notifTitle = `Tienes una respuesta pendiente en tu ${categoryLabel}`;
      const notifMsg = input.customMessage
        ? input.customMessage
        : `Tu ${categoryLabel} "${msg.subject}" tiene una respuesta del responsable de RH. Ingresa a Mi Buzón para leerla.`;

      const inserted = await db.insert(notifications).values({
        userId: msg.senderId,
        type: "mailbox_status_change",
        title: notifTitle,
        message: notifMsg,
        relatedEntityType: "mailbox",
        relatedEntityId: input.id,
        isRead: false,
      }).$returningId();

      const notifId = Array.isArray(inserted) ? inserted[0]?.id : (inserted as any)?.id;
      if (notifId) {
        emitNotificationToUser(msg.senderId, {
          id: notifId,
          type: "mailbox_status_change",
          title: notifTitle,
          message: notifMsg,
          read: false,
          createdAt: new Date(),
        });
      }

      return { success: true, notifiedUserId: msg.senderId };
    }),

  /** Timeline de cambios de estado de un mensaje (auditoría) */
  getStatusTimeline: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [msg] = await db.select().from(internalMessages)
        .where(eq(internalMessages.id, input.messageId)).limit(1);
      if (!msg) throw new TRPCError({ code: "NOT_FOUND", message: "Mensaje no encontrado" });
      if (ctx.user.role !== "admin" && msg.senderId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const timeline = await db.select().from(notifications)
        .where(and(
          eq(notifications.type, "mailbox_status_change"),
          eq(notifications.relatedEntityId, input.messageId)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(30);
      return timeline.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
        isRead: n.isRead,
      }));
    }),

  /** Conteo de mensajes con respuesta no leída para el badge del sidebar */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
    const unread = await db.select({ id: internalMessages.id }).from(internalMessages)
      .where(and(
        eq(internalMessages.senderId, ctx.user.id),
        isNotNull(internalMessages.responseBody),
        isNull(internalMessages.responseReadAt)
      ));
    return { count: unread.length };
  }),
});
