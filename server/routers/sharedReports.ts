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

  // Exportar historial a Excel
  exportHistoryToExcel: protectedProcedure
    .input(
      z.object({
        shareChannel: z.enum(["email", "linkedin", "twitter", "whatsapp", "other"]).optional(),
        reportType: z.enum(["pdf", "excel"]).optional(),
        reportCategory: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Importar ExcelJS dinámicamente
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();

      // Aplicar filtros
      const conditions = [];
      if (input.shareChannel) conditions.push(eq(sharedReportsLog.shareChannel, input.shareChannel));
      if (input.reportType) conditions.push(eq(sharedReportsLog.reportType, input.reportType));
      if (input.reportCategory) conditions.push(eq(sharedReportsLog.reportCategory, input.reportCategory));
      if (input.startDate) conditions.push(gte(sharedReportsLog.createdAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(sharedReportsLog.createdAt, new Date(input.endDate)));

      // Obtener datos filtrados
      const allLogs = await db
        .select()
        .from(sharedReportsLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sharedReportsLog.createdAt));

      // HOJA 1: Historial Completo
      const historySheet = workbook.addWorksheet("Historial Completo");
      historySheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Fecha", key: "date", width: 12 },
        { header: "Hora", key: "time", width: 10 },
        { header: "Usuario", key: "user", width: 25 },
        { header: "Email Usuario", key: "userEmail", width: 30 },
        { header: "Canal", key: "channel", width: 12 },
        { header: "Tipo Reporte", key: "reportType", width: 12 },
        { header: "Categoría", key: "category", width: 20 },
        { header: "Destinatarios", key: "recipients", width: 15 },
        { header: "Lista Destinatarios", key: "recipientsList", width: 50 },
        { header: "Asunto", key: "subject", width: 40 },
        { header: "Mensaje", key: "message", width: 50 },
        { header: "URL Reporte", key: "reportUrl", width: 60 },
      ];

      historySheet.getRow(1).font = { bold: true };
      historySheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      historySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      allLogs.forEach((log) => {
        const createdAt = log.createdAt ? new Date(log.createdAt) : new Date();
        historySheet.addRow({
          id: log.id,
          date: createdAt.toLocaleDateString("es-MX"),
          time: createdAt.toLocaleTimeString("es-MX"),
          user: log.sharedByName || "N/A",
          userEmail: log.sharedByEmail || "N/A",
          channel: log.shareChannel,
          reportType: log.reportType.toUpperCase(),
          category: log.reportCategory,
          recipients: log.recipientCount || 0,
          recipientsList:
            log.recipients && Array.isArray(log.recipients) ? log.recipients.join(", ") : "N/A",
          subject: log.emailSubject || "N/A",
          message: log.emailMessage || "N/A",
          reportUrl: log.reportUrl,
        });
      });

      // HOJA 2: Estadísticas por Canal
      const channelStats = await db
        .select({
          channel: sharedReportsLog.shareChannel,
          count: sql<number>`count(*)`,
        })
        .from(sharedReportsLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sharedReportsLog.shareChannel);

      const totalCount = channelStats.reduce((sum, stat) => sum + (stat.count || 0), 0);

      const channelSheet = workbook.addWorksheet("Estadísticas por Canal");
      channelSheet.columns = [
        { header: "Canal", key: "channel", width: 20 },
        { header: "Total Compartidos", key: "count", width: 20 },
        { header: "Porcentaje", key: "percentage", width: 15 },
      ];

      channelSheet.getRow(1).font = { bold: true };
      channelSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF10B981" },
      };
      channelSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      channelStats.forEach((stat) => {
        const percentage = totalCount > 0 ? ((stat.count || 0) / totalCount) * 100 : 0;
        channelSheet.addRow({
          channel: stat.channel,
          count: stat.count,
          percentage: `${percentage.toFixed(2)}%`,
        });
      });

      // HOJA 3: Estadísticas por Usuario
      const userStats = await db
        .select({
          userName: sharedReportsLog.sharedByName,
          userEmail: sharedReportsLog.sharedByEmail,
          count: sql<number>`count(*)`,
        })
        .from(sharedReportsLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sharedReportsLog.sharedByName, sharedReportsLog.sharedByEmail)
        .orderBy(desc(sql<number>`count(*)`));

      const userSheet = workbook.addWorksheet("Estadísticas por Usuario");
      userSheet.columns = [
        { header: "Usuario", key: "userName", width: 30 },
        { header: "Email", key: "userEmail", width: 35 },
        { header: "Total Compartidos", key: "count", width: 20 },
        { header: "Porcentaje", key: "percentage", width: 15 },
      ];

      userSheet.getRow(1).font = { bold: true };
      userSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEF4444" },
      };
      userSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      userStats.forEach((stat) => {
        const percentage = totalCount > 0 ? ((stat.count || 0) / totalCount) * 100 : 0;
        userSheet.addRow({
          userName: stat.userName || "N/A",
          userEmail: stat.userEmail || "N/A",
          count: stat.count,
          percentage: `${percentage.toFixed(2)}%`,
        });
      });

      // HOJA 4: Tendencias Temporales
      const temporalStats = await db
        .select({
          date: sql<string>`DATE(${sharedReportsLog.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(sharedReportsLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sql`DATE(${sharedReportsLog.createdAt})`)
        .orderBy(sql`DATE(${sharedReportsLog.createdAt})`);

      const temporalSheet = workbook.addWorksheet("Tendencias Temporales");
      temporalSheet.columns = [
        { header: "Fecha", key: "date", width: 15 },
        { header: "Compartidos", key: "count", width: 15 },
        { header: "Día de la Semana", key: "dayOfWeek", width: 20 },
      ];

      temporalSheet.getRow(1).font = { bold: true };
      temporalSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF59E0B" },
      };
      temporalSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

      temporalStats.forEach((stat) => {
        const date = new Date(stat.date);
        temporalSheet.addRow({
          date: date.toLocaleDateString("es-MX"),
          count: stat.count,
          dayOfWeek: daysOfWeek[date.getDay()],
        });
      });

      // Generar buffer del archivo Excel
      const buffer = await workbook.xlsx.writeBuffer();

      // Subir a S3
      const { storagePut } = await import("../storage");
      const fileName = `historial-reportes-compartidos-${Date.now()}.xlsx`;
      const { url } = await storagePut(
        `reports/${fileName}`,
        Buffer.from(buffer),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return { success: true, url, fileName };
    }),
});
