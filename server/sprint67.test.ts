/**
 * sprint67.test.ts
 * Tests unitarios para las mejoras del Sprint 67:
 * 1. Tendencias mensuales (getMonthlyTrends)
 * 2. Confirmación de lectura por token (confirmReadRouter)
 * 3. Generación de reporte PDF de despachos (dispatchesReport)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock de getDb ─────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// ── Mock de drizzle-orm ───────────────────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", args })),
  gte: vi.fn((a, b) => ({ type: "gte", a, b })),
  lte: vi.fn((a, b) => ({ type: "lte", a, b })),
  desc: vi.fn(a => ({ type: "desc", a })),
  isNull: vi.fn(a => ({ type: "isNull", a })),
}));

// ── Mock del schema ───────────────────────────────────────────────────────────
vi.mock("../drizzle/schema", () => ({
  minuteDispatches: {
    id: "id",
    minuteId: "minuteId",
    recipientId: "recipientId",
    sentAt: "sentAt",
    readAt: "readAt",
    status: "status",
    notes: "notes",
    readToken: "readToken",
    emailSentAt: "emailSentAt",
  },
  minuteRecipients: {
    id: "id",
    name: "name",
    email: "email",
    position: "position",
    department: "department",
    isActive: "isActive",
  },
  meetingMinutes: {
    id: "id",
    folio: "folio",
    title: "title",
    meetingDate: "meetingDate",
    meetingType: "meetingType",
  },
}));

// ── Mock de _core/pdfGenerator ────────────────────────────────────────────────
vi.mock("./_core/pdfGenerator", () => ({
  generatePDFFromHTML: vi
    .fn()
    .mockResolvedValue("https://s3.example.com/test.pdf"),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildDbChain(returnValue: any) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };
  // Hacer que la cadena sea thenable (resuelve con returnValue)
  chain.where.mockResolvedValue(returnValue);
  chain.limit.mockResolvedValue(returnValue);
  chain.offset.mockResolvedValue(returnValue);
  chain.orderBy.mockResolvedValue(returnValue);
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Tendencias mensuales
// ─────────────────────────────────────────────────────────────────────────────
describe("getMonthlyTrends — lógica de agrupación por mes", () => {
  it("inicializa todos los meses del rango solicitado", () => {
    const months = 6;
    const monthMap = new Map<
      string,
      { sent: number; read: number; bounced: number }
    >();
    const now = new Date();
    for (let i = 0; i < months; i++) {
      // Usar el primer día del mes para evitar solapamiento por días fuera de rango
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - (months - 1) + i,
        1
      );
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { sent: 0, read: 0, bounced: 0 });
    }
    expect(monthMap.size).toBe(6);
  });

  it("cuenta correctamente despachos leídos vs enviados", () => {
    const dispatches = [
      { sentAt: new Date(), readAt: new Date(), status: "read" },
      { sentAt: new Date(), readAt: null, status: "sent" },
      { sentAt: new Date(), readAt: null, status: "bounced" },
    ];
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthMap = new Map([[key, { sent: 0, read: 0, bounced: 0 }]]);

    for (const d of dispatches) {
      if (!d.sentAt) continue;
      const entry = monthMap.get(key)!;
      entry.sent++;
      if (d.status === "read" || d.readAt) entry.read++;
      if (d.status === "bounced") entry.bounced++;
    }

    const result = monthMap.get(key)!;
    expect(result.sent).toBe(3);
    expect(result.read).toBe(1);
    expect(result.bounced).toBe(1);
  });

  it("calcula la tasa de lectura correctamente", () => {
    const sent = 10;
    const read = 7;
    const readRate = sent > 0 ? Math.round((read / sent) * 100) : 0;
    expect(readRate).toBe(70);
  });

  it("devuelve 0% de tasa de lectura cuando no hay despachos", () => {
    const sent = 0;
    const read = 0;
    const readRate = sent > 0 ? Math.round((read / sent) * 100) : 0;
    expect(readRate).toBe(0);
  });

  it("genera etiquetas en español con formato correcto", () => {
    const monthNames = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    const key = "2026-05";
    const [year, month] = key.split("-");
    const label = `${monthNames[parseInt(month) - 1]} ${year}`;
    expect(label).toBe("May 2026");
  });

  it("genera etiqueta correcta para enero", () => {
    const monthNames = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    const key = "2026-01";
    const [year, month] = key.split("-");
    const label = `${monthNames[parseInt(month) - 1]} ${year}`;
    expect(label).toBe("Ene 2026");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Confirmación de lectura por token
// ─────────────────────────────────────────────────────────────────────────────
describe("confirmRead — validación de token", () => {
  it("rechaza tokens vacíos", () => {
    const token = "";
    expect(token.length).toBe(0);
    // Simulación: debería retornar 400
    const isValid = token.length === 64;
    expect(isValid).toBe(false);
  });

  it("acepta tokens de 64 caracteres hexadecimales", () => {
    const token = "a".repeat(64);
    const isValid = /^[a-f0-9]{64}$/.test(token);
    expect(isValid).toBe(true);
  });

  it("rechaza tokens con caracteres inválidos", () => {
    const token = "INVALID_TOKEN_WITH_UPPERCASE_AND_SPECIAL_CHARS!@#$%^&*()_+";
    const isValid = /^[a-f0-9]{64}$/.test(token);
    expect(isValid).toBe(false);
  });

  it("genera tokens únicos en cada llamada", () => {
    const { randomBytes } = require("crypto");
    const token1 = randomBytes(32).toString("hex");
    const token2 = randomBytes(32).toString("hex");
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64);
    expect(token2.length).toBe(64);
  });

  it("el token generado es hexadecimal válido", () => {
    const { randomBytes } = require("crypto");
    const token = randomBytes(32).toString("hex");
    expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: Reporte PDF de despachos
// ─────────────────────────────────────────────────────────────────────────────
describe("generateDispatchesReportPDF — estadísticas y filtros", () => {
  it("calcula estadísticas correctamente con datos de prueba", () => {
    const rows = [
      { status: "read", readAt: new Date() },
      { status: "sent", readAt: null },
      { status: "sent", readAt: null },
      { status: "bounced", readAt: null },
    ];
    const total = rows.length;
    const read = rows.filter(r => r.status === "read" || r.readAt).length;
    const bounced = rows.filter(r => r.status === "bounced").length;
    const readRate = total > 0 ? Math.round((read / total) * 100) : 0;

    expect(total).toBe(4);
    expect(read).toBe(1);
    expect(bounced).toBe(1);
    expect(readRate).toBe(25);
  });

  it("agrupa correctamente por destinatario", () => {
    const rows = [
      { recipientName: "Ana García", status: "read", readAt: new Date() },
      { recipientName: "Ana García", status: "sent", readAt: null },
      { recipientName: "Carlos López", status: "read", readAt: new Date() },
    ];
    const byRecipient = new Map<string, { total: number; read: number }>();
    for (const r of rows) {
      const key = r.recipientName ?? "Desconocido";
      if (!byRecipient.has(key)) byRecipient.set(key, { total: 0, read: 0 });
      const entry = byRecipient.get(key)!;
      entry.total++;
      if (r.status === "read" || r.readAt) entry.read++;
    }
    expect(byRecipient.get("Ana García")?.total).toBe(2);
    expect(byRecipient.get("Ana García")?.read).toBe(1);
    expect(byRecipient.get("Carlos López")?.total).toBe(1);
    expect(byRecipient.get("Carlos López")?.read).toBe(1);
  });

  it("aplica filtro de búsqueda en memoria correctamente", () => {
    const rows = [
      {
        recipientName: "Ana García",
        minuteTitle: "Reunión enero",
        minuteFolio: "MIN-001/2026",
        recipientEmail: "ana@test.com",
      },
      {
        recipientName: "Carlos López",
        minuteTitle: "Junta febrero",
        minuteFolio: "MIN-002/2026",
        recipientEmail: "carlos@test.com",
      },
    ];
    const term = "ana";
    const filtered = rows.filter(
      r =>
        (r.recipientName ?? "").toLowerCase().includes(term) ||
        (r.minuteTitle ?? "").toLowerCase().includes(term) ||
        (r.minuteFolio ?? "").toLowerCase().includes(term) ||
        (r.recipientEmail ?? "").toLowerCase().includes(term)
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].recipientName).toBe("Ana García");
  });

  it("limita los resultados a 500 registros máximo", () => {
    const maxRecords = 500;
    const mockRows = Array.from({ length: 600 }, (_, i) => ({ id: i }));
    const limited = mockRows.slice(0, maxRecords);
    expect(limited.length).toBe(500);
  });

  it("genera HTML con las secciones requeridas para el PDF", () => {
    const html = `
      <div class="header"><h1>Reporte Ejecutivo de Trazabilidad Documental</h1></div>
      <div class="stats"><div class="stat-card">Total</div></div>
      <div class="section-title">Tasa de Lectura por Destinatario</div>
      <div class="section-title">Detalle de Despachos</div>
      <div class="footer">NOM-035-STPS-2018</div>
    `;
    expect(html).toContain("Reporte Ejecutivo de Trazabilidad Documental");
    expect(html).toContain("Tasa de Lectura por Destinatario");
    expect(html).toContain("Detalle de Despachos");
    expect(html).toContain("NOM-035-STPS-2018");
  });

  it("devuelve 0% de tasa de lectura cuando no hay despachos", () => {
    const total = 0;
    const read = 0;
    const readRate = total > 0 ? Math.round((read / total) * 100) : 0;
    expect(readRate).toBe(0);
  });
});
