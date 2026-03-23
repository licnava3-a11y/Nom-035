import { getDb } from "../db";
import { correctiveActionPlans, notifications, users } from "../../drizzle/schema";
// import { notifications } from "../../drizzle/schema"; // removed duplicate
import { eq, and, lt, gte, sql } from "drizzle-orm";

/**
 * Job automático de recordatorios de planes de acción correctiva
 * Ejecuta diariamente a las 9:00 AM
 * 
 * Funcionalidades:
 * 1. Detectar planes vencidos y enviar alertas
 * 2. Detectar planes próximos a vencer (3 días) y enviar recordatorios
 * 3. Detectar planes en progreso sin actividad (7 días) y enviar recordatorios
 * 4. Enviar resumen semanal a administradores (solo lunes)
 */

export async function runCorrectiveActionPlansRemindersJob() {
  console.log("[Corrective Action Plans Reminders Job] Starting...");

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Corrective Action Plans Reminders Job] Database connection failed");
      return;
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Detectar planes vencidos
    const overduePlans = await db
      .select()
      .from(correctiveActionPlans)
      .where(
        and(
          lt(correctiveActionPlans.dueDate, now),
          sql`${correctiveActionPlans.status} NOT IN ('completed', 'verified', 'closed')`
        )
      );

    console.log(`[Corrective Action Plans Reminders Job] Found ${overduePlans.length} overdue plans`);

    for (const plan of overduePlans) {
      if (plan.assignedTo) {
        await (db.insert(notifications) as any).values({
          userId: plan.assignedTo,
          type: "system",
          title: "Plan de Acción Vencido",
          message: `El plan "${plan.title}" está vencido. Fecha límite: ${plan.dueDate?.toLocaleDateString()}`,
          createdAt: now,
        });
      }
    }

    // 2. Detectar planes próximos a vencer (3 días)
    const expiringSoonPlans = await db
      .select()
      .from(correctiveActionPlans)
      .where(
        and(
          gte(correctiveActionPlans.dueDate, now),
          lt(correctiveActionPlans.dueDate, threeDaysFromNow),
          sql`${correctiveActionPlans.status} NOT IN ('completed', 'verified', 'closed')`
        )
      );

    console.log(`[Corrective Action Plans Reminders Job] Found ${expiringSoonPlans.length} plans expiring soon`);

    for (const plan of expiringSoonPlans) {
      if (plan.assignedTo) {
        await (db.insert(notifications) as any).values({
          userId: plan.assignedTo,
          type: "system",
          title: "Plan de Acción Próximo a Vencer",
          message: `El plan "${plan.title}" vence en ${Math.ceil((plan.dueDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))} días`,
          createdAt: now,
        });
      }
    }

    // 3. Detectar planes en progreso sin actividad (7 días)
    const stalePlans = await db
      .select()
      .from(correctiveActionPlans)
      .where(
        and(
          eq(correctiveActionPlans.status, "in_progress"),
          lt(correctiveActionPlans.updatedAt, sevenDaysAgo)
        )
      );

    console.log(`[Corrective Action Plans Reminders Job] Found ${stalePlans.length} stale plans`);

    for (const plan of stalePlans) {
      if (plan.assignedTo) {
        await (db.insert(notifications) as any).values({
          userId: plan.assignedTo,
          type: "system",
          title: "Plan de Acción Sin Actividad",
          message: `El plan "${plan.title}" no ha tenido actividad en 7 días. Por favor actualiza el estado o sube evidencias.`,
          createdAt: now,
        });
      }
    }

    // 4. Enviar resumen semanal a administradores (solo lunes)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 1) {
      // Lunes
      const totalPlans = await db
        .select({ count: sql<number>`count(*)` })
        .from(correctiveActionPlans);

      const completedPlans = await db
        .select({ count: sql<number>`count(*)` })
        .from(correctiveActionPlans)
        .where(eq(correctiveActionPlans.status, "completed"));

      const overduePlansCount = overduePlans.length;

      // Obtener administradores (role = 'admin')
      const { users } = await import("../../drizzle/schema");
      const adminUsers = await db.select().from(users).where(eq(users.role, "admin"));

      for (const admin of adminUsers) {
        await (db.insert(notifications) as any).values({
          userId: admin.id,
          type: "system",
          title: "Resumen Semanal de Planes de Acción Correctiva",
          message: `Total: ${totalPlans[0]?.count || 0} | Completados: ${completedPlans[0]?.count || 0} | Vencidos: ${overduePlansCount}`,
          createdAt: now,
        });
      }

      console.log(`[Corrective Action Plans Reminders Job] Weekly summary sent to ${adminUsers.length} admins`);
    }

    console.log("[Corrective Action Plans Reminders Job] Completed successfully");
  } catch (error) {
    console.error("[Corrective Action Plans Reminders Job] Error:", error);
  }
}

// Ejecutar cada día a las 9:00 AM
export const correctiveActionPlansRemindersJobSchedule = "0 0 9 * * *";
