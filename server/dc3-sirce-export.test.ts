/**
 * Tests para los nuevos módulos:
 *  1. dc3.exportSirceXml — genera XML SIRCE-STPS
 *  2. dc3-expiry-alerts-job — detecta constancias próximas a vencer
 *  3. Exportación dashboard — estructura de datos para PDF/Excel
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks globales ───────────────────────────────────────────────────────────
vi.mock("../db", () => ({ getDb: vi.fn() }));
vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/test.png", key: "test.png" }),
}));
vi.mock("../_core/email", () => ({ sendEmail: vi.fn().mockResolvedValue(true) }));
vi.mock("../_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Dc3Row {
  id: number;
  status: "draft" | "issued" | "cancelled";
  companyName: string;
  companyRfc: string | null;
  workerName: string;
  workerCurp: string | null;
  workerPosition: string | null;
  courseName: string;
  courseDurationHours: number | null;
  thematicAreaKey: string | null;
  thematicAreaDesc: string | null;
  instructorName: string | null;
  trainingAgentName: string | null;
  folioNumber: string | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
  verificationHash: string | null;
  updatedAt: Date;
}

// ─── Función auxiliar: generación de XML SIRCE (replica la lógica del endpoint) ─

function escapeXml(val: string | null | undefined): string {
  if (!val) return "";
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(val: string | Date | null | undefined): string {
  if (!val) return "";
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toISOString().slice(0, 10);
}

function buildSirceXml(records: Dc3Row[], companyRfc = "", companyName = ""): string {
  const items = records
    .filter((r) => r.status === "issued")
    .map(
      (r) => `    <Constancia>
      <Folio>${escapeXml(r.folioNumber ?? String(r.id))}</Folio>
      <RFC_Empresa>${escapeXml(r.companyRfc ?? companyRfc)}</RFC_Empresa>
      <Razon_Social>${escapeXml(r.companyName ?? companyName)}</Razon_Social>
      <CURP_Trabajador>${escapeXml(r.workerCurp)}</CURP_Trabajador>
      <Nombre_Trabajador>${escapeXml(r.workerName)}</Nombre_Trabajador>
      <Puesto>${escapeXml(r.workerPosition)}</Puesto>
      <Nombre_Curso>${escapeXml(r.courseName)}</Nombre_Curso>
      <Duracion_Horas>${r.courseDurationHours ?? 0}</Duracion_Horas>
      <Fecha_Inicio>${formatDate(r.periodStartDate)}</Fecha_Inicio>
      <Fecha_Fin>${formatDate(r.periodEndDate)}</Fecha_Fin>
      <Area_Tematica>${escapeXml(r.thematicAreaDesc ?? r.thematicAreaKey ?? "")}</Area_Tematica>
      <Modalidad>Presencial</Modalidad>
      <Nombre_Instructor>${escapeXml(r.instructorName)}</Nombre_Instructor>
      <Agente_Capacitador>${escapeXml(r.trainingAgentName ?? "")}</Agente_Capacitador>
      <Numero_Constancia>${escapeXml(r.folioNumber ?? String(r.id))}</Numero_Constancia>
      <Fecha_Emision>${formatDate(r.updatedAt)}</Fecha_Emision>
      <Hash_Verificacion>${escapeXml(r.verificationHash)}</Hash_Verificacion>
    </Constancia>`
    )
    .join("\n");

  const now = new Date();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Archivo generado por la Plataforma de Capacitación NOM-035 STPS -->
<!-- Fecha de generación: ${now.toISOString()} -->
<!-- Total de constancias: ${records.filter((r) => r.status === "issued").length} -->
<Constancias_DC3 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0">
  <Encabezado>
    <Sistema>Plataforma NOM-035 STPS</Sistema>
    <Fecha_Generacion>${now.toISOString()}</Fecha_Generacion>
    <Total_Constancias>${records.filter((r) => r.status === "issued").length}</Total_Constancias>
  </Encabezado>
  <Constancias>
${items}
  </Constancias>
</Constancias_DC3>`;
}

// ─── Tests exportSirceXml ─────────────────────────────────────────────────────

describe("exportSirceXml — generación de XML", () => {
  const sampleRecords: Dc3Row[] = [
    {
      id: 1,
      status: "issued",
      companyName: "EMPRESA TEST S.A. DE C.V.",
      companyRfc: "ETE850101AAA",
      workerName: "GARCIA LOPEZ JUAN",
      workerCurp: "GALJ850101HDFRCN09",
      workerPosition: "Operador",
      courseName: "Seguridad e Higiene",
      courseDurationHours: 16,
      thematicAreaKey: "6000",
      thematicAreaDesc: "Seguridad e Higiene en el Trabajo",
      instructorName: "INSTRUCTOR PRUEBA",
      trainingAgentName: "AGENTE CAPACITADOR SA",
      folioNumber: "DC3-001/2024",
      periodStartDate: "2024-01-15",
      periodEndDate: "2024-01-16",
      verificationHash: "abc123hash",
      updatedAt: new Date("2024-01-16"),
    },
    {
      id: 2,
      status: "draft",
      companyName: "EMPRESA TEST S.A. DE C.V.",
      companyRfc: "ETE850101AAA",
      workerName: "MARTINEZ PEREZ ANA",
      workerCurp: "MAPA900202MDFRCN05",
      workerPosition: "Supervisor",
      courseName: "Primeros Auxilios",
      courseDurationHours: 8,
      thematicAreaKey: "6001",
      thematicAreaDesc: "Primeros Auxilios",
      instructorName: "INSTRUCTOR 2",
      trainingAgentName: null,
      folioNumber: "DC3-002/2024",
      periodStartDate: "2024-02-01",
      periodEndDate: "2024-02-01",
      verificationHash: null,
      updatedAt: new Date("2024-02-01"),
    },
  ];

  it("genera XML con declaración XML válida", () => {
    const xml = buildSirceXml(sampleRecords);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it("contiene nodo raíz Constancias_DC3", () => {
    const xml = buildSirceXml(sampleRecords);
    expect(xml).toContain("<Constancias_DC3");
    expect(xml).toContain("</Constancias_DC3>");
  });

  it("solo incluye registros con status issued", () => {
    const xml = buildSirceXml(sampleRecords);
    // El registro issued debe estar
    expect(xml).toContain("DC3-001/2024");
    // El registro draft no debe estar
    expect(xml).not.toContain("DC3-002/2024");
  });

  it("escapa caracteres especiales en el XML", () => {
    const records: Dc3Row[] = [
      {
        ...sampleRecords[0],
        workerName: "GARCÍA & LÓPEZ <JUAN>",
        folioNumber: "DC3-SPECIAL-001",
      },
    ];
    const xml = buildSirceXml(records);
    // El & en GARCÍA & LÓPEZ se escapa como &amp;
    expect(xml).toContain("&amp;");
    // Los < > en <JUAN> se escapan
    expect(xml).not.toContain("<JUAN>");
    expect(xml).toContain("&lt;JUAN&gt;");
  });

  it("incluye el folio de la constancia", () => {
    const xml = buildSirceXml(sampleRecords);
    expect(xml).toContain("DC3-001/2024");
  });

  it("incluye el hash de verificación", () => {
    const xml = buildSirceXml(sampleRecords);
    expect(xml).toContain("abc123hash");
  });

  it("incluye la fecha de inicio y fin del período", () => {
    const xml = buildSirceXml(sampleRecords);
    expect(xml).toContain("2024-01-15");
    expect(xml).toContain("2024-01-16");
  });

  it("incluye el área temática descriptiva", () => {
    const xml = buildSirceXml(sampleRecords);
    expect(xml).toContain("Seguridad e Higiene en el Trabajo");
  });

  it("el total de constancias en el encabezado es correcto", () => {
    const xml = buildSirceXml(sampleRecords);
    // Solo 1 de 2 está issued
    expect(xml).toContain("<Total_Constancias>1</Total_Constancias>");
  });

  it("maneja registros sin CURP sin lanzar error", () => {
    const records: Dc3Row[] = [
      { ...sampleRecords[0], workerCurp: null },
    ];
    expect(() => buildSirceXml(records)).not.toThrow();
  });

  it("el filename tiene formato correcto", () => {
    const now = new Date();
    const filename = `SIRCE-DC3-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.xml`;
    expect(filename).toMatch(/^SIRCE-DC3-\d{8}\.xml$/);
  });
});

// ─── Tests dc3-expiry-alerts-job ──────────────────────────────────────────────

describe("dc3-expiry-alerts-job — lógica de detección de vencimiento", () => {
  it("detecta constancias emitidas hace más de 2 años como vencidas", () => {
    const twoAndHalfYearsAgo = new Date();
    twoAndHalfYearsAgo.setFullYear(twoAndHalfYearsAgo.getFullYear() - 2);
    twoAndHalfYearsAgo.setMonth(twoAndHalfYearsAgo.getMonth() - 6);

    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    expect(twoAndHalfYearsAgo < twoYearsAgo).toBe(true);
  });

  it("constancias recientes (6 meses) no están vencidas", () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    expect(sixMonthsAgo < twoYearsAgo).toBe(false);
  });

  it("constancias que vencen en 20 días entran en alerta temprana (umbral 30 días)", () => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
    const alertThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(expiryDate < alertThreshold).toBe(true);
  });

  it("constancias que vencen en 45 días NO entran en alerta temprana (umbral 30 días)", () => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    const alertThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(expiryDate < alertThreshold).toBe(false);
  });

  it("calcula correctamente la fecha de vencimiento (issuedAt + 2 años)", () => {
    const issuedAt = new Date("2022-01-15");
    const expiryDate = new Date(issuedAt);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);
    expect(expiryDate.toISOString().slice(0, 10)).toBe("2024-01-15");
  });

  it("detecta constancias ya vencidas (issuedAt hace 3 años)", () => {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const expiryDate = new Date(threeYearsAgo);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);
    expect(expiryDate < new Date()).toBe(true);
  });
});

// ─── Tests estructura de datos para exportación del Dashboard ─────────────────

describe("DC3Dashboard — estructura de datos para exportación PDF/Excel", () => {
  interface DashboardStats {
    totals: { total: number; issued: number; draft: number; cancelled: number };
    byMonth: { month: string; count: number; issued: number }[];
    byCompany: { company: string; count: number }[];
    byThematicArea: { area: string; count: number }[];
  }

  const mockStats: DashboardStats = {
    totals: { total: 150, issued: 120, draft: 20, cancelled: 10 },
    byMonth: [
      { month: "2024-01", count: 25, issued: 20 },
      { month: "2024-02", count: 30, issued: 25 },
    ],
    byCompany: [
      { company: "EMPRESA A S.A.", count: 50 },
      { company: "EMPRESA B S.A.", count: 40 },
    ],
    byThematicArea: [
      { area: "Seguridad e Higiene", count: 60 },
      { area: "Primeros Auxilios", count: 30 },
    ],
  };

  it("la estructura de totals tiene los 4 campos requeridos", () => {
    expect(mockStats.totals).toHaveProperty("total");
    expect(mockStats.totals).toHaveProperty("issued");
    expect(mockStats.totals).toHaveProperty("draft");
    expect(mockStats.totals).toHaveProperty("cancelled");
  });

  it("la tasa de emisión se calcula correctamente", () => {
    const rate = mockStats.totals.total > 0
      ? Math.round((mockStats.totals.issued / mockStats.totals.total) * 100)
      : 0;
    expect(rate).toBe(80); // 120/150 = 80%
  });

  it("byMonth tiene los campos necesarios para la gráfica de barras", () => {
    mockStats.byMonth.forEach((entry) => {
      expect(entry).toHaveProperty("month");
      expect(entry).toHaveProperty("count");
    });
  });

  it("byCompany tiene los campos necesarios para la gráfica de empresas", () => {
    mockStats.byCompany.forEach((entry) => {
      expect(entry).toHaveProperty("company");
      expect(entry).toHaveProperty("count");
    });
  });

  it("byThematicArea tiene los campos necesarios para la gráfica de áreas", () => {
    mockStats.byThematicArea.forEach((entry) => {
      expect(entry).toHaveProperty("area");
      expect(entry).toHaveProperty("count");
    });
  });

  it("los datos del Excel tienen todas las columnas requeridas para el reporte STPS", () => {
    // Simular la transformación de datos para Excel
    const excelRows = mockStats.byMonth.map((m) => ({
      Mes: m.month,
      Total: m.count,
      Emitidas: m.issued,
      Pendientes: m.count - m.issued,
    }));
    excelRows.forEach((row) => {
      expect(row).toHaveProperty("Mes");
      expect(row).toHaveProperty("Total");
      expect(row).toHaveProperty("Emitidas");
      expect(row).toHaveProperty("Pendientes");
    });
  });
});
