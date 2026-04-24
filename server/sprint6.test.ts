/**
 * Sprint 6 Tests
 * 1. Contador 24h en modal de notificación (InternalMailbox)
 * 2. Campo de motivo en updateStatus (internalMailbox router)
 * 3. Gráfica de barras agrupadas Chart.js (ExecutiveReport)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

// ─── Módulo 1: Contador 24h ───────────────────────────────────────────────────
describe("Sprint 6 – Módulo 1: Contador 24h en modal de notificación", () => {
  const mailboxFile = readFileSync(
    join(ROOT, "client/src/pages/InternalMailbox.tsx"),
    "utf-8"
  );

  it("debe importar useEffect y useRef para el contador", () => {
    expect(mailboxFile).toContain("useEffect");
    expect(mailboxFile).toContain("useRef");
  });

  it("debe declarar el estado blockCountdown", () => {
    expect(mailboxFile).toContain("blockCountdown");
    expect(mailboxFile).toContain("setBlockCountdown");
  });

  it("debe declarar countdownRef con setInterval", () => {
    expect(mailboxFile).toContain("countdownRef");
    expect(mailboxFile).toContain("setInterval");
  });

  it("debe calcular horas, minutos y segundos restantes", () => {
    expect(mailboxFile).toContain("Math.floor(diff / 3600000)");
    expect(mailboxFile).toContain("Math.floor((diff % 3600000) / 60000)");
    expect(mailboxFile).toContain("Math.floor((diff % 60000) / 1000)");
  });

  it("debe mostrar el contador en el aviso de bloqueo del modal", () => {
    expect(mailboxFile).toContain("Disponible en:");
    expect(mailboxFile).toContain("{blockCountdown}");
  });
});

// ─── Módulo 2: Motivo en cambio de estado ────────────────────────────────────
describe("Sprint 6 – Módulo 2: Campo de motivo en updateStatus", () => {
  const routerFile = readFileSync(
    join(ROOT, "server/routers/internalMailbox.ts"),
    "utf-8"
  );
  const mailboxFile = readFileSync(
    join(ROOT, "client/src/pages/InternalMailbox.tsx"),
    "utf-8"
  );

  it("updateStatus debe aceptar el campo reason en el schema zod", () => {
    expect(routerFile).toContain("reason: z.string().max(500).optional()");
  });

  it("updateStatus debe insertar registro de auditoría en notifications", () => {
    expect(routerFile).toContain("db.insert(notifications)");
    expect(routerFile).toContain("type: \"mailbox_status_change\"");
  });

  it("debe registrar el estado anterior y el nuevo", () => {
    expect(routerFile).toContain("prevStatus");
    expect(routerFile).toContain("Cambio de estado:");
  });

  it("debe existir el estado showStatusModal en el componente", () => {
    expect(mailboxFile).toContain("showStatusModal");
    expect(mailboxFile).toContain("setShowStatusModal");
  });

  it("debe existir la función requestStatusChange", () => {
    expect(mailboxFile).toContain("requestStatusChange");
  });

  it("debe existir la función confirmStatusChange", () => {
    expect(mailboxFile).toContain("confirmStatusChange");
  });

  it("debe existir el modal de motivo con campo de texto", () => {
    expect(mailboxFile).toContain("Motivo del cambio");
    expect(mailboxFile).toContain("Confirmar cambio");
  });

  it("los botones de estado deben llamar a requestStatusChange", () => {
    expect(mailboxFile).toContain("requestStatusChange(k)");
  });
});

// ─── Módulo 3: Gráfica de barras agrupadas ────────────────────────────────────
describe("Sprint 6 – Módulo 3: Gráfica de barras agrupadas en ExecutiveReport", () => {
  const reportFile = readFileSync(
    join(ROOT, "client/src/pages/ExecutiveReport.tsx"),
    "utf-8"
  );

  it("debe existir el componente RiskComparisonChart", () => {
    expect(reportFile).toContain("function RiskComparisonChart");
  });

  it("RiskComparisonChart debe usar Chart.js tipo bar", () => {
    expect(reportFile).toContain("type: \"bar\"");
  });

  it("debe tener dos datasets (período anterior y actual)", () => {
    expect(reportFile).toContain("data.previousMonthLabel");
    expect(reportFile).toContain("data.currentMonthLabel");
  });

  it("debe usar canvasRef para el canvas de la gráfica", () => {
    expect(reportFile).toContain("canvasRef");
  });

  it("debe incluir la gráfica en la sección comparativa", () => {
    expect(reportFile).toContain("<RiskComparisonChart data={riskComparison}");
  });

  it("debe configurar el eje Y con max 140 (escala NOM-035)", () => {
    expect(reportFile).toContain("max: 140");
  });

  it("debe tener la leyenda en posición bottom", () => {
    expect(reportFile).toContain("position: \"bottom\"");
  });
});
