import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, cases } from "../../drizzle/schema";
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

    return {
      activeEmployees: Number(totalUsers[0]?.count || 0),
      newEmployeesThisMonth: 2, // TODO: Implementar cuando se agregue campo createdAt o similar
      nom035Compliance: 92, // TODO: Calcular basado en evaluaciones completadas
      nom035Trend: "up" as const,
      nom035Change: 3,
      openCases: Number(openCases[0]?.count || 0),
      casesInInvestigation: Number(casesInInvestigation[0]?.count || 0),
      overallPerformance: 88, // TODO: Calcular basado en métricas de capacitación y evaluaciones
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
