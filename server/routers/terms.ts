import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { termsAcceptance } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const termsRouter = router({
  // Verificar si el usuario ya aceptó los términos
  hasAccepted: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Base de datos no disponible",
      });
    const [record] = await db
      .select({
        id: termsAcceptance.id,
        version: termsAcceptance.version,
        acceptedAt: termsAcceptance.acceptedAt,
      })
      .from(termsAcceptance)
      .where(eq(termsAcceptance.userId, ctx.user.id))
      .orderBy(desc(termsAcceptance.acceptedAt))
      .limit(1);
    return { accepted: !!record, record: record ?? null };
  }),

  // Registrar aceptación de términos (LFPDPPP Art. 8)
  accept: protectedProcedure
    .input(
      z.object({
        version: z.string().default("1.0"),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      await db.insert(termsAcceptance).values({
        userId: ctx.user.id,
        version: input.version,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      return { success: true };
    }),

  // Obtener historial de aceptaciones (para auditoría)
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Base de datos no disponible",
      });
    const records = await db
      .select()
      .from(termsAcceptance)
      .where(eq(termsAcceptance.userId, ctx.user.id))
      .orderBy(desc(termsAcceptance.acceptedAt));
    return records;
  }),
});
