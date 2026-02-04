import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { surveys, surveyQuestions, surveyResponses, surveyAnswers, surveyTokens, surveyNotifications, users, cases } from "../../drizzle/schema";
import { eq, and, desc, count, sql, inArray, not } from "drizzle-orm";
import { randomBytes } from "crypto";
import * as calculator from "../lib/nom035-calculator";
import * as scoring from "../lib/nom035-scoring";

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
      
      // Obtener preguntas para calcular resultados
      const questions = await db
        .select()
        .from(surveyQuestions)
        .where(eq(surveyQuestions.surveyId, input.surveyId));
      
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
      
      // Calcular resultados según el tipo de encuesta
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, input.surveyId)).limit(1);
      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      
      let results: any = {};
      let atsDetected = false;
      
      if (survey.type === 'guia_i') {
        // Guía I - Detectar Acontecimientos Traumáticos Severos
        const guideIResult = scoring.calculateGuideIResult(input.answers);
        results = {
          type: 'guia_i',
          atsDetected: guideIResult.atsDetected,
          score: guideIResult.score,
          riskLevel: guideIResult.riskLevel,
          recommendations: scoring.getRecommendations(guideIResult.riskLevel, 'guia_i'),
          calculatedAt: new Date().toISOString(),
        };
        atsDetected = guideIResult.atsDetected;
        
        // Crear caso automáticamente si se detecta ATS
        if (atsDetected) {
          const caseNumber = `ATS-${Date.now()}-${ctx.user.id}`;
          await db.insert(cases).values({
            caseNumber,
            reporterName: ctx.user.name || 'Anónimo',
            reporterEmail: ctx.user.email || '',
            isAnonymous: false,
            caseType: 'other',
            description: `Se detectó un Acontecimiento Traumático Severo en la respuesta de la Guía I del trabajador ${ctx.user.name || ctx.user.email}. Se requiere investigación y dictamen por parte del comité.`,
            status: 'open',
            priority: 'critical',
            createdAt: new Date(),
          });
        }
      } else if (survey.type === 'guia_ii') {
        // Guía II - Empresas de 16 a 50 trabajadores
        const totalScore = scoring.calculateTotalScore(
          input.answers,
          questions.map(q => ({ id: q.id, isReverseScored: q.isReverseScored }))
        );
        const guideIIResult = scoring.calculateGuideIIResult(totalScore);
        const categoryScores = scoring.calculateCategoryScores(
          input.answers,
          questions.map(q => ({ id: q.id, category: q.category, isReverseScored: q.isReverseScored }))
        );
        
        results = {
          type: 'guia_ii',
          totalScore,
          riskLevel: guideIIResult.riskLevel,
          category: guideIIResult.category,
          categoryScores,
          recommendations: scoring.getRecommendations(guideIIResult.riskLevel, 'guia_ii'),
          calculatedAt: new Date().toISOString(),
        };
      } else if (survey.type === 'guia_iii') {
        // Guía III - Empresas de más de 50 trabajadores
        const totalScore = scoring.calculateTotalScore(
          input.answers,
          questions.map(q => ({ id: q.id, isReverseScored: q.isReverseScored }))
        );
        const guideIIIResult = scoring.calculateGuideIIIResult(totalScore);
        const categoryScores = scoring.calculateCategoryScores(
          input.answers,
          questions.map(q => ({ id: q.id, category: q.category, isReverseScored: q.isReverseScored }))
        );
        const domainScores = scoring.calculateDomainScores(
          input.answers,
          questions.map(q => ({ id: q.id, domain: q.domain, isReverseScored: q.isReverseScored }))
        );
        
        results = {
          type: 'guia_iii',
          totalScore,
          riskLevel: guideIIIResult.riskLevel,
          category: guideIIIResult.category,
          categoryScores,
          domainScores,
          recommendations: scoring.getRecommendations(guideIIIResult.riskLevel, 'guia_iii'),
          calculatedAt: new Date().toISOString(),
        };
      }
      
      // Guardar resultados en la respuesta
      await db
        .update(surveyResponses)
        .set({ results: JSON.stringify(results) })
        .where(eq(surveyResponses.id, newResponse.id));
      
      return { success: true, responseId: newResponse.id, atsDetected, results };
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
      const [totalWorkers] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users);
      
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

  // Generar reporte individual PDF
  generateIndividualPDF: protectedProcedure
    .input(z.number()) // responseId
    .mutation(async ({ input, ctx }) => {
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
      
      // Obtener encuesta
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, response.surveyId)).limit(1);
      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      
      // Obtener usuario
      if (!response.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Respuesta sin usuario asociado" });
      }
      const [user] = await db.select().from(users).where(eq(users.id, response.userId)).limit(1);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }
      
      // Obtener respuestas individuales con información de preguntas
      const answers = await db
        .select({
          questionId: surveyAnswers.questionId,
          questionText: surveyQuestions.questionText,
          answer: surveyAnswers.answerValue,
          isReverseScored: surveyQuestions.isReverseScored,
          category: surveyQuestions.category,
          domain: surveyQuestions.domain,
          dimension: surveyQuestions.dimension,
        })
        .from(surveyAnswers)
        .innerJoin(surveyQuestions, eq(surveyAnswers.questionId, surveyQuestions.id))
        .where(eq(surveyAnswers.responseId, input));
      
      // Preparar datos del reporte
      const reportData = {
        employeeName: user.name || user.email || 'Usuario sin nombre',
        employeeId: user.id.toString(),
        department: undefined, // TODO: Agregar departamento si existe
        position: undefined, // TODO: Agregar puesto si existe
        surveyType: survey.type as 'guia_i' | 'guia_ii' | 'guia_iii',
        surveyDate: response.completedAt || new Date(),
        answers: answers.map(a => ({
          questionId: a.questionId,
          questionText: a.questionText || '',
          answer: a.answer,
          isReverseScored: Boolean(a.isReverseScored),
          category: a.category || '',
          domain: a.domain || '',
          dimension: a.dimension || '',
        })),
      };
      
      // Generar PDF según el tipo de guía
      const pdfReports = await import('../lib/nom035-pdf-reports');
      let pdfBuffer: Buffer;
      
      if (survey.type === 'guia_i') {
        // Detectar ATS
        const hasATS = detectATS(answers.map(a => ({ questionId: a.questionId, answerValue: a.answer })));
        pdfBuffer = await pdfReports.generateGuideIReport(reportData, hasATS);
      } else {
        pdfBuffer = await pdfReports.generateIndividualReport(reportData);
      }
      
      // Retornar PDF como base64
      return {
        pdf: pdfBuffer.toString('base64'),
        filename: `reporte_${survey.type}_${user.id}_${Date.now()}.pdf`,
      };
    }),

  // Generar reporte agregado PDF
  generateAggregatedPDF: protectedProcedure
    .input(z.number()) // surveyId
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Obtener encuesta
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, input)).limit(1);
      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      
      // Obtener todas las respuestas
      const responses = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, input));
      
      // Total de trabajadores
      const [totalWorkers] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users);
      
      // Calcular cobertura
      const coverage = totalWorkers?.count ? (responses.length / totalWorkers.count) * 100 : 0;
      
      // Calcular estadísticas
      const riskDistribution: Record<string, number> = {};
      const categoryScores: Record<string, number[]> = {};
      let atsDetected = 0;
      
      if (survey.type === 'guia_i') {
        // Contar casos ATS
        for (const response of responses) {
          const answers = await db
            .select({ questionId: surveyAnswers.questionId, answer: surveyAnswers.answerValue })
            .from(surveyAnswers)
            .where(eq(surveyAnswers.responseId, response.id));
          
          if (detectATS(answers.map(a => ({ questionId: a.questionId, answerValue: a.answer })))) {
            atsDetected++;
          }
        }
      } else {
        // Calcular para Guía II y III
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
              dimension: a.dimension || '',
            })),
            survey.type as 'guia_ii' | 'guia_iii'
          );
          
          riskDistribution[result.finalRiskLevel] = (riskDistribution[result.finalRiskLevel] || 0) + 1;
          
          for (const cat of result.categories) {
            if (!categoryScores[cat.category]) {
              categoryScores[cat.category] = [];
            }
            categoryScores[cat.category].push(cat.score);
          }
        }
      }
      
      // Calcular promedios por categoría
      const averageRiskByCategory = Object.entries(categoryScores).map(([category, scores]) => ({
        category,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      }));
      
      // Preparar datos del reporte
      const reportData = {
        organizationName: 'Organización', // TODO: Obtener nombre real
        reportDate: new Date(),
        totalEmployees: totalWorkers?.count || 0,
        totalResponses: responses.length,
        coverage,
        riskDistribution,
        averageRiskByCategory,
        atsDetected,
      };
      
      // Generar PDF
      const pdfReports = await import('../lib/nom035-pdf-reports');
      const pdfBuffer = await pdfReports.generateAggregatedReport(reportData);
      
      // Retornar PDF como base64
      return {
        pdf: pdfBuffer.toString('base64'),
        filename: `reporte_agregado_${survey.type}_${Date.now()}.pdf`,
      };
    }),

  // Obtener cobertura por departamento
  getCoverageByDepartment: protectedProcedure
    .input(z.number()) // surveyId
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Obtener todos los usuarios con departamento
      const allUsers = await db.select().from(users);
      
      // Obtener respuestas de la encuesta
      const responses = await db
        .select({ userId: surveyResponses.userId })
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, input));
      
      const respondedUserIds = new Set(responses.map(r => r.userId));
      
      // Agrupar por departamento
      const departmentStats: Record<string, { total: number; responded: number; pending: number; coverage: number }> = {};
      
      for (const user of allUsers) {
        const dept = user.departamento || 'Sin departamento';
        if (!departmentStats[dept]) {
          departmentStats[dept] = { total: 0, responded: 0, pending: 0, coverage: 0 };
        }
        
        departmentStats[dept].total++;
        if (user.id && respondedUserIds.has(user.id)) {
          departmentStats[dept].responded++;
        } else {
          departmentStats[dept].pending++;
        }
      }
      
      // Calcular cobertura
      for (const dept in departmentStats) {
        const stats = departmentStats[dept];
        stats.coverage = stats.total > 0 ? (stats.responded / stats.total) * 100 : 0;
      }
      
      return Object.entries(departmentStats).map(([department, stats]) => ({
        department,
        ...stats,
      }));
    }),

  // Obtener lista de trabajadores pendientes
  getPendingWorkers: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      department: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Obtener respuestas de la encuesta
      const responses = await db
        .select({ userId: surveyResponses.userId })
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, input.surveyId));
      
      const respondedUserIds = new Set(responses.map(r => r.userId));
      
      // Obtener todos los usuarios
      let allUsers = await db.select().from(users);
      
      // Filtrar usuarios pendientes
      let pendingUsers = allUsers.filter(user => user.id && !respondedUserIds.has(user.id));
      
      // Aplicar filtro de departamento
      if (input.department && input.department !== 'all') {
        pendingUsers = pendingUsers.filter(user => user.departamento === input.department);
      }
      
      // Aplicar filtro de búsqueda
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        pendingUsers = pendingUsers.filter(user => 
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      }
      
      return pendingUsers.map(user => ({
        id: user.id,
        name: user.name || 'Sin nombre',
        email: user.email || 'Sin correo',
        department: user.departamento || 'Sin departamento',
        position: user.puesto || 'Sin puesto',
      }));
    }),

  // Generar PDF de trabajadores pendientes
  generatePendingWorkersPDF: protectedProcedure
    .input(z.number()) // surveyId
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Obtener encuesta
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, input)).limit(1);
      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      
      // Obtener respuestas
      const responses = await db
        .select({ userId: surveyResponses.userId })
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, input));
      
      const respondedUserIds = new Set(responses.map(r => r.userId));
      
      // Obtener usuarios pendientes
      const allUsers = await db.select().from(users);
      const pendingUsers = allUsers.filter(user => user.id && !respondedUserIds.has(user.id));
      
      // Generar PDF
      const pdfReports = await import('../lib/nom035-pdf-reports');
      const pdfBuffer = await pdfReports.generatePendingWorkersReport({
        surveyType: survey.type as 'guia_i' | 'guia_ii' | 'guia_iii',
        surveyTitle: survey.title || 'Encuesta NOM-035',
        totalWorkers: allUsers.length,
        respondedWorkers: responses.length,
        pendingWorkers: pendingUsers.map(user => ({
          name: user.name || 'Sin nombre',
          email: user.email || 'Sin correo',
          department: user.departamento || 'Sin departamento',
          position: user.puesto || 'Sin puesto',
        })),
        generatedAt: new Date(),
      });
      
      return {
        pdf: pdfBuffer.toString('base64'),
        filename: `trabajadores_pendientes_${survey.type}_${Date.now()}.pdf`,
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

  // Enviar invitaciones masivas a encuesta
  sendSurveyInvitations: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      userIds: z.array(z.number()).optional(), // Si no se especifica, se envía a todos los pendientes
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Solo admin puede enviar invitaciones
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo los administradores pueden enviar invitaciones" });
      }
      
      const { sendSurveyInvitation } = await import('../lib/survey-email-service');
      
      // Obtener encuesta
      const survey = await db.select().from(surveys).where(eq(surveys.id, input.surveyId)).limit(1);
      if (!survey[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      
      // Obtener usuarios pendientes
      let targetUsers;
      if (input.userIds && input.userIds.length > 0) {
        targetUsers = await db.select().from(users).where(inArray(users.id, input.userIds));
      } else {
        // Obtener todos los usuarios que no han respondido
        const responses = await db.select({ userId: surveyResponses.userId })
          .from(surveyResponses)
          .where(eq(surveyResponses.surveyId, input.surveyId));
        
        const respondedUserIds = responses.map(r => r.userId).filter((id): id is number => id !== null);
        
        if (respondedUserIds.length > 0) {
          targetUsers = await db.select().from(users).where(not(inArray(users.id, respondedUserIds)));
        } else {
          targetUsers = await db.select().from(users);
        }
      }
      
      // Enviar invitaciones
      const results = [];
      for (const user of targetUsers) {
        if (!user.email) continue;
        
        const result = await sendSurveyInvitation({
          to: user.email,
          userName: user.name || 'Usuario',
          surveyTitle: survey[0].title,
          surveyDescription: survey[0].description || '',
          surveyUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/surveys/${survey[0].type}`,
          dueDate: input.dueDate,
        });
        
        // Registrar notificación
        await db.insert(surveyNotifications).values({
          surveyId: input.surveyId,
          userId: user.id,
          type: 'invitation',
          subject: `Invitación: ${survey[0].title}`,
          body: `Invitación a encuesta NOM-035`,
          sentAt: result.success ? new Date() : null,
          status: result.success ? 'sent' : 'failed',
          error: result.error,
        });
        
        results.push({ userId: user.id, success: result.success });
      }
      
      const successCount = results.filter(r => r.success).length;
      return { 
        success: true, 
        message: `Invitaciones enviadas: ${successCount} de ${results.length}`,
        results 
      };
    }),

  // Enviar recordatorios masivos
  sendSurveyReminders: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      userIds: z.array(z.number()).optional(),
      daysRemaining: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo los administradores pueden enviar recordatorios" });
      }
      
      const { sendSurveyReminder } = await import('../lib/survey-email-service');
      
      const survey = await db.select().from(surveys).where(eq(surveys.id, input.surveyId)).limit(1);
      if (!survey[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      
      // Obtener usuarios pendientes
      let targetUsers;
      if (input.userIds && input.userIds.length > 0) {
        targetUsers = await db.select().from(users).where(inArray(users.id, input.userIds));
      } else {
        const responses = await db.select({ userId: surveyResponses.userId })
          .from(surveyResponses)
          .where(eq(surveyResponses.surveyId, input.surveyId));
        
        const respondedUserIds = responses.map(r => r.userId).filter((id): id is number => id !== null);
        
        if (respondedUserIds.length > 0) {
          targetUsers = await db.select().from(users).where(not(inArray(users.id, respondedUserIds)));
        } else {
          targetUsers = await db.select().from(users);
        }
      }
      
      const results = [];
      for (const user of targetUsers) {
        if (!user.email) continue;
        
        const result = await sendSurveyReminder({
          to: user.email,
          userName: user.name || 'Usuario',
          surveyTitle: survey[0].title,
          surveyUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/surveys/${survey[0].type}`,
          daysRemaining: input.daysRemaining,
        });
        
        await db.insert(surveyNotifications).values({
          surveyId: input.surveyId,
          userId: user.id,
          type: 'reminder',
          subject: `Recordatorio: ${survey[0].title}`,
          body: `Recordatorio de encuesta NOM-035 pendiente`,
          sentAt: result.success ? new Date() : null,
          status: result.success ? 'sent' : 'failed',
          error: result.error,
        });
        
        results.push({ userId: user.id, success: result.success });
      }
      
      const successCount = results.filter(r => r.success).length;
      return { 
        success: true, 
        message: `Recordatorios enviados: ${successCount} de ${results.length}`,
        results 
      };
    }),

  // Obtener resultados de una respuesta
  getResults: protectedProcedure
    .input(z.number()) // responseId
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [response] = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.id, input))
        .limit(1);
      
      if (!response) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Respuesta no encontrada" });
      }
      
      // Verificar que el usuario tiene permiso para ver los resultados
      if (response.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estos resultados" });
      }
      
      // Obtener encuesta
      const [survey] = await db
        .select()
        .from(surveys)
        .where(eq(surveys.id, response.surveyId))
        .limit(1);
      
      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      
      // Parsear resultados
      let results = null;
      if (response.results) {
        try {
          results = JSON.parse(response.results);
        } catch (e) {
          console.error('Error parsing results:', e);
        }
      }
      
      return {
        response,
        survey,
        results,
      };
    }),

  // Obtener log de notificaciones
  getNotificationsLog: protectedProcedure
    .input(z.object({
      surveyId: z.number().optional(),
      userId: z.number().optional(),
      type: z.enum(['invitation', 'reminder', 'completion']).optional(),
      status: z.enum(['pending', 'sent', 'failed']).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo los administradores pueden ver el log" });
      }
      
      const conditions = [];
      if (input.surveyId) conditions.push(eq(surveyNotifications.surveyId, input.surveyId));
      if (input.userId) conditions.push(eq(surveyNotifications.userId, input.userId));
      if (input.type) conditions.push(eq(surveyNotifications.type, input.type));
      if (input.status) conditions.push(eq(surveyNotifications.status, input.status));
      
      const notifications = await db.select()
        .from(surveyNotifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(surveyNotifications.createdAt))
        .limit(input.limit);
      
      return notifications;
    }),
});
