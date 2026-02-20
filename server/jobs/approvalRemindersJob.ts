import cron from "node-cron";
import { getDb } from "../db";
import { operatingRulesApprovals, committeeOperatingRules, users } from "../../drizzle/schema";
import { eq, and, sql, lt } from "drizzle-orm";
import { sendEmail } from "../_core/email";

/**
 * Job para enviar recordatorios automáticos de firmas pendientes
 * Se ejecuta diariamente a las 09:00 AM
 * Envía recordatorios a aprobadores con firmas pendientes > 48 horas
 */

interface PendingApproval {
  approvalId: number;
  approverId: number;
  approverName: string | null;
  approverEmail: string | null;
  approverRole: string;
  approverRoleDescription: string | null;
  operatingRuleId: number;
  operatingRuleVersion: string;
  createdAt: Date;
  hoursPending: number;
}

async function sendApprovalReminders() {
  const db = await getDb();
  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  try {
    console.log("[Approval Reminders Job] Checking pending approvals...");

    // Obtener aprobaciones pendientes creadas hace más de 48 horas
    const pendingApprovals = await db
      .select({
        approvalId: operatingRulesApprovals.id,
        approverId: operatingRulesApprovals.approverId,
        approverName: users.name,
        approverEmail: users.email,
        approverRole: operatingRulesApprovals.approverRole,
        approverRoleDescription: operatingRulesApprovals.approverRoleDescription,
        operatingRuleId: committeeOperatingRules.id,
        operatingRuleVersion: committeeOperatingRules.version,
        createdAt: operatingRulesApprovals.createdAt,
      })
      .from(operatingRulesApprovals)
      .leftJoin(users, eq(operatingRulesApprovals.approverId, users.id))
      .leftJoin(committeeOperatingRules, eq(operatingRulesApprovals.operatingRuleId, committeeOperatingRules.id))
      .where(
        and(
          eq(operatingRulesApprovals.status, "pending"),
          lt(operatingRulesApprovals.createdAt, fortyEightHoursAgo)
        )
      );

    if (pendingApprovals.length === 0) {
      console.log("[Approval Reminders Job] No pending approvals found");
      return { success: true, remindersSent: 0 };
    }

    console.log(`[Approval Reminders Job] Found ${pendingApprovals.length} pending approvals`);

    let remindersSent = 0;
    const errors: string[] = [];

    for (const approval of pendingApprovals) {
      if (!approval.approverEmail) {
        console.log(`[Approval Reminders Job] Skipping approval ${approval.approvalId}: no email for approver`);
        continue;
      }

      try {
        const hoursPending = Math.floor((now.getTime() - new Date(approval.createdAt).getTime()) / (1000 * 60 * 60));
        const documentUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || "https://app.manus.space"}/committee-operating-rules`;

        const roleLabels: Record<string, string> = {
          president: "Presidente",
          secretary: "Secretario",
          vocal: "Vocal",
          other: "Otro",
        };

        const roleLabel = roleLabels[approval.approverRole] || approval.approverRole;

        await sendEmail({
          to: approval.approverEmail,
          subject: "Recordatorio: Firma Pendiente - Base de Funcionamiento del Comité",
          html: `
            <h2>Recordatorio de Firma Pendiente</h2>
            <p>Estimado/a ${approval.approverName},</p>
            <p>Le recordamos que tiene una firma pendiente para aprobar la base de funcionamiento del comité:</p>
            <ul>
              <li><strong>Versión:</strong> ${approval.operatingRuleVersion}</li>
              <li><strong>Su rol:</strong> ${roleLabel}${approval.approverRoleDescription ? ` - ${approval.approverRoleDescription}` : ""}</li>
              <li><strong>Tiempo pendiente:</strong> ${hoursPending} horas (${Math.floor(hoursPending / 24)} días)</li>
              <li><strong>Fecha de solicitud:</strong> ${new Date(approval.createdAt).toLocaleDateString("es-MX", { 
                year: "numeric", 
                month: "long", 
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}</li>
            </ul>
            <p>Por favor, revise y firme el documento a la brevedad posible.</p>
            <p><a href="${documentUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Ir a Firmar Documento</a></p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Este es un recordatorio automático. Recibirá este correo cada 48 horas mientras la firma permanezca pendiente.
            </p>
          `,
        });

        remindersSent++;
        console.log(`[Approval Reminders Job] Reminder sent to ${approval.approverEmail}`);
      } catch (error) {
        const errorMessage = `Error sending reminder to ${approval.approverEmail}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`[Approval Reminders Job] ${errorMessage}`);
        errors.push(errorMessage);
      }
    }

    console.log(`[Approval Reminders Job] Completed: ${remindersSent} reminders sent, ${errors.length} errors`);

    return {
      success: true,
      remindersSent,
      errors,
    };
  } catch (error) {
    console.error("[Approval Reminders Job] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Programar job para ejecutarse diariamente a las 09:00 AM
export function startApprovalRemindersJob() {
  // Ejecutar diariamente a las 09:00 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("[Approval Reminders Job] Starting scheduled job...");
    await sendApprovalReminders();
  });

  console.log("[Approval Reminders Job] Scheduled to run daily at 09:00 AM");
}

// Exportar función para ejecutar manualmente (testing)
export { sendApprovalReminders };
