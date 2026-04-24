/**
 * Job: Notificación al responsable del PAC — cursos estancados
 *
 * Lógica:
 *  - Se ejecuta diariamente a las 09:00 AM.
 *  - Busca items del PAC con status "pendiente" o "en_proceso" cuyo campo `updatedAt`
 *    lleva más de 30 días sin modificarse.
 *  - Para cada plan afectado, obtiene el correo del responsable (employees.workEmail o personalEmail).
 *  - Envía un correo al responsable con el listado de cursos estancados.
 *  - Envía una notificación interna al owner del sistema.
 *  - Evita enviar la misma alerta dos veces en el mismo día (deduplicación por notificación interna).
 */
import { getDb } from "../db";
import {
  annualTrainingPlans,
  annualTrainingPlanItems,
  employees,
  notifications,
} from "../../drizzle/schema";
import { eq, and, lte, inArray, sql, ne } from "drizzle-orm";
import { sendEmail } from "../_core/email";
import { notifyOwner } from "../_core/notification";

const JOB_TAG = "[PAC Stale Items Job]";
const STALE_DAYS = 30;

export async function runPacStaleItemsJob(): Promise<{
  success: boolean;
  checked: number;
  alertsSent: number;
  errors: string[];
}> {
  console.log(`${JOB_TAG} Iniciando verificación de cursos PAC sin actualizar...`);
  const result = { success: false, checked: 0, alertsSent: 0, errors: [] as string[] };

  try {
    const db = await getDb();
    if (!db) {
      result.errors.push("Base de datos no disponible");
      return result;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_DAYS);
    cutoff.setHours(23, 59, 59, 999);

    // Buscar items activos (pendiente / en_proceso) que no se han actualizado en 30+ días
    const staleItems = await db
      .select({
        itemId: annualTrainingPlanItems.id,
        courseName: annualTrainingPlanItems.courseName,
        status: annualTrainingPlanItems.status,
        updatedAt: annualTrainingPlanItems.updatedAt,
        planId: annualTrainingPlans.id,
        planTitle: annualTrainingPlans.title,
        planYear: annualTrainingPlans.year,
        responsibleId: annualTrainingPlans.responsibleId,
        responsibleFirstName: employees.firstName,
        responsibleLastName: employees.lastName,
        responsibleWorkEmail: employees.workEmail,
        responsiblePersonalEmail: employees.personalEmail,
      })
      .from(annualTrainingPlanItems)
      .innerJoin(annualTrainingPlans, eq(annualTrainingPlanItems.planId, annualTrainingPlans.id))
      .leftJoin(employees, eq(annualTrainingPlans.responsibleId, employees.id))
      .where(
        and(
          inArray(annualTrainingPlanItems.status, ["pendiente", "en_proceso"]),
          lte(annualTrainingPlanItems.updatedAt, cutoff),
          // Solo planes activos (no cerrados)
          ne(annualTrainingPlans.status, "cerrado"),
        )
      );

    result.checked = staleItems.length;
    console.log(`${JOB_TAG} Cursos estancados encontrados: ${staleItems.length}`);

    if (staleItems.length === 0) {
      result.success = true;
      return result;
    }

    // Agrupar por plan para enviar un solo correo por responsable
    const byPlan = new Map<number, typeof staleItems>();
    for (const item of staleItems) {
      const list = byPlan.get(item.planId) ?? [];
      list.push(item);
      byPlan.set(item.planId, list);
    }

    const today = new Date().toISOString().slice(0, 10);

    for (const [planId, items] of byPlan) {
      const first = items[0];
      const responsibleEmail = first.responsibleWorkEmail ?? first.responsiblePersonalEmail;
      const responsibleName = first.responsibleFirstName
        ? `${first.responsibleFirstName} ${first.responsibleLastName ?? ""}`.trim()
        : "Responsable del PAC";

      // Deduplicación: verificar si ya se envió notificación hoy para este plan
      const dedupKey = `pac_stale_${planId}_${today}`;
      const existing = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.type, "pac_stale_alert"),
            sql`DATE(${notifications.createdAt}) = ${today}`,
            sql`JSON_EXTRACT(${notifications.metadata}, '$.planId') = ${planId}`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`${JOB_TAG} Alerta ya enviada hoy para plan ${planId}, omitiendo.`);
        continue;
      }

      // Construir lista de cursos para el correo
      const courseList = items
        .map((i) => {
          const diasSinActualizar = Math.floor(
            (Date.now() - new Date(i.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          return `• ${i.courseName} (${i.status === "pendiente" ? "Pendiente" : "En Proceso"}) — ${diasSinActualizar} días sin actualizar`;
        })
        .join("\n");

      // Registrar notificación interna
      await db.insert(notifications).values({
        type: "pac_stale_alert",
        title: `PAC ${first.planYear}: ${items.length} curso(s) sin actualizar (>${STALE_DAYS} días)`,
        message: `El plan "${first.planTitle}" tiene ${items.length} curso(s) que llevan más de ${STALE_DAYS} días sin actualizar su avance.`,
        isRead: false,
        metadata: JSON.stringify({ planId, planTitle: first.planTitle, planYear: first.planYear, staleCount: items.length }),
      } as any);

      // Enviar correo al responsable (si tiene email)
      if (responsibleEmail) {
        try {
          await sendEmail({
            to: responsibleEmail,
            subject: `[NOM-035] Alerta PAC ${first.planYear}: Cursos sin actualizar — ${first.planTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0f172a; color: #fff; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                  <h2 style="margin: 0; font-size: 18px;">⚠️ Alerta PAC — Cursos sin actualizar</h2>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">NOM-035 STPS 2018 — Sistema de Gestión de Cumplimiento</p>
                </div>
                <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                  <p style="color: #334155; margin: 0 0 16px;">Estimado/a <strong>${responsibleName}</strong>,</p>
                  <p style="color: #334155; margin: 0 0 16px;">
                    El siguiente <strong>Programa Anual de Capacitación (PAC)</strong> tiene cursos que llevan
                    más de <strong>${STALE_DAYS} días</strong> sin actualizar su avance:
                  </p>
                  <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                    <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">${first.planTitle} (${first.planYear})</p>
                    <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">Cursos estancados: ${items.length}</p>
                    <pre style="font-size: 13px; color: #475569; background: #f1f5f9; padding: 12px; border-radius: 4px; white-space: pre-wrap;">${courseList}</pre>
                  </div>
                  <p style="color: #334155; margin: 0 0 8px;">
                    Por favor, actualice el avance de estos cursos en el sistema para mantener el seguimiento
                    del PAC conforme a los requisitos de la NOM-035 STPS 2018.
                  </p>
                  <p style="color: #64748b; font-size: 12px; margin: 16px 0 0; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                    Este mensaje fue generado automáticamente por el Sistema de Gestión NOM-035 STPS 2018.
                    Fecha de generación: ${new Date().toLocaleDateString("es-MX")}.
                  </p>
                </div>
              </div>
            `,
          });
          console.log(`${JOB_TAG} Correo enviado a ${responsibleEmail} para plan ${planId}`);
          result.alertsSent++;
        } catch (emailErr) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
          console.error(`${JOB_TAG} Error enviando correo para plan ${planId}: ${msg}`);
          result.errors.push(`Plan ${planId}: ${msg}`);
        }
      } else {
        console.log(`${JOB_TAG} Plan ${planId} sin email de responsable, solo notificación interna.`);
        result.alertsSent++;
      }
    }

    // Notificación al owner con resumen
    const totalPlans = byPlan.size;
    if (totalPlans > 0) {
      await notifyOwner({
        title: `PAC: ${result.checked} curso(s) sin actualizar en ${totalPlans} plan(es)`,
        content: `Se detectaron ${result.checked} cursos del PAC que llevan más de ${STALE_DAYS} días sin actualizar su avance. Se enviaron ${result.alertsSent} alertas a los responsables.`,
      });
    }

    result.success = true;
    console.log(`${JOB_TAG} Completado. Alertas enviadas: ${result.alertsSent}, errores: ${result.errors.length}`);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${JOB_TAG} Error fatal: ${msg}`);
    result.errors.push(msg);
    return result;
  }
}
