import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { webVitalsMetrics } from "../../drizzle/schema";
import { and, desc, gte, sql, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const webVitalsRouter = router({
  /**
   * Registrar una métrica de Core Web Vitals (llamado desde el cliente)
   */
  record: publicProcedure
    .input(
      z.object({
        name: z.enum(["LCP", "CLS", "INP", "FCP", "TTFB", "FID"]),
        value: z.number(),
        rating: z.enum(["good", "needs-improvement", "poor"]),
        delta: z.number().optional().default(0),
        id: z.string(),
        page: z.string().max(500).optional().default("/"),
        userAgent: z.string().max(500).optional(),
        sessionId: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      try {
        await (db.insert(webVitalsMetrics) as any).values({
          metricName: input.name,
          value: String(input.value),
          rating: input.rating,
          delta: String(input.delta),
          metricId: input.id,
          page: input.page,
          userAgent: input.userAgent,
          sessionId: input.sessionId,
        });
        return { success: true };
      } catch {
        return { success: false };
      }
    }),

  /**
   * Obtener resumen de métricas para el dashboard (admin)
   */
  getSummary: adminProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).optional().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const metrics = ["LCP", "CLS", "INP", "FCP", "TTFB"] as const;
      const summary: Record<string, {
        avg: number;
        p75: number;
        good: number;
        needsImprovement: number;
        poor: number;
        total: number;
      }> = {};

      for (const metric of metrics) {
        const rows = await db
          .select({
            value: webVitalsMetrics.value,
            rating: webVitalsMetrics.rating,
          })
          .from(webVitalsMetrics)
          .where(
            and(
              eq(webVitalsMetrics.metricName, metric),
              gte(webVitalsMetrics.createdAt, since)
            )
          )
          .orderBy(webVitalsMetrics.value);

        if (rows.length === 0) {
          summary[metric] = { avg: 0, p75: 0, good: 0, needsImprovement: 0, poor: 0, total: 0 };
          continue;
        }

        const values = rows.map((r) => Number(r.value));
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const p75Index = Math.floor(values.length * 0.75);
        const p75 = values[p75Index] ?? values[values.length - 1];

        const good = rows.filter((r) => r.rating === "good").length;
        const needsImprovement = rows.filter((r) => r.rating === "needs-improvement").length;
        const poor = rows.filter((r) => r.rating === "poor").length;

        summary[metric] = { avg: Math.round(avg * 10) / 10, p75: Math.round(p75 * 10) / 10, good, needsImprovement, poor, total: rows.length };
      }

      return summary;
    }),

  /**
   * Obtener tendencia diaria de una métrica (admin)
   */
  getTrend: adminProcedure
    .input(
      z.object({
        metric: z.enum(["LCP", "CLS", "INP", "FCP", "TTFB"]),
        days: z.number().int().min(7).max(90).optional().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const rows = await db
        .select({
          day: sql<string>`DATE(${webVitalsMetrics.createdAt})`,
          avg: sql<number>`ROUND(AVG(CAST(${webVitalsMetrics.value} AS DECIMAL(12,3))), 1)`,
          good: sql<number>`SUM(CASE WHEN ${webVitalsMetrics.rating} = 'good' THEN 1 ELSE 0 END)`,
          poor: sql<number>`SUM(CASE WHEN ${webVitalsMetrics.rating} = 'poor' THEN 1 ELSE 0 END)`,
          total: sql<number>`COUNT(*)`,
        })
        .from(webVitalsMetrics)
        .where(
          and(
            eq(webVitalsMetrics.metricName, input.metric),
            gte(webVitalsMetrics.createdAt, since)
          )
        )
        .groupBy(sql`DATE(${webVitalsMetrics.createdAt})`)
        .orderBy(sql`DATE(${webVitalsMetrics.createdAt})`);

      return rows;
    }),

  /**
   * Obtener las últimas N métricas (admin)
   */
  getRecent: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(200).optional().default(50),
        metric: z.enum(["LCP", "CLS", "INP", "FCP", "TTFB", "all"]).optional().default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const conditions = input.metric !== "all"
        ? [eq(webVitalsMetrics.metricName, input.metric)]
        : [];

      const rows = await db
        .select()
        .from(webVitalsMetrics)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(webVitalsMetrics.createdAt))
        .limit(input.limit);

      return rows;
    }),
});
