import cron from "node-cron";
import { getDb } from "../db";
import { departments, employees, predictiveTurnoverAlerts } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Job de análisis predictivo de rotación
 * Se ejecuta mensualmente para detectar departamentos con alto riesgo de rotación
 */

async function analyzePredictiveTurnover() {
  console.log("[Predictive Turnover Job] Starting predictive turnover analysis...");

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Predictive Turnover Job] Database not available");
      return;
    }

    // Obtener departamentos activos
    // @ts-expect-error - getDb() siempre retorna instancia válida
    const allDepartments = await db
      .select({
        id: departments.id,
        name: departments.name,
        managerId: departments.managerId,
      })
      .from(departments)
      .where(eq(departments.isActive, true))
      .execute();

    console.log(`[Predictive Turnover Job] Analyzing ${allDepartments.length} departments...`);

    const alerts: Array<{
      departmentId: number;
      departmentName: string;
      riskScore: number;
      currentEmployeeCount: number;
      hiresLast3Months: number;
      terminationsLast3Months: number;
      avgTenureMonths: number;
      predictedTurnoverRate: number;
      recommendedActions: string;
    }> = [];

    for (const dept of allDepartments) {
      // Calcular métricas de los últimos 3 meses
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Contar empleados actuales
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [currentCount] = await db
        .select({ count: sql`COUNT(*)`.mapWith(Number) })
        .from(employees)
        .where(
          and(
            eq(employees.departmentId, dept.id),
            sql`${employees.status} = 'activo'`
          )
        )
        .execute();

      const currentEmployeeCount = currentCount.count;

      // Contar altas de los últimos 3 meses
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [hiresCount] = await db
        .select({ count: sql`COUNT(*)`.mapWith(Number) })
        .from(employees)
        .where(
          and(
            eq(employees.departmentId, dept.id),
            gte(employees.createdAt, threeMonthsAgo)
          )
        )
        .execute();

      const hiresLast3Months = hiresCount.count;

      // Contar bajas de los últimos 3 meses
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [terminationsCount] = await db
        .select({ count: sql`COUNT(*)`.mapWith(Number) })
        .from(employees)
        .where(
          and(
            eq(employees.departmentId, dept.id),
            sql`${employees.status} = 'inactivo'`,
            gte(employees.updatedAt, threeMonthsAgo)
          )
        )
        .execute();

      const terminationsLast3Months = terminationsCount.count;

      // Calcular antigüedad promedio (en meses)
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [avgTenure] = await db
        .select({
          avg: sql`AVG(TIMESTAMPDIFF(MONTH, ${employees.createdAt}, NOW()))`.mapWith(Number),
        })
        .from(employees)
        .where(
          and(
            eq(employees.departmentId, dept.id),
            sql`${employees.status} = 'activo'`
          )
        )
        .execute();

      const avgTenureMonths = avgTenure.avg || 0;

      // Calcular score de riesgo (0-100)
      let riskScore = 0;

      // Factor 1: Tasa de rotación reciente (0-40 puntos)
      const turnoverRate =
        currentEmployeeCount > 0
          ? (terminationsLast3Months / currentEmployeeCount) * 100
          : 0;
      if (turnoverRate > 20) riskScore += 40;
      else if (turnoverRate > 10) riskScore += 30;
      else if (turnoverRate > 5) riskScore += 20;
      else riskScore += 10;

      // Factor 2: Antigüedad promedio baja (0-30 puntos)
      if (avgTenureMonths < 6) riskScore += 30;
      else if (avgTenureMonths < 12) riskScore += 20;
      else if (avgTenureMonths < 24) riskScore += 10;

      // Factor 3: Sin manager asignado (0-20 puntos)
      if (!dept.managerId) riskScore += 20;

      // Factor 4: Tamaño del equipo pequeño con rotación (0-10 puntos)
      if (currentEmployeeCount < 5 && terminationsLast3Months > 0) riskScore += 10;

      // Predicción de tasa de rotación anualizada
      const predictedTurnoverRate = turnoverRate * 4; // Proyección anual

      // Generar recomendaciones
      const recommendations = [];
      if (turnoverRate > 10) {
        recommendations.push("Realizar entrevistas de salida para identificar causas de rotación");
        recommendations.push("Revisar políticas de compensación y beneficios");
      }
      if (avgTenureMonths < 12) {
        recommendations.push("Implementar programa de onboarding mejorado");
        recommendations.push("Establecer plan de desarrollo de carrera para nuevos empleados");
      }
      if (!dept.managerId) {
        recommendations.push("Asignar manager al departamento urgentemente");
      }
      if (currentEmployeeCount < 5) {
        recommendations.push("Considerar fusión con otro departamento o contratación de refuerzos");
      }

      // Solo crear alerta si el score es >= 40 (riesgo medio-alto)
      if (riskScore >= 40) {
        alerts.push({
          departmentId: dept.id,
          departmentName: dept.name,
          riskScore,
          currentEmployeeCount,
          hiresLast3Months,
          terminationsLast3Months,
          avgTenureMonths,
          predictedTurnoverRate,
          recommendedActions: JSON.stringify(recommendations),
        });
      }
    }

    // Insertar alertas en la base de datos
    if (alerts.length > 0) {
      // @ts-expect-error - getDb() siempre retorna instancia válida
      await db.insert(predictiveTurnoverAlerts).values(alerts).execute();

      console.log(`[Predictive Turnover Job] Created ${alerts.length} predictive turnover alerts`);

      // Notificar al propietario
      const highRiskDepts = alerts.filter((a) => a.riskScore >= 70);
      if (highRiskDepts.length > 0) {
        const deptNames = highRiskDepts.map((a) => a.departmentName).join(", ");
        await notifyOwner({
          title: "⚠️ Alerta de Rotación Predictiva - Riesgo Alto",
          content: `Se detectaron ${highRiskDepts.length} departamento(s) con alto riesgo de rotación: ${deptNames}. Revisa el dashboard de métricas para más detalles.`,
        });
      }
    } else {
      console.log("[Predictive Turnover Job] No high-risk departments detected");
    }

    console.log("[Predictive Turnover Job] Predictive turnover analysis completed successfully");
  } catch (error) {
    console.error("[Predictive Turnover Job] Error during predictive turnover analysis:", error);
  }
}

/**
 * Iniciar el job de análisis predictivo de rotación
 * Se ejecuta el día 1 de cada mes a las 8:00 AM
 */
export function startPredictiveTurnoverJob() {
  console.log("[Predictive Turnover Job] Scheduling predictive turnover analysis job...");

  // Ejecutar el día 1 de cada mes a las 8:00 AM
  cron.schedule("0 8 1 * *", analyzePredictiveTurnover, {
    timezone: "America/Mexico_City",
  });

  console.log("[Predictive Turnover Job] Job scheduled: Monthly on day 1 at 8:00 AM");
}
