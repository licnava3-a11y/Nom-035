/**
 * Job de Monitoreo de Riesgo de Ofertas Externas
 * Ejecuta semanalmente (domingos a las 04:00 AM) para detectar empleados clave en riesgo
 */

import cron from "node-cron";
import { getDb } from "../db";
import { employees, externalOfferRiskAlerts } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { sql } from "drizzle-orm";

export function startExternalOfferRiskMonitorJob() {
  // Ejecutar cada domingo a las 04:00 AM
  cron.schedule("0 4 * * 0", async () => {
    console.log(
      "[External Offer Risk Monitor Job] Starting weekly risk assessment..."
    );

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Obtener empleados con datos de nómina y rotación
      const employees = await db.execute(sql`
        SELECT 
          p.employee_id,
          p.employee_name,
          p.department,
          p.position,
          p.salary_gap_percentage,
          p.compensation_risk_level,
          TIMESTAMPDIFF(MONTH, 
            COALESCE(
              (SELECT MAX(effective_date) FROM salary_history WHERE employee_id = p.employee_id),
              DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
            ),
            CURDATE()
          ) as months_since_last_raise,
          ptr.turnover_probability
        FROM payroll_data p
        LEFT JOIN predictive_turnover_results ptr ON p.employee_id = ptr.employee_id
        WHERE p.salary IS NOT NULL
      `);

      let alertsGenerated = 0;

      for (const emp of employees[0] as unknown as any[]) {
        // Calcular factores de riesgo
        const salaryGap = parseFloat(emp.salary_gap_percentage || "0");
        const monthsSinceRaise = emp.months_since_last_raise || 0;
        const turnoverProb = parseFloat(emp.turnover_probability || "0");

        // Determinar nivel de habilidades (simplificado)
        let skillLevel = "mid";
        if (
          emp.position?.toLowerCase().includes("senior") ||
          emp.position?.toLowerCase().includes("lead")
        ) {
          skillLevel = "senior";
        } else if (emp.position?.toLowerCase().includes("junior")) {
          skillLevel = "junior";
        } else if (
          emp.position?.toLowerCase().includes("director") ||
          emp.position?.toLowerCase().includes("manager")
        ) {
          skillLevel = "expert";
        }

        // Determinar demanda de mercado (basado en brecha salarial y posición)
        let marketDemand = "medium";
        if (salaryGap < -20 && skillLevel === "expert") {
          marketDemand = "critical";
        } else if (
          salaryGap < -15 &&
          (skillLevel === "senior" || skillLevel === "expert")
        ) {
          marketDemand = "high";
        } else if (salaryGap < -10) {
          marketDemand = "medium";
        } else {
          marketDemand = "low";
        }

        // Calcular score de riesgo (0-100)
        let riskScore = 0;

        // Factor 1: Brecha salarial (30 puntos máx)
        riskScore += Math.min(30, Math.abs(salaryGap) * 1.5);

        // Factor 2: Tiempo sin aumento (25 puntos máx)
        riskScore += Math.min(25, monthsSinceRaise * 2);

        // Factor 3: Nivel de habilidades (20 puntos máx)
        const skillPoints = { junior: 5, mid: 10, senior: 15, expert: 20 };
        riskScore += skillPoints[skillLevel as keyof typeof skillPoints] || 10;

        // Factor 4: Demanda de mercado (15 puntos máx)
        const demandPoints = { low: 0, medium: 5, high: 10, critical: 15 };
        riskScore +=
          demandPoints[marketDemand as keyof typeof demandPoints] || 5;

        // Factor 5: Probabilidad de rotación (10 puntos máx)
        riskScore += Math.min(10, turnoverProb / 10);

        // Determinar nivel de riesgo
        let riskLevel = "low";
        if (riskScore >= 70) {
          riskLevel = "critical";
        } else if (riskScore >= 50) {
          riskLevel = "high";
        } else if (riskScore >= 30) {
          riskLevel = "medium";
        }

        // Generar alerta solo para riesgo alto o crítico
        if (riskLevel === "high" || riskLevel === "critical") {
          // Estimar tiempo hasta recibir oferta (en días)
          let estimatedTimeToOffer = 90;
          if (riskLevel === "critical") {
            estimatedTimeToOffer = 30;
          } else if (riskLevel === "high") {
            estimatedTimeToOffer = 60;
          }

          // Generar recomendación
          let recommendedAction = "";
          if (salaryGap < -20) {
            recommendedAction = `URGENTE: Ajustar salario a tasa de mercado inmediatamente. Brecha actual: ${salaryGap.toFixed(1)}%. Sin aumento en ${monthsSinceRaise} meses. Riesgo de pérdida inminente.`;
          } else if (salaryGap < -15) {
            recommendedAction = `ALTA PRIORIDAD: Revisar compensación en próximos 30 días. Considerar ajuste de ${Math.abs(salaryGap).toFixed(0)}% para alcanzar mercado. Combinar con beneficios adicionales.`;
          } else {
            recommendedAction = `MONITOREAR: Programar revisión salarial en próximos 60 días. Evaluar oportunidades de desarrollo y promoción. Mantener comunicación activa sobre plan de carrera.`;
          }

          // Verificar si ya existe alerta activa para este empleado
          const existingAlert = await db.execute(sql`
            SELECT id FROM external_offer_risk_alerts
            WHERE employee_id = ${emp.employee_id}
            AND status = 'active'
            LIMIT 1
          `);

          if ((existingAlert as any)[0].length === 0) {
            // Crear nueva alerta
            await (db.insert(externalOfferRiskAlerts) as any).values({
              employeeId: emp.employee_id,
              employeeName: emp.employee_name,
              department: emp.department,
              position: emp.position,
              salaryGapPercentage: salaryGap.toString(),
              monthsSinceLastRaise: monthsSinceRaise,
              skillLevel,
              marketDemand,
              turnoverProbability: turnoverProb.toString(),
              riskLevel,
              riskScore: riskScore.toString(),
              recommendedAction,
              estimatedTimeToOffer,
            });

            alertsGenerated++;
          }
        }
      }

      console.log(
        `[External Offer Risk Monitor Job] Risk assessment completed. Alerts generated: ${alertsGenerated}`
      );

      // Notificar al owner si se generaron alertas críticas
      if (alertsGenerated > 0) {
        await notifyOwner({
          title: "🚨 Nuevas Alertas de Riesgo de Ofertas Externas",
          content: `Se han detectado ${alertsGenerated} empleados clave en riesgo de recibir ofertas externas. Revisa el dashboard de alertas para tomar acciones preventivas.`,
        });
      }
    } catch (error: any) {
      console.error("[External Offer Risk Monitor Job] Error:", error);
    }
  });

  console.log(
    "[External Offer Risk Monitor Job] Scheduled to run every Sunday at 04:00 AM"
  );
}
