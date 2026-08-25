import { getDb } from "../db";
import { alertHistory, systemSettings } from "../../drizzle/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { sendEmail } from "../lib/email-sender";

/**
 * Job programado para enviar resumen de alertas al administrador
 * Frecuencia configurable: weekly (lunes 9am) o monthly (día 1 de cada mes 9am)
 */

interface AlertSummary {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  alertsByType: {
    critical_cases: number;
    low_coverage: number;
    excellent_compliance: number;
  };
}

async function generateAlertSummary(startDate: Date): Promise<AlertSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener todas las alertas desde la fecha de inicio
  const alerts = await db
    .select()
    .from(alertHistory)
    .where(gte(alertHistory.triggeredAt, startDate));

  const summary: AlertSummary = {
    totalAlerts: alerts.length,
    activeAlerts: alerts.filter((a: any) => a.status === "active").length,
    resolvedAlerts: alerts.filter((a: any) => a.status === "resolved").length,
    criticalAlerts: alerts.filter((a: any) => a.priority === "critical").length,
    warningAlerts: alerts.filter((a: any) => a.priority === "warning").length,
    infoAlerts: alerts.filter((a: any) => a.priority === "info").length,
    alertsByType: {
      critical_cases: alerts.filter(
        (a: any) => a.alertType === "critical_cases"
      ).length,
      low_coverage: alerts.filter((a: any) => a.alertType === "low_coverage")
        .length,
      excellent_compliance: alerts.filter(
        (a: any) => a.alertType === "excellent_compliance"
      ).length,
    },
  };

  return summary;
}

function generateSummaryHTML(summary: AlertSummary, period: string): string {
  const {
    totalAlerts,
    activeAlerts,
    resolvedAlerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    alertsByType,
  } = summary;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 0;
          opacity: 0.9;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-card {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          border-radius: 4px;
        }
        .summary-card.critical {
          border-left-color: #dc2626;
          background: #fef2f2;
        }
        .summary-card.warning {
          border-left-color: #f59e0b;
          background: #fffbeb;
        }
        .summary-card.info {
          border-left-color: #3b82f6;
          background: #eff6ff;
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .summary-card .value {
          font-size: 36px;
          font-weight: bold;
          color: #111827;
        }
        .section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 20px;
        }
        .section h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          color: #111827;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }
        .alert-type-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .alert-type-row:last-child {
          border-bottom: none;
        }
        .alert-type-label {
          font-weight: 500;
          color: #374151;
        }
        .alert-type-value {
          font-size: 18px;
          font-weight: bold;
          color: #667eea;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
        }
        .cta-button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Resumen ${period} de Alertas</h1>
        <p>Plataforma NOM-035 STPS 2018 - Auditoría de Cumplimiento</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total de Alertas</h3>
          <div class="value">${totalAlerts}</div>
        </div>
        <div class="summary-card critical">
          <h3>Alertas Activas</h3>
          <div class="value">${activeAlerts}</div>
        </div>
        <div class="summary-card info">
          <h3>Alertas Resueltas</h3>
          <div class="value">${resolvedAlerts}</div>
        </div>
      </div>

      <div class="section">
        <h2>Distribución por Prioridad</h2>
        <div class="alert-type-row">
          <span class="alert-type-label">🔴 Críticas</span>
          <span class="alert-type-value">${criticalAlerts}</span>
        </div>
        <div class="alert-type-row">
          <span class="alert-type-label">🟡 Advertencias</span>
          <span class="alert-type-value">${warningAlerts}</span>
        </div>
        <div class="alert-type-row">
          <span class="alert-type-label">🔵 Informativas</span>
          <span class="alert-type-value">${infoAlerts}</span>
        </div>
      </div>

      <div class="section">
        <h2>Distribución por Tipo</h2>
        <div class="alert-type-row">
          <span class="alert-type-label">Casos Críticos (> 50 casos abiertos)</span>
          <span class="alert-type-value">${alertsByType.critical_cases}</span>
        </div>
        <div class="alert-type-row">
          <span class="alert-type-label">Cobertura Baja (< 80% encuestas)</span>
          <span class="alert-type-value">${alertsByType.low_coverage}</span>
        </div>
        <div class="alert-type-row">
          <span class="alert-type-label">Cumplimiento Excelente</span>
          <span class="alert-type-value">${alertsByType.excellent_compliance}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${process.env.VITE_FRONTEND_FORGE_API_URL || "https://app.manus.im"}/alert-history" class="cta-button">
          Ver Histórico Completo de Alertas
        </a>
      </div>

      <div class="footer">
        <p>Este es un correo automático generado por el sistema de alertas NOM-035.</p>
        <p>Para más información, accede al panel de administración.</p>
      </div>
    </body>
    </html>
  `;
}

export async function sendAlertSummary(
  frequency: "weekly" | "monthly"
): Promise<void> {
  try {
    console.log(
      `[Alert Summary Job] Iniciando envío de resumen ${frequency}...`
    );

    // Calcular fecha de inicio según frecuencia
    const now = new Date();
    const startDate = new Date();

    if (frequency === "weekly") {
      // Últimos 7 días
      startDate.setDate(now.getDate() - 7);
    } else {
      // Último mes
      startDate.setMonth(now.getMonth() - 1);
    }

    // Generar resumen
    const summary = await generateAlertSummary(startDate);

    // Generar HTML
    const periodLabel = frequency === "weekly" ? "Semanal" : "Mensual";
    const htmlContent = generateSummaryHTML(summary, periodLabel);

    // Obtener email del administrador desde variables de entorno
    const adminEmail = process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL;

    if (!adminEmail) {
      console.error(
        "[Alert Summary Job] No se encontró email del administrador"
      );
      return;
    }

    // Enviar correo
    await sendEmail({
      to: adminEmail,
      subject: `📊 Resumen ${periodLabel} de Alertas - NOM-035`,
      html: htmlContent,
    });

    console.log(
      `[Alert Summary Job] Resumen ${frequency} enviado exitosamente a ${adminEmail}`
    );
  } catch (error) {
    console.error(
      `[Alert Summary Job] Error al enviar resumen ${frequency}:`,
      error
    );
  }
}

/**
 * Función para envío manual de resumen (llamada desde tRPC)
 */
export async function sendManualAlertSummary(
  frequency: "weekly" | "monthly" = "weekly"
): Promise<{ success: boolean; message: string }> {
  try {
    await sendAlertSummary(frequency);
    return {
      success: true,
      message: `Resumen ${frequency === "weekly" ? "semanal" : "mensual"} enviado exitosamente`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error al enviar resumen: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
}
