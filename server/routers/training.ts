import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
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
    // TODO: Implementar queries reales cuando se agreguen campos instructorId, status, dates a tabla courses
    // Por ahora retornamos datos mock para que el dashboard funcione
    
    // Contar cursos publicados como proxy temporal
    const db = await getDb();
    const publishedCourses = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(courses)
          .where(eq(courses.isPublished, true))
      : [{ count: 0 }];

    return {
      completedCourses: Number(publishedCourses[0]?.count || 0),
      pendingCourses: 3,
      pendingConfirmations: 1,
      averageRating: 4.5,
      recentEvaluations: [
        {
          courseName: "Fundamentos NOM-035",
          rating: 5,
          comment: "Excelente instructor, muy claro en sus explicaciones",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          courseName: "Prevención de Riesgos Psicosociales",
          rating: 4,
          comment: "Buen contenido, me gustaría más ejemplos prácticos",
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      ],
    };
  }),

  // Cursos próximos a impartir
  getInstructorUpcomingCourses: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Implementar query real cuando se agreguen campos de fechas e instructor
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 1,
        courseName: "Identificación de Factores de Riesgo Psicosocial",
        startDate: nextWeek,
        endDate: nextWeek,
        duration: 120,
        participants: 25,
      },
      {
        id: 2,
        courseName: "Manejo del Estrés Laboral",
        startDate: nextMonth,
        endDate: nextMonth,
        duration: 180,
        participants: 30,
      },
    ];
  }),

  // Confirmaciones pendientes
  getInstructorPendingConfirmations: protectedProcedure.query(async ({ ctx }) => {
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
  }),
});
