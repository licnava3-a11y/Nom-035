/**
 * Job de Recordatorios de Cumplimiento NOM-035
 * Verifica vencimientos de items del checklist y envía notificaciones
 * Ejecuta diariamente a las 08:00
 */

import cron from "node-cron";
import { getDb } from "../db";
import { complianceChecks, complianceChecklist, notifications, users } from "../../drizzle/schema";
import { and, lte, gte, eq, isNull, sql } from "drizzle-orm";
import { emitNotificationToUser } from "../_core/websocket";
import { notifyOwner } from "../_core/notification";

/**
 * Verificar vencimientos y enviar recordatorios
 * Notifica 21 días antes del vencimiento
 */
async function checkDueDatesAndNotify() {
  console.log("[Compliance Reminders Job] Checking due dates for compliance items...");
  
  const db = await getDb();
  if (!db) {
    console.error("[Compliance Reminders Job] Database not available");
    return;
  }

  try {
    // Fecha actual
    const today = new Date();
    
    // Fecha límite: 21 días a partir de hoy
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 21);

    // Obtener items con vencimiento próximo (entre hoy y 21 días)
    const upcomingDueDates = await db
      .select({
        checkId: complianceChecks.id,
        checklistItemId: complianceChecks.checklistItemId,
        dueDate: complianceChecks.dueDate,
        isCompliant: complianceChecks.isCompliant,
        itemCode: complianceChecklist.itemCode,
        section: complianceChecklist.section,
        sectionName: complianceChecklist.sectionName,
        requirement: complianceChecklist.requirement,
      })
      .from(complianceChecks)
      .innerJoin(complianceChecklist, eq(complianceChecks.checklistItemId, complianceChecklist.id))
      .where(
        and(
          sql`${complianceChecks.dueDate} IS NOT NULL`,
          gte(complianceChecks.dueDate, today),
          lte(complianceChecks.dueDate, reminderDate),
          eq(complianceChecks.isCompliant, false) // Solo items no completados
        )
      );

    console.log(`[Compliance Reminders Job] Found ${upcomingDueDates.length} items with upcoming due dates`);

    let notificationsSent = 0;

    // Obtener administradores para notificar
    const admins = await db
      .select({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "admin"));

    // Enviar notificaciones a cada administrador
    for (const item of upcomingDueDates) {
      const daysUntilDue = Math.ceil((new Date(item.dueDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const message = `El requisito "${item.itemCode} - ${item.requirement}" vence en ${daysUntilDue} días (${new Date(item.dueDate!).toLocaleDateString()}). Sección: ${item.section} - ${item.sectionName}`;

      for (const admin of admins) {
        try {
          // Crear notificación en base de datos
          await (db.insert(notifications) as any).values({
            userId: admin.id,
            type: "compliance_reminder" as any,
            title: "⏰ Recordatorio de Cumplimiento NOM-035",
            message,
            relatedEntityType: "compliance_check",
            relatedEntityId: item.checkId,
            isRead: false,
          } as any);

          // Emitir notificación vía WebSocket
          emitNotificationToUser(admin.id, {
            id: item.checkId,
            title: "Recordatorio de Cumplimiento NOM-035",
            message,
          });

          // Enviar notificación por email usando notifyOwner
          try {
            const emailSent = await notifyOwner({
              title: `⏰ Recordatorio de Cumplimiento NOM-035 - ${item.itemCode}`,
              content: `Hola ${admin.nombre},\n\n${message}\n\nPrioridad: ${daysUntilDue <= 7 ? "ALTA" : "Media"}\n\nPor favor, revisa el dashboard de cumplimiento para más detalles.\n\nSaludos,\nPlataforma NOM-035`,
            });
            
            if (emailSent) {
              console.log(`[Compliance Reminders Job] Email sent to ${admin.email}`);
            } else {
              console.warn(`[Compliance Reminders Job] Failed to send email to ${admin.email}`);
            }
          } catch (emailError) {
            console.error(`[Compliance Reminders Job] Error sending email to ${admin.email}:`, emailError);
          }

          notificationsSent++;
        } catch (error) {
          console.error(`[Compliance Reminders Job] Error sending notification to admin ${admin.id}:`, error);
        }
      }
    }

    console.log(`[Compliance Reminders Job] Completed: ${notificationsSent} notifications sent to ${admins.length} admins`);
  } catch (error) {
    console.error("[Compliance Reminders Job] Error in compliance reminders job:", error);
  }
}

/**
 * Inicializar job de recordatorios de cumplimiento
 * Ejecuta diariamente a las 08:00
 */
export function initializeComplianceRemindersJob() {
  // Ejecutar diariamente a las 08:00
  cron.schedule("0 8 * * *", async () => {
    await checkDueDatesAndNotify();
  });

  console.log("[Compliance Reminders Job] Scheduled to run daily at 08:00");
}
