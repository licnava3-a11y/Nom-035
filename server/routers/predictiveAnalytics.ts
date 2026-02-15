import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Predictive Analytics Router
 * Análisis predictivo de riesgos psicosociales usando datos históricos
 */
export const predictiveAnalyticsRouter = router({
  /**
   * Obtener predicciones de riesgo para empleados
   * Algoritmo de scoring basado en:
   * - Historial de casos previos
   * - Resultados de encuestas NOM-035
   * - Patrones de reportes
   * - Métricas de estrés laboral
   */
  getRiskPredictions: protectedProcedure
    .input(z.object({
      departmentFilter: z.string().optional(),
      riskThreshold: z.number().min(0).max(100).default(70), // Umbral de riesgo (0-100)
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const { cases, surveyResults, users } = await import('../../drizzle/schema');
      const { eq, sql, and, desc } = await import('drizzle-orm');
      
      // 1. Obtener empleados con sus datos relevantes
      const employeesQuery = await db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          department: users.departamento,
          position: users.puesto,
          hireDate: users.fechaIngreso,
        })
        .from(users)
        .where(input.departmentFilter ? eq(users.departamento, input.departmentFilter) : sql`1=1`);
      
      // 2. Calcular score de riesgo para cada empleado
      const riskPredictions = await Promise.all(
        employeesQuery.map(async (employee) => {
          // Factor 1: Resultados de encuestas NOM-035 (peso 60%)
          // Buscar resultado más reciente de encuesta
          const latestSurvey = await db.execute(sql`
            SELECT riskLevel
            FROM ${surveyResults}
            WHERE ${surveyResults.userId} = ${employee.userId}
            ORDER BY ${surveyResults.completedAt} DESC
            LIMIT 1
          `);
          const surveyRisk = (latestSurvey as any).rows?.[0]?.riskLevel || 'low';
          
          // Factor 2: Casos en el departamento (peso 30%)
          const departmentCases = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM ${cases}
            WHERE ${cases.createdAt} >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          `);
          const departmentCasesCount = Number((departmentCases as any).rows?.[0]?.count || 0);
          
          // Factor 3: Casos críticos en departamento (peso 10%)
          const criticalDeptCases = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM ${cases}
            WHERE ${cases.priority} = 'critical'
            AND ${cases.createdAt} >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          `);
          const criticalDeptCount = Number((criticalDeptCases as any).rows?.[0]?.count || 0);
          
          // Calcular score de riesgo (0-100)
          let riskScore = 0;
          
          // Resultado de encuesta NOM-035 (principal indicador)
          const surveyScores: Record<string, number> = {
            'very_high': 60,
            'high': 45,
            'medium': 25,
            'low': 0,
          };
          riskScore += surveyScores[surveyRisk] || 0;
          
          // Casos en departamento: indicador de ambiente laboral
          if (departmentCasesCount >= 10) riskScore += 30;
          else if (departmentCasesCount >= 5) riskScore += 20;
          else if (departmentCasesCount >= 2) riskScore += 10;
          
          // Casos críticos en departamento
          if (criticalDeptCount >= 3) riskScore += 10;
          else if (criticalDeptCount >= 1) riskScore += 5;
          
          // Determinar nivel de riesgo
          let riskLevel: 'low' | 'medium' | 'high' | 'critical';
          if (riskScore >= 80) riskLevel = 'critical';
          else if (riskScore >= 60) riskLevel = 'high';
          else if (riskScore >= 40) riskLevel = 'medium';
          else riskLevel = 'low';
          
          // Generar recomendaciones
          const recommendations: string[] = [];
          if (surveyRisk === 'very_high') {
            recommendations.push('URGENTE: Evaluación psicológica inmediata requerida (NOM-035)');
            recommendations.push('Asignar a programa de intervención especializada');
          } else if (surveyRisk === 'high') {
            recommendations.push('Evaluación psicológica recomendada según NOM-035');
            recommendations.push('Seguimiento mensual de condiciones laborales');
          }
          
          if (departmentCasesCount >= 10) {
            recommendations.push('Departamento de alto riesgo: intervención organizacional necesaria');
          }
          
          if (criticalDeptCount >= 3) {
            recommendations.push('Múltiples casos críticos en área: auditoría de clima laboral urgente');
          }
          
          if (riskScore >= input.riskThreshold) {
            recommendations.push('Asignar a programa de prevención de riesgos psicosociales');
          }
          
          return {
            userId: employee.userId,
            name: employee.name || 'Sin nombre',
            email: employee.email,
            department: employee.department,
            position: employee.position,
            riskScore: Math.round(riskScore),
            riskLevel,
            factors: {
              surveyRisk,
              departmentCasesCount,
              criticalDeptCount,
            },
            recommendations,
          };
        })
      );
      
      // 3. Filtrar por umbral de riesgo y ordenar por score descendente
      const highRiskEmployees = riskPredictions
        .filter((p: any) => p.riskScore >= input.riskThreshold)
        .sort((a: any, b: any) => b.riskScore - a.riskScore)
        .slice(0, input.limit);
      
      // 4. Estadísticas generales
      const totalEmployees = riskPredictions.length;
      const criticalRisk = riskPredictions.filter((p: any) => p.riskLevel === 'critical').length;
      const highRisk = riskPredictions.filter((p: any) => p.riskLevel === 'high').length;
      const mediumRisk = riskPredictions.filter((p: any) => p.riskLevel === 'medium').length;
      const lowRisk = riskPredictions.filter((p: any) => p.riskLevel === 'low').length;
      
      return {
        predictions: highRiskEmployees,
        statistics: {
          totalEmployees,
          criticalRisk,
          highRisk,
          mediumRisk,
          lowRisk,
          averageRiskScore: Math.round(
            riskPredictions.reduce((sum: number, p: any) => sum + p.riskScore, 0) / totalEmployees
          ),
        },
      };
    }),
});
