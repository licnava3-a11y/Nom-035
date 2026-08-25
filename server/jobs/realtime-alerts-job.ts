/**
 * Job: Notificaciones en Tiempo Real vía WebSocket
 * Detecta tareas vencidas (operatingRulesApprovals) y contratos próximos a vencer,
 * persiste cada alerta en alertHistory (deduplicada por día) y emite eventos
 * instantáneos a los usuarios conectados vía Socket.IO.
 * Se ejecuta cada 15 minutos.
 */
import { getDb } from "../db";
import {
  alertHistory,
  employees,
  operatingRulesApprovals,
  committeeOperatingRules,
  users,
} from "../../drizzle/schema";
import { eq, and, sql, lte, gte } from "drizzle-orm";
import {
  emitNotificationToUser,
  emitCriticalAlertToAdmins,
  getWebSocketServer,
} from "../_core/websocket";

// ── Helper: persistir alerta con deduplicación por día ───────────────────────
async function persistRealtimeAlert(
  db: any,
  description: string,
  priority: "info" | "warning" | "critical",
  currentValue: number
): Promise<number | null> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await db
      .select({ id: alertHistory.id })
      .from(alertHistory)
      .where(
        and(
          sql`${alertHistory.alertType} = 'critical_cases'`,
          sql`${alertHistory.description} = ${description}`,
          gte(alertHistory.triggeredAt, today)
        )
      )
      .limit(1);
    if (existing.length > 0) return existing[0].id as number;
    const result = await (db.insert(alertHistory) as any).values({
      alertType: "critical_cases",
      priority,
      threshold: 1,
      currentValue,
      description,
      status: "active",
    });
    return (result[0]?.insertId as number) ?? null;
  } catch {
    return null;
  }
}

export async function runRealtimeAlertsJob() {
  const io = getWebSocketServer();
  if (!io) {
    console.warn("[Realtime Alerts Job] WebSocket no inicializado, saltando.");
    return { success: false, reason: "websocket_not_ready" };
  }

  const db = await getDb();
  if (!db) {
    console.error("[Realtime Alerts Job] Base de datos no disponible.");
    return { success: false, reason: "db_unavailable" };
  }

  const now = new Date();
  const results = {
    overdueApprovals: 0,
    expiringContracts: 0,
    persisted: 0,
    errors: 0,
  };

  // ─── 1. Tareas vencidas: aprobaciones de reglamentos con deadline pasado ───
  try {
    const overdueApprovals = await db
      .select({
        id: operatingRulesApprovals.id,
        approverId: operatingRulesApprovals.approverId,
        approverName: users.name,
        deadline: operatingRulesApprovals.deadline,
        ruleVersion: committeeOperatingRules.version,
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
          sql`${operatingRulesApprovals.deadline} IS NOT NULL`,
          lte(operatingRulesApprovals.deadline, now)
        )
      )
      .limit(50);

    for (const approval of overdueApprovals) {
      if (!approval.approverId) continue;
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(approval.deadline!).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const desc = `Aprobación vencida: Reglamento v${approval.ruleVersion ?? "N/A"} — ${approval.approverName ?? "Usuario"} (${daysOverdue}d vencida)`;
      const priority =
        daysOverdue >= 7 ? "critical" : daysOverdue >= 3 ? "warning" : "info";

      // Persistir en BD (deduplicada por día)
      const alertId = await persistRealtimeAlert(
        db,
        desc,
        priority,
        daysOverdue
      );
      if (alertId) results.persisted++;

      // Notificación al usuario responsable
      emitNotificationToUser(approval.approverId, {
        id: alertId ?? approval.id,
        type: "overdue_approval",
        title: "⚠ Aprobación vencida",
        message: `Tienes una aprobación del reglamento v${approval.ruleVersion ?? "N/A"} vencida hace ${daysOverdue} día${daysOverdue !== 1 ? "s" : ""}.`,
        read: false,
        createdAt: now,
      });

      // Alerta crítica a admins si lleva más de 3 días vencida
      if (daysOverdue >= 3) {
        emitCriticalAlertToAdmins({
          id: alertId ?? approval.id,
          category: "deadline",
          priority: daysOverdue >= 7 ? "critical" : "high",
          title: "Aprobación crítica vencida",
          message: `${approval.approverName ?? "Usuario"} tiene una aprobación vencida hace ${daysOverdue} días (Reglamento v${approval.ruleVersion ?? "N/A"}).`,
        });
      }
      results.overdueApprovals++;
    }
  } catch (err) {
    console.error("[Realtime Alerts Job] Error en tareas vencidas:", err);
    results.errors++;
  }

  // ─── 2. Contratos próximos a vencer (≤7 días) ───
  try {
    const activeEmployees = await db.select().from(employees).limit(500);

    const expiringList: Array<{
      name: string;
      contractType: string;
      daysRemaining: number;
    }> = [];

    for (const emp of activeEmployees) {
      const contractFields = [
        { field: (emp as any).contract1ExpirationDate, type: "Contrato 1" },
        { field: (emp as any).contract2ExpirationDate, type: "Contrato 2" },
        { field: (emp as any).contract3ExpirationDate, type: "Contrato 3" },
      ];
      for (const c of contractFields) {
        if (!c.field) continue;
        const expDate = new Date(c.field);
        const daysRemaining = Math.ceil(
          (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysRemaining >= 0 && daysRemaining <= 7) {
          expiringList.push({
            name:
              `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() ||
              "Sin nombre",
            contractType: c.type,
            daysRemaining,
          });
          results.expiringContracts++;
        }
      }
    }

    // Persistir y emitir alerta consolidada si hay contratos próximos a vencer
    if (expiringList.length > 0) {
      const urgentCount = expiringList.filter(e => e.daysRemaining <= 2).length;
      const consolidatedDesc = `Contratos próximos a vencer: ${expiringList
        .slice(0, 5)
        .map(e => `${e.name} — ${e.contractType} (${e.daysRemaining}d)`)
        .join(
          "; "
        )}${expiringList.length > 5 ? ` y ${expiringList.length - 5} más` : ""}`;
      const priority = urgentCount > 0 ? "critical" : "warning";

      const alertId = await persistRealtimeAlert(
        db,
        consolidatedDesc,
        priority,
        expiringList.length
      );
      if (alertId) results.persisted++;

      emitCriticalAlertToAdmins({
        id: alertId ?? Date.now(),
        category: "contract_expiry",
        priority: urgentCount > 0 ? "critical" : "high",
        title: `${expiringList.length} contrato${expiringList.length !== 1 ? "s" : ""} próximo${expiringList.length !== 1 ? "s" : ""} a vencer`,
        message:
          expiringList
            .slice(0, 5)
            .map(e => `${e.name} — ${e.contractType} (${e.daysRemaining}d)`)
            .join(", ") +
          (expiringList.length > 5
            ? ` y ${expiringList.length - 5} más...`
            : ""),
      });
    }
  } catch (err) {
    console.error("[Realtime Alerts Job] Error en contratos:", err);
    results.errors++;
  }

  console.log(
    `[Realtime Alerts Job] Completado: ${results.overdueApprovals} aprobaciones vencidas, ${results.expiringContracts} contratos próximos, ${results.persisted} persistidas, ${results.errors} errores`
  );
  return { success: true, ...results };
}
