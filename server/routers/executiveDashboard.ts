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
  equalityComplaints,
  employees,
  manualEvidences,
  nmx025ManualEvidences,
  postCaseSurveys,
  courses
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
      // Nota: La BD usa valores en español ('abierto', 'resuelto'), mapeamos a inglés para consistencia
      const [casesOpen] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(sql`${cases.status} = 'open'`);

      const [casesClosed] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(sql`${cases.status} = 'resolved'`);

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
      // Construir condiciones de filtro temporal para riskTrend
      const riskTrendConditions = [sql`${surveyResponses.completedAt} IS NOT NULL`];
      if (input?.startDate) {
        riskTrendConditions.push(sql`${surveyResponses.completedAt} >= ${input.startDate}`);
      }
      if (input?.endDate) {
        riskTrendConditions.push(sql`${surveyResponses.completedAt} <= ${input.endDate}`);
      }

      const riskTrend = await db
        .select({
          surveyId: surveyResponses.surveyId,
          surveyTitle: surveys.title,
          avgScore: sql<number>`AVG(CAST(JSON_EXTRACT(${surveyResponses.results}, '$.finalScore') AS DECIMAL(10,2)))`,
          completedAt: sql<string>`MAX(${surveyResponses.completedAt})`,
        })
        .from(surveyResponses)
        .leftJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
        .where(and(...riskTrendConditions))
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

      // Brecha salarial por género (requiere campo salario en users)
      const salaryGapByGender = await db
        .select({
          sexo: users.sexo,
          avgSalary: sql<number>`AVG(CAST(${users.salario} AS DECIMAL(10,2)))`,
          count: sql<number>`COUNT(*)`,
        })
        .from(users)
        .where(sql`${users.salario} IS NOT NULL AND ${users.salario} > 0`)
        .groupBy(users.sexo);

      // Distribución por nivel jerárquico y género
      const hierarchyDistribution = await db
        .select({
          nivelJerarquico: users.nivelJerarquico,
          sexo: users.sexo,
          count: sql<number>`COUNT(*)`,
        })
        .from(users)
        .where(sql`${users.nivelJerarquico} IS NOT NULL`)
        .groupBy(users.nivelJerarquico, users.sexo);

      // Porcentaje de mujeres en puestos directivos
      const [totalDirectives] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(sql`${users.nivelJerarquico} IN ('Directivo', 'Gerencial', 'Alta Dirección')`);

      const [femaleDirectives] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(sql`${users.nivelJerarquico} IN ('Directivo', 'Gerencial', 'Alta Dirección') AND ${users.sexo} = 'Femenino'`);

      const femaleDirectivesPercentage = totalDirectives?.count
        ? (Number(femaleDirectives?.count || 0) / Number(totalDirectives.count)) * 100
        : 0;

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
          salaryGapByGender: salaryGapByGender.map(s => ({
            sexo: s.sexo || 'No especificado',
            avgSalary: Number(s.avgSalary) || 0,
            count: Number(s.count),
          })),
          hierarchyDistribution: hierarchyDistribution.map(h => ({
            nivelJerarquico: h.nivelJerarquico || 'No especificado',
            sexo: h.sexo || 'No especificado',
            count: Number(h.count),
          })),
          femaleDirectivesPercentage: Math.round(femaleDirectivesPercentage * 10) / 10,
          totalComplaints: Number(totalComplaints?.count || 0),
        },
      };
    }),

  /**
   * Obtener datos de tendencias para gráficas del dashboard
   * Con filtros temporales (día/semana/mes/año actual y anterior)
   */
  getTrendsData: protectedProcedure
    .input(z.object({
      period: z.enum(['today', 'this_week', 'this_month', 'this_year', 'last_week', 'last_month', 'last_year', 'custom']),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Calcular rango de fechas según período
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (input.period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'this_week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startDate = new Date(startOfWeek.setHours(0, 0, 0, 0));
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'last_week':
          const lastWeekEnd = new Date(now);
          lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
          const lastWeekStart = new Date(lastWeekEnd);
          lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
          startDate = lastWeekStart;
          endDate = lastWeekEnd;
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'last_year':
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31);
          break;
        case 'custom':
          startDate = input.startDate ? new Date(input.startDate) : new Date(now.getFullYear(), 0, 1);
          endDate = input.endDate ? new Date(input.endDate) : now;
          break;
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // === TENDENCIA DE CASOS (Abiertos vs Cerrados) ===
      const casesCreated = await db
        .select({
          date: sql<string>`DATE(${cases.createdAt})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(cases)
        .where(
          and(
            sql`DATE(${cases.createdAt}) >= ${startDateStr}`,
            sql`DATE(${cases.createdAt}) <= ${endDateStr}`
          )
        )
        .groupBy(sql`DATE(${cases.createdAt})`);

      const casesClosed = await db
        .select({
          date: sql<string>`DATE(${cases.closedAt})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(cases)
        .where(
          and(
            sql`${cases.closedAt} IS NOT NULL`,
            sql`DATE(${cases.closedAt}) >= ${startDateStr}`,
            sql`DATE(${cases.closedAt}) <= ${endDateStr}`
          )
        )
        .groupBy(sql`DATE(${cases.closedAt})`);

      // === COBERTURA DE ENCUESTAS ===
      const surveyCompletion = await db
        .select({
          date: sql<string>`DATE(${surveyResponses.completedAt})`,
          completed: sql<number>`COUNT(*)`,
        })
        .from(surveyResponses)
        .where(
          and(
            sql`${surveyResponses.completedAt} IS NOT NULL`,
            sql`DATE(${surveyResponses.completedAt}) >= ${startDateStr}`,
            sql`DATE(${surveyResponses.completedAt}) <= ${endDateStr}`
          )
        )
        .groupBy(sql`DATE(${surveyResponses.completedAt})`);

      // === DISTRIBUCIÓN DE NIVELES DE PRIORIDAD ===
      const casesByRisk = await db
        .select({
          riskLevel: cases.priority,
          count: sql<number>`COUNT(*)`,
        })
        .from(cases)
        .where(
          and(
            sql`DATE(${cases.createdAt}) >= ${startDateStr}`,
            sql`DATE(${cases.createdAt}) <= ${endDateStr}`
          )
        )
        .groupBy(sql`${cases.priority}`);
      return {
        period: input.period,
        dateRange: { start: startDateStr, end: endDateStr },
        casesTrend: {
          created: casesCreated.map(c => ({
            date: c.date,
            count: Number(c.count),
          })),
          closed: casesClosed.map(c => ({
            date: c.date,
            count: Number(c.count),
          })),
        },
        surveyCompletion: surveyCompletion.map(s => ({
          date: s.date,
          completed: Number(s.completed),
        })),
        riskDistribution: casesByRisk.map((r: any) => ({
          level: r.riskLevel || 'No especificado',
          count: Number(r.count),
        })),
      };
    }),

  /**
   * Obtener comparación histórica entre mes actual y anterior
   * Para visualizar mejoras en cumplimiento NOM-035
   */
  getHistoricalComparison: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const now = new Date();
      
      // Mes actual
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = now;
      
      // Mes anterior
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Formatear fechas
      const currentStartStr = currentMonthStart.toISOString().split('T')[0];
      const currentEndStr = currentMonthEnd.toISOString().split('T')[0];
      const lastStartStr = lastMonthStart.toISOString().split('T')[0];
      const lastEndStr = lastMonthEnd.toISOString().split('T')[0];

      // === CASOS MES ACTUAL ===
      const [currentCasesOpen] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(
          and(
            sql`${cases.status} = 'open'`,
            sql`DATE(${cases.createdAt}) >= ${currentStartStr}`,
            sql`DATE(${cases.createdAt}) <= ${currentEndStr}`
          )
        );

      const [currentCasesClosed] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(
          and(
            sql`${cases.status} = 'closed'`,
            sql`DATE(${cases.closedAt}) >= ${currentStartStr}`,
            sql`DATE(${cases.closedAt}) <= ${currentEndStr}`
          )
        );

      const [currentCriticalCases] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(
          and(
            sql`${cases.priority} = 'critical'`,
            sql`${cases.status} = 'open'`,
            sql`DATE(${cases.createdAt}) >= ${currentStartStr}`,
            sql`DATE(${cases.createdAt}) <= ${currentEndStr}`
          )
        );

      // === CASOS MES ANTERIOR ===
      const [lastCasesOpen] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(
          and(
            sql`${cases.status} = 'open'`,
            sql`DATE(${cases.createdAt}) >= ${lastStartStr}`,
            sql`DATE(${cases.createdAt}) <= ${lastEndStr}`
          )
        );

      const [lastCasesClosed] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(
          and(
            sql`${cases.status} = 'closed'`,
            sql`DATE(${cases.closedAt}) >= ${lastStartStr}`,
            sql`DATE(${cases.closedAt}) <= ${lastEndStr}`
          )
        );

      const [lastCriticalCases] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(
          and(
            sql`${cases.priority} = 'critical'`,
            sql`${cases.status} = 'open'`,
            sql`DATE(${cases.createdAt}) >= ${lastStartStr}`,
            sql`DATE(${cases.createdAt}) <= ${lastEndStr}`
          )
        );

      // === ENCUESTAS MES ACTUAL ===
      const [currentSurveysSent] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(
          and(
            sql`DATE(${surveyResponses.startedAt}) >= ${currentStartStr}`,
            sql`DATE(${surveyResponses.startedAt}) <= ${currentEndStr}`
          )
        );

      const [currentSurveysCompleted] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(
          and(
            sql`${surveyResponses.completedAt} IS NOT NULL`,
            sql`DATE(${surveyResponses.completedAt}) >= ${currentStartStr}`,
            sql`DATE(${surveyResponses.completedAt}) <= ${currentEndStr}`
          )
        );

      // === ENCUESTAS MES ANTERIOR ===
      const [lastSurveysSent] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(
          and(
            sql`DATE(${surveyResponses.startedAt}) >= ${lastStartStr}`,
            sql`DATE(${surveyResponses.startedAt}) <= ${lastEndStr}`
          )
        );

      const [lastSurveysCompleted] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(
          and(
            sql`${surveyResponses.completedAt} IS NOT NULL`,
            sql`DATE(${surveyResponses.completedAt}) >= ${lastStartStr}`,
            sql`DATE(${surveyResponses.completedAt}) <= ${lastEndStr}`
          )
        );

      // Calcular coberturas
      const currentCoverage = currentSurveysSent?.count
        ? (Number(currentSurveysCompleted?.count || 0) / Number(currentSurveysSent.count)) * 100
        : 0;

      const lastCoverage = lastSurveysSent?.count
        ? (Number(lastSurveysCompleted?.count || 0) / Number(lastSurveysSent.count)) * 100
        : 0;

      // Calcular diferencias porcentuales
      const calculateChange = (current: number, last: number): number => {
        if (last === 0) return current > 0 ? 100 : 0;
        return ((current - last) / last) * 100;
      };

      return {
        currentMonth: {
          casesOpen: Number(currentCasesOpen?.count || 0),
          casesClosed: Number(currentCasesClosed?.count || 0),
          criticalCases: Number(currentCriticalCases?.count || 0),
          surveyCoverage: Math.round(currentCoverage * 10) / 10,
        },
        lastMonth: {
          casesOpen: Number(lastCasesOpen?.count || 0),
          casesClosed: Number(lastCasesClosed?.count || 0),
          criticalCases: Number(lastCriticalCases?.count || 0),
          surveyCoverage: Math.round(lastCoverage * 10) / 10,
        },
        changes: {
          casesOpen: calculateChange(
            Number(currentCasesOpen?.count || 0),
            Number(lastCasesOpen?.count || 0)
          ),
          casesClosed: calculateChange(
            Number(currentCasesClosed?.count || 0),
            Number(lastCasesClosed?.count || 0)
          ),
          criticalCases: calculateChange(
            Number(currentCriticalCases?.count || 0),
            Number(lastCriticalCases?.count || 0)
          ),
          surveyCoverage: currentCoverage - lastCoverage,
        },
      };
    }),

  /**
   * Obtener KPIs consolidados (NOM-035, NMX-025, Encuestas, Capacitación)
   */
  getConsolidatedKPIs: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // KPIs NOM-035
    const [totalCases] = await db.select({ count: sql<number>`COUNT(*)` }).from(cases);
    const [openCases] = await db.select({ count: sql<number>`COUNT(*)` }).from(cases).where(eq(cases.status, 'open'));
    const [criticalCases] = await db.select({ count: sql<number>`COUNT(*)` }).from(cases).where(eq(cases.priority, 'critical'));
    const [nom035Evidences] = await db.select({ count: sql<number>`COUNT(*)` }).from(manualEvidences);

    // KPIs NMX-025
    const [nmx025Evidences] = await db.select({ count: sql<number>`COUNT(*)` }).from(nmx025ManualEvidences);
    const [totalEmployees] = await db.select({ count: sql<number>`COUNT(*)` }).from(employees);
    const [femaleEmployeesResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(employees).where(eq(employees.gender, 'female'));
    const femaleEmployees = (femaleEmployeesResult as any)[0]?.count || 0;
    const genderParityScore = (totalEmployees as any)[0]?.count ? (femaleEmployees / (totalEmployees as any)[0].count * 100).toFixed(1) : '0.0';

    // KPIs Encuestas Post-Caso
    const [totalSurveys] = await db.select({ count: sql<number>`COUNT(*)` }).from(postCaseSurveys);
    const [completedSurveys] = await db.select({ count: sql<number>`COUNT(*)` }).from(postCaseSurveys).where(eq(postCaseSurveys.status, 'completed'));
    const completionRate = (totalSurveys as any)[0]?.count ? (((completedSurveys as any)[0]?.count || 0) / (totalSurveys as any)[0].count * 100).toFixed(1) : '0.0';

    const completedSurveysData = await db.select({
      improvementRating: postCaseSurveys.improvementRating,
      satisfactionRating: postCaseSurveys.satisfactionRating,
      supportRating: postCaseSurveys.supportRating,
      recommendationRating: postCaseSurveys.recommendationRating,
    }).from(postCaseSurveys).where(eq(postCaseSurveys.status, 'completed'));

    let avgScore = 0;
    if (completedSurveysData.length > 0) {
      const totalScore = completedSurveysData.reduce((sum, s) => {
        return sum + ((s.improvementRating || 0) + (s.satisfactionRating || 0) + (s.supportRating || 0) + (s.recommendationRating || 0)) / 4;
      }, 0);
      avgScore = parseFloat((totalScore / completedSurveysData.length).toFixed(2));
    }

    // KPIs Capacitación
    const [totalCourses] = await db.select({ count: sql<number>`COUNT(*)` }).from(courses);

    return {
      nom035: { totalCases: (totalCases as any)[0]?.count || 0, openCases: (openCases as any)[0]?.count || 0, criticalCases: (criticalCases as any)[0]?.count || 0, evidences: (nom035Evidences as any)[0]?.count || 0 },
      nmx025: { evidences: (nmx025Evidences as any)[0]?.count || 0, totalEmployees: (totalEmployees as any)[0]?.count || 0, femaleEmployees, genderParityScore: parseFloat(genderParityScore) },
      surveys: { total: (totalSurveys as any)[0]?.count || 0, completed: (completedSurveys as any)[0]?.count || 0, completionRate: parseFloat(completionRate), avgScore },
      training: { totalCourses: (totalCourses as any)[0]?.count || 0 },
    };
  }),

  /**
   * Obtener tendencias de cumplimiento (últimos 6 meses)
   */
  getComplianceTrends: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const months: string[] = [];
    const monthData: Record<string, { cases: number; evidences: number; surveys: number }> = {};

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthKey);
      monthData[monthKey] = { cases: 0, evidences: 0, surveys: 0 };
    }

    const casesData = await db.select({ month: sql<string>`DATE_FORMAT(${cases.createdAt}, '%Y-%m')`, count: sql<number>`COUNT(*)` }).from(cases).where(gte(cases.createdAt, sixMonthsAgo)).groupBy(sql`DATE_FORMAT(${cases.createdAt}, '%Y-%m')`);
    casesData.forEach(row => { if (monthData[row.month]) monthData[row.month].cases = row.count; });

    const evidencesData = await db.select({ month: sql<string>`DATE_FORMAT(${manualEvidences.uploadedAt}, '%Y-%m')`, count: sql<number>`COUNT(*)` }).from(manualEvidences).where(gte(manualEvidences.uploadedAt, sixMonthsAgo)).groupBy(sql`DATE_FORMAT(${manualEvidences.uploadedAt}, '%Y-%m')`);
    evidencesData.forEach(row => { if (monthData[row.month]) monthData[row.month].evidences = row.count; });

    const surveysData = await db.select({ month: sql<string>`DATE_FORMAT(${postCaseSurveys.completedAt}, '%Y-%m')`, count: sql<number>`COUNT(*)` }).from(postCaseSurveys).where(and(eq(postCaseSurveys.status, 'completed'), sql`${postCaseSurveys.completedAt} IS NOT NULL`, gte(postCaseSurveys.completedAt, sixMonthsAgo))).groupBy(sql`DATE_FORMAT(${postCaseSurveys.completedAt}, '%Y-%m')`);
    surveysData.forEach(row => { if (monthData[row.month]) monthData[row.month].surveys = row.count; });

    return { months, cases: months.map(m => monthData[m].cases), evidences: months.map(m => monthData[m].evidences), surveys: months.map(m => monthData[m].surveys) };
  }),

  /**
   * Obtener alertas consolidadas críticas
   */
  getConsolidatedAlerts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const alerts: Array<{ id: string; type: 'critical' | 'warning' | 'info'; category: 'NOM-035' | 'NMX-025' | 'Encuestas' | 'Capacitación'; title: string; description: string; count?: number }> = [];

    const [criticalCases] = await db.select({ count: sql<number>`COUNT(*)` }).from(cases).where(and(eq(cases.status, 'open'), eq(cases.priority, 'critical')));
    if (((criticalCases as any)[0]?.count || 0) > 0) alerts.push({ id: 'nom035-critical-cases', type: 'critical', category: 'NOM-035', title: 'Casos Críticos Abiertos', description: `${(criticalCases as any)[0].count} casos críticos requieren atención inmediata`, count: (criticalCases as any)[0].count });

    const [unassignedCases] = await db.select({ count: sql<number>`COUNT(*)` }).from(cases).where(and(eq(cases.status, 'open'), sql`${cases.assignedTo} IS NULL`));
    if (((unassignedCases as any)[0]?.count || 0) > 3) alerts.push({ id: 'nom035-unassigned-cases', type: 'warning', category: 'NOM-035', title: 'Casos Sin Asignar', description: `${(unassignedCases as any)[0].count} casos abiertos sin responsable asignado`, count: (unassignedCases as any)[0].count });

    const [totalEmployees] = await db.select({ count: sql<number>`COUNT(*)` }).from(employees);
    const [femaleEmployeesResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(employees).where(eq(employees.gender, 'female'));
    const femaleEmployees = (femaleEmployeesResult as any)[0]?.count || 0;
    const genderParity = (totalEmployees as any)[0]?.count ? (femaleEmployees / (totalEmployees as any)[0].count * 100) : 0;
    if (genderParity < 40 || genderParity > 60) alerts.push({ id: 'nmx025-gender-parity', type: 'warning', category: 'NMX-025', title: 'Brecha de Género', description: `Paridad actual: ${genderParity.toFixed(1)}% (objetivo: 40-60%)` });

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const [expiringSurveys] = await db.select({ count: sql<number>`COUNT(*)` }).from(postCaseSurveys).where(and(eq(postCaseSurveys.status, 'sent'), sql`${postCaseSurveys.expiresAt} IS NOT NULL`, lte(postCaseSurveys.expiresAt, threeDaysFromNow)));
    if (((expiringSurveys as any)[0]?.count || 0) > 0) alerts.push({ id: 'surveys-expiring', type: 'warning', category: 'Encuestas', title: 'Encuestas Próximas a Expirar', description: `${(expiringSurveys as any)[0].count} encuestas expiran en los próximos 3 días`, count: (expiringSurveys as any)[0].count });

    const [totalSurveys] = await db.select({ count: sql<number>`COUNT(*)` }).from(postCaseSurveys);
    const [completedSurveys] = await db.select({ count: sql<number>`COUNT(*)` }).from(postCaseSurveys).where(eq(postCaseSurveys.status, 'completed'));
    const completionRate = (totalSurveys as any)[0]?.count ? (((completedSurveys as any)[0]?.count || 0) / (totalSurveys as any)[0].count * 100) : 0;
    if (completionRate < 50 && (totalSurveys as any)[0]?.count > 10) alerts.push({ id: 'surveys-low-completion', type: 'info', category: 'Encuestas', title: 'Baja Tasa de Completitud', description: `Solo ${completionRate.toFixed(1)}% de encuestas completadas` });

    return alerts;
  }),
});
