import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { featureRequests } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const featureRequestsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["pendiente","aprobada","en_desarrollo","implementada","descartada","all"]).default("all"),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const rows = input.status === "all"
        ? await db.select().from(featureRequests).orderBy(desc(featureRequests.createdAt)).limit(input.limit)
        : await db.select().from(featureRequests).where(eq(featureRequests.status, input.status as any)).orderBy(desc(featureRequests.createdAt)).limit(input.limit);
      return rows;
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(5).max(300),
      description: z.string().min(10),
      justification: z.string().optional(),
      priority: z.enum(["baja","normal","alta","critica"]).default("normal"),
      module: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db.insert(featureRequests).values({
        requestedBy: ctx.user.id,
        title: input.title,
        description: input.description,
        justification: input.justification ?? null,
        priority: input.priority,
        module: input.module ?? null,
        status: "pendiente",
      });
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pendiente","aprobada","en_desarrollo","implementada","descartada"]),
      implementationNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db.update(featureRequests).set({
        status: input.status,
        implementationNotes: input.implementationNotes ?? null,
        implementedBy: input.status === "implementada" ? ctx.user.id : null,
        implementedAt: input.status === "implementada" ? new Date() : null,
      }).where(eq(featureRequests.id, input.id));
      return { success: true };
    }),

  getStats: protectedProcedure
    .input(z.object({ days: z.number().optional() }).optional())
    .query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
    let all = await db.select().from(featureRequests);
    if (input?.days) {
      const cutoff = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      all = all.filter(r => r.createdAt >= cutoff);
    }
    const total = all.length;
    const implementada = all.filter(r => r.status === "implementada").length;
    const en_desarrollo = all.filter(r => r.status === "en_desarrollo").length;
    const aprobada = all.filter(r => r.status === "aprobada").length;
    const pendiente = all.filter(r => r.status === "pendiente").length;
    const descartada = all.filter(r => r.status === "descartada").length;
    const pctImplemented = total > 0 ? Math.round((implementada / total) * 100) : 0;
    const pctInProgress = total > 0 ? Math.round(((implementada + en_desarrollo) / total) * 100) : 0;
    return { total, implementada, en_desarrollo, aprobada, pendiente, descartada, pctImplemented, pctInProgress };
  }),
});
