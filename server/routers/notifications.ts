import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const notificationsRouter = router({
  /**
   * Get all notifications for current user
   */
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        unreadOnly: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(notifications.userId, ctx.user.id)];
      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      const result = await db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit);

      return result;
    }),

  /**
   * Get unread count for current user
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );

    return { count: result.length };
  }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );

    return { success: true };
  }),

  /**
   * Create notification (admin only)
   */
  create: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        type: z.enum([
          "new_case",
          "case_status_change",
          "case_assigned",
          "deadline_approaching",
          "new_mailbox_request",
          "mailbox_status_change",
          "employee_hire",
          "employee_termination",
          "department_change",
          "survey_expiring",
          "training_due",
          "system",
        ]),
        title: z.string().min(1),
        message: z.string().min(1),
        relatedEntityType: z.string().optional(),
        relatedEntityId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admin can create notifications manually
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can create notifications");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(notifications).values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        isRead: false,
      } as any);

      return { success: true, id: result.insertId };
    }),

  /**
   * Delete notification
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),
});
