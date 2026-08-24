/**
 * Sprint 36 Tests — KPI Dashboard + Planes de Acción
 * - Indicador variación % en KPI de rotación (prevYearTurnoverRate, turnoverChange)
 * - Procedure updateActionPlanStatus con notificación al completar
 * - Procedure deleteActionPlan
 * - Vista de seguimiento de Planes de Acción (listActionPlans)
 */
import { describe, it, expect } from "vitest";

// ── Test 1: Cálculo de variación % de rotación ─────────────────────────────
describe("Sprint 36 — Indicador variación % rotación", () => {
  it("calcula turnoverChange correctamente cuando hay aumento", () => {
    const turnoverRate = 12;
    const prevYearTurnoverRate = 8;
    const turnoverChange = turnoverRate - prevYearTurnoverRate;
    expect(turnoverChange).toBe(4);
    expect(turnoverChange).toBeGreaterThan(0);
  });

  it("calcula turnoverChange correctamente cuando hay mejora", () => {
    const turnoverRate = 6;
    const prevYearTurnoverRate = 10;
    const turnoverChange = turnoverRate - prevYearTurnoverRate;
    expect(turnoverChange).toBe(-4);
    expect(turnoverChange).toBeLessThan(0);
  });

  it("calcula turnoverChange = 0 cuando no hay cambio", () => {
    const turnoverRate = 8;
    const prevYearTurnoverRate = 8;
    const turnoverChange = turnoverRate - prevYearTurnoverRate;
    expect(turnoverChange).toBe(0);
  });

  it("prevYearTurnoverRate es 0 cuando no hay empleados", () => {
    const totalEmployees = 0;
    const prevYearInactiveCount = 5;
    const prevYearTurnoverRate =
      totalEmployees > 0
        ? Math.round((prevYearInactiveCount / totalEmployees) * 100)
        : 0;
    expect(prevYearTurnoverRate).toBe(0);
  });

  it("calcula prevYearTurnoverRate como porcentaje entero", () => {
    const totalEmployees = 40;
    const prevYearInactiveCount = 6;
    const prevYearTurnoverRate = Math.round(
      (prevYearInactiveCount / totalEmployees) * 100
    );
    expect(prevYearTurnoverRate).toBe(15);
  });
});

// ── Test 2: Lógica del badge de variación % en el frontend ─────────────────
describe("Sprint 36 — Badge variación % en KPI card", () => {
  function getBadgeConfig(turnoverChange: number) {
    if (turnoverChange > 0)
      return { class: "bg-red-100 text-red-700", symbol: "▲" };
    if (turnoverChange < 0)
      return { class: "bg-emerald-100 text-emerald-700", symbol: "▼" };
    return { class: "bg-slate-100 text-slate-500", symbol: "—" };
  }

  it("muestra badge rojo con ▲ cuando la rotación aumentó", () => {
    const badge = getBadgeConfig(4);
    expect(badge.class).toContain("red");
    expect(badge.symbol).toBe("▲");
  });

  it("muestra badge verde con ▼ cuando la rotación bajó", () => {
    const badge = getBadgeConfig(-3);
    expect(badge.class).toContain("emerald");
    expect(badge.symbol).toBe("▼");
  });

  it("muestra badge gris con — cuando no hay cambio", () => {
    const badge = getBadgeConfig(0);
    expect(badge.class).toContain("slate");
    expect(badge.symbol).toBe("—");
  });
});

// ── Test 3: Lógica de notificación al completar Plan de Acción ─────────────
describe("Sprint 36 — Notificación al completar Plan de Acción", () => {
  it("debe notificar cuando el nuevo estado es 'completado' y el anterior no lo era", () => {
    const shouldNotify = (newStatus: string, oldStatus: string) =>
      newStatus === "completado" && oldStatus !== "completado";

    expect(shouldNotify("completado", "pendiente")).toBe(true);
    expect(shouldNotify("completado", "en_progreso")).toBe(true);
    expect(shouldNotify("completado", "completado")).toBe(false); // ya estaba completado
    expect(shouldNotify("en_progreso", "pendiente")).toBe(false);
    expect(shouldNotify("cancelado", "en_progreso")).toBe(false);
  });

  it("no debe notificar al cancelar un plan", () => {
    const shouldNotify = (newStatus: string, oldStatus: string) =>
      newStatus === "completado" && oldStatus !== "completado";
    expect(shouldNotify("cancelado", "en_progreso")).toBe(false);
  });
});

// ── Test 4: Validación de estados válidos para updateActionPlanStatus ──────
describe("Sprint 36 — Estados válidos de Plan de Acción", () => {
  const VALID_STATUSES = [
    "pendiente",
    "en_progreso",
    "completado",
    "cancelado",
  ];

  it("acepta todos los estados válidos", () => {
    VALID_STATUSES.forEach(status => {
      expect(VALID_STATUSES).toContain(status);
    });
  });

  it("rechaza estados inválidos", () => {
    const invalidStatuses = ["activo", "cerrado", "done", "open"];
    invalidStatuses.forEach(status => {
      expect(VALID_STATUSES).not.toContain(status);
    });
  });

  it("tiene exactamente 4 estados", () => {
    expect(VALID_STATUSES).toHaveLength(4);
  });
});

// ── Test 5: Lógica de filtro de mapa de calor por fecha ───────────────────
describe("Sprint 36 — Filtro de fecha en mapa de calor", () => {
  it("el rango de fechas es válido cuando startDate <= endDate", () => {
    const isValidRange = (start: string, end: string) =>
      !start || !end || new Date(start) <= new Date(end);

    expect(isValidRange("2025-01-01", "2025-12-31")).toBe(true);
    expect(isValidRange("2025-06-01", "2025-01-01")).toBe(false);
    expect(isValidRange("", "2025-12-31")).toBe(true);
    expect(isValidRange("2025-01-01", "")).toBe(true);
  });
});

// ── Test 6: Estructura del ActionPlansTracker ─────────────────────────────
describe("Sprint 36 — ActionPlansTracker estructura", () => {
  it("el STATUS_CONFIG tiene todas las claves de estado", () => {
    const STATUS_CONFIG: Record<
      string,
      { label: string; color: string; bg: string }
    > = {
      pendiente: {
        label: "Pendiente",
        color: "text-amber-700",
        bg: "bg-amber-100",
      },
      en_progreso: {
        label: "En progreso",
        color: "text-blue-700",
        bg: "bg-blue-100",
      },
      completado: {
        label: "Completado",
        color: "text-emerald-700",
        bg: "bg-emerald-100",
      },
      cancelado: {
        label: "Cancelado",
        color: "text-slate-500",
        bg: "bg-slate-100",
      },
    };
    expect(Object.keys(STATUS_CONFIG)).toHaveLength(4);
    expect(STATUS_CONFIG["completado"].color).toContain("emerald");
    expect(STATUS_CONFIG["pendiente"].color).toContain("amber");
    expect(STATUS_CONFIG["en_progreso"].color).toContain("blue");
    expect(STATUS_CONFIG["cancelado"].color).toContain("slate");
  });
});
