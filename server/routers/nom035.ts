import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db-nom035";

export const nom035Router = router({
  // Obtener todas las preguntas del cuestionario
  getQuestions: publicProcedure.query(async () => {
    return await db.getNOM035Questions();
  }),

  // Guardar una respuesta individual
  saveResponse: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number(),
        questionId: z.number(),
        response: z.number().min(0).max(4), // Escala Likert 0-4
      })
    )
    .mutation(async ({ ctx, input }) => {
      const employeeId = ctx.user.id;
      await db.saveNOM035Response({
        employeeId,
        ...input,
      });
      return { success: true };
    }),

  // Obtener progreso del cuestionario
  getProgress: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const employeeId = ctx.user.id;
      return await db.getNOM035Progress(employeeId, input.surveyPeriodId);
    }),

  // Obtener respuestas del empleado
  getResponses: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const employeeId = ctx.user.id;
      return await db.getNOM035Responses(employeeId, input.surveyPeriodId);
    }),

  // Calcular resultados del cuestionario
  calculateResults: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const employeeId = ctx.user.id;
      return await db.calculateNOM035Results(employeeId, input.surveyPeriodId);
    }),

  // Obtener resultados calculados
  getResults: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number(),
        employeeId: z.number().optional(), // Admin puede ver resultados de otros
      })
    )
    .query(async ({ ctx, input }) => {
      const employeeId = input.employeeId || ctx.user.id;
      
      // Solo admin puede ver resultados de otros empleados
      if (employeeId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No autorizado");
      }

      return await db.getNOM035Results(employeeId, input.surveyPeriodId);
    }),

  // Crear período de evaluación (solo admin)
  createPeriod: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        startDate: z.string(), // ISO date string
        endDate: z.string(), // ISO date string
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Solo administradores pueden crear períodos");
      }

      const periodId = await db.createSurveyPeriod({
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        createdBy: ctx.user.id,
      });

      return { id: periodId, success: true };
    }),

  // Obtener período activo
  getActivePeriod: publicProcedure.query(async () => {
    return await db.getActiveSurveyPeriod();
  }),
});
