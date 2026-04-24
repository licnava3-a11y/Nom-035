import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { companyVisits } from "../../drizzle/schema";
import { desc, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const companyVisitsRouter = router({
  track: publicProcedure
    .input(z.object({
      page: z.string().max(300),
      sessionId: z.string().max(100).optional(),
      companyName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.insert(companyVisits).values({
        page: input.page,
        sessionId: input.sessionId ?? null,
        companyName: input.companyName ?? null,
        visitorUserId: (ctx as any).user?.id ?? null,
        visitedAt: new Date(),
      });
      return { success: true };
    }),

  getStats: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [totalRow] = await db.select({ total: count() }).from(companyVisits);
      const total = totalRow?.total ?? 0;
      const byPage = await db.select({ page: companyVisits.page, visits: count() })
        .from(companyVisits).groupBy(companyVisits.page).orderBy(desc(count())).limit(10);
      const byCompany = await db.select({ companyName: companyVisits.companyName, visits: count() })
        .from(companyVisits).groupBy(companyVisits.companyName).orderBy(desc(count())).limit(10);
      const recent = await db.select().from(companyVisits).orderBy(desc(companyVisits.visitedAt)).limit(50);
      return { total, byPage, byCompany, recent };
    }),
});
