import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../permissions";
import { getDb } from "../db";
import { cases, companyGeneralData, departments, employees, jobPositions, nom035Results, notifications, positions, questions, surveyAnonymousTokens, surveyAnswers, surveyNotifications, surveyPeriods, surveyQuestions, surveyResponses, surveyResults, surveyTokens, surveys, users } from "../../drizzle/schema";
import { eq, and, desc, count, sql, inArray, not } from "drizzle-orm";
import { randomBytes } from "crypto";
import * as calculator from "../lib/nom035-calculator";
import * as scoring from "../lib/nom035-scoring";
import { calculateAndPersistGuideIIResult } from "../services/guideIIResults";
import { calculateSampleSize } from "../lib/sample-size-calculator";
import { sendSurveyTokensNotification } from "../lib/email-sender";
import { generateConsolidatedNOM035Report } from "../lib/nom035-pdf-generator";
import { storagePut } from "../storage";
import { logSurveyReportEvidence } from "../helpers/evidenceLogger";

type SurveyDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// Helper para generar token único
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Helper para determinar qué guía aplicar según número de trabajadores
async function determineApplicableGuide(db: SurveyDatabase): Promise<'guia_ii' | 'guia_iii'> {
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

type ScoringAnswer = {
  questionId: number;
  answer: string;
  isReverseScored: boolean | null;
  category: string | null;
  domain: string | null;
  dimension: string | null;
};

async function getScoringAnswersByResponseId(
  db: SurveyDatabase,
  responseIds: number[],
): Promise<Map<number, ScoringAnswer[]>> {
  if (responseIds.length === 0) return new Map();

  const rows = await db
    .select({
      responseId: surveyAnswers.responseId,
      questionId: surveyAnswers.questionId,
      answer: surveyAnswers.answerValue,
      isReverseScored: surveyQuestions.isReverseScored,
      category: surveyQuestions.category,
      domain: surveyQuestions.domain,
      dimension: surveyQuestions.dimension,
    })
    .from(surveyAnswers)
    .innerJoin(surveyQuestions, eq(surveyAnswers.questionId, surveyQuestions.id))
    .where(inArray(surveyAnswers.responseId, responseIds));

  const answersByResponseId = new Map<number, ScoringAnswer[]>();
  for (const row of rows) {
    const answers = answersByResponseId.get(row.responseId) ?? [];
    answers.push({
      questionId: row.questionId,
      answer: row.answer,
      isReverseScored: row.isReverseScored,
      category: row.category,
      domain: row.domain,
      dimension: row.dimension,
    });
    answersByResponseId.set(row.responseId, answers);
  }

  return answersByResponseId;
}

export const surveysRouter = router({
  // Obtener todas las encuestas disponibles
  getAll: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
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
  getApplicableGuide: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
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
    .use(requirePermission('can_create'))
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
      
      // NOTA: Temporalmente comentado - requiere periodId
      // await (db.insert(surveyTokens) as any).values({
      //   periodId: input.periodId, // NUEVO CAMPO REQUERIDO
      //   userId: input.userId,
      //   surveyId: input.surveyId,
      //   token,
      //   expiresAt,
      //   usedAt: null,
      // });
      
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

  // Guardar respuesta parcial (auto-guardado en tiempo real)
  savePartialResponse: publicProcedure
    .input(z.object({
      surveyId: z.number(),
      token: z.string().optional(), // Token de acceso anónimo
      periodId: z.number().optional(), // Requerido cuando el flujo usa un token de periodo
      questionId: z.number(),
      answerValue: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // El usuario autenticado se toma exclusivamente de la sesión; nunca del cliente.
      if (!input.token && !ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión o proporcionar un token" });
      }

      // Buscar o crear respuesta parcial
      let responseId: number;

      if (input.token) {
        // Acceso mediante token
        const [tokenData] = await db
          .select()
          .from(surveyTokens)
          .where(eq(surveyTokens.token, input.token))
          .limit(1);

        if (!tokenData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Token inválido" });
        }

        if (input.periodId !== undefined && tokenData.periodId !== input.periodId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El token no corresponde a este periodo" });
        }

        // Buscar respuesta existente
        const [existingResponse] = await db
          .select()
          .from(surveyResponses)
          .where(and(
            eq(surveyResponses.surveyId, input.surveyId),
            eq(surveyResponses.userId, tokenData.userId),
            eq(surveyResponses.periodId, tokenData.periodId)
          ))
          .limit(1);

        if (existingResponse) {
          responseId = existingResponse.id;
        } else {
          // Crear nueva respuesta
          const responseToken = generateToken();
          const [newResponse] = await (db.insert(surveyResponses) as any).values({
            surveyId: input.surveyId,
            userId: tokenData.userId,
            periodId: tokenData.periodId,
            token: responseToken,
            startedAt: new Date(),
          });
          responseId = newResponse.insertId;
        }
      } else {
        // Acceso autenticado
        const userId = ctx.user?.id;
        if (userId === undefined) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión para guardar respuestas" });
        }
        const [existingResponse] = await db
          .select()
          .from(surveyResponses)
          .where(and(
            eq(surveyResponses.surveyId, input.surveyId),
            eq(surveyResponses.userId, userId)
          ))
          .limit(1);

        if (existingResponse) {
          responseId = existingResponse.id;
        } else {
          // Crear nueva respuesta
          const responseToken = generateToken();
          const [newResponse] = await (db.insert(surveyResponses) as any).values({
            surveyId: input.surveyId,
            userId,
            token: responseToken,
            startedAt: new Date(),
          });
          responseId = newResponse.insertId;
        }
      }

      // Verificar si ya existe una respuesta para esta pregunta
      const [existingAnswer] = await db
        .select()
        .from(surveyAnswers)
        .where(and(
          eq(surveyAnswers.responseId, responseId),
          eq(surveyAnswers.questionId, input.questionId)
        ))
        .limit(1);

      if (existingAnswer) {
        // Actualizar respuesta existente
        await db
          .update(surveyAnswers)
          .set({
            answerValue: input.answerValue,
            answeredAt: new Date(),
          } as any)
          .where(eq(surveyAnswers.id, existingAnswer.id));
      } else {
        // Crear nueva respuesta
        await (db.insert(surveyAnswers) as any).values({
          responseId,
          questionId: input.questionId,
          answerValue: input.answerValue,
        });
      }

      return { success: true, responseId };
    }),

  // Enviar respuesta de encuesta
  submitResponse: publicProcedure
    .input(z.object({
      surveyId: z.number(),
      answers: z.array(z.object({
        questionId: z.number(),
        answerValue: z.string(),
      })),
      responseToken: z.string().optional(), // Token opcional para validar
      curp: z.string().optional(), // Para trabajadores no registrados
      anonymousToken: z.string().optional(), // Token anónimo para acceso sin login
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Determinar userId según el contexto
      let userId: number | null = null;
      
      if (input.anonymousToken) {
        // Acceso anónimo - no requiere userId
        // Validar que el token anónimo no haya sido usado
        const { surveyAnonymousTokens } = await import('../../drizzle/schema');
        const [tokenRecord] = await db
          .select()
          .from(surveyAnonymousTokens)
          .where(eq(surveyAnonymousTokens.token, input.anonymousToken))
          .limit(1);
        
        if (!tokenRecord) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Token anónimo no encontrado" });
        }
        
        if (tokenRecord.usedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este token ya fue utilizado" });
        }
        
        if (tokenRecord.isRevoked) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este token ha sido revocado" });
        }
        
        if (new Date() > tokenRecord.expiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este token ha expirado" });
        }
        
        // Marcar token anónimo como usado
        await db
          .update(surveyAnonymousTokens)
          .set({ usedAt: new Date() })
          .where(eq(surveyAnonymousTokens.token, input.anonymousToken));
      } else if (ctx.user) {
        // Usuario autenticado
        userId = ctx.user.id;
        
        // Verificar si ya respondió
        const [existingResponse] = await db
          .select()
          .from(surveyResponses)
          .where(and(
            eq(surveyResponses.surveyId, input.surveyId),
            eq(surveyResponses.userId, userId)
          ))
          .limit(1);
        
        if (existingResponse) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ya has respondido esta encuesta" });
        }
      } else {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión o proporcionar un token anónimo" });
      }
      
      // Generar token único para esta respuesta
      const responseToken = input.responseToken || generateToken();
      
      // Obtener departmentId y positionId del empleado para segmentación por puesto/área
      let empDeptId: number | null = null;
      let empPosId: number | null = null;
      if (userId) {
        const [empData] = await db
          .select({ departmentId: employees.departmentId, positionId: employees.positionId })
          .from(employees)
          .where(eq(employees.userId, userId))
          .limit(1);
        if (empData) {
          empDeptId = empData.departmentId ?? null;
          empPosId = empData.positionId ?? null;
        }
      }
      
      // Crear respuesta
      await (db.insert(surveyResponses) as any).values({
        surveyId: input.surveyId,
        userId: userId, // Puede ser null para respuestas anónimas
        curp: input.curp || null,
        token: responseToken,
        completedAt: new Date(),
        startedAt: new Date(),
        departmentId: empDeptId,
        positionId: empPosId,
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
        await (db.insert(surveyAnswers) as any).values({
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
      
      let results: Record<string, unknown> = {};
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
          const actor = ctx.user;
          const caseNumber = `ATS-${Date.now()}-${actor?.id ?? "anonimo"}`;
          let departmentId: number | null = null;

          if (actor) {
            const [userEmployee] = await db.select({ departmentId: employees.departmentId })
              .from(employees)
              .where(eq(employees.userId, actor.id))
              .limit(1);
            departmentId = userEmployee?.departmentId ?? null;
          }
          
          await db.insert(cases).values({
            caseNumber,
            reporterName: actor?.name ?? null,
            reporterEmail: actor?.email ?? null,
            isAnonymous: !actor,
            caseType: 'other',
            description: actor
              ? `Se detectó un Acontecimiento Traumático Severo en la respuesta de la Guía I del trabajador ${actor.name || actor.email || actor.id}. Se requiere investigación y dictamen por parte del comité.`
              : 'Se detectó un Acontecimiento Traumático Severo en una respuesta anónima de la Guía I. Se requiere investigación y dictamen por parte del comité.',
            status: 'open',
            priority: 'critical',
            departmentId,
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
      const answersByResponseId = await getScoringAnswersByResponseId(db, responses.map(response => response.id));
      const results = [];
      for (const response of responses) {
        const answers = answersByResponseId.get(response.id) ?? [];
        
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
      const domainRiskTotals: Record<string, { count: number; avgScore: number }> = {};
      for (const result of results) {
        for (const cat of result.categories) {
          if (!categoryRisks[cat.category]) {
            categoryRisks[cat.category] = { count: 0, avgScore: 0 };
          }
          categoryRisks[cat.category].count++;
          categoryRisks[cat.category].avgScore += cat.score;
        }

        if (survey.type === 'guia_iii') {
          for (const domain of result.domains) {
            if (!domainRiskTotals[domain.domain]) {
              domainRiskTotals[domain.domain] = { count: 0, avgScore: 0 };
            }
            domainRiskTotals[domain.domain].count++;
            domainRiskTotals[domain.domain].avgScore += domain.score;
          }
        }
      }
      
      // Calcular promedios
      for (const cat in categoryRisks) {
        categoryRisks[cat].avgScore = categoryRisks[cat].avgScore / categoryRisks[cat].count;
      }

      for (const domain in domainRiskTotals) {
        domainRiskTotals[domain].avgScore = domainRiskTotals[domain].avgScore / domainRiskTotals[domain].count;
      }

      const domainRisks = survey.type === 'guia_iii'
        ? Object.entries(domainRiskTotals).map(([domain, data]) => ({
            domain,
            avgScore: data.avgScore,
            riskLevel: calculator.determineRiskLevel(data.avgScore, 'guia_iii').level,
          }))
        : [];
      
      return {
        totalResponses: responses.length,
        riskDistribution,
        categoryRisks: Object.entries(categoryRisks).map(([category, data]: [string, any]) => ({
          category,
          avgScore: data.avgScore,
          riskLevel: calculator.determineRiskLevel(data.avgScore, survey.type as 'guia_ii' | 'guia_iii').level,
        })),
        domainRisks,
        domainRiskStatus: survey.type === 'guia_iii'
          ? (domainRisks.length > 0 ? 'available' : 'no_domain_data')
          : 'not_applicable',
      };
    }),

  // Generar reporte individual PDF
  generateIndividualPDF: protectedProcedure
    .use(requirePermission('can_export'))
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
      
      // P10: Prellenar departamento y puesto desde el catálogo de empleados
      const [empInfo] = await db
        .select({
          departmentName: departments.name,
          positionTitle:  positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions,   eq(employees.positionId,   positions.id))
        .where(eq(employees.userId, user.id))
        .limit(1);
      // Preparar datos del reporte
      const reportData = {
        employeeName: user.name || user.email || 'Usuario sin nombre',
        employeeId: user.id.toString(),
        department: empInfo?.departmentName ?? undefined,
        position:   empInfo?.positionTitle  ?? undefined,
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
      
      // Subir PDF a S3
      const filename = `reporte_${survey.type}_${user.id}_${Date.now()}.pdf`;
      const fileKey = `survey-reports/individual/${response.id}/${filename}`;
      const { url: pdfUrl } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
      
      // Registrar evidencia automáticamente
      const surveyTitle = `${survey.type.toUpperCase()} - ${user.name || user.email || 'Usuario sin nombre'}`;
      await logSurveyReportEvidence(
        survey.id,
        surveyTitle,
        pdfUrl,
        fileKey,
        ctx.user?.id || 1
      );
      
      // Retornar URL del PDF
      return {
        pdfUrl,
        filename,
      };
    }),

  // Generar reporte agregado PDF
  generateAggregatedPDF: protectedProcedure
    .use(requirePermission('can_export'))
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
      const answersByResponseId = await getScoringAnswersByResponseId(db, responses.map(response => response.id));
      
      if (survey.type === 'guia_i') {
        // Contar casos ATS
        for (const response of responses) {
          const answers = answersByResponseId.get(response.id) ?? [];
          
          if (detectATS(answers.map(a => ({ questionId: a.questionId, answerValue: a.answer })))) {
            atsDetected++;
          }
        }
      } else {
        // Calcular para Guía II y III
        for (const response of responses) {
          const answers = answersByResponseId.get(response.id) ?? [];
          
          const guideType: "guia_ii" | "guia_iii" = survey.type === "guia_ii" ? "guia_ii" : "guia_iii";
          const result = calculator.calculateSurveyResult(
            answers.map(a => ({
              questionId: a.questionId,
              answer: a.answer,
              isReverseScored: Boolean(a.isReverseScored),
              category: a.category || '',
              domain: a.domain || '',
              dimension: a.dimension || '',
            })),
            guideType
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
        averageScore: scores.length > 0 ? scores.reduce((total, score) => total + score, 0) / scores.length : 0,
      }));
      
      // Obtener nombre real de la empresa desde configuración
      const [companyInfo] = await db.select({ razonSocial: companyGeneralData.razonSocial }).from(companyGeneralData).limit(1);
      // Preparar datos del reporte
      const reportData = {
        organizationName: companyInfo?.razonSocial ?? 'Organización',
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
      
      // Subir PDF a S3
      const filename = `reporte_agregado_${survey.type}_${Date.now()}.pdf`;
      const fileKey = `survey-reports/aggregated/${survey.id}/${filename}`;
      const { url: pdfUrl } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
      
      // Registrar evidencia automáticamente
      const surveyTitle = `${survey.type.toUpperCase()} - Reporte Agregado`;
      await logSurveyReportEvidence(
        survey.id,
        surveyTitle,
        pdfUrl,
        fileKey,
        ctx.user?.id || 1
      );
      
      // Retornar URL del PDF
      return {
        pdfUrl,
        filename,
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
      
      return Object.entries(departmentStats).map(([department, stats]: [string, any]) => ({
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

  // Enviar recordatorios masivos a trabajadores pendientes
  sendPendingWorkersReminders: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      department: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Obtener encuesta
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, input.surveyId)).limit(1);
      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }
      
      // Obtener respuestas de la encuesta
      const responses = await db
        .select({ userId: surveyResponses.userId })
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, input.surveyId));
      
      const respondedUserIds = new Set(responses.map(r => r.userId));
      
      // Obtener todos los usuarios
      let allUsers = await db.select().from(users);
      
      // Filtrar usuarios pendientes con email válido
      let pendingUsers = allUsers.filter(user => 
        user.id && 
        !respondedUserIds.has(user.id) && 
        user.email && 
        user.email.includes('@')
      );
      
      // Aplicar filtro de departamento si se especifica
      if (input.department && input.department !== 'all') {
        pendingUsers = pendingUsers.filter(user => user.departamento === input.department);
      }
      
      // Enviar correos
      const results = {
        total: pendingUsers.length,
        sent: 0,
        failed: 0,
        errors: [] as string[],
      };
      
      // Importar dinámicamente el servicio de correo
      const { sendSurveyReminder } = await import('../lib/survey-email-service');
      
      // URL base para las encuestas (ajustar según configuración)
      const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
      
      for (const user of pendingUsers) {
        try {
          const result = await sendSurveyReminder({
            to: user.email!,
            userName: user.name || 'Usuario',
            surveyTitle: survey.title,
            surveyUrl: `${baseUrl}/surveys/${survey.id}/respond`,
          });
          
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`${user.email}: ${result.error}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`${user.email}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
      
      return results;
    }),

  // Generar PDF de trabajadores pendientes
  generatePendingWorkersPDF: protectedProcedure
    .use(requirePermission('can_export'))
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
      let targetUsers: any;
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
        await (db.insert(surveyNotifications) as any).values({
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
      let targetUsers: any;
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
        
        await (db.insert(surveyNotifications) as any).values({
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

  // ============================================
  // PANEL DE ADMINISTRACIÓN DE ENCUESTAS
  // ============================================

  // Obtener respuestas agregadas por encuesta
  getAggregatedResponses: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      department: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(surveyResponses.surveyId, input.surveyId)];
      
      if (input.department) {
        // Filtrar por departamento del usuario
        const usersInDept = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.departamento, input.department));
        const userIds = usersInDept.map(u => u.id);
        if (userIds.length > 0) {
          conditions.push(inArray(surveyResponses.userId, userIds));
        }
      }

      if (input.startDate) {
        conditions.push(sql`${surveyResponses.startedAt} >= ${input.startDate}`);
      }

      if (input.endDate) {
        conditions.push(sql`${surveyResponses.startedAt} <= ${input.endDate}`);
      }

      const responses = await db.select()
        .from(surveyResponses)
        .where(and(...conditions))
        .orderBy(desc(surveyResponses.startedAt));

      return responses;
    }),

  // Obtener estadísticas generales de encuestas
  getSurveyStatistics: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      department: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(surveyResponses.surveyId, input.surveyId)];
      
      if (input.department) {
        const usersInDept = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.departamento, input.department));
        const userIds = usersInDept.map(u => u.id);
        if (userIds.length > 0) {
          conditions.push(inArray(surveyResponses.userId, userIds));
        }
      }

      if (input.startDate) {
        conditions.push(sql`${surveyResponses.startedAt} >= ${input.startDate}`);
      }

      if (input.endDate) {
        conditions.push(sql`${surveyResponses.startedAt} <= ${input.endDate}`);
      }

      const responses = await db.select()
        .from(surveyResponses)
        .where(and(...conditions));

      // Calcular estadísticas
      const totalResponses = responses.length;
      const riskLevels = { nulo: 0, bajo: 0, medio: 0, alto: 0, muy_alto: 0 };
      let totalScore = 0;

      responses.forEach(response => {
        if (response.results) {
          try {
            const results = JSON.parse(response.results);
            const level = results.overallRiskLevel;
            if (level && riskLevels.hasOwnProperty(level)) {
              riskLevels[level as keyof typeof riskLevels]++;
            }
            if (results.totalScore) {
              totalScore += results.totalScore;
            }
          } catch (e) {
            console.error('Error parsing results:', e);
          }
        }
      });

      const averageScore = totalResponses > 0 ? totalScore / totalResponses : 0;

      return {
        totalResponses,
        riskLevels,
        averageScore,
        distribution: Object.entries(riskLevels).map(([level, count]: [string, any]) => ({
          level,
          count,
          percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0
        }))
      };
    }),

  // Comparar estadísticas entre periodos
  comparePeriods: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      period1Start: z.string(),
      period1End: z.string(),
      period2Start: z.string(),
      period2End: z.string(),
      department: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener estadísticas del periodo 1
      const period1Conditions = [
        eq(surveyResponses.surveyId, input.surveyId),
        sql`${surveyResponses.startedAt} >= ${input.period1Start}`,
        sql`${surveyResponses.startedAt} <= ${input.period1End}`
      ];

      if (input.department) {
        const usersInDept = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.departamento, input.department));
        const userIds = usersInDept.map(u => u.id);
        if (userIds.length > 0) {
          period1Conditions.push(inArray(surveyResponses.userId, userIds));
        }
      }

      const period1Responses = await db.select()
        .from(surveyResponses)
        .where(and(...period1Conditions));

      // Obtener estadísticas del periodo 2
      const period2Conditions = [
        eq(surveyResponses.surveyId, input.surveyId),
        sql`${surveyResponses.startedAt} >= ${input.period2Start}`,
        sql`${surveyResponses.startedAt} <= ${input.period2End}`
      ];

      if (input.department) {
        const usersInDept = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.departamento, input.department));
        const userIds = usersInDept.map(u => u.id);
        if (userIds.length > 0) {
          period2Conditions.push(inArray(surveyResponses.userId, userIds));
        }
      }

      const period2Responses = await db.select()
        .from(surveyResponses)
        .where(and(...period2Conditions));

      // Calcular estadísticas para ambos periodos
      const calculateStats = (responses: any[]) => {
        const totalResponses = responses.length;
        const riskLevels = { nulo: 0, bajo: 0, medio: 0, alto: 0, muy_alto: 0 };
        let totalScore = 0;

        responses.forEach(response => {
          if (response.results) {
            try {
              const results = JSON.parse(response.results);
              const level = results.overallRiskLevel;
              if (level && riskLevels.hasOwnProperty(level)) {
                riskLevels[level as keyof typeof riskLevels]++;
              }
              if (results.totalScore) {
                totalScore += results.totalScore;
              }
            } catch (e) {
              console.error('Error parsing results:', e);
            }
          }
        });

        const averageScore = totalResponses > 0 ? totalScore / totalResponses : 0;

        return {
          totalResponses,
          riskLevels,
          averageScore,
          distribution: Object.entries(riskLevels).map(([level, count]: [string, any]) => ({
            level,
            count,
            percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0
          }))
        };
      };

      const period1Stats = calculateStats(period1Responses);
      const period2Stats = calculateStats(period2Responses);

      return {
        period1: period1Stats,
        period2: period2Stats,
        comparison: {
          responseDiff: period2Stats.totalResponses - period1Stats.totalResponses,
          scoreDiff: period2Stats.averageScore - period1Stats.averageScore,
          riskLevelChanges: Object.keys(period1Stats.riskLevels).map(level => ({
            level,
            period1Count: period1Stats.riskLevels[level as keyof typeof period1Stats.riskLevels],
            period2Count: period2Stats.riskLevels[level as keyof typeof period2Stats.riskLevels],
            diff: period2Stats.riskLevels[level as keyof typeof period2Stats.riskLevels] - 
                  period1Stats.riskLevels[level as keyof typeof period1Stats.riskLevels]
          }))
        }
      };
    }),

  // Obtener departamentos disponibles
  getDepartments: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const departments = await db.selectDistinct({ department: users.departamento })
      .from(users)
      .where(not(eq(users.departamento, '')));

    return departments.map(d => d.department).filter(Boolean);
  }),

  // Exportar resultados agregados a Excel
  exportToExcel: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      department: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(surveyResponses.surveyId, input.surveyId)];
      
      if (input.department) {
        const usersInDept = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.departamento, input.department));
        const userIds = usersInDept.map(u => u.id);
        if (userIds.length > 0) {
          conditions.push(inArray(surveyResponses.userId, userIds));
        }
      }

      if (input.startDate) {
        conditions.push(sql`${surveyResponses.startedAt} >= ${input.startDate}`);
      }

      if (input.endDate) {
        conditions.push(sql`${surveyResponses.startedAt} <= ${input.endDate}`);
      }

      const responses = await db.select()
        .from(surveyResponses)
        .where(and(...conditions))
        .orderBy(desc(surveyResponses.startedAt));

      // Preparar datos para Excel
      // NOTA: Los niveles de riesgo son conforme NOM-035-STPS-2018:
      // Nulo, Bajo, Medio, Alto, Muy Alto
      const excelData = responses.map(response => {
        let riskLevel = 'N/A';
        let totalScore = 0;
        let categories = {};

        if (response.results) {
          try {
            const results = JSON.parse(response.results);
            riskLevel = results.overallRiskLevel || 'N/A';
            totalScore = results.totalScore || 0;
            categories = results.categories || {};
          } catch (e) {
            console.error('Error parsing results:', e);
          }
        }

        return {
          ID: response.id,
          'Usuario ID': response.userId || 'N/A',
          'CURP': response.curp || 'N/A',
          'Fecha Inicio': response.startedAt ? new Date(response.startedAt).toLocaleDateString('es-MX') : 'N/A',
          'Fecha Completado': response.completedAt ? new Date(response.completedAt).toLocaleDateString('es-MX') : 'En progreso',
          'Nivel de Riesgo': riskLevel,
          'Puntaje Total': totalScore,
          'IP': response.ipAddress || 'N/A',
          ...categories
        };
      });

      return excelData;
    }),

  // Generar token único para un empleado por CURP
  generateTokenByCURP: protectedProcedure
    .use(requirePermission('can_create'))
    .input(z.object({
      curp: z.string().length(18),
      surveyId: z.number(),
      expiresInDays: z.number().default(30),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar usuario por CURP
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.curp, input.curp))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró empleado con ese CURP" });
      }

      // Verificar si ya existe un token activo para este usuario y encuesta
      const [existingToken] = await db
        .select()
        .from(surveyTokens)
        .where(and(
          eq(surveyTokens.userId, user.id),
          eq(surveyTokens.surveyId, input.surveyId),
          sql`${surveyTokens.expiresAt} > NOW()`,
          sql`${surveyTokens.usedAt} IS NULL`
        ))
        .limit(1);

      if (existingToken) {
        // Retornar token existente
        const surveyUrl = `${process.env.VITE_APP_URL || 'https://app.example.com'}/survey/${input.surveyId}/token/${existingToken.token}`;
        return {
          token: existingToken.token,
          surveyUrl,
          expiresAt: existingToken.expiresAt,
          employee: {
            name: user.name,
            curp: user.curp,
            email: user.email,
          },
        };
      }

      // Generar nuevo token
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      // NOTA: Temporalmente comentado - requiere periodId
      // await (db.insert(surveyTokens) as any).values({
      //   periodId: input.periodId, // NUEVO CAMPO REQUERIDO
      //   userId: user.id,
      //   surveyId: input.surveyId,
      //   token,
      //   expiresAt,
      //   sentVia: 'email',
      // });

      const surveyUrl = `${process.env.VITE_APP_URL || 'https://app.example.com'}/survey/${input.surveyId}/token/${token}`;

      return {
        token,
        surveyUrl,
        expiresAt,
        employee: {
          name: user.name,
          curp: user.curp,
          email: user.email,
        },
      };
    }),

  // Validar token para acceso anónimo a encuesta
  validateSurveyToken: publicProcedure
    .input(z.object({
      token: z.string(),
      surveyId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [tokenRecord] = await db
        .select({
          id: surveyTokens.id,
          userId: surveyTokens.userId,
          surveyId: surveyTokens.surveyId,
          token: surveyTokens.token,
          expiresAt: surveyTokens.expiresAt,
          usedAt: surveyTokens.usedAt,
          userName: users.name,
          userCurp: users.curp,
          userEmail: users.email,
        })
        .from(surveyTokens)
        .leftJoin(users, eq(surveyTokens.userId, users.id))
        .where(and(
          eq(surveyTokens.token, input.token),
          eq(surveyTokens.surveyId, input.surveyId)
        ))
        .limit(1);

      if (!tokenRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token inválido" });
      }

      // Verificar si el token ha expirado
      if (new Date() > new Date(tokenRecord.expiresAt)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token expirado" });
      }

      // Verificar si el token ya fue usado
      if (tokenRecord.usedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token ya utilizado" });
      }

      return {
        valid: true,
        userId: tokenRecord.userId,
        surveyId: tokenRecord.surveyId,
        employee: {
          name: tokenRecord.userName,
          curp: tokenRecord.userCurp,
          email: tokenRecord.userEmail,
        },
      };
    }),

  // Generar tokens para todos los empleados
  generateTokensForAllEmployees: protectedProcedure
    .use(requirePermission('can_create'))
    .input(z.object({
      surveyId: z.number(),
      expiresInDays: z.number().default(30),
      department: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener empleados (filtrar por departamento si se especifica)
      const whereConditions = [sql`${users.curp} IS NOT NULL`];
      
      if (input.department) {
        whereConditions.push(eq(users.departamento, input.department));
      }

      const employees = await db
        .select({
          id: users.id,
          name: users.name,
          curp: users.curp,
          email: users.email,
          departamento: users.departamento,
        })
        .from(users)
        .where(and(...whereConditions));

      if (employees.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontraron empleados con CURP" });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      const tokensGenerated = [];

      for (const employee of employees) {
        // Verificar si ya existe un token activo
        const [existingToken] = await db
          .select()
          .from(surveyTokens)
          .where(and(
            eq(surveyTokens.userId, employee.id),
            eq(surveyTokens.surveyId, input.surveyId),
            sql`${surveyTokens.expiresAt} > NOW()`,
            sql`${surveyTokens.usedAt} IS NULL`
          ))
          .limit(1);

        if (existingToken) {
          // Usar token existente
          tokensGenerated.push({
            employeeName: employee.name,
            curp: employee.curp,
            email: employee.email,
            token: existingToken.token,
            surveyUrl: `${process.env.VITE_APP_URL || 'https://app.example.com'}/survey/${input.surveyId}/token/${existingToken.token}`,
            expiresAt: existingToken.expiresAt,
          });
        } else {
          // Generar nuevo token
          const token = generateToken();

          // NOTA: Temporalmente comentado - requiere periodId
          // await (db.insert(surveyTokens) as any).values({
          //   periodId: input.periodId, // NUEVO CAMPO REQUERIDO
          //   userId: employee.id,
          //   surveyId: input.surveyId,
          //   token,
          //   expiresAt,
          //   sentVia: 'email',
          // });

          tokensGenerated.push({
            employeeName: employee.name,
            curp: employee.curp,
            email: employee.email,
            token,
            surveyUrl: `${process.env.VITE_APP_URL || 'https://app.example.com'}/survey/${input.surveyId}/token/${token}`,
            expiresAt,
          });
        }
      }

      // Obtener nombre de la encuesta
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, input.surveyId)).limit(1);
      const surveyName = survey?.title || 'Encuesta NOM-035';

      // Enviar notificación al administrador
      const ownerEmail = process.env.OWNER_EMAIL || 'admin@example.com';
      try {
        await sendSurveyTokensNotification(
          ownerEmail,
          surveyName,
          tokensGenerated.length,
          expiresAt
        );
      } catch (error) {
        console.error('Error al enviar notificación de tokens generados:', error);
        // No lanzar error, solo registrar en consola
      }

      return {
        generated: tokensGenerated.length,
        tokens: tokensGenerated,
      };
    }),

  // Marcar token como usado
  markTokenAsUsed: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(surveyTokens)
        .set({ usedAt: new Date() } as any)
        .where(eq(surveyTokens.token, input.token));

      return { success: true };
    }),

  // Exportar tokens a Excel
  exportTokensToExcel: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const tokens = await db
        .select({
          employeeName: users.name,
          curp: users.curp,
          email: users.email,
          departamento: users.departamento,
          token: surveyTokens.token,
          expiresAt: surveyTokens.expiresAt,
          usedAt: surveyTokens.usedAt,
        })
        .from(surveyTokens)
        .leftJoin(users, eq(surveyTokens.userId, users.id))
        .where(eq(surveyTokens.surveyId, input.surveyId))
        .orderBy(users.name);

      const excelData = tokens.map(t => ({
        'Nombre': t.employeeName,
        'CURP': t.curp,
        'Email': t.email,
        'Departamento': t.departamento,
        'URL de Encuesta': `${process.env.VITE_APP_URL || 'https://app.example.com'}/survey/${input.surveyId}/token/${t.token}`,
        'Expira': t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('es-MX') : '',
        'Usado': t.usedAt ? 'Sí' : 'No',
      }));

      return excelData;
    }),

  // Obtener estadísticas de tamaño de muestra para Guía III
  getSampleSizeStats: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener total de trabajadores activos (todos los usuarios excepto admin)
      const [totalResult] = await db
        .select({ count: count() })
        .from(users);
      const totalWorkers = totalResult?.count || 0;

      // Calcular tamaño de muestra requerido
      const sampleCalc = calculateSampleSize(totalWorkers);

      // Obtener respuestas completadas para esta encuesta
      const [responsesResult] = await db
        .select({ count: count() })
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );
      const completedResponses = responsesResult?.count || 0;

      // Calcular porcentaje de completado
      const percentageCompleted = sampleCalc.sampleSize > 0
        ? Math.round((completedResponses / sampleCalc.sampleSize) * 100 * 100) / 100
        : 0;

      // Determinar si se alcanzó el tamaño de muestra
      const sampleReached = completedResponses >= sampleCalc.sampleSize;

      return {
        totalWorkers,
        sampleSize: sampleCalc.sampleSize,
        completedResponses,
        percentageCompleted,
        sampleReached,
        confidenceLevel: sampleCalc.confidenceLevel,
        marginOfError: sampleCalc.marginOfError,
      };
    }),

  // Obtener estadísticas de tokens de encuestas
  getTokenStats: protectedProcedure
    .input(z.object({
      surveyId: z.number().optional(),
      department: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Construir condiciones de filtro
      const whereConditions = [];
      if (input.surveyId) {
        whereConditions.push(eq(surveyTokens.surveyId, input.surveyId));
      }
      if (input.department) {
        whereConditions.push(eq(users.departamento, input.department));
      }

      // Obtener todos los tokens con información del usuario
      const tokens = await db
        .select({
          tokenId: surveyTokens.id,
          token: surveyTokens.token,
          surveyId: surveyTokens.surveyId,
          surveyTitle: surveys.title,
          employeeName: users.name,
          employeeEmail: users.email,
          department: users.departamento,
          position: users.puesto,
          expiresAt: surveyTokens.expiresAt,
          usedAt: surveyTokens.usedAt,
          sentVia: surveyTokens.sentVia,
          sexo: users.sexo,
          fechaNacimiento: users.fechaNacimiento,
        })
        .from(surveyTokens)
        .leftJoin(users, eq(surveyTokens.userId, users.id))
        .leftJoin(surveys, eq(surveyTokens.surveyId, surveys.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(surveyTokens.createdAt));

      // Calcular estadísticas
      const now = new Date();
      const totalTokens = tokens.length;
      const completedTokens = tokens.filter(t => t.usedAt !== null).length;
      const pendingTokens = tokens.filter(t => t.usedAt === null && new Date(t.expiresAt!) > now).length;
      const expiredTokens = tokens.filter(t => t.usedAt === null && new Date(t.expiresAt!) <= now).length;
      const completionRate = totalTokens > 0 ? Math.round((completedTokens / totalTokens) * 100 * 100) / 100 : 0;

      // Estadísticas por departamento
      const byDepartment: Record<string, { total: number; completed: number; pending: number; expired: number }> = {};
      tokens.forEach(t => {
        const dept = t.department || 'Sin departamento';
        if (!byDepartment[dept]) {
          byDepartment[dept] = { total: 0, completed: 0, pending: 0, expired: 0 };
        }
        byDepartment[dept].total++;
        if (t.usedAt) {
          byDepartment[dept].completed++;
        } else if (new Date(t.expiresAt!) > now) {
          byDepartment[dept].pending++;
        } else {
          byDepartment[dept].expired++;
        }
      });

      // Estadísticas por puesto
      const byPosition: Record<string, { total: number; completed: number; pending: number; expired: number }> = {};
      tokens.forEach(t => {
        const pos = t.position || 'Sin puesto';
        if (!byPosition[pos]) {
          byPosition[pos] = { total: 0, completed: 0, pending: 0, expired: 0 };
        }
        byPosition[pos].total++;
        if (t.usedAt) {
          byPosition[pos].completed++;
        } else if (new Date(t.expiresAt!) > now) {
          byPosition[pos].pending++;
        } else {
          byPosition[pos].expired++;
        }
      });
            // Estadísticas por encuesta
      const bySurvey: Record<number, { surveyTitle: string; total: number; completed: number; pending: number; expired: number }> = {};
      tokens.forEach(t => {
        if (!bySurvey[t.surveyId]) {
          bySurvey[t.surveyId] = { surveyTitle: t.surveyTitle || 'Sin título', total: 0, completed: 0, pending: 0, expired: 0 };
        }
        bySurvey[t.surveyId].total++;
        if (t.usedAt) {
          bySurvey[t.surveyId].completed++;
        } else if (new Date(t.expiresAt!) > now) {
          bySurvey[t.surveyId].pending++;
        } else {
          bySurvey[t.surveyId].expired++;
        }
      });

      // Estadísticas por sexo/género
      const bySexo: Record<string, { total: number; completed: number; pending: number; expired: number }> = {};
      tokens.forEach(t => {
        const sexo = t.sexo || 'No especificado';
        if (!bySexo[sexo]) bySexo[sexo] = { total: 0, completed: 0, pending: 0, expired: 0 };
        bySexo[sexo].total++;
        if (t.usedAt) bySexo[sexo].completed++;
        else if (new Date(t.expiresAt!) > now) bySexo[sexo].pending++;
        else bySexo[sexo].expired++;
      });

      // Estadísticas por rango de edad NOM-035 (18-29, 30-39, 40-49, 50+)
      const ageGroups: Record<string, { total: number; completed: number; pending: number; expired: number }> = {
        '18-29': { total: 0, completed: 0, pending: 0, expired: 0 },
        '30-39': { total: 0, completed: 0, pending: 0, expired: 0 },
        '40-49': { total: 0, completed: 0, pending: 0, expired: 0 },
        '50+': { total: 0, completed: 0, pending: 0, expired: 0 },
        'Sin dato': { total: 0, completed: 0, pending: 0, expired: 0 },
      };
      tokens.forEach(t => {
        let group = 'Sin dato';
        if (t.fechaNacimiento) {
          const birth = new Date(t.fechaNacimiento);
          const age = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
          if (age >= 18 && age <= 29) group = '18-29';
          else if (age >= 30 && age <= 39) group = '30-39';
          else if (age >= 40 && age <= 49) group = '40-49';
          else if (age >= 50) group = '50+';
        }
        ageGroups[group].total++;
        if (t.usedAt) ageGroups[group].completed++;
        else if (new Date(t.expiresAt!) > now) ageGroups[group].pending++;
        else ageGroups[group].expired++;
      });

      return {
        totalTokens,
        completedTokens,
        pendingTokens,
        expiredTokens,
        completionRate,
        byDepartment: Object.entries(byDepartment).map(([dept, stats]: [string, any]) => ({
          department: dept,
          ...stats,
          completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100 * 100) / 100 : 0,
        })),
        byPosition: Object.entries(byPosition).map(([pos, stats]: [string, any]) => ({
          position: pos,
          ...stats,
          completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100 * 100) / 100 : 0,
        })),
        bySurvey: Object.entries(bySurvey).map(([surveyId, stats]: [string, any]) => ({
          surveyId: parseInt(surveyId),
          ...stats,
          completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100 * 100) / 100 : 0,
        })),
        byGender: Object.entries(bySexo).map(([sexo, stats]: [string, any]) => ({
          sexo,
          ...stats,
          completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100 * 100) / 100 : 0,
        })),
        byAgeGroup: Object.entries(ageGroups).map(([group, stats]: [string, any]) => ({
          group,
          ...stats,
          completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100 * 100) / 100 : 0,
        })).filter(g => g.total > 0),
        tokens: tokens.map(t => ({
          ...t,
          status: t.usedAt ? 'completado' : (new Date(t.expiresAt!) > now ? 'pendiente' : 'expirado'),
        })),
      };
    }),

  // Generar reporte PDF consolidado NOM-035
  generateConsolidatedReport: protectedProcedure
    .use(requirePermission('can_export'))
    .input(z.object({
      surveyIds: z.array(z.number()).optional(), // Si no se especifica, incluye todas las encuestas
      includeMultilevelAnalysis: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener encuestas a incluir
      const surveyFilter = input.surveyIds && input.surveyIds.length > 0
        ? inArray(surveys.id, input.surveyIds)
        : undefined;

      const selectedSurveys = await db
        .select()
        .from(surveys)
        .where(surveyFilter)
        .orderBy(surveys.createdAt);

      if (selectedSurveys.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontraron encuestas" });
      }

      // Recopilar resultados por encuesta
      const surveyResults = [];

      for (const survey of selectedSurveys) {
        // Obtener respuestas completadas
        const responses = await db
          .select()
          .from(surveyResponses)
          .where(and(
            eq(surveyResponses.surveyId, survey.id),
            not(sql`${surveyResponses.completedAt} IS NULL`)
          ));

        if (responses.length === 0) continue;

        // Calcular distribución de riesgo
        const riskDistribution = {
          nulo: 0,
          bajo: 0,
          medio: 0,
          alto: 0,
          muyAlto: 0,
        };

        let totalScore = 0;

        responses.forEach(response => {
          if (response.results && typeof response.results === 'object') {
            const results = response.results as any;
            const riskLevel = results.riskLevel || results.nivel || 'nulo';
            const score = results.finalScore || results.score || 0;

            totalScore += score;

            // Mapear nivel de riesgo
            const normalizedLevel = riskLevel.toLowerCase().replace(/\s+/g, '');
            if (normalizedLevel.includes('nulo')) riskDistribution.nulo++;
            else if (normalizedLevel.includes('bajo')) riskDistribution.bajo++;
            else if (normalizedLevel.includes('medio')) riskDistribution.medio++;
            else if (normalizedLevel.includes('muyalto')) riskDistribution.muyAlto++;
            else if (normalizedLevel.includes('alto')) riskDistribution.alto++;
          }
        });

        const averageScore = responses.length > 0 ? totalScore / responses.length : 0;

        // Generar recomendaciones según nivel de riesgo predominante
        const recommendations = [];
        const highRiskCount = riskDistribution.alto + riskDistribution.muyAlto;
        const highRiskPercentage = (highRiskCount / responses.length) * 100;

        if (highRiskPercentage > 50) {
          recommendations.push('Se detectaron niveles de riesgo alto en más del 50% de las respuestas. Se requiere acción inmediata.');
          recommendations.push('Implementar programa de intervención psicosocial con seguimiento mensual.');
          recommendations.push('Realizar evaluaciones individuales a empleados con riesgo muy alto.');
        } else if (highRiskPercentage > 25) {
          recommendations.push('Se detectaron niveles de riesgo alto en más del 25% de las respuestas.');
          recommendations.push('Implementar acciones preventivas y de promoción de la salud mental.');
          recommendations.push('Monitorear periódicamente los factores de riesgo identificados.');
        } else {
          recommendations.push('Los niveles de riesgo se encuentran en rangos aceptables.');
          recommendations.push('Continuar con las prácticas de prevención actuales.');
          recommendations.push('Realizar evaluaciones periódicas para mantener el seguimiento.');
        }

        surveyResults.push({
          surveyTitle: survey.title,
          surveyType: survey.type,
          totalResponses: responses.length,
          riskDistribution,
          averageScore,
          recommendations,
        });
      }

      // Recopilar análisis multinivel si se solicita
      const multilevelAnalysis = [];

      if (input.includeMultilevelAnalysis) {
        // Análisis por departamento
        const deptAnalysis = await db
          .select({
            department: users.departamento,
            totalResponses: sql<number>`COUNT(*)`,
            avgScore: sql<number>`AVG(CAST(JSON_EXTRACT(${surveyResponses.results}, '$.finalScore') AS DECIMAL(10,2)))`,
          })
          .from(surveyResponses)
          .leftJoin(users, eq(surveyResponses.userId, users.id))
          .where(not(sql`${surveyResponses.completedAt} IS NULL`))
          .groupBy(users.departamento);

        if (deptAnalysis.length > 0) {
          multilevelAnalysis.push({
            level: 'Análisis por Departamento',
            segments: deptAnalysis.map(d => ({
              name: d.department || 'Sin departamento',
              totalResponses: Number(d.totalResponses),
              averageScore: Number(d.avgScore) || 0,
              riskDistribution: { nulo: 0, bajo: 0, medio: 0, alto: 0, muyAlto: 0 }, // Simplificado
            })),
          });
        }
      }

      // Generar PDF
      const companyName = process.env.VITE_APP_TITLE || 'Empresa';
      const reportData = {
        companyName,
        reportDate: new Date(),
        surveyResults,
        multilevelAnalysis,
      };

      const { url, key } = await generateConsolidatedNOM035Report(reportData);

      return {
        success: true,
        pdfUrl: url,
        fileKey: key,
        surveysIncluded: selectedSurveys.length,
        totalResponses: surveyResults.reduce((sum: any, r: any) => sum + r.totalResponses, 0),
      };
    }),

  // Envío masivo de encuestas por correo electrónico
  sendMassEmail: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      recipientType: z.enum(['all', 'department', 'position']),
      departmentId: z.number().optional(),
      positionId: z.number().optional(),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener información de la encuesta
      const [survey] = await db
        .select()
        .from(surveys)
        .where(eq(surveys.id, input.surveyId));

      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }

      // Determinar destinatarios según tipo
      let recipients: Array<{ id: number; name: string | null; email: string | null }> = [];
      
      if (input.recipientType === 'all') {
        recipients = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users);
      } else if (input.recipientType === 'department' && input.departmentId) {
        // Por ahora enviar a todos (TODO: implementar filtro por departamento cuando exista tabla)
        recipients = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users);
      } else if (input.recipientType === 'position' && input.positionId) {
        // Buscar por puesto usando jobPositions
        const { jobPositions } = await import('../../drizzle/schema');
        const [position] = await db
          .select()
          .from(jobPositions)
          .where(eq(jobPositions.id, input.positionId));
        
        if (position) {
          recipients = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(eq(users.puesto, position.positionName));
        }
      }

      // Filtrar usuarios sin email
      const validRecipients = recipients.filter(r => r.email && r.email.includes('@'));

      if (validRecipients.length === 0) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "No se encontraron destinatarios válidos con correo electrónico" 
        });
      }

      // Obtener o crear periodo activo
      const { surveyPeriods } = await import('../../drizzle/schema');
      const [activePeriod] = await db
        .select()
        .from(surveyPeriods)
        .where(eq(surveyPeriods.status, 'active'))
        .limit(1);

      if (!activePeriod) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "No hay un período activo. Crea un período antes de enviar encuestas." 
        });
      }

      // Generar tokens para cada destinatario
      const tokensToInsert = validRecipients.map(recipient => ({
        periodId: activePeriod.id,
        userId: recipient.id,
        surveyId: input.surveyId,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        sentVia: 'email' as const,
      }));

      await (db.insert(surveyTokens) as any).values(tokensToInsert);

      // Enviar correos
      const { sendEmail } = await import('../lib/email-sender');
      let sent = 0;
      let failed = 0;

      for (const recipient of validRecipients) {
        const token = tokensToInsert.find(t => t.userId === recipient.id)?.token;
        if (!token) continue;

        const surveyUrl = `${process.env.VITE_OAUTH_PORTAL_URL || 'http://localhost:3000'}/survey/${token}`;
        
        const html = `
          <h2>Invitación a Encuesta NOM-035</h2>
          <p>Estimado/a <strong>${recipient.name}</strong>,</p>
          <p>Has sido invitado/a a participar en la siguiente encuesta:</p>
          <h3>${survey.title}</h3>
          <p>${survey.description || ''}</p>
          ${input.customMessage ? `<p><em>${input.customMessage}</em></p>` : ''}
          <p>Por favor, accede a la encuesta mediante el siguiente enlace:</p>
          <p><a href="${surveyUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Acceder a la Encuesta</a></p>
          <p>Este enlace es único y personal. Tiene una validez de 30 días.</p>
          <p>Gracias por tu participación.</p>
        `;

        const success = await sendEmail({
          to: recipient.email!,
          subject: `Invitación a Encuesta: ${survey.title}`,
          html,
        });

        if (success) {
          sent++;
        } else {
          failed++;
        }
      }

      return {
        success: true,
        totalRecipients: validRecipients.length,
        sent,
        failed,
        surveyTitle: survey.title,
      };
    }),

  // Obtener guías recomendadas según cantidad de trabajadores
  getRecommendedGuides: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
    const db = await getDb();  
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Contar trabajadores
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);
    
    const totalWorkers = Number(result?.count || 0);

    // Determinar guías según NOM-035-STPS-2018
    const guides = [];
    
    // Guía I (ATS) - Obligatoria para todos
    guides.push({
      id: 'guia_i',
      name: 'Guía de Referencia I',
      description: 'Cuestionario para identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos',
      required: true,
      workerRange: 'Todos los centros de trabajo',
      questionCount: 4,
    });

    // Guía II - Para 16-50 trabajadores
    if (totalWorkers >= 16) {
      guides.push({
        id: 'guia_ii',
        name: 'Guía de Referencia II',
        description: 'Cuestionario para identificar factores de riesgo psicosocial en los centros de trabajo',
        required: totalWorkers >= 16 && totalWorkers <= 50,
        workerRange: '16 a 50 trabajadores',
        questionCount: 46,
      });
    }

    // Guía III - Para 51+ trabajadores
    if (totalWorkers > 50) {
      guides.push({
        id: 'guia_iii',
        name: 'Guía de Referencia III',
        description: 'Cuestionario para identificar y analizar factores de riesgo psicosocial y evaluar el entorno organizacional',
        required: true,
        workerRange: 'Más de 50 trabajadores',
        questionCount: 72,
      });
    }

    return {
      totalWorkers,
      recommendedGuides: guides,
      complianceLevel: totalWorkers <= 15 ? 'basic' : totalWorkers <= 50 ? 'intermediate' : 'complete',
    };
  }),

  // Obtener resultados de encuestas de un empleado específico
  getEmployeeResults: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { nom035Results } = await import("../../drizzle/schema");
      
      const results = await db
        .select()
        .from(nom035Results)
        .where(eq(nom035Results.employeeId, input.employeeId))
        .orderBy(desc(nom035Results.completedAt));

      return results;
    }),

  // Calcular resultados de Guía II NOM-035
  calculateGuideII: protectedProcedure
    .input(z.object({
      responseId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const results = await calculateAndPersistGuideIIResult(db, input.responseId);

      return {
        success: true,
        results,
      };
    }),

  // Obtener resultados calculados de Guía II
  getGuideIIResults: protectedProcedure
    .input(z.object({
      responseId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [response] = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.id, input.responseId));

      if (!response) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Respuesta de encuesta no encontrada" });
      }

      if (!response.results) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resultados no calculados. Ejecute calculateGuideII primero." });
      }

      try {
        const results = JSON.parse(response.results);
        return results;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al parsear resultados" });
      }
    }),

  // Obtener resultados agregados de Guía II por departamento
  getGuideIIAggregatedResults: protectedProcedure
    .input(z.object({
      departmentId: z.number().optional(),
      periodId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Construir query con filtros
      const whereConditions = [
        sql`${surveyResponses.completedAt} IS NOT NULL`,
        sql`${surveyResponses.results} IS NOT NULL`
      ];

      if (input.periodId) {
        whereConditions.push(eq(surveyResponses.periodId, input.periodId));
      }

      const responses = await db
        .select()
        .from(surveyResponses)
        .where(and(...whereConditions));

      // Filtrar por departamento si se especifica
      let filteredResponses = responses;
      if (input.departmentId) {
        const userIds = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`${users.departamento} = ${input.departmentId}`);
        
        const userIdSet = new Set(userIds.map(u => u.id));
        filteredResponses = responses.filter(r => r.userId && userIdSet.has(r.userId));
      }

      // Parsear resultados y agregar
      const parsedResults = filteredResponses
        .map(r => {
          try {
            return JSON.parse(r.results!);
          } catch {
            return null;
          }
        })
        .filter(r => r !== null);

      if (parsedResults.length === 0) {
        return {
          totalResponses: 0,
          averageFinalScore: 0,
          riskDistribution: {},
          domainAverages: {},
          categoryAverages: {},
        };
      }

      // Calcular promedios
      const averageFinalScore = parsedResults.reduce((sum: any, r: any) => sum + r.finalScore, 0) / parsedResults.length;

      // Distribución de niveles de riesgo
      const riskDistribution: Record<string, number> = {};
      for (const result of parsedResults) {
        riskDistribution[result.finalRiskLevel] = (riskDistribution[result.finalRiskLevel] || 0) + 1;
      }

      // Promedios por dominio
      const domainAverages: Record<string, number> = {};
      const domainKeys = Object.keys(parsedResults[0].domainScores);
      for (const key of domainKeys) {
        domainAverages[key] = parsedResults.reduce((sum: any, r: any) => sum + r.domainScores[key], 0) / parsedResults.length;
      }

      // Promedios por categoría
      const categoryAverages: Record<string, number> = {};
      const categoryKeys = Object.keys(parsedResults[0].categoryScores);
      for (const key of categoryKeys) {
        categoryAverages[key] = parsedResults.reduce((sum: any, r: any) => sum + r.categoryScores[key], 0) / parsedResults.length;
      }

      return {
        totalResponses: parsedResults.length,
        averageFinalScore,
        riskDistribution,
        domainAverages,
        categoryAverages,
      };
    }),

});
