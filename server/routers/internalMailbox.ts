import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { internalMessages, notifications } from "../../drizzle/schema";
import { eq, desc, and, isNotNull, isNull } from "drizzle-orm";
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
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db.update(internalMessages)
        .set({ status: input.status, assignedTo: input.assignedTo || null })
        .where(eq(internalMessages.id, input.id));
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
