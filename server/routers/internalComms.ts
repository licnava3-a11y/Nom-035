import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  internalNotices,
  noticeAcknowledgments,
  anonymousSuggestions,
} from "../../drizzle/schema";
import { eq, desc, and, sql, like, or } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateNoticeFolio(type: string, seq: number): string {
  const year = new Date().getFullYear();
  const codes: Record<string, string> = {
    aviso: "AVI",
    comunicado: "COM",
    circular: "CIR",
    urgente: "URG",
  };
  return `${codes[type] ?? "NOT"}-${String(seq).padStart(3, "0")}/${year}`;
}

function generateSuggestionFolio(seq: number): string {
  const year = new Date().getFullYear();
  return `SUG-${String(seq).padStart(4, "0")}/${year}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const internalCommsRouter = router({
  // ── Avisos y Comunicados ──────────────────────────────────────────────────
  listNotices: protectedProcedure
    .input(
      z
        .object({
          type: z.string().optional(),
          priority: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(internalNotices)
        .orderBy(desc(internalNotices.createdAt));

      let filtered = rows;
      if (input?.type)
        filtered = filtered.filter(r => r.noticeType === input.type);
      if (input?.priority)
        filtered = filtered.filter(r => r.priority === input.priority);
      if (input?.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter(
          r =>
            r.title.toLowerCase().includes(q) ||
            r.content.toLowerCase().includes(q)
        );
      }
      return filtered;
    }),

  createNotice: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3),
        content: z.string().min(10),
        noticeType: z
          .enum(["aviso", "comunicado", "circular", "urgente"])
          .default("aviso"),
        priority: z.enum(["alta", "media", "baja"]).default("media"),
        requiresAck: z.boolean().default(false),
        targetAudience: z
          .enum(["todos", "directivos", "supervisores", "operativos"])
          .default("todos"),
        publishedAt: z.string().optional(),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const year = new Date().getFullYear();
      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(internalNotices)
        .where(
          and(
            eq(internalNotices.noticeType, input.noticeType),
            sql`YEAR(created_at) = ${year}`
          )
        );
      const seq = Number(countRow?.count ?? 0) + 1;
      const folio = generateNoticeFolio(input.noticeType, seq);

      const [result] = await db.insert(internalNotices).values({
        folio,
        title: input.title,
        content: input.content,
        noticeType: input.noticeType,
        priority: input.priority,
        requiresAck: input.requiresAck,
        targetAudience: input.targetAudience,
        publishedAt: input.publishedAt
          ? new Date(input.publishedAt)
          : new Date(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        createdBy: ctx.user.id,
      });

      // Notificar al owner si es urgente
      if (input.noticeType === "urgente") {
        await notifyOwner({
          title: `🚨 Comunicado Urgente: ${input.title}`,
          content: `Se publicó un comunicado urgente (${folio}) con audiencia: ${input.targetAudience}.\n\n${input.content.substring(0, 200)}...`,
        });
      }

      return { id: result.insertId, folio };
    }),

  updateNotice: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(3).optional(),
        content: z.string().min(10).optional(),
        priority: z.enum(["alta", "media", "baja"]).optional(),
        requiresAck: z.boolean().optional(),
        targetAudience: z
          .enum(["todos", "directivos", "supervisores", "operativos"])
          .optional(),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, expiresAt, ...rest } = input;
      await db
        .update(internalNotices)
        .set({
          ...rest,
          ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
        })
        .where(eq(internalNotices.id, id));
      return { ok: true };
    }),

  deleteNotice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(noticeAcknowledgments)
        .where(eq(noticeAcknowledgments.noticeId, input.id));
      await db.delete(internalNotices).where(eq(internalNotices.id, input.id));
      return { ok: true };
    }),

  // ── Acuses de Recibo ──────────────────────────────────────────────────────
  acknowledgeNotice: protectedProcedure
    .input(
      z.object({
        noticeId: z.number(),
        employeeId: z.number(),
        employeeName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Verificar si ya existe acuse
      const existing = await db
        .select()
        .from(noticeAcknowledgments)
        .where(
          and(
            eq(noticeAcknowledgments.noticeId, input.noticeId),
            eq(noticeAcknowledgments.employeeId, input.employeeId)
          )
        );
      if (existing.length > 0) return { ok: true, alreadyAcknowledged: true };

      await db.insert(noticeAcknowledgments).values({
        noticeId: input.noticeId,
        employeeId: input.employeeId,
        employeeName: input.employeeName,
      });
      return { ok: true, alreadyAcknowledged: false };
    }),

  getAcknowledgments: protectedProcedure
    .input(z.object({ noticeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db
        .select()
        .from(noticeAcknowledgments)
        .where(eq(noticeAcknowledgments.noticeId, input.noticeId))
        .orderBy(desc(noticeAcknowledgments.acknowledgedAt));
    }),

  // ── Sugerencias Anónimas ──────────────────────────────────────────────────
  listSuggestions: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          category: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(anonymousSuggestions)
        .orderBy(desc(anonymousSuggestions.createdAt));

      let filtered = rows;
      if (input?.status)
        filtered = filtered.filter(r => r.status === input.status);
      if (input?.category)
        filtered = filtered.filter(r => r.category === input.category);
      return filtered;
    }),

  // Endpoint público para enviar sugerencia anónima
  submitSuggestion: publicProcedure
    .input(
      z.object({
        category: z
          .enum([
            "mejora_proceso",
            "clima_laboral",
            "seguridad",
            "capacitacion",
            "comunicacion",
            "otro",
          ])
          .default("otro"),
        content: z
          .string()
          .min(20, "La sugerencia debe tener al menos 20 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const year = new Date().getFullYear();
      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(anonymousSuggestions)
        .where(sql`YEAR(created_at) = ${year}`);
      const seq = Number(countRow?.count ?? 0) + 1;
      const folio = generateSuggestionFolio(seq);

      await db.insert(anonymousSuggestions).values({
        folio,
        category: input.category,
        content: input.content,
        status: "nueva",
      });

      // Notificar al owner
      await notifyOwner({
        title: `💡 Nueva Sugerencia Anónima (${folio})`,
        content: `Categoría: ${input.category}\n\n${input.content.substring(0, 300)}`,
      });

      return { ok: true, folio };
    }),

  respondSuggestion: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["nueva", "en_revision", "atendida", "archivada"]),
        adminResponse: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(anonymousSuggestions)
        .set({
          status: input.status,
          adminResponse: input.adminResponse,
          respondedAt: new Date(),
          respondedBy: ctx.user.id,
        })
        .where(eq(anonymousSuggestions.id, input.id));
      return { ok: true };
    }),

  // ── Estadísticas ──────────────────────────────────────────────────────────
  getCommsStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const notices = await db.select().from(internalNotices);
    const suggestions = await db.select().from(anonymousSuggestions);
    const acks = await db.select().from(noticeAcknowledgments);

    return {
      totalNotices: notices.length,
      urgentNotices: notices.filter(n => n.noticeType === "urgente").length,
      requiresAckNotices: notices.filter(n => n.requiresAck).length,
      totalAcknowledgments: acks.length,
      totalSuggestions: suggestions.length,
      newSuggestions: suggestions.filter(s => s.status === "nueva").length,
      attendedSuggestions: suggestions.filter(s => s.status === "atendida")
        .length,
    };
  }),
});
