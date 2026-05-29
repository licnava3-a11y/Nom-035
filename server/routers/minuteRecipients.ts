import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { minuteRecipients, minuteDispatches, meetingMinutes } from "../../drizzle/schema";
import { eq, asc, like, or, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { sendDispatchEmail } from "../dispatchEmail";
import crypto from "crypto";

const recipientInput = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(255),
  email: z.string().email("Correo electrónico inválido").max(255),
  position: z.string().min(2, "El cargo debe tener al menos 2 caracteres").max(255),
  department: z.string().max(255).optional().nullable(),
});

export const minuteRecipientsRouter = router({
  // ── Listar todos los destinatarios con búsqueda y filtros ──────────────────
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        onlyActive: z.boolean().optional().default(false),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      const conditions = [];
      if (input.onlyActive) {
        conditions.push(eq(minuteRecipients.isActive, true));
      }
      if (input.search && input.search.trim() !== "") {
        const term = `%${input.search.trim()}%`;
        conditions.push(
          or(
            like(minuteRecipients.name, term),
            like(minuteRecipients.email, term),
            like(minuteRecipients.position, term),
            like(minuteRecipients.department, term)
          )
        );
      }
      const results = await db
        .select()
        .from(minuteRecipients)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(minuteRecipients.name));
      return results;
    }),

  // ── Obtener un destinatario por ID ─────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      const [recipient] = await db
        .select()
        .from(minuteRecipients)
        .where(eq(minuteRecipients.id, input.id))
        .limit(1);
      if (!recipient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Destinatario no encontrado" });
      }
      return recipient;
    }),

  // ── Crear un nuevo destinatario ────────────────────────────────────────────
  create: protectedProcedure
    .input(recipientInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      const result = await db.insert(minuteRecipients).values({
        name: input.name,
        email: input.email.toLowerCase().trim(),
        position: input.position,
        department: input.department ?? null,
        isActive: true,
      });
      return { id: Number(result[0].insertId), success: true };
    }),

  // ── Actualizar un destinatario existente ───────────────────────────────────
  update: protectedProcedure
    .input(z.object({ id: z.number(), data: recipientInput }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      await db
        .update(minuteRecipients)
        .set({
          name: input.data.name,
          email: input.data.email.toLowerCase().trim(),
          position: input.data.position,
          department: input.data.department ?? null,
        })
        .where(eq(minuteRecipients.id, input.id));
      return { success: true };
    }),

  // ── Eliminar un destinatario ───────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      await db.delete(minuteRecipients).where(eq(minuteRecipients.id, input.id));
      return { success: true };
    }),

  // ── Activar o desactivar un destinatario ───────────────────────────────────
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      await db
        .update(minuteRecipients)
        .set({ isActive: input.isActive })
        .where(eq(minuteRecipients.id, input.id));
      return { success: true };
    }),

  // ── Importación masiva desde Excel ─────────────────────────────────────────
  bulkImport: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            name: z.string().min(1),
            email: z.string().email(),
            position: z.string().min(1),
            department: z.string().nullable().optional(),
          })
        ).min(1).max(500),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      let created = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const row of input.rows) {
        try {
          const normalizedEmail = row.email.toLowerCase().trim();
          const [existing] = await db
            .select({ id: minuteRecipients.id })
            .from(minuteRecipients)
            .where(eq(minuteRecipients.email, normalizedEmail))
            .limit(1);

          if (existing) {
            await db
              .update(minuteRecipients)
              .set({
                name: row.name,
                position: row.position,
                department: row.department ?? null,
              })
              .where(eq(minuteRecipients.id, existing.id));
            updated++;
          } else {
            await db.insert(minuteRecipients).values({
              name: row.name,
              email: normalizedEmail,
              position: row.position,
              department: row.department ?? null,
              isActive: true,
            });
            created++;
          }
        } catch (e: any) {
          errors.push(`${row.email}: ${e.message}`);
        }
      }

      return { success: true, created, updated, errors, total: input.rows.length };
    }),

  // ── Historial de envíos por destinatario ───────────────────────────────────
  getDispatches: protectedProcedure
    .input(
      z.object({
        recipientId: z.number(),
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      const [recipient] = await db
        .select()
        .from(minuteRecipients)
        .where(eq(minuteRecipients.id, input.recipientId))
        .limit(1);

      if (!recipient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Destinatario no encontrado" });
      }

      const offset = (input.page - 1) * input.pageSize;

      const dispatches = await db
        .select({
          id: minuteDispatches.id,
          minuteId: minuteDispatches.minuteId,
          sentAt: minuteDispatches.sentAt,
          readAt: minuteDispatches.readAt,
          status: minuteDispatches.status,
          notes: minuteDispatches.notes,
          minuteFolio: meetingMinutes.folio,
          minuteTitle: meetingMinutes.title,
          minuteDate: meetingMinutes.meetingDate,
          minuteType: meetingMinutes.meetingType,
        })
        .from(minuteDispatches)
        .leftJoin(meetingMinutes, eq(minuteDispatches.minuteId, meetingMinutes.id))
        .where(eq(minuteDispatches.recipientId, input.recipientId))
        .orderBy(desc(minuteDispatches.sentAt))
        .limit(input.pageSize)
        .offset(offset);

      const allDispatches = await db
        .select({ id: minuteDispatches.id, readAt: minuteDispatches.readAt })
        .from(minuteDispatches)
        .where(eq(minuteDispatches.recipientId, input.recipientId));

      const total = allDispatches.length;
      const readCount = allDispatches.filter((d) => d.readAt !== null).length;

      return {
        recipient,
        dispatches,
        total,
        stats: {
          total,
          read: readCount,
          unread: total - readCount,
        },
      };
    }),

  // ── Marcar un despacho como leído ──────────────────────────────────────────
  markAsRead: protectedProcedure
    .input(z.object({ dispatchId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      await db
        .update(minuteDispatches)
        .set({ readAt: new Date(), status: "read" })
        .where(eq(minuteDispatches.id, input.dispatchId));
      return { success: true };
    }),

  // ── Panel global de despachos (todos, con filtros avanzados) ───────────────
  getAllDispatches: protectedProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
        recipientId: z.number().nullable().optional(),
        status: z.enum(["sent", "read", "bounced", "all"]).optional().default("all"),
        dateFrom: z.string().nullable().optional(), // ISO date string YYYY-MM-DD
        dateTo: z.string().nullable().optional(),   // ISO date string YYYY-MM-DD
        minuteId: z.number().nullable().optional(),
        search: z.string().optional(), // busca en nombre del destinatario o título de minuta
        signerSearch: z.string().optional(), // busca específicamente por nombre del firmante
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      const conditions: any[] = [];

      // Filtro por destinatario
      if (input.recipientId) {
        conditions.push(eq(minuteDispatches.recipientId, input.recipientId));
      }

      // Filtro por estado
      if (input.status && input.status !== "all") {
        conditions.push(eq(minuteDispatches.status, input.status));
      }

      // Filtro por rango de fechas (sentAt)
      if (input.dateFrom) {
        conditions.push(gte(minuteDispatches.sentAt, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        const endDate = new Date(input.dateTo);
        endDate.setHours(23, 59, 59, 999);
        conditions.push(lte(minuteDispatches.sentAt, endDate));
      }

      // Filtro por minuta específica
      if (input.minuteId) {
        conditions.push(eq(minuteDispatches.minuteId, input.minuteId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;

      // Obtener despachos con joins
      const dispatches = await db
        .select({
          id: minuteDispatches.id,
          minuteId: minuteDispatches.minuteId,
          recipientId: minuteDispatches.recipientId,
          sentAt: minuteDispatches.sentAt,
          readAt: minuteDispatches.readAt,
          status: minuteDispatches.status,
          notes: minuteDispatches.notes,
          // Datos de la minuta
          minuteFolio: meetingMinutes.folio,
          minuteTitle: meetingMinutes.title,
          minuteDate: meetingMinutes.meetingDate,
          minuteType: meetingMinutes.meetingType,
          // Datos del destinatario
          recipientName: minuteRecipients.name,
          recipientEmail: minuteRecipients.email,
          recipientPosition: minuteRecipients.position,
          recipientDepartment: minuteRecipients.department,
          // Firma de recibido
          signerName: minuteDispatches.signerName,
        })
        .from(minuteDispatches)
        .leftJoin(meetingMinutes, eq(minuteDispatches.minuteId, meetingMinutes.id))
        .leftJoin(minuteRecipients, eq(minuteDispatches.recipientId, minuteRecipients.id))
        .where(whereClause)
        .orderBy(desc(minuteDispatches.sentAt))
        .limit(input.pageSize)
        .offset(offset);

      // Aplicar filtro de búsqueda en memoria (nombre del destinatario o título de minuta)
      let filtered = dispatches;
      if (input.search && input.search.trim() !== "") {
        const term = input.search.toLowerCase().trim();
        filtered = dispatches.filter(
          (d) =>
            (d.recipientName ?? "").toLowerCase().includes(term) ||
            (d.minuteTitle ?? "").toLowerCase().includes(term) ||
            (d.minuteFolio ?? "").toLowerCase().includes(term) ||
            (d.recipientEmail ?? "").toLowerCase().includes(term)
        );
      }
      // Filtro por nombre del firmante (solo registros leídos con firma registrada)
      if (input.signerSearch && input.signerSearch.trim() !== "") {
        const signerTerm = input.signerSearch.toLowerCase().trim();
        filtered = filtered.filter(
          (d) => (d.signerName ?? "").toLowerCase().includes(signerTerm)
        );
      }

      // Contar totales para paginación (sin límite)
      const allForCount = await db
        .select({
          id: minuteDispatches.id,
          status: minuteDispatches.status,
          readAt: minuteDispatches.readAt,
        })
        .from(minuteDispatches)
        .where(whereClause);

      const totalCount = allForCount.length;
      const readCount = allForCount.filter((d) => d.readAt !== null).length;
      const sentCount = allForCount.filter((d) => d.status === "sent").length;
      const bouncedCount = allForCount.filter((d) => d.status === "bounced").length;

      // Obtener lista de destinatarios únicos para el filtro del panel
      const allRecipients = await db
        .select({ id: minuteRecipients.id, name: minuteRecipients.name, email: minuteRecipients.email })
        .from(minuteRecipients)
        .where(eq(minuteRecipients.isActive, true))
        .orderBy(asc(minuteRecipients.name));

      return {
        dispatches: filtered,
        pagination: {
          total: totalCount,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(totalCount / input.pageSize),
        },
        stats: {
          total: totalCount,
          read: readCount,
          unread: totalCount - readCount - bouncedCount,
          bounced: bouncedCount,
          sent: sentCount,
          readRate: totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0,
        },
        recipients: allRecipients,
      };
    }),

  // ── Reenviar correo de notificación a un destinatario ─────────────────────
  resendDispatch: protectedProcedure
    .input(z.object({ dispatchId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      // Obtener el despacho con datos de la minuta y el destinatario
      const [dispatch] = await db
        .select({
          id: minuteDispatches.id,
          minuteId: minuteDispatches.minuteId,
          recipientId: minuteDispatches.recipientId,
          status: minuteDispatches.status,
          minuteFolio: meetingMinutes.folio,
          minuteTitle: meetingMinutes.title,
          minuteDate: meetingMinutes.meetingDate,
          recipientName: minuteRecipients.name,
          recipientEmail: minuteRecipients.email,
        })
        .from(minuteDispatches)
        .leftJoin(meetingMinutes, eq(minuteDispatches.minuteId, meetingMinutes.id))
        .leftJoin(minuteRecipients, eq(minuteDispatches.recipientId, minuteRecipients.id))
        .where(eq(minuteDispatches.id, input.dispatchId))
        .limit(1);

      if (!dispatch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Despacho no encontrado" });
      }

      if (!dispatch.recipientEmail) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El destinatario no tiene correo registrado" });
      }

      // Generar nuevo token único
      const newToken = crypto.randomBytes(32).toString("hex");

      // Actualizar token y fecha de envío
      await db
        .update(minuteDispatches)
        .set({
          readToken: newToken,
          emailSentAt: new Date(),
          status: "sent",
        })
        .where(eq(minuteDispatches.id, input.dispatchId));

      // Enviar correo con el nuevo token
      try {
        await sendDispatchEmail({
          to: dispatch.recipientEmail,
          recipientName: dispatch.recipientName ?? "Destinatario",
          minuteTitle: dispatch.minuteTitle ?? "Minuta",
          minuteFolio: dispatch.minuteFolio ?? "",
          minuteDate: dispatch.minuteDate ?? new Date(),
          dispatchId: dispatch.id,
          token: newToken,
        });
      } catch (e: any) {
        // Si falla el correo, marcar como rebotado
        await db
          .update(minuteDispatches)
          .set({ status: "bounced" })
          .where(eq(minuteDispatches.id, input.dispatchId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Error al reenviar correo: ${e.message}` });
      }

      return { success: true, message: "Correo reenviado exitosamente" };
    }),
});
