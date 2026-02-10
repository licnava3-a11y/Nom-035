import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { documentAuditLog, complianceReports } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, like, or } from "drizzle-orm";

export const documentAuditRouter = router({
  /**
   * Registrar acceso a documento (view, download, verify)
   */
  logAccess: publicProcedure
    .input(
      z.object({
        reportId: z.number(),
        action: z.enum(["view", "download", "verify"]),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(documentAuditLog).values({
        reportId: input.reportId,
        userId: ctx.user?.id || null,
        userName: ctx.user?.name || "Anónimo",
        userEmail: ctx.user?.email || null,
        action: input.action,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      });

      return { success: true };
    }),

  /**
   * Obtener log de auditoría con filtros
   */
  getAuditLog: protectedProcedure
    .input(
      z.object({
        reportId: z.number().optional(),
        action: z.enum(["view", "download", "verify"]).optional(),
        userId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.reportId) {
        conditions.push(eq(documentAuditLog.reportId, input.reportId));
      }

      if (input.action) {
        conditions.push(eq(documentAuditLog.action, input.action));
      }

      if (input.userId) {
        conditions.push(eq(documentAuditLog.userId, input.userId));
      }

      if (input.startDate) {
        conditions.push(gte(documentAuditLog.timestamp, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(documentAuditLog.timestamp, new Date(input.endDate)));
      }

      if (input.search) {
        conditions.push(
          or(
            like(documentAuditLog.userName, `%${input.search}%`),
            like(documentAuditLog.userEmail, `%${input.search}%`)
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Obtener total de registros
      const totalRecords = await db
        .select({ count: documentAuditLog.id })
        .from(documentAuditLog)
        .where(where);

      const total = totalRecords.length;

      // Obtener registros paginados con información del reporte
      const logs = await db
        .select({
          id: documentAuditLog.id,
          reportId: documentAuditLog.reportId,
          reportTitle: complianceReports.titulo,
          reportFolio: complianceReports.folio,
          userId: documentAuditLog.userId,
          userName: documentAuditLog.userName,
          userEmail: documentAuditLog.userEmail,
          action: documentAuditLog.action,
          ipAddress: documentAuditLog.ipAddress,
          userAgent: documentAuditLog.userAgent,
          timestamp: documentAuditLog.timestamp,
        })
        .from(documentAuditLog)
        .leftJoin(complianceReports, eq(documentAuditLog.reportId, complianceReports.id))
        .where(where)
        .orderBy(desc(documentAuditLog.timestamp))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        logs,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * Obtener estadísticas de auditoría
   */
  getStatistics: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.startDate) {
        conditions.push(gte(documentAuditLog.timestamp, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(documentAuditLog.timestamp, new Date(input.endDate)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const allLogs = await db
        .select()
        .from(documentAuditLog)
        .where(where);

      const totalAccesses = allLogs.length;
      const views = allLogs.filter((log: any) => log.action === "view").length;
      const downloads = allLogs.filter((log: any) => log.action === "download").length;
      const verifications = allLogs.filter((log: any) => log.action === "verify").length;
      const uniqueUsers = new Set(allLogs.filter((log: any) => log.userId).map((log: any) => log.userId)).size;

      return {
        totalAccesses,
        views,
        downloads,
        verifications,
        uniqueUsers,
      };
    }),
});
