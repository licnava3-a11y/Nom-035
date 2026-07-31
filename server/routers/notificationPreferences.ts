import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { notificationPreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const notificationPreferencesRouter = router({
  /**
   * Obtiene las preferencias de notificación del usuario autenticado.
   * Si no existen, devuelve los valores predeterminados sin crear registro.
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

    const rows = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);

    if (rows.length === 0) {
      return {
        userId: ctx.user.id,
        realtimeEnabled: true,
        dailyEmailEnabled: false,
        dailyEmailHour: 8,
        weeklyEmailEnabled: false,
        weeklyEmailDay: 1,
      };
    }

    return rows[0];
  }),

  /**
   * Actualiza (o crea) las preferencias de notificación del usuario autenticado.
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        realtimeEnabled: z.boolean(),
        dailyEmailEnabled: z.boolean(),
        dailyEmailHour: z.number().int().min(0).max(23).default(8),
        weeklyEmailEnabled: z.boolean(),
        weeklyEmailDay: z.number().int().min(1).max(7).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      const existing = await db
        .select({ id: notificationPreferences.id })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(notificationPreferences).values({
          userId: ctx.user.id,
          realtimeEnabled: input.realtimeEnabled,
          dailyEmailEnabled: input.dailyEmailEnabled,
          dailyEmailHour: input.dailyEmailHour,
          weeklyEmailEnabled: input.weeklyEmailEnabled,
          weeklyEmailDay: input.weeklyEmailDay,
        });
      } else {
        await db
          .update(notificationPreferences)
          .set({
            realtimeEnabled: input.realtimeEnabled,
            dailyEmailEnabled: input.dailyEmailEnabled,
            dailyEmailHour: input.dailyEmailHour,
            weeklyEmailEnabled: input.weeklyEmailEnabled,
            weeklyEmailDay: input.weeklyEmailDay,
          })
          .where(eq(notificationPreferences.userId, ctx.user.id));
      }

      return { success: true };
    }),
});
