import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cases, mailbox, surveys, surveyTokens, courses } from "../../drizzle/schema";
import { eq, and, sql, lt, gte } from "drizzle-orm";

/**
 * Router para contadores dinámicos del menú lateral
 * Proporciona badges y alertas visuales para navegación
 */
export const menuCountersRouter = router({
  /**
   * Obtiene todos los contadores para el menú lateral
   * Incluye casos abiertos, quejas pendientes, cursos pendientes, etc.
   */
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Contador de casos abiertos
    const openCasesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(eq(cases.status, "open"));
    const openCases = Number(openCasesResult[0]?.count || 0);

    // Contador de casos en investigación
    const investigatingCasesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(eq(cases.status, "investigating"));
    const investigatingCases = Number(investigatingCasesResult[0]?.count || 0);

    // Contador de quejas pendientes en buzón (recibidas, no atendidas)
    const pendingComplaintsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(mailbox)
      .where(eq(mailbox.status, "recibido"));
    const pendingComplaints = Number(pendingComplaintsResult[0]?.count || 0);

    // Contador de encuestas próximas a vencer (tokens no usados que expiran en 7 días)
    const expiringTokensResult = await db
      .select({ count: sql<number>`count(distinct ${surveyTokens.surveyId})` })
      .from(surveyTokens)
      .where(
        and(
          sql`${surveyTokens.usedAt} IS NULL`, // No usado
          gte(surveyTokens.expiresAt, now),
          lt(surveyTokens.expiresAt, sevenDaysFromNow)
        )
      );
    const expiringSurveys = Number(expiringTokensResult[0]?.count || 0);

    // Contador de cursos publicados
    const publishedCoursesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(courses)
      .where(eq(courses.isPublished, true));
    const publishedCourses = Number(publishedCoursesResult[0]?.count || 0);

    // Contador total de cursos
    const totalCoursesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(courses);
    const totalCourses = Number(totalCoursesResult[0]?.count || 0);

    return {
      cases: {
        open: openCases,
        investigating: investigatingCases,
        total: openCases + investigatingCases,
      },
      mailbox: {
        pending: pendingComplaints,
      },
      surveys: {
        expiringSoon: expiringSurveys,
      },
      courses: {
        published: publishedCourses,
        total: totalCourses,
      },
    };
  }),
});
