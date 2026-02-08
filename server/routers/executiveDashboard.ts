import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  users, 
  companyLegalRepresentative, 
  companyDigitalSignature,
  cases,
  surveyResponses,
  surveys,
  equalityComplaints
} from "../../drizzle/schema";
import { eq, and, sql, gte, lte, count, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const executiveDashboardRouter = router({
  /**
   * Obtener métricas consolidadas del dashboard ejecutivo
   */
  getMetrics: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // === MÉTRICAS DE EMPLEADOS Y ESTRUCTURA ===
      
      // Total de empleados
      const [employeesResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users);
      
      const totalEmployees = Number(employeesResult?.count || 0);

      // Representantes legales activos
      const [legalRepsResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(companyLegalRepresentative);
      
      const activeLegalReps = Number(legalRepsResult?.count || 0);

      // Firmantes autorizados
      const [signaturesResult] = await db
        .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
        .from(companyDigitalSignature);
      
      const authorizedSigners = Number(signaturesResult?.count || 0);

      // Distribución por departamento
      const departmentDistribution = await db
        .select({
          department: users.departamento,
          count: sql<number>`COUNT(*)`,
        })
        .from(users)
        .groupBy(users.departamento);

      // === MÉTRICAS DE CUMPLIMIENTO NOM-035 ===

      // Casos abiertos vs cerrados
      const [casesOpen] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(eq(cases.status, 'open'));

      const [casesClosed] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(eq(cases.status, 'closed'));

      // Cobertura de encuestas (%)
      const [totalSurveysSent] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses);

      const [completedSurveys] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(sql`${surveyResponses.completedAt} IS NOT NULL`);

      const surveyCoverage = totalSurveysSent?.count 
        ? (Number(completedSurveys?.count || 0) / Number(totalSurveysSent.count)) * 100
        : 0;

      // Tendencia de factores de riesgo (últimas 3 encuestas)
      const riskTrend = await db
        .select({
          surveyId: surveyResponses.surveyId,
          surveyTitle: surveys.title,
          avgScore: sql<number>`AVG(CAST(JSON_EXTRACT(${surveyResponses.results}, '$.finalScore') AS DECIMAL(10,2)))`,
          completedAt: sql<string>`MAX(${surveyResponses.completedAt})`,
        })
        .from(surveyResponses)
        .leftJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
        .where(sql`${surveyResponses.completedAt} IS NOT NULL`)
        .groupBy(surveyResponses.surveyId, surveys.title)
        .orderBy(desc(sql`MAX(${surveyResponses.completedAt})`))
        .limit(3);

      // === MÉTRICAS DE IGUALDAD LABORAL NMX-025 ===

      // Distribución de género por nivel jerárquico (usando sexo)
      const genderDistribution = await db
        .select({
          sexo: users.sexo,
          count: sql<number>`COUNT(*)`,
        })
        .from(users)
        .groupBy(users.sexo);

      // Acciones afirmativas (placeholder)
      const activeAffirmativeActions = 0;

      // Quejas de discriminación (total)
      const [totalComplaints] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(equalityComplaints);

      // Indicadores de brecha salarial (simplificado - requiere datos salariales)
      const salaryGapIndicators = {
        overallGap: 0, // Placeholder - requiere implementación con datos salariales
        byPosition: [],
        byDepartment: [],
      };

      return {
        // Empleados y Estructura
        employeesAndStructure: {
          totalEmployees,
          activeLegalReps,
          authorizedSigners,
          departmentDistribution: departmentDistribution.map(d => ({
            department: d.department || 'Sin departamento',
            count: Number(d.count),
          })),
        },

        // NOM-035
        nom035Compliance: {
          casesOpen: Number(casesOpen?.count || 0),
          casesClosed: Number(casesClosed?.count || 0),
          surveyCoverage: Math.round(surveyCoverage * 10) / 10,
          riskTrend: riskTrend.map(r => ({
            surveyTitle: r.surveyTitle || 'Encuesta',
            avgScore: Number(r.avgScore) || 0,
            completedAt: r.completedAt,
          })),
        },

        // NMX-025
        nmx025Equality: {
          genderDistribution: genderDistribution.map(g => ({
            sexo: g.sexo || 'No especificado',
            count: Number(g.count),
          })),
          totalComplaints: Number(totalComplaints?.count || 0),
        },
      };
    }),
});
