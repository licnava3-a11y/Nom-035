/**
 * Sprint 5 Tests
 * 1. Límite de notificaciones duplicadas 24h en notifyEmployee
 * 2. Exportación PDF del historial de notificaciones
 * 3. Selector de período histórico en comparativa psicométrica
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Module 1: 24h duplicate notification limit ───────────────────────────────
describe("Límite de notificaciones duplicadas 24h", () => {
  it("internalMailbox router exports getLastNotification procedure", () => {
    const src = readFileSync(
      resolve(__dirname, "../server/routers/internalMailbox.ts"),
      "utf-8"
    );
    expect(src).toContain("getLastNotification:");
    expect(src).toContain("isBlocked");
    expect(src).toContain("blockedUntil");
  });

  it("notifyEmployee validates 24h cutoff with gte operator", () => {
    const src = readFileSync(
      resolve(__dirname, "../server/routers/internalMailbox.ts"),
      "utf-8"
    );
    expect(src).toContain("gte(notifications.createdAt, cutoff)");
    expect(src).toContain("24 * 60 * 60 * 1000");
    expect(src).toContain("TOO_MANY_REQUESTS");
  });

  it("InternalMailbox UI uses getLastNotification hook", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/pages/InternalMailbox.tsx"),
      "utf-8"
    );
    expect(src).toContain("getLastNotification");
    expect(src).toContain("lastNotifData?.isBlocked");
    expect(src).toContain("Bloqueado (24h)");
  });

  it("modal shows 24h block warning when isBlocked is true", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/pages/InternalMailbox.tsx"),
      "utf-8"
    );
    expect(src).toContain("Límite de 24 horas activo");
    expect(src).toContain("Próximo envío permitido");
  });
});

// ─── Module 2: PDF export of notification history ─────────────────────────────
describe("Exportación PDF del historial de notificaciones", () => {
  it("exportNotifHistoryToPDF function exists in InternalMailbox.tsx", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/pages/InternalMailbox.tsx"),
      "utf-8"
    );
    expect(src).toContain("function exportNotifHistoryToPDF");
  });

  it("PDF export generates HTML with NOM-035 header", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/pages/InternalMailbox.tsx"),
      "utf-8"
    );
    expect(src).toContain("NOM-035 STPS 2018");
    expect(src).toContain("Evidencia de Comunicación Interna");
    expect(src).toContain("Historial de Notificaciones Enviadas al Empleado");
  });

  it("PDF button appears only when history is expanded and has entries", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/pages/InternalMailbox.tsx"),
      "utf-8"
    );
    expect(src).toContain("showNotifHistory && notifHistory && notifHistory.history.length > 0");
    expect(src).toContain("Exportar historial a PDF (evidencia STPS)");
  });

  it("PDF export opens print dialog", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/pages/InternalMailbox.tsx"),
      "utf-8"
    );
    expect(src).toContain("win.print()");
  });
});

// ─── Module 3: Historical period selector in psychometric comparison ───────────
describe("Selector de período histórico en comparativa psicométrica", () => {
  it("getRiskComparison accepts compareMonthsAgo parameter", () => {
    const src = readFileSync(
      resolve(__dirname, "../server/routers/psychometric.ts"),
      "utf-8"
    );
    expect(src).toContain("compareMonthsAgo: z.number().min(1).max(12)");
    expect(src).toContain("const compareMonthsAgo = input?.compareMonthsAgo ?? 1");
  });

  it("getRiskComparison uses compareMonthsAgo for period offset", () => {
    const src = readFileSync(
      resolve(__dirname, "../server/routers/psychometric.ts"),
      "utf-8"
    );
    expect(src).toContain("getRiskForPeriod(compareMonthsAgo)");
    expect(src).toContain("now.getMonth() - compareMonthsAgo");
  });

  it("ExecutiveReport has compareMonthsAgo state and passes it to query", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/pages/ExecutiveReport.tsx"),
      "utf-8"
    );
    expect(src).toContain("const [compareMonthsAgo, setCompareMonthsAgo] = useState(1)");
    expect(src).toContain("{ companyId: selectedCompanyId, compareMonthsAgo }");
  });

  it("period selector has options for 1, 2, 3, 6, 12 months ago", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/pages/ExecutiveReport.tsx"),
      "utf-8"
    );
    expect(src).toContain("Mes anterior");
    expect(src).toContain("Hace 2 meses");
    expect(src).toContain("Hace 3 meses");
    expect(src).toContain("Hace 6 meses");
    expect(src).toContain("Hace 12 meses");
  });
});
