/**
 * Sprint 4 Tests:
 * 1. exportRiskComparisonToExcel — función de exportación existe en ExecutiveReport.tsx
 * 2. notifyEmployee — acepta customMessage opcional (source check en internalMailbox.ts)
 * 3. getNotificationHistory — procedure definido en internalMailbox.ts
 * 4. Modal de notificación — estados showNotifyModal y notifyCustomMsg existen en InternalMailbox.tsx
 * 5. Historial de notificaciones — showNotifHistory y renderizado existen en InternalMailbox.tsx
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const EXEC_REPORT = readFileSync(resolve(__dirname, "../client/src/pages/ExecutiveReport.tsx"), "utf8");
const MAILBOX_ROUTER = readFileSync(resolve(__dirname, "routers/internalMailbox.ts"), "utf8");
const MAILBOX_UI = readFileSync(resolve(__dirname, "../client/src/pages/InternalMailbox.tsx"), "utf8");

// ── 1. Exportación Excel comparativa psicométrica ────────────────────────────
describe("ExecutiveReport — exportRiskComparisonToExcel", () => {
  it("define la función exportRiskComparisonToExcel", () => {
    expect(EXEC_REPORT).toContain("exportRiskComparisonToExcel");
  });

  it("usa el cargador dinámico compartido de xlsx", () => {
    expect(EXEC_REPORT).toContain("loadXlsx");
    expect(EXEC_REPORT).toContain("await loadXlsx()");
  });

  it("genera hoja 'Comparativa Psicométrica'", () => {
    expect(EXEC_REPORT).toContain("Comparativa Psicométrica");
  });

  it("genera hoja de referencia NOM-035", () => {
    expect(EXEC_REPORT).toContain("Referencia NOM-035");
  });

  it("botón Excel STPS visible en la Card comparativa", () => {
    expect(EXEC_REPORT).toContain("Excel STPS");
    expect(EXEC_REPORT).toContain("FileSpreadsheet");
  });

  it("usa toast para confirmar exportación", () => {
    expect(EXEC_REPORT).toContain("toast.success");
    expect(EXEC_REPORT).toContain("departamentos exportados a Excel");
  });
});

// ── 2. notifyEmployee acepta customMessage opcional ──────────────────────────
describe("internalMailbox router — notifyEmployee customMessage", () => {
  it("acepta customMessage opcional en el input", () => {
    expect(MAILBOX_ROUTER).toContain("customMessage: z.string().max(300).optional()");
  });
});

// ── 3. getNotificationHistory procedure ─────────────────────────────────────
describe("internalMailbox router — getNotificationHistory", () => {
  it("define el procedure getNotificationHistory", () => {
    expect(MAILBOX_ROUTER).toContain("getNotificationHistory:");
  });

  it("filtra por messageId y type mailbox_status_change", () => {
    expect(MAILBOX_ROUTER).toContain("mailbox_status_change");
    expect(MAILBOX_ROUTER).toContain("relatedEntityId");
  });

  it("retorna history y total", () => {
    expect(MAILBOX_ROUTER).toContain("{ history, total: history.length }");
  });
});

// ── 4. Modal de notificación personalizada en UI ─────────────────────────────
describe("InternalMailbox UI — modal de notificación personalizada", () => {
  it("tiene estado showNotifyModal", () => {
    expect(MAILBOX_UI).toContain("showNotifyModal");
  });

  it("tiene estado notifyCustomMsg con contador de caracteres", () => {
    expect(MAILBOX_UI).toContain("notifyCustomMsg");
    expect(MAILBOX_UI).toContain("/300");
  });

  it("pasa customMessage al mutate de notifyEmployee", () => {
    expect(MAILBOX_UI).toContain("customMessage: notifyCustomMsg.trim() || undefined");
  });

  it("el modal muestra el asunto del mensaje seleccionado", () => {
    expect(MAILBOX_UI).toContain("selectedMsg.subject");
    expect(MAILBOX_UI).toContain("Notificar al Empleado");
  });
});

// ── 5. Historial de notificaciones en panel de detalle ───────────────────────
describe("InternalMailbox UI — historial de notificaciones", () => {
  it("tiene estado showNotifHistory", () => {
    expect(MAILBOX_UI).toContain("showNotifHistory");
  });

  it("usa el query getNotificationHistory", () => {
    expect(MAILBOX_UI).toContain("getNotificationHistory");
  });

  it("muestra badge con total de notificaciones enviadas", () => {
    expect(MAILBOX_UI).toContain("notifHistory.total > 0");
  });

  it("muestra estado leída/no leída de cada notificación", () => {
    expect(MAILBOX_UI).toContain("Leída");
    expect(MAILBOX_UI).toContain("No leída");
  });

  it("muestra mensaje cuando no hay historial", () => {
    expect(MAILBOX_UI).toContain("No se han enviado notificaciones aún");
  });
});
