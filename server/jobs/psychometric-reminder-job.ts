import { getDb, createNotification } from "../db";
import {
  psychometricAssessments,
  employees,
  users,
} from "../../drizzle/schema";
import { eq, sql, and, isNull, or } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Job automático de recordatorio anual de evaluación psicométrica NOM-035
 * Detecta empleados sin evaluación en los últimos 12 meses y notifica al administrador de RH.
 * Ejecuta mensualmente el día 1 a las 9:00 AM.
 */
export async function runPsychometricReminderJob(): Promise<void> {
  console.log(
    "[Psychometric Reminder Job] Iniciando verificación de evaluaciones pendientes..."
  );
  try {
    const db = await getDb();
    if (!db) {
      console.error("[Psychometric Reminder Job] Database not available");
      return;
    }

    // Obtener todos los empleados activos
    const activeEmployees = await db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentId: employees.departmentId,
      })
      .from(employees)
      .where(eq(employees.isActive, true));

    if (activeEmployees.length === 0) {
      console.log("[Psychometric Reminder Job] No active employees found");
      return;
    }

    // Fecha límite: 12 meses atrás
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    // Obtener evaluaciones recientes (últimos 12 meses) por empleado
    const recentAssessments = await db
      .select({ employeeId: psychometricAssessments.employeeId })
      .from(psychometricAssessments)
      .where(
        sql`${psychometricAssessments.createdAt} >= ${twelveMonthsAgo.toISOString()}`
      );

    const evaluatedIds = new Set(recentAssessments.map(a => a.employeeId));

    // Filtrar empleados sin evaluación en los últimos 12 meses
    const pendingEmployees = activeEmployees.filter(
      e => !evaluatedIds.has(e.id)
    );

    if (pendingEmployees.length === 0) {
      console.log(
        "[Psychometric Reminder Job] All active employees have recent psychometric evaluations"
      );
      return;
    }

    console.log(
      `[Psychometric Reminder Job] Found ${pendingEmployees.length} employees without recent psychometric evaluation`
    );

    // Agrupar por departamento para el reporte
    const byDept: Record<string, string[]> = {};
    for (const emp of pendingEmployees) {
      const dept = emp.departmentId
        ? `Depto. ${emp.departmentId}`
        : "Sin departamento";
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(`${emp.firstName} ${emp.lastName}`);
    }

    const deptSummary = Object.entries(byDept)
      .map(
        ([dept, names]) =>
          `• ${dept}: ${names.length} empleado(s) — ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` y ${names.length - 3} más` : ""}`
      )
      .join("\n");

    // Notificar al propietario (administrador de RH)
    const notifyResult = await notifyOwner({
      title: `⚠️ NOM-035: ${pendingEmployees.length} empleados sin evaluación psicométrica anual`,
      content: `Se detectaron ${pendingEmployees.length} empleados activos sin evaluación psicométrica en los últimos 12 meses.\n\nResumen por departamento:\n${deptSummary}\n\nAcción requerida: Programar las evaluaciones pendientes para cumplir con el ciclo anual obligatorio de la NOM-035 STPS 2018.`,
    });

    if (notifyResult) {
      console.log(
        `[Psychometric Reminder Job] Owner notification sent for ${pendingEmployees.length} pending employees`
      );
    }

    // Crear notificación interna para administradores
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));

    for (const admin of adminUsers) {
      await createNotification({
        userId: admin.id,
        type: "system",
        title: `NOM-035: ${pendingEmployees.length} evaluaciones psicométricas pendientes`,
        message: `Hay ${pendingEmployees.length} empleados activos sin evaluación psicométrica en los últimos 12 meses. Revisa el Reporte Ejecutivo para ver el detalle por departamento.`,
      });
    }

    console.log(
      `[Psychometric Reminder Job] Completed. Pending: ${pendingEmployees.length}, Admins notified: ${adminUsers.length}`
    );
  } catch (error) {
    console.error("[Psychometric Reminder Job] Error:", error);
  }
}

/**
 * Inicializa el job mensual de recordatorio psicométrico
 * Ejecuta el día 1 de cada mes a las 9:00 AM
 */
export function startPsychometricReminderJob(): void {
  setInterval(() => {
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 9 && now.getMinutes() === 0) {
      console.log(
        "[Psychometric Reminder Job] Triggering monthly psychometric reminder check"
      );
      runPsychometricReminderJob().catch(console.error);
    }
  }, 60000); // Check every minute
  console.log(
    "[Psychometric Reminder Job] Scheduled to run on the 1st of each month at 09:00"
  );
}
