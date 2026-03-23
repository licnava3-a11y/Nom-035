import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cases, correctiveActions, surveys, userNotificationPreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Router for managing user notification preferences
 */
export const notificationPreferencesRouter = router({
  /**
   * Get current user's notification preferences
   * Creates default preferences if none exist
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Try to get existing preferences
    const [existing] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, ctx.user.id))
      .limit(1);

    // If no preferences exist, create default ones
    if (!existing) {
      const [newPrefs] = await db
        .insert(userNotificationPreferences)
        .values({
          userId: ctx.user.id,
          alertsEnabled: true,
          remindersEnabled: true,
          reportsEnabled: true,
          surveysEnabled: true,
          casesEnabled: true,
          correctiveActionsEnabled: true,
          frequency: "immediate",
          dailySummaryEnabled: false,
          dailySummaryTime: "09:00",
          emailEnabled: true,
          inAppEnabled: true,
        });

      // Return the newly created preferences
      const [created] = await db
        .select()
        .from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, ctx.user.id))
        .limit(1);

      return created;
    }

    return existing;
  }),

  /**
   * Update user's notification preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        alertsEnabled: z.boolean().optional(),
        remindersEnabled: z.boolean().optional(),
        reportsEnabled: z.boolean().optional(),
        surveysEnabled: z.boolean().optional(),
        casesEnabled: z.boolean().optional(),
        correctiveActionsEnabled: z.boolean().optional(),
        frequency: z.enum(["immediate", "daily", "weekly"]).optional(),
        dailySummaryEnabled: z.boolean().optional(),
        dailySummaryTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:mm format
        emailEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Check if preferences exist
      const [existing] = await db
        .select()
        .from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, ctx.user.id))
        .limit(1);

      if (!existing) {
        // Create new preferences with provided values
        await (db.insert(userNotificationPreferences) as any).values({
          userId: ctx.user.id,
          ...input,
        });
      } else {
        // Update existing preferences
        await db
          .update(userNotificationPreferences)
          .set(input)
          .where(eq(userNotificationPreferences.userId, ctx.user.id));
      }

      // Return updated preferences
      const [updated] = await db
        .select()
        .from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, ctx.user.id))
        .limit(1);

      return updated;
    }),

  /**
   * Reset preferences to defaults
   */
  resetToDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    await db
      .update(userNotificationPreferences)
      .set({
        alertsEnabled: true,
        remindersEnabled: true,
        reportsEnabled: true,
        surveysEnabled: true,
        casesEnabled: true,
        correctiveActionsEnabled: true,
        frequency: "immediate",
        dailySummaryEnabled: false,
        dailySummaryTime: "09:00",
        emailEnabled: true,
        inAppEnabled: true,
      } as any)
      .where(eq(userNotificationPreferences.userId, ctx.user.id));

    const [updated] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, ctx.user.id))
      .limit(1);

    return updated;
  }),

  /**
   * Check if a specific notification type is enabled for a user
   */
  isNotificationEnabled: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        notificationType: z.enum([
          "alerts",
          "reminders",
          "reports",
          "surveys",
          "cases",
          "correctiveActions",
        ]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return true; // Default to enabled if DB fails

      const [prefs] = await db
        .select()
        .from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, input.userId))
        .limit(1);

      if (!prefs) return true; // Default to enabled if no preferences

      const fieldMap = {
        alerts: prefs.alertsEnabled,
        reminders: prefs.remindersEnabled,
        reports: prefs.reportsEnabled,
        surveys: prefs.surveysEnabled,
        cases: prefs.casesEnabled,
        correctiveActions: prefs.correctiveActionsEnabled,
      };

      return fieldMap[input.notificationType] ?? true;
    }),
});
