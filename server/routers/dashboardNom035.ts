/**
 * Router tRPC para Dashboard Interactivo NOM-035
 * Versión simplificada usando schema real
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { 
  surveyResponses,
  surveyAnswers,
  surveys,
  employees,
  surveyPeriods
} from '../../drizzle/schema';
import { eq, desc, and, gte, lte, sql, count, isNotNull } from 'drizzle-orm';

export const dashboardNom035Router = router({
  /**
   * Obtiene el semáforo de riesgo global
   */
  getGlobalRisk: protectedProcedure
    .input(z.object({
      periodo: z.enum(['semana', 'mes', 'trimestre', 'año']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Obtener respuestas completadas
      const responses = await db
        .select({
          response: surveyResponses,
          survey: surveys,
        })
        .from(surveyResponses)
        .leftJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
        .where(isNotNull(surveyResponses.completedAt))
        .orderBy(desc(surveyResponses.completedAt))
        .limit(1000);

      if (responses.length === 0) {
        return {
          nivelRiesgo: 'sin_datos',
          porcentajeRiesgo: 0,
          totalEvaluaciones: 0,
          distribucion: {
            nulo: 0,
            bajo: 0,
            medio: 0,
            alto: 0,
            muy_alto: 0,
          },
        };
      }

      // Calcular distribución de riesgos basado en results
      const distribucion = {
        nulo: 0,
        bajo: 0,
        medio: 0,
        alto: 0,
        muy_alto: 0,
      };

      for (const { response } of responses) {
        if (!response.results) continue;
        
        try {
          const results = JSON.parse(response.results);
          const nivel = results.nivelRiesgo || 'Nulo';
          
          if (nivel === 'Nulo' || nivel === 'Nulo o despreciable') distribucion.nulo++;
          else if (nivel === 'Bajo') distribucion.bajo++;
          else if (nivel === 'Medio') distribucion.medio++;
          else if (nivel === 'Alto') distribucion.alto++;
          else if (nivel === 'Muy alto') distribucion.muy_alto++;
        } catch (e) {
          // Ignorar errores de parsing
        }
      }

      // Calcular porcentaje de riesgo alto y muy alto
      const totalRiesgoAlto = distribucion.alto + distribucion.muy_alto;
      const porcentajeRiesgo = (totalRiesgoAlto / responses.length) * 100;

      // Determinar nivel global
      let nivelRiesgo = 'bajo';
      if (porcentajeRiesgo >= 50) nivelRiesgo = 'muy_alto';
      else if (porcentajeRiesgo >= 30) nivelRiesgo = 'alto';
      else if (porcentajeRiesgo >= 15) nivelRiesgo = 'medio';
      else if (porcentajeRiesgo > 0) nivelRiesgo = 'bajo';
      else nivelRiesgo = 'nulo';

      return {
        nivelRiesgo,
        porcentajeRiesgo: Math.round(porcentajeRiesgo * 100) / 100,
        totalEvaluaciones: responses.length,
        distribucion,
      };
    }),

  /**
   * Obtiene el mapa de calor por dimensión
   */
  getDimensionHeatmap: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    // Obtener respuestas completadas con results
    const responses = await db
      .select()
      .from(surveyResponses)
      .where(isNotNull(surveyResponses.completedAt))
      .orderBy(desc(surveyResponses.completedAt))
      .limit(500);

    if (responses.length === 0) {
      return {
        dimensiones: [],
        promedios: {},
      };
    }

    // Acumular puntajes por dimensión
    const dimensionScores: Record<string, number[]> = {};

    for (const response of responses) {
      if (!response.results) continue;
      
      try {
        const results = JSON.parse(response.results);
        
        if (results.dimensiones && Array.isArray(results.dimensiones)) {
          for (const dim of results.dimensiones) {
            const codigo = dim.codigo || dim.nombre;
            if (!dimensionScores[codigo]) {
              dimensionScores[codigo] = [];
            }
            dimensionScores[codigo].push(dim.puntaje || 0);
          }
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }

    // Calcular promedios
    const dimensiones = Object.keys(dimensionScores).map(codigo => {
      const scores = dimensionScores[codigo];
      const promedio = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      return {
        codigo,
        nombre: codigo,
        promedio: Math.round(promedio * 100) / 100,
        total: scores.length,
      };
    });

    // Ordenar por promedio descendente
    dimensiones.sort((a, b) => b.promedio - a.promedio);

    return {
      dimensiones,
      promedios: dimensionScores,
    };
  }),

  /**
   * Obtiene gráficos de evolución temporal
   */
  getTemporalTrends: protectedProcedure
    .input(z.object({
      periodo: z.enum(['mes', 'trimestre', 'semestre', 'año']).default('mes'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Calcular fecha de inicio según periodo
      const now = new Date();
      const startDate = new Date();
      
      switch (input.periodo) {
        case 'mes':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'trimestre':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'semestre':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case 'año':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Obtener respuestas en el periodo
      const responses = await db
        .select()
        .from(surveyResponses)
        .where(
          and(
            isNotNull(surveyResponses.completedAt),
            gte(surveyResponses.completedAt, startDate)
          )
        )
        .orderBy(surveyResponses.completedAt);

      // Agrupar por mes
      const trends: Record<string, { nulo: number; bajo: number; medio: number; alto: number; muy_alto: number }> = {};

      for (const response of responses) {
        if (!response.completedAt) continue;
        
        const date = new Date(response.completedAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!trends[key]) {
          trends[key] = { nulo: 0, bajo: 0, medio: 0, alto: 0, muy_alto: 0 };
        }

        if (!response.results) continue;

        try {
          const results = JSON.parse(response.results);
          const nivel = results.nivelRiesgo || 'Nulo';
          
          if (nivel === 'Nulo' || nivel === 'Nulo o despreciable') trends[key].nulo++;
          else if (nivel === 'Bajo') trends[key].bajo++;
          else if (nivel === 'Medio') trends[key].medio++;
          else if (nivel === 'Alto') trends[key].alto++;
          else if (nivel === 'Muy alto') trends[key].muy_alto++;
        } catch (e) {
          // Ignorar errores de parsing
        }
      }

      return {
        trends: Object.keys(trends).sort().map(key => ({
          periodo: key,
          ...trends[key],
        })),
      };
    }),

  /**
   * Obtiene casos críticos que requieren atención
   */
  getCriticalCases: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    // Obtener respuestas completadas
    const responses = await db
      .select({
        response: surveyResponses,
        survey: surveys,
      })
      .from(surveyResponses)
      .leftJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
      .where(isNotNull(surveyResponses.completedAt))
      .orderBy(desc(surveyResponses.completedAt))
      .limit(1000);

    const criticalCases = [];

    for (const { response, survey } of responses) {
      if (!response.results) continue;

      try {
        const results = JSON.parse(response.results);
        const nivel = results.nivelRiesgo || 'Nulo';
        
        if (nivel === 'Alto' || nivel === 'Muy alto') {
          criticalCases.push({
            id: response.id,
            curp: response.curp || 'Anónimo',
            nivelRiesgo: nivel,
            puntajeTotal: results.puntajeTotal || 0,
            fecha: response.completedAt,
            surveyName: survey?.title || 'Encuesta',
          });
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }

    // Ordenar por nivel de riesgo y puntaje
    criticalCases.sort((a, b) => {
      if (a.nivelRiesgo === 'Muy alto' && b.nivelRiesgo !== 'Muy alto') return -1;
      if (a.nivelRiesgo !== 'Muy alto' && b.nivelRiesgo === 'Muy alto') return 1;
      return b.puntajeTotal - a.puntajeTotal;
    });

    return {
      cases: criticalCases.slice(0, 50), // Limitar a 50 casos más críticos
      total: criticalCases.length,
    };
  }),

  /**
   * Obtiene métricas de cumplimiento
   */
  getComplianceMetrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    // Total de empleados
    const [{ total: totalEmployees }] = await db
      .select({ total: count() })
      .from(employees);

    // Total de evaluaciones completadas
    const [{ total: totalEvaluations }] = await db
      .select({ total: count() })
      .from(surveyResponses)
      .where(isNotNull(surveyResponses.completedAt));

    // Cobertura
    const cobertura = totalEmployees > 0 ? (totalEvaluations / totalEmployees) * 100 : 0;

    // Evaluaciones en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ total: recentEvaluations }] = await db
      .select({ total: count() })
      .from(surveyResponses)
      .where(
        and(
          isNotNull(surveyResponses.completedAt),
          gte(surveyResponses.completedAt, thirtyDaysAgo)
        )
      );

    return {
      totalEmployees,
      totalEvaluations,
      cobertura: Math.round(cobertura * 100) / 100,
      recentEvaluations,
    };
  }),
});
