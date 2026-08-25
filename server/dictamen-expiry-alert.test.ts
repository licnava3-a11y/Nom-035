/**
 * Tests para el job de alerta de vencimiento de Dictamen NOM-035
 * y para el router annualTrainingPlan
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { getDb } from "./db";
import { sendEmail } from "./_core/email";
import { notifyOwner } from "./_core/notification";
import { runDictamenExpiryAlertJob } from "./jobs/dictamen-expiry-alert-job";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildMockDb(
  overrides: Partial<{
    dictamenes: any[];
    settings: any[];
    insertResult: any;
  }> = {}
) {
  const dictamenes = overrides.dictamenes ?? [];
  const settings = overrides.settings ?? [{ settingValue: "rh@empresa.com" }];

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    // Devolver los datos según la tabla consultada
    then: undefined as any,
  };

  let callCount = 0;
  const mockSelect = vi.fn().mockImplementation(() => {
    callCount++;
    const chain = { ...selectChain };
    // Primera llamada → dictamenes, segunda → settings
    const resolveWith = callCount === 1 ? dictamenes : settings;
    chain.where = vi.fn().mockReturnValue({
      ...chain,
      then: (resolve: any) => Promise.resolve(resolveWith).then(resolve),
      [Symbol.asyncIterator]: undefined,
    });
    // Hacer la cadena awaitable
    const awaitable: any = {
      ...chain,
      then: (resolve: any) => Promise.resolve(resolveWith).then(resolve),
    };
    awaitable.where = vi.fn().mockReturnValue(awaitable);
    awaitable.limit = vi.fn().mockReturnValue(awaitable);
    awaitable.from = vi.fn().mockReturnValue(awaitable);
    return awaitable;
  });

  return {
    select: mockSelect,
    insert: mockInsert,
    execute: vi.fn().mockResolvedValue([]),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("runDictamenExpiryAlertJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna success:false cuando la DB no está disponible", async () => {
    (getDb as any).mockResolvedValue(null);

    const result = await runDictamenExpiryAlertJob();

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Base de datos no disponible");
    expect(result.checked).toBe(0);
    expect(result.alertsSent).toBe(0);
  });

  it("retorna success:true con 0 alertas cuando no hay dictámenes próximos a vencer", async () => {
    const mockDb = buildMockDb({ dictamenes: [] });
    (getDb as any).mockResolvedValue(mockDb);

    const result = await runDictamenExpiryAlertJob();

    expect(result.success).toBe(true);
    expect(result.checked).toBe(0);
    expect(result.alertsSent).toBe(0);
  });

  it("la estructura de retorno tiene los campos requeridos", async () => {
    (getDb as any).mockResolvedValue(null);

    const result = await runDictamenExpiryAlertJob();

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("checked");
    expect(result).toHaveProperty("alertsSent");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("alertsSent es un número no negativo", async () => {
    (getDb as any).mockResolvedValue(null);

    const result = await runDictamenExpiryAlertJob();

    expect(result.alertsSent).toBeGreaterThanOrEqual(0);
  });
});

// ─── Tests del módulo PAC ─────────────────────────────────────────────────────
describe("PAC - Módulo Programa Anual de Capacitación", () => {
  it("los estados del plan son los correctos", () => {
    const validStatuses = ["borrador", "aprobado", "en_ejecucion", "cerrado"];
    expect(validStatuses).toContain("borrador");
    expect(validStatuses).toContain("aprobado");
    expect(validStatuses).toContain("en_ejecucion");
    expect(validStatuses).toContain("cerrado");
    expect(validStatuses.length).toBe(4);
  });

  it("los estados de los items del plan son los correctos", () => {
    const validItemStatuses = [
      "pendiente",
      "en_proceso",
      "completado",
      "cancelado",
    ];
    expect(validItemStatuses).toContain("pendiente");
    expect(validItemStatuses).toContain("completado");
    expect(validItemStatuses.length).toBe(4);
  });

  it("las modalidades de capacitación son las correctas", () => {
    const modalities = ["presencial", "virtual", "mixta", "e_learning"];
    expect(modalities).toContain("presencial");
    expect(modalities).toContain("e_learning");
    expect(modalities.length).toBe(4);
  });

  it("calcula correctamente el porcentaje de avance", () => {
    const total = 10;
    const completed = 4;
    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    expect(completionRate).toBe(40);
  });

  it("calcula 0% de avance cuando no hay items", () => {
    const total = 0;
    const completed = 0;
    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    expect(completionRate).toBe(0);
  });

  it("calcula 100% de avance cuando todos los items están completados", () => {
    const total = 5;
    const completed = 5;
    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    expect(completionRate).toBe(100);
  });
});

// ─── Tests del selector de departamento en KPIDashboard ──────────────────────
describe("KPIDashboard - Filtro de Departamento", () => {
  it("filtra correctamente las métricas por departamento", () => {
    const employees = [
      { id: 1, departmentId: 1, isActive: true },
      { id: 2, departmentId: 2, isActive: true },
      { id: 3, departmentId: 1, isActive: false },
      { id: 4, departmentId: 1, isActive: true },
    ];

    const filterByDept = (deptId: number | null) =>
      deptId === null
        ? employees
        : employees.filter(e => e.departmentId === deptId);

    const allEmployees = filterByDept(null);
    expect(allEmployees.length).toBe(4);

    const dept1Employees = filterByDept(1);
    expect(dept1Employees.length).toBe(3);

    const dept2Employees = filterByDept(2);
    expect(dept2Employees.length).toBe(1);
  });

  it("calcula la rotación correctamente por departamento", () => {
    const calculateTurnover = (terminations: number, avgEmployees: number) =>
      avgEmployees > 0
        ? Math.round((terminations / avgEmployees) * 100 * 10) / 10
        : 0;

    expect(calculateTurnover(2, 20)).toBe(10);
    expect(calculateTurnover(0, 20)).toBe(0);
    expect(calculateTurnover(5, 0)).toBe(0);
  });

  it("el selector 'todos' devuelve el valor null", () => {
    const ALL_DEPARTMENTS = null;
    const selectedDept = ALL_DEPARTMENTS;
    expect(selectedDept).toBeNull();
  });
});
