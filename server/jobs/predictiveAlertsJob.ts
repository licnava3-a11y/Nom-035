import { getDb } from "../db";
import { alertHistory, users } from "../../drizzle/schema";
import { desc, gte, sql } from "drizzle-orm";
import { sendEmail } from "../lib/email-sender";

interface PredictiveAlert {
  alertType: string;
  daysUntilPredicted: number;
  confidenceLevel: "high" | "medium" | "low";
  trend: "increasing" | "stable" | "decreasing";
  averageIntervalDays: number;
  shouldNotify: boolean;
  notificationMessage: string | null;
}

const alertTypeLabels: Record<string, string> = {
  critical_cases: "Casos Críticos",
  low_coverage: "Baja Cobertura de Encuestas",
  excellent_compliance: "Cumplimiento Excelente",
};

/**
 * Analyze historical alert data and predict next occurrence
 */
async function analyzeAlertHistory(alertType: string): Promise<PredictiveAlert | null> {
  const db = await getDb();
  if (!db) {
    console.error('[Predictive Alerts] Database connection not available');
    return null;
  }
  
  // Get last 180 days of alerts
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

  const alerts = await db
    .select({
      id: alertHistory.id,
      alertType: alertHistory.alertType,
      createdAt: alertHistory.triggeredAt,
    })
    .from(alertHistory)
    .where(
      sql`${alertHistory.alertType} = ${alertType} AND ${alertHistory.triggeredAt} >= ${sixMonthsAgo}`
    )
    .orderBy(desc(alertHistory.triggeredAt));

  if (alerts.length < 3) {
    return null; // Insufficient data
  }

  // Calculate intervals between consecutive alerts
  const intervals: number[] = [];
  for (let i = 0; i < alerts.length - 1; i++) {
    const current = new Date(alerts[i].createdAt).getTime();
    const next = new Date(alerts[i + 1].createdAt).getTime();
    const intervalDays = Math.abs(current - next) / (1000 * 60 * 60 * 24);
    intervals.push(intervalDays);
  }

  // Calculate average interval
  const averageIntervalDays = Math.round(
    intervals.reduce((sum: any, interval: any) => sum + interval, 0) / intervals.length
  );

  // Calculate standard deviation
  const variance =
    intervals.reduce((sum: any, interval: any) => sum + Math.pow(interval - averageIntervalDays, 2), 0) /
    intervals.length;
  const standardDeviation = Math.sqrt(variance);

  // Calculate coefficient of variation (CV) for confidence level
  const coefficientOfVariation = standardDeviation / averageIntervalDays;
  let confidenceLevel: "high" | "medium" | "low";
  if (coefficientOfVariation < 0.3) {
    confidenceLevel = "high";
  } else if (coefficientOfVariation < 0.6) {
    confidenceLevel = "medium";
  } else {
    confidenceLevel = "low";
  }

  // Detect trend (increasing/stable/decreasing frequency)
  const recentIntervals = intervals.slice(0, Math.min(3, intervals.length));
  const olderIntervals = intervals.slice(Math.min(3, intervals.length));
  const recentAvg =
    recentIntervals.reduce((sum: any, val: any) => sum + val, 0) / recentIntervals.length;
  const olderAvg =
    olderIntervals.length > 0
      ? olderIntervals.reduce((sum: any, val: any) => sum + val, 0) / olderIntervals.length
      : recentAvg;

  let trend: "increasing" | "stable" | "decreasing";
  if (recentAvg < olderAvg * 0.85) {
    trend = "increasing"; // Shorter intervals = more frequent
  } else if (recentAvg > olderAvg * 1.15) {
    trend = "decreasing"; // Longer intervals = less frequent
  } else {
    trend = "stable";
  }

  // Predict next alert date
  const lastAlertDate = new Date(alerts[0].createdAt);
  const predictedDate = new Date(lastAlertDate);
  predictedDate.setDate(predictedDate.getDate() + averageIntervalDays);

  const today = new Date();
  const daysUntilPredicted = Math.ceil(
    (predictedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine if notification should be sent (within 7 days and medium/high confidence)
  const shouldNotify =
    daysUntilPredicted <= 7 &&
    daysUntilPredicted >= 0 &&
    (confidenceLevel === "high" || confidenceLevel === "medium");

  const notificationMessage = shouldNotify
    ? `Se predice una alerta de "${alertTypeLabels[alertType]}" en aproximadamente ${daysUntilPredicted} días. Toma acción preventiva ahora.`
    : null;

  return {
    alertType,
    daysUntilPredicted,
    confidenceLevel,
    trend,
    averageIntervalDays,
    shouldNotify,
    notificationMessage,
  };
}

/**
 * Generate HTML email content for predictive alerts
 */
function generateAlertEmail(alerts: PredictiveAlert[]): string {
  const alertRows = alerts
    .map((alert: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${alertTypeLabels[alert.alertType]}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background: ${
          alert.daysUntilPredicted <= 3 ? "#fee2e2" : "#fef3c7"
        }; color: ${
        alert.daysUntilPredicted <= 3 ? "#991b1b" : "#92400e"
      }; padding: 4px 8px; border-radius: 4px; font-weight: 600;">
          ${alert.daysUntilPredicted} días
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background: ${
          alert.confidenceLevel === "high"
            ? "#d1fae5"
            : alert.confidenceLevel === "medium"
            ? "#fef3c7"
            : "#fee2e2"
        }; color: ${
        alert.confidenceLevel === "high"
          ? "#065f46"
          : alert.confidenceLevel === "medium"
          ? "#92400e"
          : "#991b1b"
      }; padding: 4px 8px; border-radius: 4px;">
          ${
            alert.confidenceLevel === "high"
              ? "Alta"
              : alert.confidenceLevel === "medium"
              ? "Media"
              : "Baja"
          }
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${alert.averageIntervalDays} días
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="color: ${
          alert.trend === "increasing"
            ? "#991b1b"
            : alert.trend === "decreasing"
            ? "#065f46"
            : "#1e40af"
        };">
          ${
            alert.trend === "increasing"
              ? "↑ Creciente"
              : alert.trend === "decreasing"
              ? "↓ Decreciente"
              : "→ Estable"
          }
        </span>
      </td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alertas Predictivas - NOM-035</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">⚠️ Alertas Predictivas Urgentes</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.95;">Sistema de Análisis Predictivo NOM-035</p>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; color: #991b1b;">
          <strong>Acción Requerida:</strong> Se han detectado ${alerts.length} alerta(s) predictiva(s) que requieren atención preventiva en los próximos 7 días.
        </p>
      </div>

      <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #111827;">Predicciones de Alertas</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Tipo de Alerta</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Días Hasta Predicción</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Confianza</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Intervalo Promedio</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Tendencia</th>
          </tr>
        </thead>
        <tbody>
          ${alertRows}
        </tbody>
      </table>

      <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e40af;">💡 Recomendaciones</h3>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #1e3a8a;">
          <li>Revisa el dashboard de análisis predictivo para ver detalles completos</li>
          <li>Implementa medidas preventivas antes de que ocurran las alertas</li>
          <li>Monitorea las tendencias para ajustar estrategias de intervención</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.VITE_FRONTEND_FORGE_API_URL || "https://app.manus.space"}/alerts/predictive" 
           style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Ver Dashboard Predictivo
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Este correo fue generado automáticamente por el Sistema de Análisis Predictivo NOM-035
      </p>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
        Fecha de generación: ${new Date().toLocaleString("es-MX", {
          dateStyle: "full",
          timeStyle: "short",
        })}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Main job function - runs daily to check for urgent predictive alerts
 */
export async function runPredictiveAlertsJob(): Promise<void> {
  console.log("[Predictive Alerts Job] Starting automated predictive alerts check...");

  try {
    const alertTypes = ["critical_cases", "low_coverage", "excellent_compliance"];
    const urgentAlerts: PredictiveAlert[] = [];

    // Analyze each alert type
    for (const alertType of alertTypes) {
      const prediction = await analyzeAlertHistory(alertType);
      if (prediction && prediction.shouldNotify) {
        urgentAlerts.push(prediction);
      }
    }

    // If there are urgent alerts, send notification to admin
    if (urgentAlerts.length > 0) {
      console.log(`[Predictive Alerts Job] Found ${urgentAlerts.length} urgent predictive alerts`);

      // Get admin users
      const db = await getDb();
      if (!db) {
        console.error('[Predictive Alerts Job] Database connection not available for admin lookup');
        return;
      }
      const admins = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(sql`${users.role} = 'admin'`);

      // Send email to each admin
      for (const admin of admins) {
        if (admin.email) {
          try {
            await sendEmail({
              to: admin.email,
              subject: `⚠️ Alertas Predictivas Urgentes - ${urgentAlerts.length} Alerta(s) Detectada(s)`,
              html: generateAlertEmail(urgentAlerts),
            });
            console.log(`[Predictive Alerts Job] Email sent to admin: ${admin.email}`);
          } catch (error) {
            console.error(`[Predictive Alerts Job] Failed to send email to ${admin.email}:`, error);
          }
        }
      }
    } else {
      console.log("[Predictive Alerts Job] No urgent predictive alerts found");
    }

    console.log("[Predictive Alerts Job] Automated predictive alerts check completed successfully");
  } catch (error) {
    console.error("[Predictive Alerts Job] Error during predictive alerts check:", error);
  }
}
