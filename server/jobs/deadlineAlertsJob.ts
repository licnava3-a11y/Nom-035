import cron from "node-cron";
import { getDb } from "../db";
import { operatingRulesApprovals, committeeOperatingRules, users } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "../_core/email";

/**
 * Job: Alertas de Deadlines Próximos
 * Detecta aprobaciones con deadlines próximos (3 días, 1 día) o vencidos
 * y envía notificaciones por email
 * Programado para ejecutarse diariamente a las 09:00 AM
 */

interface DeadlineAlert {
  approvalId: number;
  operatingRuleId: number;
  ruleVersion: string;
  approverName: string;
  approverEmail: string;
  approverRole: string;
  deadline: Date;
  daysLeft: number;
  urgency: "critical" | "high" | "overdue";
}

/**
 * Detectar y enviar alertas de deadlines
 */
export async function sendDeadlineAlerts() {
  const db = await getDb();
  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  console.log(`[Deadline Alerts Job] Starting deadline alerts check at ${now.toISOString()}`);

  try {
    // Obtener aprobaciones pendientes con deadline
    const pendingApprovals = await db
      .select({
        id: operatingRulesApprovals.id,
        operatingRuleId: operatingRulesApprovals.operatingRuleId,
        approverId: operatingRulesApprovals.approverId,
        approverRole: operatingRulesApprovals.approverRole,
        deadline: operatingRulesApprovals.deadline,
        ruleVersion: committeeOperatingRules.version,
        approverName: users.name,
        approverEmail: users.email,
      })
      .from(operatingRulesApprovals)
      .leftJoin(users, eq(operatingRulesApprovals.approverId, users.id))
      .leftJoin(
        committeeOperatingRules,
        eq(operatingRulesApprovals.operatingRuleId, committeeOperatingRules.id)
      )
      .where(
        and(
          sql`${operatingRulesApprovals.status} = 'pending'`,
          sql`${operatingRulesApprovals.deadline} IS NOT NULL`
        )
      );

    if (pendingApprovals.length === 0) {
      console.log("[Deadline Alerts Job] No pending approvals with deadlines found");
      return { checked: 0, alertsSent: 0, errors: [] };
    }

    console.log(`[Deadline Alerts Job] Found ${pendingApprovals.length} pending approvals with deadlines`);

    const alerts: DeadlineAlert[] = [];
    const errors: string[] = [];

    // Clasificar aprobaciones por urgencia
    for (const approval of pendingApprovals) {
      if (!approval.deadline) continue;

      const deadlineDate = new Date(approval.deadline);
      const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let urgency: "critical" | "high" | "overdue" | null = null;

      if (daysLeft < 0) {
        urgency = "overdue"; // Vencido
      } else if (daysLeft <= 1) {
        urgency = "critical"; // 1 día o menos
      } else if (daysLeft <= 3) {
        urgency = "high"; // 3 días o menos
      }

      // Solo enviar alertas para urgencias críticas, altas o vencidas
      if (urgency) {
        alerts.push({
          approvalId: approval.id,
          operatingRuleId: approval.operatingRuleId,
          ruleVersion: approval.ruleVersion || "Sin versión",
          approverName: approval.approverName || "Usuario desconocido",
          approverEmail: approval.approverEmail || "",
          approverRole: approval.approverRole,
          deadline: deadlineDate,
          daysLeft,
          urgency,
        });
      }
    }

    console.log(`[Deadline Alerts Job] Found ${alerts.length} alerts to send`);

    // Enviar alertas por email
    let alertsSent = 0;
    for (const alert of alerts) {
      if (!alert.approverEmail) {
        errors.push(`No email found for approver ${alert.approverName}`);
        continue;
      }

      try {
        const subject = alert.urgency === "overdue"
          ? `⚠️ Aprobación VENCIDA - ${alert.ruleVersion}`
          : alert.urgency === "critical"
          ? `🔴 Aprobación URGENTE - ${alert.ruleVersion}`
          : `⏰ Recordatorio de Aprobación - ${alert.ruleVersion}`;

        const urgencyText = alert.urgency === "overdue"
          ? `<strong style="color: #dc2626;">VENCIDA hace ${Math.abs(alert.daysLeft)} día(s)</strong>`
          : alert.urgency === "critical"
          ? `<strong style="color: #dc2626;">Vence HOY o mañana</strong>`
          : `<strong style="color: #f59e0b;">Vence en ${alert.daysLeft} día(s)</strong>`;

        const roleLabel = {
          president: "Presidente",
          secretary: "Secretario",
          vocal: "Vocal",
          other: "Otro",
        }[alert.approverRole] || alert.approverRole;

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .alert-box { background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; border-radius: 4px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Alerta de Aprobación</h1>
              </div>
              <div class="content">
                <p>Estimado/a <strong>${alert.approverName}</strong>,</p>
                
                <div class="alert-box">
                  <h2 style="margin-top: 0; color: #dc2626;">Aprobación Pendiente</h2>
                  <p><strong>Documento:</strong> ${alert.ruleVersion}</p>
                  <p><strong>Su rol:</strong> ${roleLabel}</p>
                  <p><strong>Fecha límite:</strong> ${alert.deadline.toLocaleDateString("es-ES", { 
                    day: "numeric", 
                    month: "long", 
                    year: "numeric" 
                  })}</p>
                  <p><strong>Estado:</strong> ${urgencyText}</p>
                </div>

                <p>
                  ${alert.urgency === "overdue" 
                    ? "La fecha límite para aprobar este documento ha vencido. Por favor, complete la aprobación lo antes posible." 
                    : "La fecha límite para aprobar este documento se acerca. Por favor, revise y complete la aprobación a la brevedad."}
                </p>

                <p>
                  <a href="${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/committee-operating-rules?id=${alert.operatingRuleId}" class="button">
                    Ver Documento y Firmar
                  </a>
                </p>

                <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                  Este es un recordatorio automático del sistema de gestión NOM-035.
                </p>
              </div>
              <div class="footer">
                <p>Sistema de Gestión NOM-035 STPS 2018</p>
                <p>Este correo fue generado automáticamente, por favor no responder.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: alert.approverEmail,
          subject,
          html,
        });

        alertsSent++;
        console.log(`[Deadline Alerts Job] Alert sent to ${alert.approverEmail} for approval ${alert.approvalId}`);
      } catch (error) {
        const errorMsg = `Failed to send alert to ${alert.approverEmail}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[Deadline Alerts Job] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[Deadline Alerts Job] Completed: ${alertsSent} alerts sent, ${errors.length} errors`);

    return {
      checked: pendingApprovals.length,
      alertsSent,
      errors,
    };
  } catch (error) {
    console.error("[Deadline Alerts Job] Fatal error:", error);
    throw error;
  }
}

/**
 * Iniciar el job programado
 */
export function startDeadlineAlertsJob() {
  // Ejecutar diariamente a las 09:00 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("[Deadline Alerts Job] Running scheduled deadline alerts check...");
    try {
      await sendDeadlineAlerts();
    } catch (error) {
      console.error("[Deadline Alerts Job] Scheduled job failed:", error);
    }
  });

  console.log("[Deadline Alerts Job] Scheduled to run daily at 09:00 AM");
}
