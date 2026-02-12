import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, cases, surveys, surveyResponses, employees } from "../../drizzle/schema";
import { eq, and, sql, gte } from "drizzle-orm";

/**
 * Dashboard Router - Procedures para dashboard de gerente
 * NOTA: Algunos procedures retornan datos mock temporales.
 * Reemplazar con queries reales cuando se implementen las funcionalidades completas.
 */
export const dashboardRouter = router({
  // Estadísticas del gerente
  getManagerStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    
    // Total de usuarios
    const totalUsers = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
      : [{ count: 0 }];

    // Casos abiertos
    const openCases = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(cases)
          .where(eq(cases.status, "open"))
      : [{ count: 0 }];

    // Casos en investigación
    const casesInInvestigation = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(cases)
          .where(eq(cases.status, "investigating"))
      : [{ count: 0 }];

    // Total de empleados activos
    const activeEmployees = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(employees)
          .where(eq(employees.isActive, true))
      : [{ count: 0 }];

    // Total de respuestas de encuestas NOM-035
    const totalSurveyResponses = db
      ? await db
          .select({ count: sql<number>`count(DISTINCT employee_id)` })
          .from(surveyResponses)
      : [{ count: 0 }];

    // Calcular cumplimiento NOM-035 (% de empleados que han respondido encuestas)
    const activeEmployeesCount = Number(activeEmployees[0]?.count || 0);
    const respondedEmployeesCount = Number(totalSurveyResponses[0]?.count || 0);
    const nom035Compliance = activeEmployeesCount > 0 
      ? Math.round((respondedEmployeesCount / activeEmployeesCount) * 100)
      : 0;

    return {
      activeEmployees: activeEmployeesCount,
      newEmployeesThisMonth: 0, // TODO: Implementar cuando employees tenga campo createdAt
      nom035Compliance,
      nom035Trend: "up" as const, // TODO: Calcular comparando con mes anterior
      nom035Change: 0, // TODO: Calcular diferencia con mes anterior
      openCases: Number(openCases[0]?.count || 0),
      casesInInvestigation: Number(casesInInvestigation[0]?.count || 0),
      overallPerformance: nom035Compliance, // Usar cumplimiento NOM-035 como métrica general
    };
  }),

  // Tendencia de cumplimiento del equipo
  getTeamPerformance: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Implementar query real basado en registros de capacitación por mes
    const currentMonth = new Date().getMonth();
    const labels = [];
    const trainingCompletion = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      labels.push(monthNames[monthIndex]);
      // Datos mock con tendencia creciente
      trainingCompletion.push(75 + i * 3 + Math.random() * 5);
    }

    return {
      labels,
      trainingCompletion,
    };
  }),

  // Métricas de cumplimiento NOM-035
  getNOM035Compliance: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Implementar queries reales basadas en:
    // - Evaluaciones completadas vs programadas
    // - Capacitaciones completadas vs requeridas
    // - Casos atendidos vs reportados
    // - Documentación completa vs requerida

    return {
      labels: ['Evaluaciones', 'Capacitaciones', 'Casos Atendidos', 'Documentación'],
      values: [95, 88, 92, 97],
    };
  }),
});
