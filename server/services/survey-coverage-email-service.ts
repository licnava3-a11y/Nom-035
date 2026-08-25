import { sendEmail } from "../lib/email-sender";

interface CoverageAlert {
  surveyId: number;
  surveyType: string;
  surveyTitle: string;
  totalWorkers: number;
  completedSurveys: number;
  coverage: number;
  threshold: number;
  gap: number;
  priority: string;
  priorityColor: string;
}

interface SendCoverageAlertParams {
  to: string;
  alerts: CoverageAlert[];
}

export async function sendCoverageAlertNotification({
  to,
  alerts,
}: SendCoverageAlertParams) {
  const subject = `⚠️ Alerta: Cobertura de Encuestas NOM-035 Insuficiente`;

  const getPriorityBadge = (priority: string, color: string) => {
    const colors = {
      red: "#ef4444",
      yellow: "#eab308",
      green: "#22c55e",
    };
    return `<span style="display: inline-block; padding: 4px 12px; background-color: ${colors[color as keyof typeof colors] || "#6b7280"}; color: white; border-radius: 12px; font-size: 12px; font-weight: 600;">${priority === "high" ? "ALTA" : priority === "medium" ? "MEDIA" : "BAJA"}</span>`;
  };

  const alertRows = alerts
    .map(
      (alert: any) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 16px 12px;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${alert.surveyTitle}</div>
        <div style="font-size: 14px; color: #6b7280;">${alert.surveyType}</div>
      </td>
      <td style="padding: 16px 12px; text-align: center;">
        <div style="font-size: 24px; font-weight: 700; color: ${alert.priorityColor === "red" ? "#ef4444" : alert.priorityColor === "yellow" ? "#eab308" : "#22c55e"};">
          ${alert.coverage.toFixed(1)}%
        </div>
      </td>
      <td style="padding: 16px 12px; text-align: center;">
        <div style="font-size: 14px; color: #6b7280;">
          ${alert.completedSurveys} / ${alert.totalWorkers}
        </div>
      </td>
      <td style="padding: 16px 12px; text-align: center;">
        <div style="font-size: 14px; font-weight: 600; color: #ef4444;">
          -${alert.gap.toFixed(1)}%
        </div>
      </td>
      <td style="padding: 16px 12px; text-align: center;">
        ${getPriorityBadge(alert.priority, alert.priorityColor)}
      </td>
    </tr>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
            ⚠️ Alerta de Cobertura NOM-035
          </h1>
          <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
            Se detectaron ${alerts.length} encuesta${alerts.length > 1 ? "s" : ""} con cobertura insuficiente
          </p>
        </div>

        <!-- Content -->
        <div style="background-color: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6;">
              Las siguientes encuestas tienen una cobertura <strong>menor al 80%</strong> requerido por la NOM-035-STPS-2018:
            </p>
          </div>

          <!-- Alerts Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #6b7280;">Encuesta</th>
                <th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; color: #6b7280;">Cobertura</th>
                <th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; color: #6b7280;">Completadas</th>
                <th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; color: #6b7280;">Brecha</th>
                <th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; color: #6b7280;">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              ${alertRows}
            </tbody>
          </table>

          <!-- Action Required -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #92400e;">
              Acción Requerida
            </h3>
            <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.6;">
              Es necesario incrementar la cobertura de estas encuestas para cumplir con los requisitos de la norma oficial. 
              Se recomienda enviar recordatorios a los trabajadores pendientes y verificar que tengan acceso a las encuestas.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 32px;">
            <a href="${process.env.VITE_APP_URL || "http://localhost:3000"}/prevention/early-warnings" 
               style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Ver Dashboard de Alertas
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 24px; padding: 16px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            Este correo se envía automáticamente cada semana para monitorear el cumplimiento de la NOM-035-STPS-2018
          </p>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
            Plataforma de Capacitación NOM-035 STPS 2018
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Error al enviar notificación de cobertura:", error);
    return false;
  }
}
