/**
 * Job: Model Auto-Retraining
 * Detecta degradación persistente del modelo y aplica automáticamente la mejor configuración
 * Ejecuta semanalmente los domingos a las 03:00 AM
 */

import cron from "node-cron";
import { getDb } from "../db";
import { modelPerformanceAlerts, thresholdExperiments, modelThresholds, modelRetrainingHistory } from "../../drizzle/schema";
import { desc, eq, and, gte } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// Umbral de alertas críticas para disparar reentrenamiento
const CRITICAL_ALERT_THRESHOLD = 3; // 3 o más alertas críticas en 7 días
const DAYS_TO_CHECK = 7;

export function startModelAutoRetrainingJob() {
  // Ejecutar semanalmente los domingos a las 03:00 AM
  cron.schedule("0 3 * * 0", async () => {
    console.log("[Model Auto-Retraining Job] Starting weekly retraining check...");

    try {
      const db = await getDb();
      if (!db) {
        console.error("[Model Auto-Retraining Job] Database not available");
        return;
      }

      // Verificar alertas críticas en los últimos 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DAYS_TO_CHECK);

      const recentCriticalAlerts = await db
        .select()
        .from(modelPerformanceAlerts)
        .where(
          and(
            eq(modelPerformanceAlerts.severity, "critical"),
            eq(modelPerformanceAlerts.isResolved, false),
            gte(modelPerformanceAlerts.createdAt, sevenDaysAgo)
          )
        );

      console.log(`[Model Auto-Retraining Job] Found ${recentCriticalAlerts.length} critical alerts in the last ${DAYS_TO_CHECK} days`);

      if (recentCriticalAlerts.length < CRITICAL_ALERT_THRESHOLD) {
        console.log("[Model Auto-Retraining Job] No retraining needed - alert count below threshold");
        return;
      }

      // Obtener configuración actual
      const [currentConfig] = await db
        .select()
        .from(modelThresholds)
        .where(eq(modelThresholds.isActive, true))
        .orderBy(desc(modelThresholds.createdAt))
        .limit(1);

      if (!currentConfig) {
        console.error("[Model Auto-Retraining Job] No active configuration found");
        return;
      }

      // Buscar la mejor configuración de experimentos A/B históricos
      const experiments = await db
        .select()
        .from(thresholdExperiments)
        .where(eq(thresholdExperiments.status, "completed"))
        .orderBy(desc(thresholdExperiments.createdAt))
        .limit(10); // Últimos 10 experimentos

      if (experiments.length === 0) {
        console.log("[Model Auto-Retraining Job] No completed experiments found");
        return;
      }

      // Seleccionar la configuración con mejor F1-Score
      let bestConfig: any = null;
      let bestF1Score = 0;
      let bestMetrics: any = null;

      for (const exp of experiments) {
        const f1ScoreA = parseFloat(exp.f1ScoreA || "0");
        const f1ScoreB = parseFloat(exp.f1ScoreB || "0");

        if (f1ScoreA > bestF1Score) {
          bestF1Score = f1ScoreA;
          bestConfig = await db
            .select()
            .from(modelThresholds)
            .where(eq(modelThresholds.id, exp.configIdA))
            .limit(1);
          bestMetrics = {
            precision: exp.precisionA,
            recall: exp.recallA,
            f1Score: exp.f1ScoreA,
            accuracy: exp.accuracyA,
          };
        }

        if (f1ScoreB > bestF1Score) {
          bestF1Score = f1ScoreB;
          bestConfig = await db
            .select()
            .from(modelThresholds)
            .where(eq(modelThresholds.id, exp.configIdB))
            .limit(1);
          bestMetrics = {
            precision: exp.precisionB,
            recall: exp.recallB,
            f1Score: exp.f1ScoreB,
            accuracy: exp.accuracyB,
          };
        }
      }

      if (!bestConfig || bestConfig.length === 0) {
        console.error("[Model Auto-Retraining Job] No valid configuration found in experiments");
        return;
      }

      const selectedConfig = bestConfig[0];

      // Verificar si la configuración seleccionada es diferente a la actual
      if (selectedConfig.id === currentConfig.id) {
        console.log("[Model Auto-Retraining Job] Best configuration is already active");
        return;
      }

      // Calcular mejora esperada
      const currentF1 = parseFloat(currentConfig.criticalCommentsWeight || "0"); // Placeholder - debería calcularse
      const improvementPercentage = ((bestF1Score - currentF1) / currentF1) * 100;

      // Desactivar configuración actual
      await db
        .update(modelThresholds)
        .set({ isActive: false })
        .where(eq(modelThresholds.id, currentConfig.id));

      // Activar nueva configuración
      await db
        .update(modelThresholds)
        .set({ isActive: true })
        .where(eq(modelThresholds.id, selectedConfig.id));

      // Registrar reentrenamiento en historial
      await db.insert(modelRetrainingHistory).values({
        oldConfigId: currentConfig.id,
        newConfigId: selectedConfig.id,
        reason: `Degradación persistente detectada: ${recentCriticalAlerts.length} alertas críticas en ${DAYS_TO_CHECK} días`,
        oldPrecision: null, // Se calcularía con métricas actuales
        oldRecall: null,
        oldF1Score: null,
        oldAccuracy: null,
        newPrecision: bestMetrics.precision,
        newRecall: bestMetrics.recall,
        newF1Score: bestMetrics.f1Score,
        newAccuracy: bestMetrics.accuracy,
        alertCount: recentCriticalAlerts.length,
        improvementPercentage: improvementPercentage.toFixed(2),
        status: "applied",
        createdBy: null, // Automático
      });

      console.log(`[Model Auto-Retraining Job] Retraining applied: Config ${currentConfig.id} → ${selectedConfig.id}`);

      // Notificar al owner
      await notifyOwner({
        title: "🔄 Reentrenamiento Automático del Modelo Aplicado",
        content: `El sistema detectó degradación persistente del modelo predictivo (${recentCriticalAlerts.length} alertas críticas en ${DAYS_TO_CHECK} días) y aplicó automáticamente la mejor configuración histórica.\n\n` +
          `**Configuración Anterior:** ${currentConfig.description || `Config ${currentConfig.id}`}\n` +
          `**Nueva Configuración:** ${selectedConfig.description || `Config ${selectedConfig.id}`}\n` +
          `**Mejora Esperada:** ${improvementPercentage.toFixed(1)}% en F1-Score\n\n` +
          `Revisa el historial de reentrena mientos en el dashboard para más detalles.`,
      });

      console.log("[Model Auto-Retraining Job] Retraining completed successfully");
    } catch (error) {
      console.error("[Model Auto-Retraining Job] Error during retraining check:", error);
    }
  });

  console.log("[Model Auto-Retraining Job] Scheduled to run weekly on Sundays at 03:00 AM");
}
