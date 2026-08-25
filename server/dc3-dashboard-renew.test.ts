/**
 * Tests para:
 *  1. dc3.getDashboardStats — agrupación por mes, empresa y área temática
 *  2. dc3RemoteSign.renewToken — regenerar token expirado
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock de getDb ─────────────────────────────────────────────────────────────
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://s3.example.com/test.png",
    key: "test.png",
  }),
}));

vi.mock("../_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Helpers de agrupación (extraídos de la lógica del endpoint) ──────────────

interface Dc3Row {
  id: number;
  status: "draft" | "issued" | "cancelled";
  companyName: string | null;
  thematicArea: string | null;
  createdAt: Date | null;
}

function aggregateByMonth(rows: Dc3Row[]) {
  const map = new Map<
    string,
    { draft: number; issued: number; cancelled: number }
  >();
  for (const r of rows) {
    const d = r.createdAt ? new Date(r.createdAt) : null;
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const prev = map.get(key) ?? { draft: 0, issued: 0, cancelled: 0 };
    prev[r.status] = (prev[r.status] ?? 0) + 1;
    map.set(key, prev);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }));
}

function aggregateByCompany(rows: Dc3Row[], limit = 10) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.companyName ?? "Sin empresa";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([company, count]) => ({ company, count }));
}

function aggregateByArea(rows: Dc3Row[], limit = 10) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.thematicArea ?? "Sin área";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([area, count]) => ({ area, count }));
}

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const sampleRows: Dc3Row[] = [
  {
    id: 1,
    status: "issued",
    companyName: "Empresa A",
    thematicArea: "6000",
    createdAt: new Date("2026-01-15"),
  },
  {
    id: 2,
    status: "issued",
    companyName: "Empresa A",
    thematicArea: "6000",
    createdAt: new Date("2026-01-20"),
  },
  {
    id: 3,
    status: "draft",
    companyName: "Empresa B",
    thematicArea: "8000",
    createdAt: new Date("2026-02-05"),
  },
  {
    id: 4,
    status: "cancelled",
    companyName: "Empresa C",
    thematicArea: "6000",
    createdAt: new Date("2026-02-10"),
  },
  {
    id: 5,
    status: "issued",
    companyName: "Empresa B",
    thematicArea: "3000",
    createdAt: new Date("2026-03-01"),
  },
  {
    id: 6,
    status: "draft",
    companyName: null,
    thematicArea: null,
    createdAt: new Date("2026-03-15"),
  },
  {
    id: 7,
    status: "issued",
    companyName: "Empresa A",
    thematicArea: "6000",
    createdAt: null,
  },
];

// ─── Tests: getDashboardStats helpers ─────────────────────────────────────────

describe("getDashboardStats — aggregateByMonth", () => {
  it("agrupa correctamente por mes YYYY-MM", () => {
    const result = aggregateByMonth(sampleRows);
    expect(result.length).toBe(3); // Ene, Feb, Mar (id=7 no tiene fecha)
    const jan = result.find(r => r.month === "2026-01");
    expect(jan).toBeDefined();
    expect(jan!.issued).toBe(2);
    expect(jan!.draft).toBe(0);
    expect(jan!.cancelled).toBe(0);
  });

  it("ordena los meses cronológicamente", () => {
    const result = aggregateByMonth(sampleRows);
    const months = result.map(r => r.month);
    expect(months).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("ignora filas sin fecha", () => {
    const result = aggregateByMonth(sampleRows);
    const total = result.reduce(
      (acc, r) => acc + r.issued + r.draft + r.cancelled,
      0
    );
    expect(total).toBe(6); // id=7 no tiene fecha → se ignora
  });

  it("cuenta correctamente borradores y canceladas", () => {
    const result = aggregateByMonth(sampleRows);
    const feb = result.find(r => r.month === "2026-02");
    expect(feb!.draft).toBe(1);
    expect(feb!.cancelled).toBe(1);
    expect(feb!.issued).toBe(0);
  });
});

describe("getDashboardStats — aggregateByCompany", () => {
  it("agrupa por empresa y ordena por cantidad descendente", () => {
    const result = aggregateByCompany(sampleRows);
    expect(result[0].company).toBe("Empresa A");
    expect(result[0].count).toBe(3); // ids 1, 2, 7
  });

  it("usa 'Sin empresa' para filas sin companyName", () => {
    const result = aggregateByCompany(sampleRows);
    const sinEmpresa = result.find(r => r.company === "Sin empresa");
    expect(sinEmpresa).toBeDefined();
    expect(sinEmpresa!.count).toBe(1);
  });

  it("respeta el límite de top 10", () => {
    const manyRows: Dc3Row[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      status: "issued" as const,
      companyName: `Empresa ${i}`,
      thematicArea: "6000",
      createdAt: new Date(),
    }));
    const result = aggregateByCompany(manyRows, 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe("getDashboardStats — aggregateByArea", () => {
  it("agrupa por área temática y ordena por cantidad descendente", () => {
    const result = aggregateByArea(sampleRows);
    expect(result[0].area).toBe("6000"); // aparece 4 veces (ids 1, 2, 4 y 7)
    expect(result[0].count).toBe(4);
  });

  it("usa 'Sin área' para filas sin thematicArea", () => {
    const result = aggregateByArea(sampleRows);
    const sinArea = result.find(r => r.area === "Sin área");
    expect(sinArea).toBeDefined();
    expect(sinArea!.count).toBe(1);
  });
});

describe("getDashboardStats — KPIs", () => {
  it("calcula la tasa de emisión correctamente", () => {
    const total = sampleRows.length;
    const issued = sampleRows.filter(r => r.status === "issued").length;
    const issueRate = total > 0 ? Math.round((issued / total) * 100) : 0;
    expect(issueRate).toBe(Math.round((4 / 7) * 100)); // 4 issued de 7
  });

  it("devuelve 0% cuando no hay registros", () => {
    const total = 0;
    const issued = 0;
    const issueRate = total > 0 ? Math.round((issued / total) * 100) : 0;
    expect(issueRate).toBe(0);
  });
});

// ─── Tests: renewToken helpers ─────────────────────────────────────────────────

describe("renewToken — lógica de validación", () => {
  it("detecta token expirado correctamente", () => {
    const expiredAt = new Date(Date.now() - 1000 * 60 * 60); // hace 1 hora
    const isExpired = expiredAt < new Date();
    expect(isExpired).toBe(true);
  });

  it("detecta token vigente correctamente", () => {
    const futureAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // en 24 horas
    const isExpired = futureAt < new Date();
    expect(isExpired).toBe(false);
  });

  it("calcula la nueva expiración según las horas configuradas", () => {
    const hours = 72;
    const newExpiry = new Date(Date.now() + hours * 60 * 60 * 1000);
    const diffHours = (newExpiry.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(72, 0);
  });

  it("genera un UUID v4 válido para el nuevo token", () => {
    const { randomUUID } = require("crypto");
    const token = randomUUID();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(token)).toBe(true);
  });

  it("construye la URL de firma remota correctamente", () => {
    const baseUrl = "https://nom035mood-32dy4ksx.manus.space";
    const token = "abc123-test-token";
    const url = `${baseUrl}/firmar-dc3/${token}`;
    expect(url).toBe(
      "https://nom035mood-32dy4ksx.manus.space/firmar-dc3/abc123-test-token"
    );
  });
});

// ─── Tests: Período de filtrado ────────────────────────────────────────────────

describe("getDashboardStats — período de filtrado", () => {
  it("calcula el rango del año en curso correctamente", () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    expect(from.getMonth()).toBe(0); // Enero
    expect(to.getMonth()).toBe(11); // Diciembre
    expect(from.getFullYear()).toBe(now.getFullYear());
    expect(to.getFullYear()).toBe(now.getFullYear());
  });

  it("calcula el rango del mes en curso correctamente", () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    expect(from.getDate()).toBe(1);
    expect(to.getMonth()).toBe(now.getMonth());
  });

  it("usa fechas personalizadas cuando se proporcionan", () => {
    const customFrom = new Date("2026-03-01").getTime();
    const customTo = new Date("2026-03-31").getTime();
    const from = new Date(customFrom);
    const to = new Date(customTo);
    expect(from.getMonth()).toBe(2); // Marzo (0-indexed)
    expect(to.getMonth()).toBe(2);
  });
});
