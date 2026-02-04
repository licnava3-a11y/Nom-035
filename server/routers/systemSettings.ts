import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const systemSettingsRouter = router({
  /**
   * Get a system setting by key
   */
  getSetting: protectedProcedure
    .input(
      z.object({
        key: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, input.key))
        .limit(1);

      return setting || null;
    }),

  /**
   * Get all system settings
   */
  getAllSettings: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    const settings = await db.select().from(systemSettings);
    return settings;
  }),

  /**
   * Update or create a system setting
   */
  updateSetting: adminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Check if setting exists
      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, input.key))
        .limit(1);

      if (existing) {
        // Update existing setting
        await db
          .update(systemSettings)
          .set({
            settingValue: input.value,
            description: input.description,
            updatedBy: ctx.user.id,
          })
          .where(eq(systemSettings.settingKey, input.key));
      } else {
        // Create new setting
        await db.insert(systemSettings).values({
          settingKey: input.key,
          settingValue: input.value,
          description: input.description,
          updatedBy: ctx.user.id,
        });
      }

      return { success: true };
    }),

  /**
   * Delete a system setting
   */
  deleteSetting: adminProcedure
    .input(
      z.object({
        key: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      await db.delete(systemSettings).where(eq(systemSettings.settingKey, input.key));

      return { success: true };
    }),
});
