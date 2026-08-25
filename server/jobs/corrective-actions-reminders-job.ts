import { getDb } from "../db";
import { correctiveActions, users, systemSettings } from "../../drizzle/schema";
import { and, eq, gte, lte, isNull } from "drizzle-orm";
import { sendEmail } from "../lib/email-sender";

/**
 * Job para enviar recordatorios automáticos de acciones correctivas próximas a vencer
 * Se ejecuta diariamente a las 8:00 AM
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface ReminderResult {
  success: boolean;
  remindersSent: number;
  dueTodaySent: number;
  errors: string[];
}

/**
 * Obtener acciones próximas a vencer (7 días)
 */
async function getUpcomingActions() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + SEVEN_DAYS_MS);

  return await db
    .select()
    .from(correctiveActions)
    .where(
      and(
        gte(correctiveActions.dueDate, now),
        lte(correctiveActions.dueDate, sevenDaysFromNow),
        eq(correctiveActions.status, "pendiente")
        // Solo enviar recordatorios de acciones pendientes
      )
    );
}

/**
 * Obtener acciones que vencen hoy
 */
async function getActionsDueToday() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + ONE_DAY_MS);

  return await db
    .select()
    .from(correctiveActions)
    .where(
      and(
        gte(correctiveActions.dueDate, startOfDay),
        lte(correctiveActions.dueDate, endOfDay),
        eq(correctiveActions.status, "pendiente")
      )
    );
}

/**
 * Enviar recordatorio a responsable
 */
async function sendReminderEmail(
  action: any,
  responsible: any,
  daysUntilDue: number
) {
  const subject =
    daysUntilDue === 0
      ? `⚠️ Acción Correctiva Vence HOY - ${action.description.substring(0, 50)}`
      : `🔔 Recordatorio: Acción Correctiva Vence en ${daysUntilDue} días`;

  const riskLevelLabels: Record<string, string> = {
    nulo: "Nulo",
    bajo: "Bajo",
    medio: "Medio",
    alto: "Alto",
    muy_alto: "Muy Alto",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${daysUntilDue === 0 ? "#dc2626" : "#f59e0b"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #3b82f6; }
        .label { font-weight: bold; color: #1f2937; }
        .value { color: #4b5563; }
        .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .risk-alto, .risk-muy_alto { background: #fee2e2; color: #991b1b; }
        .risk-medio { background: #fef3c7; color: #92400e; }
        .risk-bajo { background: #dbeafe; color: #1e40af; }
        .footer { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">${daysUntilDue === 0 ? "⚠️ Acción Vence HOY" : "🔔 Recordatorio de Acción Correctiva"}</h2>
        </div>
        <div class="content">
          <p>Hola <strong>${responsible.name}</strong>,</p>
          <p>${
            daysUntilDue === 0
              ? "Te recordamos que la siguiente acción correctiva <strong>vence hoy</strong>:"
              : `Te recordamos que la siguiente acción correctiva vence en <strong>${daysUntilDue} días</strong>:`
          }</p>

          <div class="info-row">
            <div class="label">Descripción:</div>
            <div class="value">${action.description}</div>
          </div>

          <div class="info-row">
            <div class="label">Nivel de Riesgo:</div>
            <div class="value">
              <span class="risk-badge risk-${action.riskLevel}">
                ${riskLevelLabels[action.riskLevel] || action.riskLevel}
              </span>
            </div>
          </div>

          <div class="info-row">
            <div class="label">Departamento:</div>
            <div class="value">${action.departamento}</div>
          </div>

          <div class="info-row">
            <div class="label">Fecha Límite:</div>
            <div class="value" style="color: ${daysUntilDue === 0 ? "#dc2626" : "#f59e0b"}; font-weight: bold;">
              ${new Date(action.dueDate).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>

          ${
            daysUntilDue === 0
              ? '<p style="color: #dc2626; font-weight: bold; margin-top: 20px;">⚠️ Por favor, actualiza el estado de esta acción lo antes posible.</p>'
              : '<p style="margin-top: 20px;">Por favor, asegúrate de completar esta acción antes de la fecha límite.</p>'
          }
        </div>
        <div class="footer">
          <p><strong>Sistema de Gestión NOM-035 STPS</strong></p>
          <p>Este es un mensaje automático. Por favor, no respondas a este correo.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: responsible.email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error(
      `[Corrective Actions Reminders] Error sending email to ${responsible.email}:`,
      error
    );
    return false;
  }
}

/**
 * Marcar acción como recordatorio enviado
 */
/**
 * Obtener acciones vencidas
 */
async function getOverdueActions() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();

  return await db
    .select()
    .from(correctiveActions)
    .where(
      and(
        lte(correctiveActions.dueDate, now),
        eq(correctiveActions.status, "pendiente")
      )
    );
}

/**
 * Enviar resumen semanal al coordinador
 */
async function sendCoordinatorWeeklySummary() {
  const db = await getDb();
  if (!db) return false;

  try {
    // Obtener acciones vencidas
    const overdueActions = await getOverdueActions();

    if (overdueActions.length === 0) {
      console.log(
        "[Corrective Actions Reminders] No overdue actions, skipping coordinator summary"
      );
      return true;
    }

    // Obtener email del coordinador/RH desde systemSettings
    const [settings] = await db.select().from(systemSettings).limit(1);
    const coordinatorEmail = (settings as any)?.hrEmail as string | undefined;
    if (!coordinatorEmail) {
      console.warn(
        "[Corrective Actions Reminders] No hay email de coordinador/RH configurado en systemSettings (campo hrEmail). Saltando resumen semanal."
      );
      return true;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .summary-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .action-item { background: white; padding: 12px; margin: 10px 0; border: 1px solid #e5e7eb; border-radius: 4px; }
          .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .risk-alto, .risk-muy_alto { background: #fee2e2; color: #991b1b; }
          .risk-medio { background: #fef3c7; color: #92400e; }
          .risk-bajo { background: #dbeafe; color: #1e40af; }
          .footer { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">📊 Resumen Semanal: Acciones Correctivas Vencidas</h2>
          </div>
          <div class="content">
            <div class="summary-box">
              <h3 style="margin-top: 0; color: #dc2626;">⚠️ Total de Acciones Vencidas: ${overdueActions.length}</h3>
              <p>A continuación se presenta el detalle de las acciones correctivas que han superado su fecha límite:</p>
            </div>

            ${overdueActions
              .map((action: any) => {
                const riskLevelLabels: Record<string, string> = {
                  nulo: "Nulo",
                  bajo: "Bajo",
                  medio: "Medio",
                  alto: "Alto",
                  muy_alto: "Muy Alto",
                };

                const daysOverdue = Math.ceil(
                  (Date.now() -
                    new Date(action.dueDate || Date.now()).getTime()) /
                    ONE_DAY_MS
                );

                return `
                <div class="action-item">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div style="flex: 1;">
                      <strong style="color: #1f2937;">${action.description}</strong>
                    </div>
                    <span class="risk-badge risk-${action.riskLevel}">
                      ${riskLevelLabels[action.riskLevel] || action.riskLevel}
                    </span>
                  </div>
                  <div style="font-size: 14px; color: #6b7280;">
                    <div><strong>Departamento:</strong> ${action.departamento || "No especificado"}</div>
                    <div><strong>Fecha límite:</strong> ${new Date(action.dueDate || Date.now()).toLocaleDateString("es-MX")}</div>
                    <div style="color: #dc2626; font-weight: bold;"><strong>Vencida hace:</strong> ${daysOverdue} día${daysOverdue !== 1 ? "s" : ""}</div>
                  </div>
                </div>
              `;
              })
              .join("")}

            <div class="summary-box" style="margin-top: 20px; border-left-color: #f59e0b;">
              <p><strong>Recomendación:</strong> Por favor, revisa el estado de estas acciones y coordina con los responsables para su pronta resolución.</p>
            </div>
          </div>
          <div class="footer">
            <p><strong>Sistema de Gestión NOM-035 STPS</strong></p>
            <p>Este es un resumen automático generado semanalmente. Por favor, no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: coordinatorEmail,
      subject: `📊 Resumen Semanal: ${overdueActions.length} ${overdueActions.length === 1 ? "Acción Vencida" : "Acciones Vencidas"}`,
      html,
    });

    console.log(
      `[Corrective Actions Reminders] Weekly summary sent to coordinator: ${overdueActions.length} overdue actions`
    );
    return true;
  } catch (error) {
    console.error(
      "[Corrective Actions Reminders] Error sending coordinator summary:",
      error
    );
    return false;
  }
}

/**
 * Ejecutar job de recordatorios
 */
export async function runCorrectiveActionsRemindersCheck(): Promise<ReminderResult> {
  console.log(
    "[Corrective Actions Reminders] Starting automated reminders check..."
  );

  const result: ReminderResult = {
    success: true,
    remindersSent: 0,
    dueTodaySent: 0,
    errors: [],
  };

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Corrective Actions Reminders] Database not available");
      result.success = false;
      result.errors.push("Database not available");
      return result;
    }

    // 1. Obtener acciones próximas a vencer (7 días)
    const upcomingActions = await getUpcomingActions();
    console.log(
      `[Corrective Actions Reminders] Found ${upcomingActions.length} actions due in 7 days`
    );

    for (const action of upcomingActions) {
      if (!action.responsibleUserId) {
        console.warn(
          `[Corrective Actions Reminders] No responsible user assigned for action ${action.id}`
        );
        result.errors.push(
          `No responsible user assigned for action ${action.id}`
        );
        continue;
      }

      const [responsible] = await db
        .select()
        .from(users)
        .where(eq(users.id, action.responsibleUserId))
        .limit(1);

      if (!responsible || !responsible.email) {
        console.warn(
          `[Corrective Actions Reminders] No responsible user found for action ${action.id}`
        );
        result.errors.push(`No responsible user found for action ${action.id}`);
        continue;
      }

      if (!action.dueDate) {
        console.warn(
          `[Corrective Actions Reminders] No due date for action ${action.id}`
        );
        result.errors.push(`No due date for action ${action.id}`);
        continue;
      }

      const daysUntilDue = Math.ceil(
        (new Date(action.dueDate).getTime() - Date.now()) / ONE_DAY_MS
      );

      const sent = await sendReminderEmail(action, responsible, daysUntilDue);
      if (sent) {
        result.remindersSent++;
        console.log(
          `[Corrective Actions Reminders] Reminder sent for action ${action.id} to ${responsible.email}`
        );
      } else {
        result.errors.push(`Failed to send reminder for action ${action.id}`);
      }
    }

    // 2. Obtener acciones que vencen hoy
    const actionsDueToday = await getActionsDueToday();
    console.log(
      `[Corrective Actions Reminders] Found ${actionsDueToday.length} actions due today`
    );

    for (const action of actionsDueToday) {
      if (!action.responsibleUserId) {
        console.warn(
          `[Corrective Actions Reminders] No responsible user assigned for action ${action.id}`
        );
        result.errors.push(
          `No responsible user assigned for action ${action.id}`
        );
        continue;
      }

      const [responsible] = await db
        .select()
        .from(users)
        .where(eq(users.id, action.responsibleUserId))
        .limit(1);

      if (!responsible || !responsible.email) {
        console.warn(
          `[Corrective Actions Reminders] No responsible user found for action ${action.id}`
        );
        result.errors.push(`No responsible user found for action ${action.id}`);
        continue;
      }

      const sent = await sendReminderEmail(action, responsible, 0);
      if (sent) {
        result.dueTodaySent++;
        console.log(
          `[Corrective Actions Reminders] Due today alert sent for action ${action.id} to ${responsible.email}`
        );
      } else {
        result.errors.push(
          `Failed to send due today alert for action ${action.id}`
        );
      }
    }

    console.log(
      `[Corrective Actions Reminders] Check completed: ${result.remindersSent} reminders sent, ${result.dueTodaySent} due today alerts sent`
    );
    return result;
  } catch (error) {
    console.error(
      "[Corrective Actions Reminders] Error running automated reminders check:",
      error
    );
    result.success = false;
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
    return result;
  }
}

/**
 * Iniciar job programado
 * Se ejecuta diariamente a las 8:00 AM
 */
export function startCorrectiveActionsRemindersJob() {
  console.log(
    "[Corrective Actions Reminders] Initializing automated reminders job (daily at 8:00 AM)..."
  );

  // Calcular tiempo hasta las 8:00 AM del próximo día
  const now = new Date();
  const next8AM = new Date();
  next8AM.setHours(8, 0, 0, 0);

  // Si ya pasaron las 8:00 AM hoy, programar para mañana
  if (now.getHours() >= 8) {
    next8AM.setDate(next8AM.getDate() + 1);
  }

  const timeUntilNext8AM = next8AM.getTime() - now.getTime();

  // Programar primera ejecución
  setTimeout(() => {
    runCorrectiveActionsRemindersCheck();

    // Programar ejecuciones diarias (cada 24 horas)
    setInterval(
      () => {
        runCorrectiveActionsRemindersCheck();
      },
      24 * 60 * 60 * 1000
    );
  }, timeUntilNext8AM);

  console.log(
    `[Corrective Actions Reminders] First execution scheduled for ${next8AM.toLocaleString("es-MX")}`
  );
  console.log(
    "[Corrective Actions Reminders] Automated reminders job started successfully"
  );

  // Programar resumen semanal al coordinador (cada lunes a las 9:00 AM)
  const nextMonday = new Date();
  nextMonday.setDate(
    nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7)
  );
  nextMonday.setHours(9, 0, 0, 0);

  const timeUntilNextMonday = nextMonday.getTime() - now.getTime();

  setTimeout(() => {
    sendCoordinatorWeeklySummary();

    // Programar ejecuciones semanales (cada 7 días)
    setInterval(
      () => {
        sendCoordinatorWeeklySummary();
      },
      7 * 24 * 60 * 60 * 1000
    );
  }, timeUntilNextMonday);

  console.log(
    `[Corrective Actions Reminders] Weekly coordinator summary scheduled for ${nextMonday.toLocaleString("es-MX")}`
  );
}
