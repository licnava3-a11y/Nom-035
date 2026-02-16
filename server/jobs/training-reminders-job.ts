import { getDb, createNotification } from "../db";
import { trainingAssignments, trainingCertificates, committeeTrainings, users } from "../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

/**
 * Job automático para enviar recordatorios de capacitaciones pendientes
 * y alertas de certificados próximos a vencer
 * 
 * Ejecuta diariamente a las 8:00 AM
 */
export async function runTrainingRemindersJob() {
  console.log("[Training Reminders Job] Iniciando verificación de recordatorios...");

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Training Reminders Job] Database not available");
      return;
    }

    let pendingReminders = 0;
    let expiringCertificates = 0;
    let errors: string[] = [];

    // 1. Detectar capacitaciones pendientes (>7 días sin iniciar)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const pendingAssignments = await db
        .select({
          assignment: trainingAssignments,
          training: committeeTrainings,
          member: users,
        })
        .from(trainingAssignments)
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
        .where(
          and(
            eq(trainingAssignments.status, "pending"),
            sql`${trainingAssignments.assignedDate} <= ${sevenDaysAgo.toISOString()}`
          )
        );

      for (const item of pendingAssignments) {
        if (!item.member || !item.training) continue;

        await createNotification({
          userId: item.member.id,
          type: "system",
          title: "Recordatorio: Capacitación Pendiente",
          message: `Tienes pendiente iniciar la capacitación: ${item.training.title}. Fue asignada hace más de 7 días.`,
        });

        pendingReminders++;
      }

      console.log(`[Training Reminders Job] Recordatorios de pendientes enviados: ${pendingReminders}`);
    } catch (error) {
      const errorMsg = `Error al procesar capacitaciones pendientes: ${error}`;
      console.error(`[Training Reminders Job] ${errorMsg}`);
      errors.push(errorMsg);
    }

    // 2. Detectar certificados próximos a vencer (30 días)
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringCerts = await db
        .select({
          certificate: trainingCertificates,
          assignment: trainingAssignments,
          training: committeeTrainings,
          member: users,
        })
        .from(trainingCertificates)
        .leftJoin(trainingAssignments, eq(trainingCertificates.assignmentId, trainingAssignments.id))
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
        .where(
          and(
            sql`${trainingCertificates.expiryDate} IS NOT NULL`,
            sql`${trainingCertificates.expiryDate} <= ${thirtyDaysFromNow.toISOString().split("T")[0]}`,
            sql`${trainingCertificates.expiryDate} >= NOW()`
          )
        );

      for (const item of expiringCerts) {
        if (!item.member || !item.training || !item.certificate.expiryDate) continue;

        const daysUntilExpiry = Math.ceil(
          (new Date(item.certificate.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        await createNotification({
          userId: item.member.id,
          type: "system",
          title: "Certificado Próximo a Vencer",
          message: `Tu certificado de ${item.training.title} vence en ${daysUntilExpiry} días. Considera renovar tu capacitación.`,
        });

        expiringCertificates++;
      }

      console.log(`[Training Reminders Job] Alertas de certificados enviadas: ${expiringCertificates}`);
    } catch (error) {
      const errorMsg = `Error al procesar certificados próximos a vencer: ${error}`;
      console.error(`[Training Reminders Job] ${errorMsg}`);
      errors.push(errorMsg);
    }

    // 3. Enviar resumen semanal a administradores (solo lunes)
    try {
      const today = new Date().getDay(); // 0 = domingo, 1 = lunes, ...
      
      if (today === 1) { // Solo lunes
        // Obtener estadísticas generales
        const [stats] = await db
          .select({
            totalPending: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'pending' THEN 1 ELSE 0 END)`,
            totalInProgress: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'in_progress' THEN 1 ELSE 0 END)`,
            totalCompleted: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'completed' THEN 1 ELSE 0 END)`,
            totalExpired: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'expired' THEN 1 ELSE 0 END)`,
          })
          .from(trainingAssignments);

        // Obtener administradores y coordinadores
        const admins = await db
          .select()
          .from(users)
          .where(inArray(users.role, ["admin", "committee_coordinator"]));

        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "system",
            title: "Resumen Semanal - Capacitaciones del Comité",
            message: `Resumen de capacitaciones: ${stats.totalPending || 0} pendientes, ${stats.totalInProgress || 0} en progreso, ${stats.totalCompleted || 0} completadas, ${stats.totalExpired || 0} vencidas.`,
          });
        }

        console.log(`[Training Reminders Job] Resumen semanal enviado a ${admins.length} administradores`);
      }
    } catch (error) {
      const errorMsg = `Error al enviar resumen semanal: ${error}`;
      console.error(`[Training Reminders Job] ${errorMsg}`);
      errors.push(errorMsg);
    }

    // 4. Marcar asignaciones vencidas
    try {
      const expiredCount = await db
        .update(trainingAssignments)
        .set({ status: "expired" })
        .where(
          and(
            inArray(trainingAssignments.status, ["pending", "in_progress"]),
            sql`EXISTS (
              SELECT 1 FROM ${trainingCertificates} tc
              WHERE tc.assignment_id = ${trainingAssignments.id}
              AND tc.expiry_date < NOW()
            )`
          )
        );

      console.log(`[Training Reminders Job] Asignaciones marcadas como vencidas: ${expiredCount}`);
    } catch (error) {
      const errorMsg = `Error al marcar asignaciones vencidas: ${error}`;
      console.error(`[Training Reminders Job] ${errorMsg}`);
      errors.push(errorMsg);
    }

    console.log("[Training Reminders Job] Verificación completada exitosamente", {
      pendingReminders,
      expiringCertificates,
      errors: errors.length,
    });

    return {
      success: true,
      pendingReminders,
      expiringCertificates,
      errors,
    };
  } catch (error) {
    console.error("[Training Reminders Job] Error crítico:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}

// Configurar ejecución diaria a las 8:00 AM
export function startTrainingRemindersJob() {
  console.log("[Training Reminders Job] Job programado para ejecutar diariamente a las 8:00 AM");

  // Calcular tiempo hasta las 8:00 AM del siguiente día
  const now = new Date();
  const next8AM = new Date();
  next8AM.setHours(8, 0, 0, 0);

  if (next8AM <= now) {
    next8AM.setDate(next8AM.getDate() + 1);
  }

  const timeUntilNext = next8AM.getTime() - now.getTime();

  // Ejecutar primera vez a las 8:00 AM
  setTimeout(() => {
    runTrainingRemindersJob();

    // Luego ejecutar cada 24 horas
    setInterval(() => {
      runTrainingRemindersJob();
    }, 24 * 60 * 60 * 1000); // 24 horas
  }, timeUntilNext);

  console.log(`[Training Reminders Job] Primera ejecución programada en ${Math.round(timeUntilNext / 1000 / 60)} minutos`);
}
