/**
 * Job: Model Performance Monitor
 * Monitorea las métricas del modelo predictivo y genera alertas cuando caen por debajo de umbrales críticos
 * Ejecuta diariamente a las 09:00 AM
 */

import cron from "node-cron";
import { getDb } from "../db";
import {
  employeeTurnoverHistory,
  modelPerformanceAlerts,
} from "../../drizzle/schema";
import { desc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// Umbrales críticos para métricas del modelo
const CRITICAL_THRESHOLDS = {
  precision: 70, // Precisión mínima aceptable: 70%
  recall: 60, // Recall mínimo aceptable: 60%
  f1Score: 65, // F1-Score mínimo aceptable: 65%
  accuracy: 70, // Accuracy mínima aceptable: 70%
};

export function startModelPerformanceMonitorJob() {
  // Ejecutar diariamente a las 09:00 AM
  cron.schedule("0 9 * * *", async () => {
    console.log(
      "[Model Performance Monitor Job] Starting daily performance check..."
    );

    try {
      const db = await getDb();
      if (!db) {
        console.error("[Model Performance Monitor Job] Database not available");
        return;
      }

      // Obtener registros de rotación para calcular métricas
      const turnoverRecords = await db
        .select()
        .from(employeeTurnoverHistory)
        .orderBy(desc(employeeTurnoverHistory.exitDate))
        .limit(100); // Últimos 100 registros

      if (turnoverRecords.length === 0) {
        console.log(
          "[Model Performance Monitor Job] No turnover records found, skipping check"
        );
        return;
      }

      // Calcular matriz de confusión
      let truePositives = 0;
      let falsePositives = 0;
      let trueNegatives = 0;
      let falseNegatives = 0;

      for (const record of turnoverRecords) {
        if (
          record.wasHighRisk &&
          record.riskScoreAtExit &&
          record.riskScoreAtExit >= 70
        ) {
          truePositives++;
        } else if (
          !record.wasHighRisk &&
          record.riskScoreAtExit &&
          record.riskScoreAtExit < 70
        ) {
          trueNegatives++;
        } else if (
          !record.wasHighRisk &&
          record.riskScoreAtExit &&
          record.riskScoreAtExit >= 70
        ) {
          falsePositives++;
        } else if (
          record.wasHighRisk &&
          record.riskScoreAtExit &&
          record.riskScoreAtExit < 70
        ) {
          falseNegatives++;
        }
      }

      // Calcular métricas
      const precision =
        truePositives + falsePositives > 0
          ? (truePositives / (truePositives + falsePositives)) * 100
          : 0;

      const recall =
        truePositives + falseNegatives > 0
          ? (truePositives / (truePositives + falseNegatives)) * 100
          : 0;

      const f1Score =
        precision + recall > 0
          ? (2 * (precision * recall)) / (precision + recall)
          : 0;

      const accuracy =
        turnoverRecords.length > 0
          ? ((truePositives + trueNegatives) / turnoverRecords.length) * 100
          : 0;

      console.log("[Model Performance Monitor Job] Current metrics:", {
        precision: precision.toFixed(2),
        recall: recall.toFixed(2),
        f1Score: f1Score.toFixed(2),
        accuracy: accuracy.toFixed(2),
      });

      // Verificar umbrales y generar alertas
      const alerts: Array<{
        alertType: string;
        metricName: string;
        currentValue: number;
        thresholdValue: number;
        severity: string;
        message: string;
        recommendation: string;
      }> = [];

      if (precision < CRITICAL_THRESHOLDS.precision) {
        alerts.push({
          alertType: "precision_low",
          metricName: "precision",
          currentValue: precision,
          thresholdValue: CRITICAL_THRESHOLDS.precision,
          severity:
            precision < 50 ? "critical" : precision < 60 ? "high" : "medium",
          message: `La precisión del modelo ha caído a ${precision.toFixed(1)}%, por debajo del umbral crítico de ${CRITICAL_THRESHOLDS.precision}%`,
          recommendation:
            "Considera ajustar los pesos de la fórmula predictiva en la página de Configuración de Umbrales. Aumenta el peso de los factores más correlacionados con rotación real.",
        });
      }

      if (recall < CRITICAL_THRESHOLDS.recall) {
        alerts.push({
          alertType: "recall_low",
          metricName: "recall",
          currentValue: recall,
          thresholdValue: CRITICAL_THRESHOLDS.recall,
          severity: recall < 40 ? "critical" : recall < 50 ? "high" : "medium",
          message: `El recall del modelo ha caído a ${recall.toFixed(1)}%, por debajo del umbral crítico de ${CRITICAL_THRESHOLDS.recall}%`,
          recommendation:
            "El modelo está perdiendo empleados de alto riesgo. Revisa si los umbrales de clasificación son demasiado altos o si faltan factores de riesgo en la fórmula.",
        });
      }

      if (f1Score < CRITICAL_THRESHOLDS.f1Score) {
        alerts.push({
          alertType: "f1_low",
          metricName: "f1Score",
          currentValue: f1Score,
          thresholdValue: CRITICAL_THRESHOLDS.f1Score,
          severity:
            f1Score < 45 ? "critical" : f1Score < 55 ? "high" : "medium",
          message: `El F1-Score del modelo ha caído a ${f1Score.toFixed(1)}%, por debajo del umbral crítico de ${CRITICAL_THRESHOLDS.f1Score}%`,
          recommendation:
            "El balance entre precisión y recall está comprometido. Usa el dashboard de A/B Testing para comparar configuraciones históricas y encontrar la óptima.",
        });
      }

      if (accuracy < CRITICAL_THRESHOLDS.accuracy) {
        alerts.push({
          alertType: "accuracy_low",
          metricName: "accuracy",
          currentValue: accuracy,
          thresholdValue: CRITICAL_THRESHOLDS.accuracy,
          severity:
            accuracy < 50 ? "critical" : accuracy < 60 ? "high" : "medium",
          message: `La exactitud del modelo ha caído a ${accuracy.toFixed(1)}%, por debajo del umbral crítico de ${CRITICAL_THRESHOLDS.accuracy}%`,
          recommendation:
            "La capacidad general del modelo para clasificar correctamente está degradada. Revisa la calidad de los datos de entrada y considera reentrenar el modelo.",
        });
      }

      // Insertar alertas en la base de datos
      if (alerts.length > 0) {
        for (const alert of alerts) {
          await (db.insert(modelPerformanceAlerts) as any).values({
            alertType: alert.alertType,
            metricName: alert.metricName,
            currentValue: alert.currentValue.toFixed(2),
            thresholdValue: alert.thresholdValue.toFixed(2),
            severity: alert.severity,
            message: alert.message,
            recommendation: alert.recommendation,
            isResolved: false,
          });
        }

        console.log(
          `[Model Performance Monitor Job] Generated ${alerts.length} alerts`
        );

        // Notificar al owner
        const criticalCount = alerts.filter(
          (a: any) => a.severity === "critical"
        ).length;
        const highCount = alerts.filter(
          (a: any) => a.severity === "high"
        ).length;

        await notifyOwner({
          title: `⚠️ Alerta de Rendimiento del Modelo Predictivo`,
          content:
            `Se detectaron ${alerts.length} alertas de rendimiento del modelo:\n\n` +
            (criticalCount > 0
              ? `🔴 ${criticalCount} alertas críticas\n`
              : "") +
            (highCount > 0
              ? `🟠 ${highCount} alertas de alta prioridad\n`
              : "") +
            `\nRevisa el dashboard de Alertas de Rendimiento para más detalles y recomendaciones de ajuste.`,
        });
      } else {
        console.log(
          "[Model Performance Monitor Job] All metrics within acceptable thresholds"
        );
      }

      console.log(
        "[Model Performance Monitor Job] Performance check completed successfully"
      );
    } catch (error) {
      console.error(
        "[Model Performance Monitor Job] Error during performance check:",
        error
      );
    }
  });

  console.log(
    "[Model Performance Monitor Job] Scheduled to run daily at 09:00 AM"
  );
}
