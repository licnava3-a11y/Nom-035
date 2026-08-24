import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notificationHistory, notifications } from "../../drizzle/schema";
import { desc, and, gte, lte, eq, count } from "drizzle-orm";

export const notificationHistoryRouter = router({
  // Obtener historial de notificaciones con filtros
  getHistory: protectedProcedure
    .input(
      z.object({
        priority: z.enum(["info", "warning", "critical"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().int().positive().optional().default(50),
        offset: z.number().int().nonnegative().optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.priority) {
        conditions.push(eq(notificationHistory.priority, input.priority));
      }

      if (input.startDate) {
        conditions.push(
          gte(notificationHistory.sentAt, new Date(input.startDate))
        );
      }

      if (input.endDate) {
        conditions.push(
          lte(notificationHistory.sentAt, new Date(input.endDate))
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const notifications = await db
        .select()
        .from(notificationHistory)
        .where(whereClause)
        .orderBy(desc(notificationHistory.sentAt))
        .limit(input.limit)
        .offset(input.offset);

      return notifications;
    }),

  // Obtener conteo total de notificaciones
  getCount: protectedProcedure
    .input(
      z.object({
        priority: z.enum(["info", "warning", "critical"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.priority) {
        conditions.push(eq(notificationHistory.priority, input.priority));
      }

      if (input.startDate) {
        conditions.push(
          gte(notificationHistory.sentAt, new Date(input.startDate))
        );
      }

      if (input.endDate) {
        conditions.push(
          lte(notificationHistory.sentAt, new Date(input.endDate))
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({ count: count(notificationHistory.id) })
        .from(notificationHistory)
        .where(whereClause);

      return result[0]?.count || 0;
    }),
});
