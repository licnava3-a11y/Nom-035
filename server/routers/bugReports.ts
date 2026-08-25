import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { bugReports } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const bugReportsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["pendiente", "en_revision", "corregido", "descartado", "all"])
          .default("all"),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });
      const rows =
        input.status === "all"
          ? await db
              .select()
              .from(bugReports)
              .orderBy(desc(bugReports.createdAt))
              .limit(input.limit)
          : await db
              .select()
              .from(bugReports)
              .where(eq(bugReports.status, input.status as any))
              .orderBy(desc(bugReports.createdAt))
              .limit(input.limit);
      return rows;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(5).max(300),
        description: z.string().min(10),
        stepsToReproduce: z.string().optional(),
        severity: z.enum(["critico", "alto", "medio", "bajo"]).default("medio"),
        module: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });
      await db.insert(bugReports).values({
        reportedBy: ctx.user.id,
        title: input.title,
        description: input.description,
        stepsToReproduce: input.stepsToReproduce ?? null,
        severity: input.severity,
        module: input.module ?? null,
        status: "pendiente",
      });
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pendiente", "en_revision", "corregido", "descartado"]),
        resolution: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });
      await db
        .update(bugReports)
        .set({
          status: input.status,
          resolution: input.resolution ?? null,
          resolvedBy: input.status === "corregido" ? ctx.user.id : null,
          resolvedAt: input.status === "corregido" ? new Date() : null,
        })
        .where(eq(bugReports.id, input.id));
      return { success: true };
    }),

  getStats: protectedProcedure
    .input(
      z
        .object({
          days: z.number().optional(),
          dateFrom: z.string().optional(), // ISO date "YYYY-MM-DD"
          dateTo: z.string().optional(), // ISO date "YYYY-MM-DD"
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });
      let all = await db.select().from(bugReports);
      // Rango libre de fechas tiene precedencia sobre days
      if (input?.dateFrom || input?.dateTo) {
        const from = input.dateFrom
          ? new Date(input.dateFrom + "T00:00:00")
          : null;
        const to = input.dateTo ? new Date(input.dateTo + "T23:59:59") : null;
        all = all.filter(r => {
          if (from && r.createdAt < from) return false;
          if (to && r.createdAt > to) return false;
          return true;
        });
      } else if (input?.days) {
        const cutoff = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
        all = all.filter(r => r.createdAt >= cutoff);
      }
      return {
        total: all.length,
        pendiente: all.filter(r => r.status === "pendiente").length,
        en_revision: all.filter(r => r.status === "en_revision").length,
        corregido: all.filter(r => r.status === "corregido").length,
        descartado: all.filter(r => r.status === "descartado").length,
        critico: all.filter(r => r.severity === "critico").length,
        alto: all.filter(r => r.severity === "alto").length,
      };
    }),
});
