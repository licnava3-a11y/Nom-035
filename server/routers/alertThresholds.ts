import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { alertThresholds } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const alertThresholdsRouter = router({
  // Obtener todos los umbrales
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const thresholds = await db.select().from(alertThresholds);
    return thresholds;
  }),

  // Actualizar umbral específico
  update: protectedProcedure
    .input(
      z.object({
        alertType: z.enum(["critical_cases", "low_coverage", "excellent_compliance"]),
        threshold: z.number().int().positive(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(alertThresholds)
        .set({
          threshold: input.threshold,
          description: input.description,
          updatedBy: ctx.user?.id,
        })
        .where(eq(alertThresholds.alertType, input.alertType));

      return { success: true };
    }),
});
