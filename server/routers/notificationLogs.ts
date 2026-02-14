import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { notificationLogs, employees } from "../../drizzle/schema";
import { desc, and, eq, gte, lte, like, or, sql } from "drizzle-orm";

export const notificationLogsRouter = router({
  /**
   * Get all notification logs with filters and pagination
   */
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
        type: z.string().optional(), // Filter by notification type
        status: z.enum(["sent", "failed", "bounced"]).optional(),
        recipientEmail: z.string().optional(), // Filter by recipient email
        dateFrom: z.string().optional(), // ISO date string
        dateTo: z.string().optional(), // ISO date string
        search: z.string().optional(), // Search in subject or recipient
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const { page, pageSize, type, status, recipientEmail, dateFrom, dateTo, search } = input;
      const offset = (page - 1) * pageSize;

      // Build WHERE conditions
      const conditions = [];
      
      if (type) {
        conditions.push(eq(notificationLogs.templateCode, type));
      }
      
      if (status) {
        conditions.push(eq(notificationLogs.status, status));
      }
      
      if (recipientEmail) {
        conditions.push(eq(notificationLogs.recipientEmail, recipientEmail));
      }
      
      if (dateFrom) {
        conditions.push(gte(notificationLogs.sentAt, new Date(dateFrom)));
      }
      
      if (dateTo) {
        conditions.push(lte(notificationLogs.sentAt, new Date(dateTo)));
      }
      
      if (search) {
        conditions.push(
          or(
            like(notificationLogs.subject, `%${search}%`),
            like(notificationLogs.recipientEmail, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(notificationLogs)
        .where(whereClause);
      
      const total = Number(countResult[0]?.count || 0);

      // Get paginated logs
      const logs = await db
        .select({
          id: notificationLogs.id,
          queueId: notificationLogs.queueId,
          templateCode: notificationLogs.templateCode,
          recipientId: notificationLogs.recipientId,
          recipientEmail: notificationLogs.recipientEmail,
          recipientPhone: notificationLogs.recipientPhone,
          channel: notificationLogs.channel,
          subject: notificationLogs.subject,
          body: notificationLogs.body,
          status: notificationLogs.status,
          errorMessage: notificationLogs.errorMessage,
          sentAt: notificationLogs.sentAt,
          createdAt: notificationLogs.createdAt,
          recipientName: employees.firstName, // Join to get recipient name
        })
        .from(notificationLogs)
        .leftJoin(employees, eq(notificationLogs.recipientId, employees.id))
        .where(whereClause)
        .orderBy(desc(notificationLogs.sentAt))
        .limit(pageSize)
        .offset(offset);

      return {
        logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * Get notification statistics
   */
  getStats: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const { dateFrom, dateTo } = input;

      const conditions = [];
      
      if (dateFrom) {
        conditions.push(gte(notificationLogs.sentAt, new Date(dateFrom)));
      }
      
      if (dateTo) {
        conditions.push(lte(notificationLogs.sentAt, new Date(dateTo)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total counts by status
      const stats = await db
        .select({
          status: notificationLogs.status,
          count: sql<number>`count(*)`,
        })
        .from(notificationLogs)
        .where(whereClause)
        .groupBy(notificationLogs.status);

      const totalSent = stats.find((s) => s.status === "sent")?.count || 0;
      const totalFailed = stats.find((s) => s.status === "failed")?.count || 0;
      const totalBounced = stats.find((s) => s.status === "bounced")?.count || 0;
      const total = Number(totalSent) + Number(totalFailed) + Number(totalBounced);

      // Get counts by type
      const byType = await db
        .select({
          type: notificationLogs.templateCode,
          count: sql<number>`count(*)`,
        })
        .from(notificationLogs)
        .where(whereClause)
        .groupBy(notificationLogs.templateCode);

      return {
        total,
        totalSent: Number(totalSent),
        totalFailed: Number(totalFailed),
        totalBounced: Number(totalBounced),
        successRate: total > 0 ? ((Number(totalSent) / total) * 100).toFixed(2) : "0.00",
        byType: byType.map((t: { type: string | null; count: number }) => ({
          type: t.type,
          count: Number(t.count),
        })),
      };
    }),

  /**
   * Get unique recipient emails for filter dropdown
   */
  getRecipients: protectedProcedure.query(async () => {
    const db = await getDb();

    const recipients = await db
      .selectDistinct({
        email: notificationLogs.recipientEmail,
      })
      .from(notificationLogs)
      .where(sql`${notificationLogs.recipientEmail} IS NOT NULL`)
      .orderBy(notificationLogs.recipientEmail)
      .limit(100);

    return recipients.map((r: { email: string | null }) => r.email).filter((email): email is string => email !== null);
  }),
});
