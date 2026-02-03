import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { surveys, surveyQuestions, surveyResponses, surveyAnswers, surveyTokens, users, cases } from "../../drizzle/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import * as calculator from "../lib/nom035-calculator";

// Helper para generar token único
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Helper para determinar qué guía aplicar según número de trabajadores
async function determineApplicableGuide(db: any): Promise<'guia_ii' | 'guia_iii'> {
  const [result] = await db.select({ count: count() }).from(users);
  const totalWorkers = result?.count || 0;
  
  // Guía II: 16-50 trabajadores (46 preguntas - Cuestionario de identificación)
  // Guía III: 51+ trabajadores (72 preguntas - Cuestionario de evaluación)
  return totalWorkers >= 51 ? 'guia_iii' : 'guia_ii';
}

// Helper para detectar Acontecimientos Traumáticos Severos en Guía I
function detectATS(answers: Array<{ questionId: number; answerValue: string }>): boolean {
  // Guía I tiene 4 preguntas, si alguna respuesta es "Sí", se detecta ATS
  return answers.some(answer => answer.answerValue === 'Si' || answer.answerValue === 'Sí');
}

export const surveysRouter = router({
  // Obtener todas las encuestas disponibles
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const allSurveys = await db.select().from(surveys).orderBy(surveys.id);
    return allSurveys;
  }),

  // Obtener encuesta por ID
  getById: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, input)).limit(1);
      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      return survey;
    }),

  // Obtener preguntas de una encuesta
  getQuestions: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const questions = await db
        .select()
        .from(surveyQuestions)
        .where(eq(surveyQuestions.surveyId, input))
        .orderBy(surveyQuestions.order);
      
      return questions;
    }),

  // Determinar qué guía aplicar según número de trabajadores
  getApplicableGuide: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const guide = await determineApplicableGuide(db);
    return { guide, message: guide === 'guia_ii' ? 'Guía II (16-50 trabajadores)' : 'Guía III (51+ trabajadores)' };
  }),

  // Verificar si un usuario ya respondió una encuesta
  hasResponded: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      userId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const userId = input.userId || ctx.user.id;
      const [response] = await db
        .select()
        .from(surveyResponses)
        .where(and(
          eq(surveyResponses.surveyId, input.surveyId),
          eq(surveyResponses.userId, userId)
        ))
        .limit(1);
      
      return { hasResponded: !!response, response };
    }),

  // Generar token único para responder encuesta (para enlaces y QR)
  generateToken: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      userId: z.number(),
      expiresInDays: z.number().default(30),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
      
      await db.insert(surveyTokens).values({
        userId: input.userId,
        surveyId: input.surveyId,
        token,
        expiresAt,
        usedAt: null,
      });
      
      return { token, expiresAt };
    }),

  // Validar token de encuesta
  validateToken: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [tokenData] = await db
        .select()
        .from(surveyTokens)
        .where(eq(surveyTokens.token, input))
        .limit(1);
      
      if (!tokenData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token inválido" });
      }
      
      if (tokenData.usedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este enlace ya fue utilizado" });
      }
      
      if (new Date() > tokenData.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este enlace ha expirado" });
      }
      
      return { valid: true, surveyId: tokenData.surveyId, userId: tokenData.userId };
    }),

  // Enviar respuesta de encuesta
  submitResponse: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      answers: z.array(z.object({
        questionId: z.number(),
        answerValue: z.string(),
      })),
      responseToken: z.string().optional(), // Token opcional para validar
      curp: z.string().optional(), // Para trabajadores no registrados
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Verificar si ya respondió
      const [existingResponse] = await db
        .select()
        .from(surveyResponses)
        .where(and(
          eq(surveyResponses.surveyId, input.surveyId),
          eq(surveyResponses.userId, ctx.user.id)
        ))
        .limit(1);
      
      if (existingResponse) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ya has respondido esta encuesta" });
      }
      
      // Generar token único para esta respuesta
      const responseToken = input.responseToken || generateToken();
      
      // Crear respuesta
      await db.insert(surveyResponses).values({
        surveyId: input.surveyId,
        userId: ctx.user.id,
        curp: input.curp || null,
        token: responseToken,
        completedAt: new Date(),
        startedAt: new Date(),
      });
      
      // Obtener el ID de la respuesta recién creada
      const [newResponse] = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.token, responseToken))
        .limit(1);
      
      if (!newResponse) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al crear respuesta" });
      }
      
      // Guardar respuestas individuales
      for (const answer of input.answers) {
        await db.insert(surveyAnswers).values({
          responseId: newResponse.id,
          questionId: answer.questionId,
          answerValue: answer.answerValue,
        });
      }
      
      // Marcar token como usado si existe
      if (input.responseToken) {
        await db
          .update(surveyTokens)
          .set({ usedAt: new Date() })
          .where(eq(surveyTokens.token, input.responseToken));
      }
      
      // Detectar ATS en Guía I y crear caso automáticamente
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, input.surveyId)).limit(1);
      if (survey && survey.type === 'guia_i') {
        const hasATS = detectATS(input.answers);
        if (hasATS) {
          // Generar número de caso único
          const caseNumber = `ATS-${Date.now()}-${ctx.user.id}`;
          
          // Crear caso automáticamente
          await db.insert(cases).values({
            caseNumber,
            reporterName: ctx.user.name || 'Anónimo',
            reporterEmail: ctx.user.email || '',
            isAnonymous: false,
            caseType: 'other', // ATS se categoriza como "other" por ahora
            description: `Se detectó un Acontecimiento Traumático Severo en la respuesta de la Guía I del trabajador ${ctx.user.name || ctx.user.email}. Se requiere investigación y dictamen por parte del comité.`,
            status: 'open',
            priority: 'critical',
            createdAt: new Date(),
          });
          
          // TODO: Enviar notificación al comité
        }
        
        return { success: true, responseId: newResponse.id, atsDetected: hasATS };
      }
      
      return { success: true, responseId: newResponse.id, atsDetected: false };
    }),

  // Obtener respuestas de un usuario
  getResponsesByUser: protectedProcedure
    .input(z.number().optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const userId = input || ctx.user.id;
      const responses = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.userId, userId))
        .orderBy(desc(surveyResponses.completedAt));
      
      return responses;
    }),

  // Obtener estadísticas de encuestas
  getStatistics: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Total de trabajadores
      const [totalWorkers] = await db.select({ count: count() }).from(users);
      
      // Total de respuestas
      const [totalResponses] = await db
        .select({ count: count() })
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, input));
      
      // Trabajadores pendientes
      const pending = (totalWorkers?.count || 0) - (totalResponses?.count || 0);
      
      return {
        totalWorkers: totalWorkers?.count || 0,
        totalResponses: totalResponses?.count || 0,
        pending,
        completionRate: totalWorkers?.count ? ((totalResponses?.count || 0) / totalWorkers.count * 100).toFixed(2) : '0',
      };
    }),

  // Obtener resultado calculado de una respuesta
  getCalculatedResult: protectedProcedure
    .input(z.number()) // responseId
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Obtener respuesta
      const [response] = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.id, input))
        .limit(1);
      
      if (!response) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Respuesta no encontrada" });
      }
      
      // Obtener encuesta para determinar tipo
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, response.surveyId)).limit(1);
      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      
      // Solo calcular para Guía II y III
      if (survey.type !== 'guia_ii' && survey.type !== 'guia_iii') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden calcular resultados de Guía II y III" });
      }
      
      // Obtener respuestas individuales con información de preguntas
      const answers = await db
        .select({
          questionId: surveyAnswers.questionId,
          answer: surveyAnswers.answerValue,
          isReverseScored: surveyQuestions.isReverseScored,
          category: surveyQuestions.category,
          domain: surveyQuestions.domain,
          dimension: surveyQuestions.dimension,
        })
        .from(surveyAnswers)
        .innerJoin(surveyQuestions, eq(surveyAnswers.questionId, surveyQuestions.id))
        .where(eq(surveyAnswers.responseId, input));
      
      // Calcular resultado
      const result = calculator.calculateSurveyResult(
        answers.map(a => ({
          questionId: a.questionId,
          answer: a.answer,
          isReverseScored: Boolean(a.isReverseScored),
          category: a.category || '',
          domain: a.domain || '',
          dimension: a.dimension,
        })),
        survey.type as 'guia_ii' | 'guia_iii'
      );
      
      return {
        responseId: input,
        userId: response.userId,
        surveyId: response.surveyId,
        surveyType: survey.type,
        completedAt: response.completedAt,
        ...result,
      };
    }),

  // Obtener estadísticas de riesgo por categoría/dominio
  getRiskStatistics: protectedProcedure
    .input(z.number()) // surveyId
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Obtener todas las respuestas de la encuesta
      const responses = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, input));
      
      if (responses.length === 0) {
        return {
          totalResponses: 0,
          riskDistribution: {},
          categoryRisks: [],
          domainRisks: [],
        };
      }
      
      // Obtener encuesta para determinar tipo
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, input)).limit(1);
      if (!survey || (survey.type !== 'guia_ii' && survey.type !== 'guia_iii')) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden calcular estadísticas de Guía II y III" });
      }
      
      // Calcular resultados para cada respuesta
      const results = [];
      for (const response of responses) {
        const answers = await db
          .select({
            questionId: surveyAnswers.questionId,
            answer: surveyAnswers.answerValue,
            isReverseScored: surveyQuestions.isReverseScored,
            category: surveyQuestions.category,
            domain: surveyQuestions.domain,
            dimension: surveyQuestions.dimension,
          })
          .from(surveyAnswers)
          .innerJoin(surveyQuestions, eq(surveyAnswers.questionId, surveyQuestions.id))
          .where(eq(surveyAnswers.responseId, response.id));
        
        const result = calculator.calculateSurveyResult(
          answers.map(a => ({
            questionId: a.questionId,
            answer: a.answer,
            isReverseScored: Boolean(a.isReverseScored),
            category: a.category || '',
            domain: a.domain || '',
            dimension: a.dimension,
          })),
          survey.type as 'guia_ii' | 'guia_iii'
        );
        
        results.push(result);
      }
      
      // Calcular distribución de riesgo
      const riskDistribution: Record<string, number> = {};
      for (const result of results) {
        riskDistribution[result.finalRiskLevel] = (riskDistribution[result.finalRiskLevel] || 0) + 1;
      }
      
      // Calcular riesgos promedio por categoría
      const categoryRisks: Record<string, { count: number; avgScore: number }> = {};
      for (const result of results) {
        for (const cat of result.categories) {
          if (!categoryRisks[cat.category]) {
            categoryRisks[cat.category] = { count: 0, avgScore: 0 };
          }
          categoryRisks[cat.category].count++;
          categoryRisks[cat.category].avgScore += cat.score;
        }
      }
      
      // Calcular promedios
      for (const cat in categoryRisks) {
        categoryRisks[cat].avgScore = categoryRisks[cat].avgScore / categoryRisks[cat].count;
      }
      
      return {
        totalResponses: responses.length,
        riskDistribution,
        categoryRisks: Object.entries(categoryRisks).map(([category, data]) => ({
          category,
          avgScore: data.avgScore,
          riskLevel: calculator.determineRiskLevel(data.avgScore, survey.type as 'guia_ii' | 'guia_iii').level,
        })),
        domainRisks: [], // TODO: Implementar si es necesario
      };
    }),

  // Reactivar encuesta para un usuario (solo admin)
  reactivateSurvey: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Solo admin puede reactivar
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo los administradores pueden reactivar encuestas" });
      }
      
      // Eliminar respuesta anterior
      await db
        .delete(surveyResponses)
        .where(and(
          eq(surveyResponses.surveyId, input.surveyId),
          eq(surveyResponses.userId, input.userId)
        ));
      
      return { success: true, message: "Encuesta reactivada exitosamente" };
    }),
});
