import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sharedReportsLog } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export const sharedReportsRouter = router({
  // Listar historial de reportes compartidos
  list: protectedProcedure
    .input(
      z.object({
        shareChannel: z.enum(["email", "linkedin", "twitter", "whatsapp", "other"]).optional(),
        reportType: z.enum(["pdf", "excel"]).optional(),
        reportCategory: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const conditions = [];
      if (input.shareChannel) conditions.push(eq(sharedReportsLog.shareChannel, input.shareChannel));
      if (input.reportType) conditions.push(eq(sharedReportsLog.reportType, input.reportType));
      if (input.reportCategory) conditions.push(eq(sharedReportsLog.reportCategory, input.reportCategory));
      
      if (input.startDate) {
        conditions.push(gte(sharedReportsLog.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(sharedReportsLog.createdAt, new Date(input.endDate)));
      }

      const offset = (input.page - 1) * input.pageSize;

      const [logs, totalCount] = await Promise.all([
        db
          .select()
          .from(sharedReportsLog)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(sharedReportsLog.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(sharedReportsLog)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      return {
        logs,
        total: totalCount[0]?.count || 0,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / input.pageSize),
      };
    }),

  // Registrar compartición de reporte
  logShare: protectedProcedure
    .input(
      z.object({
        reportUrl: z.string().url(),
        reportType: z.enum(["pdf", "excel"]),
        reportCategory: z.string(),
        shareChannel: z.enum(["email", "linkedin", "twitter", "whatsapp", "other"]),
        recipients: z.array(z.string()).optional(),
        emailSubject: z.string().optional(),
        emailMessage: z.string().optional(),
        appliedFilters: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db.insert(sharedReportsLog).values({
        reportUrl: input.reportUrl,
        reportType: input.reportType,
        reportCategory: input.reportCategory,
        shareChannel: input.shareChannel,
        recipients: input.recipients || null,
        recipientCount: input.recipients?.length || 0,
        emailSubject: input.emailSubject || null,
        emailMessage: input.emailMessage || null,
        sharedBy: ctx.user.id,
        sharedByName: ctx.user.name || null,
        sharedByEmail: ctx.user.email || null,
        appliedFilters: input.appliedFilters || null,
      });

      return { success: true };
    }),

  // Obtener estadísticas de compartición
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const [totalShares, byChannel, byReportType, recentShares] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(sharedReportsLog),
      db
        .select({
          channel: sharedReportsLog.shareChannel,
          count: sql<number>`count(*)`,
        })
        .from(sharedReportsLog)
        .groupBy(sharedReportsLog.shareChannel),
      db
        .select({
          type: sharedReportsLog.reportType,
          count: sql<number>`count(*)`,
        })
        .from(sharedReportsLog)
        .groupBy(sharedReportsLog.reportType),
      db
        .select()
        .from(sharedReportsLog)
        .orderBy(desc(sharedReportsLog.createdAt))
        .limit(10),
    ]);

    return {
      totalShares: totalShares[0]?.count || 0,
      byChannel,
      byReportType,
      recentShares,
    };
  }),
});
