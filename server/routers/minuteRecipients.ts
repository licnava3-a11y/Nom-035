import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { minuteRecipients, minuteDispatches, meetingMinutes } from "../../drizzle/schema";
import { eq, asc, like, or, and, desc } from "drizzle-orm";

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
});
