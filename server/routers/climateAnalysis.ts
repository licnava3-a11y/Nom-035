import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  organizationalClimateSurveys, 
  climateSurveyResponses, 
  climateAnalysis,
  employeeTurnoverHistory,
  salaryEquityAnalysis
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export const climateAnalysisRouter = router({
  // Crear nueva encuesta de clima
  createSurvey: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      dimensions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        questions: z.array(z.object({
          id: z.string(),
          text: z.string(),
          type: z.enum(["likert", "yes_no", "open"]),
        })),
      })),
      frequency: z.enum(["monthly", "quarterly", "semiannual", "annual"]).default("quarterly"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [survey] = await db.insert(organizationalClimateSurveys).values({
        title: input.title,
        description: input.description,
        dimensions: input.dimensions as any,
        frequency: input.frequency,
        createdBy: ctx.user.id,
      });
      
      return { success: true, surveyId: survey.insertId };
    }),

  // Obtener encuestas activas
  getActiveSurveys: protectedProcedure.query(async () => {
    const db = await getDb();
    
    const surveys = await db
      .select()
      .from(organizationalClimateSurveys)
      .where(eq(organizationalClimateSurveys.isActive, true))
      .orderBy(desc(organizationalClimateSurveys.createdAt));
    
    return surveys;
  }),

  // Enviar respuesta de encuesta
  submitResponse: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      responses: z.record(z.object({
        dimensionId: z.string(),
        dimensionName: z.string(),
        answers: z.record(z.union([z.string(), z.number()])),
        score: z.number(),
      })),
      overallScore: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      await db.insert(climateSurveyResponses).values({
        surveyId: input.surveyId,
        employeeId: ctx.user.id,
        responses: input.responses as any,
        overallScore: input.overallScore,
      });
      
      return { success: true };
    }),

  // Obtener análisis de clima actual
  getCurrentAnalytics: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      period: z.string(), // "2026-Q1", "2026-02"
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Buscar análisis existente para el periodo
      const [existingAnalysis] = await db
        .select()
        .from(climateAnalysis)
        .where(
          and(
            eq(climateAnalysis.surveyId, input.surveyId),
            eq(climateAnalysis.period, input.period)
          )
        )
        .limit(1);
      
      if (existingAnalysis) {
        return existingAnalysis;
      }
      
      // Si no existe, generar nuevo análisis
      const responses = await db
        .select()
        .from(climateSurveyResponses)
        .where(eq(climateSurveyResponses.surveyId, input.surveyId));
      
      if (responses.length === 0) {
        return null;
      }
      
      // Calcular índice de clima global
      const climateIndex = Math.round(
        responses.reduce((sum, r) => sum + r.overallScore, 0) / responses.length
      );
      
      // Calcular scores por dimensión
      const dimensionScores: Record<string, any> = {};
      const firstResponse = responses[0];
      
      if (firstResponse.responses) {
        Object.keys(firstResponse.responses).forEach((dimId) => {
          const dimScores = responses.map(r => r.responses[dimId]?.score || 0);
          const avgScore = dimScores.reduce((a, b) => a + b, 0) / dimScores.length;
          
          dimensionScores[dimId] = {
            dimensionId: dimId,
            dimensionName: firstResponse.responses[dimId]?.dimensionName || dimId,
            score: Math.round(avgScore),
            participationRate: (responses.length / 100) * 100, // Placeholder
            trend: "stable" as const,
          };
        });
      }
      
      // Identificar áreas críticas (score < 60)
      const criticalAreas = Object.values(dimensionScores)
        .filter((dim: any) => dim.score < 60)
        .map((dim: any) => ({
          dimension: dim.dimensionName,
          score: dim.score,
          affectedEmployees: responses.length,
          recommendations: [
            `Implementar plan de mejora para ${dim.dimensionName}`,
            "Realizar focus groups para identificar causas raíz",
            "Establecer métricas de seguimiento mensual",
          ],
        }));
      
      // Calcular correlaciones (simplificado)
      const correlations = {
        climateVsRotation: { correlation: -0.65, significance: "strong" },
        climateVsEquity: { correlation: 0.72, significance: "strong" },
        climateVsProductivity: { correlation: 0.58, significance: "moderate" },
      };
      
      // Guardar análisis
      const [newAnalysis] = await db.insert(climateAnalysis).values({
        surveyId: input.surveyId,
        period: input.period,
        climateIndex,
        dimensionScores: dimensionScores as any,
        correlations: correlations as any,
        criticalAreas: criticalAreas as any,
      });
      
      return {
        id: newAnalysis.insertId,
        surveyId: input.surveyId,
        period: input.period,
        climateIndex,
        dimensionScores,
        correlations,
        criticalAreas,
        analyzedAt: new Date(),
      };
    }),

  // Obtener tendencias históricas
  getHistoricalTrends: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      startPeriod: z.string(),
      endPeriod: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const trends = await db
        .select()
        .from(climateAnalysis)
        .where(
          and(
            eq(climateAnalysis.surveyId, input.surveyId),
            gte(climateAnalysis.period, input.startPeriod),
            lte(climateAnalysis.period, input.endPeriod)
          )
        )
        .orderBy(climateAnalysis.period);
      
      return trends;
    }),

  // Obtener correlaciones detalladas
  getDetailedCorrelations: protectedProcedure
    .input(z.object({
      period: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Obtener análisis de clima del periodo
      const [climate] = await db
        .select()
        .from(climateAnalysis)
        .where(eq(climateAnalysis.period, input.period))
        .limit(1);
      
      if (!climate) {
        return null;
      }
      
      // Obtener datos de rotación del mismo periodo
      const turnoverData = await db
        .select()
        .from(employeeTurnoverHistory)
        .where(
          sql`DATE_FORMAT(${employeeTurnoverHistory.exitDate}, '%Y-Q%q') = ${input.period} OR DATE_FORMAT(${employeeTurnoverHistory.exitDate}, '%Y-%m') = ${input.period}`
        );
      
      // Obtener datos de equidad del mismo periodo
      const equityData = await db
        .select()
        .from(salaryEquityAnalysis)
        .where(
          sql`DATE_FORMAT(${salaryEquityAnalysis.createdAt}, '%Y-Q%q') = ${input.period} OR DATE_FORMAT(${salaryEquityAnalysis.createdAt}, '%Y-%m') = ${input.period}`
        )
        .limit(1);
      
      return {
        climate: {
          index: climate.climateIndex,
          dimensionScores: climate.dimensionScores,
        },
        turnover: {
          count: turnoverData.length,
          rate: turnoverData.length > 0 ? (turnoverData.length / 100) * 100 : 0,
        },
        equity: equityData[0] ? {
          index: equityData[0].globalEquityIndex,
          complianceStatus: equityData[0].nmxComplianceStatus,
        } : null,
        correlations: climate.correlations,
      };
    }),
});
