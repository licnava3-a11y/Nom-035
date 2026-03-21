import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { courses } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Training Router - Procedures para dashboard de instructor
 * NOTA: Estos procedures retornan datos mock temporales.
 * Reemplazar con queries reales cuando se implemente la gestión completa de cursos con instructores.
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

    // Contar total de cursos
    const totalCourses = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(courses)
      : [{ count: 0 }];

    return {
      completedCourses: Number(publishedCourses[0]?.count || 0),
      pendingCourses: Number(unpublishedCourses[0]?.count || 0),
      pendingConfirmations: 0, // TODO: Implementar cuando se agregue tabla de confirmaciones
      averageRating: 4.5, // TODO: Implementar cuando se agregue tabla de evaluaciones
      recentEvaluations: [], // TODO: Implementar cuando se agregue tabla de evaluaciones
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
    
    // Obtener cursos publicados más recientes
    const upcomingCourses = db
      ? await db
          .select({
            id: courses.id,
            courseName: courses.title,
            duration: courses.duration,
          })
          .from(courses)
          .where(eq(courses.isPublished, true))
          .orderBy(desc(courses.createdAt))
          .limit(5)
      : [];

    // Mapear a formato esperado con fechas mock (hasta que se agreguen campos de fechas)
    const today = new Date();
    return upcomingCourses.map((course: any, index: number) => ({
      id: course.id,
      courseName: course.courseName,
      startDate: new Date(today.getTime() + (index + 1) * 7 * 24 * 60 * 60 * 1000), // Mock: próximas semanas
      endDate: new Date(today.getTime() + (index + 1) * 7 * 24 * 60 * 60 * 1000),
      duration: course.duration || 120,
      participants: 0, // TODO: Implementar cuando se agregue tabla de inscripciones
    }));
    } catch (error) {
      console.error('[Training] Error getting upcoming courses:', error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al obtener cursos próximos" });
    }
  }),

  // Confirmaciones pendientes
  getInstructorPendingConfirmations: protectedProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Implementar query real cuando se agregue gestión de confirmaciones
    const proposedDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 3,
        courseName: "Prevención del Burnout",
        proposedDate,
        duration: 240,
      },
    ];
    } catch (error) {
      console.error('[Training] Error getting pending confirmations:', error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al obtener confirmaciones pendientes" });
    }
  }),
});
