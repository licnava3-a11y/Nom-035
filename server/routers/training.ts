import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { courses } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Training Router - Procedures para dashboard de instructor
 * Los indicadores sin fuente persistida se devuelven como ausencia explícita;
 * nunca se fabrican fechas, calificaciones ni confirmaciones.
 */
export const trainingRouter = router({
  // Estadísticas del instructor
  getInstructorStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
    
    // Contar cursos publicados (completados)
    const publishedCourses = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(courses)
          .where(eq(courses.isPublished, true))
      : [{ count: 0 }];

    // Contar cursos no publicados (pendientes)
    const unpublishedCourses = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(courses)
          .where(eq(courses.isPublished, false))
      : [{ count: 0 }];

    return {
      completedCourses: Number(publishedCourses[0]?.count || 0),
      pendingCourses: Number(unpublishedCourses[0]?.count || 0),
      pendingConfirmations: 0,
      averageRating: null,
      recentEvaluations: [], // Sin evaluaciones persistidas en el modelo actual
    };
    } catch (error) {
      console.error('[Training] Error getting instructor stats:', error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al obtener estadísticas" });
    }
  }),

  // Cursos próximos a impartir
  getInstructorUpcomingCourses: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
    
    // Los cursos no almacenan inicio/fin ni inscripción en el modelo actual.
    // Devolver vacío evita presentar una agenda ficticia al instructor.
    return [];
    } catch (error) {
      console.error('[Training] Error getting upcoming courses:', error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al obtener cursos próximos" });
    }
  }),

  // Confirmaciones pendientes
  getInstructorPendingConfirmations: protectedProcedure.query(async ({ ctx }) => {
    try {
      // La confirmación de sesiones aún no tiene entidad persistida.
      return [];
    } catch (error) {
      console.error('[Training] Error getting pending confirmations:', error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al obtener confirmaciones pendientes" });
    }
  }),
});
