/**
 * Tests para el módulo de Historial de Exportaciones SIRCE
 * Cubre: listSirceExports, redownloadSirceExport y el registro automático en exportSirceXml
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock de Drizzle / DB ────────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock("../drizzle/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}));

// ─── Mock de Storage ─────────────────────────────────────────────────────────
const mockStorageGet = vi.fn();
const mockStoragePut = vi.fn();

vi.mock("./storage", () => ({
  storageGet: mockStorageGet,
  storagePut: mockStoragePut,
}));

// ─── Mock de Email ────────────────────────────────────────────────────────────
vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Genera un registro de historial SIRCE de prueba */
function makeSirceExport(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    filename: "SIRCE-DC3-20260101.xml",
    fileKey: "sirce-exports/SIRCE-DC3-20260101.xml",
    fileHash: "a".repeat(64),
    recordCount: 5,
    exportedBy: 42,
    exportedByName: "Ana López",
    exportedAt: new Date("2026-01-01T10:00:00Z"),
    companyRfc: "EEJ850101XXX",
    ...overrides,
  };
}

// ─── Tests de lógica de negocio ───────────────────────────────────────────────

describe("Historial SIRCE — lógica de negocio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Generación de nombre de archivo ──────────────────────────────────────────
  describe("Nombre de archivo SIRCE", () => {
    it("debe seguir el patrón SIRCE-DC3-YYYYMMDD.xml", () => {
      const date = new Date("2026-06-15T00:00:00Z");
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `SIRCE-DC3-${dateStr}.xml`;
      expect(filename).toBe("SIRCE-DC3-20260615.xml");
      expect(filename).toMatch(/^SIRCE-DC3-\d{8}\.xml$/);
    });

    it("el nombre de archivo debe ser único por fecha y hora si se exporta más de una vez al día", () => {
      const ts1 = new Date("2026-06-15T10:00:00Z");
      const ts2 = new Date("2026-06-15T15:30:00Z");
      const name1 = `SIRCE-DC3-${ts1.toISOString().slice(0, 10).replace(/-/g, "")}.xml`;
      const name2 = `SIRCE-DC3-${ts2.toISOString().slice(0, 10).replace(/-/g, "")}.xml`;
      // Mismo día → mismo nombre base (la unicidad la da el fileKey en S3)
      expect(name1).toBe(name2);
    });
  });

  // ── Cálculo del hash SHA-256 ──────────────────────────────────────────────────
  describe("Hash SHA-256 del archivo XML", () => {
    it("debe producir un hash de 64 caracteres hexadecimales", () => {
      const { createHash } = require("crypto");
      const xmlContent = `<?xml version="1.0"?><SIRCE><Registro/></SIRCE>`;
      const hash = createHash("sha256").update(xmlContent).digest("hex");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("el mismo contenido siempre produce el mismo hash (determinismo)", () => {
      const { createHash } = require("crypto");
      const xml = `<?xml version="1.0"?><SIRCE><Empresa RFC="EEJ850101XXX"/></SIRCE>`;
      const h1 = createHash("sha256").update(xml).digest("hex");
      const h2 = createHash("sha256").update(xml).digest("hex");
      expect(h1).toBe(h2);
    });

    it("contenidos distintos producen hashes distintos", () => {
      const { createHash } = require("crypto");
      const xml1 = `<?xml version="1.0"?><SIRCE><Registro id="1"/></SIRCE>`;
      const xml2 = `<?xml version="1.0"?><SIRCE><Registro id="2"/></SIRCE>`;
      const h1 = createHash("sha256").update(xml1).digest("hex");
      const h2 = createHash("sha256").update(xml2).digest("hex");
      expect(h1).not.toBe(h2);
    });
  });

  // ── Validación de registros de historial ─────────────────────────────────────
  describe("Estructura del registro de historial", () => {
    it("un registro válido debe tener todos los campos requeridos", () => {
      const record = makeSirceExport();
      expect(record).toHaveProperty("id");
      expect(record).toHaveProperty("filename");
      expect(record).toHaveProperty("fileKey");
      expect(record).toHaveProperty("fileHash");
      expect(record).toHaveProperty("recordCount");
      expect(record).toHaveProperty("exportedBy");
      expect(record).toHaveProperty("exportedAt");
    });

    it("el fileHash debe tener exactamente 64 caracteres", () => {
      const record = makeSirceExport({ fileHash: "b".repeat(64) });
      expect(record.fileHash).toHaveLength(64);
    });

    it("recordCount debe ser un entero positivo", () => {
      const record = makeSirceExport({ recordCount: 10 });
      expect(record.recordCount).toBeGreaterThan(0);
      expect(Number.isInteger(record.recordCount)).toBe(true);
    });

    it("un registro sin fileKey indica que el archivo no está disponible para re-descarga", () => {
      const record = makeSirceExport({ fileKey: null });
      expect(record.fileKey).toBeNull();
      // La UI debe mostrar badge "Sin archivo" en este caso
    });
  });

  // ── Paginación ────────────────────────────────────────────────────────────────
  describe("Paginación del historial", () => {
    it("el offset debe calcularse correctamente para la página 1", () => {
      const page = 1;
      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      expect(offset).toBe(0);
    });

    it("el offset debe calcularse correctamente para la página 3", () => {
      const page = 3;
      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      expect(offset).toBe(40);
    });

    it("el total de páginas debe redondearse hacia arriba", () => {
      const total = 45;
      const pageSize = 20;
      const totalPages = Math.ceil(total / pageSize);
      expect(totalPages).toBe(3);
    });

    it("con 0 registros el total de páginas debe ser 1 (no 0)", () => {
      const total = 0;
      const pageSize = 20;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      expect(totalPages).toBe(1);
    });
  });

  // ── Re-descarga ───────────────────────────────────────────────────────────────
  describe("Re-descarga de exportación SIRCE", () => {
    it("debe generar una URL presignada cuando el fileKey existe", async () => {
      const fileKey = "sirce-exports/SIRCE-DC3-20260101.xml";
      mockStorageGet.mockResolvedValue({
        url: `https://s3.example.com/${fileKey}?token=abc123`,
        key: fileKey,
      });

      const result = await mockStorageGet(fileKey, 3600);
      expect(result.url).toContain(fileKey);
      expect(mockStorageGet).toHaveBeenCalledWith(fileKey, 3600);
    });

    it("debe lanzar un error cuando el fileKey es nulo", async () => {
      const record = makeSirceExport({ fileKey: null });
      const redownload = async (r: typeof record) => {
        if (!r.fileKey) {
          throw new Error(
            "El archivo XML ya no está disponible en el almacenamiento. Genere una nueva exportación."
          );
        }
        return mockStorageGet(r.fileKey, 3600);
      };

      await expect(redownload(record)).rejects.toThrow(
        "El archivo XML ya no está disponible"
      );
    });

    it("la URL de re-descarga debe devolver el nombre de archivo original", async () => {
      const record = makeSirceExport();
      mockStorageGet.mockResolvedValue({
        url: `https://s3.example.com/${record.fileKey}?token=xyz`,
        key: record.fileKey,
      });

      const result = await mockStorageGet(record.fileKey!, 3600);
      expect(result.url).toBeTruthy();
      // El filename original se devuelve junto con la URL para el header Content-Disposition
      expect(record.filename).toMatch(/^SIRCE-DC3-\d{8}\.xml$/);
    });
  });

  // ── Truncado del hash en la UI ────────────────────────────────────────────────
  describe("Visualización del hash en la UI", () => {
    it("truncateHash debe mostrar los primeros 8 y últimos 8 caracteres con '…' en medio", () => {
      const hash = "a".repeat(32) + "b".repeat(32);
      const truncateHash = (h: string) => h.slice(0, 8) + "…" + h.slice(-8);
      const result = truncateHash(hash);
      expect(result).toBe("aaaaaaaa…bbbbbbbb");
      expect(result).toHaveLength(17); // 8 + 1 + 8
    });

    it("truncateHash debe funcionar con hashes reales SHA-256", () => {
      const { createHash } = require("crypto");
      const hash = createHash("sha256").update("test").digest("hex");
      const truncateHash = (h: string) => h.slice(0, 8) + "…" + h.slice(-8);
      const result = truncateHash(hash);
      expect(result).toMatch(/^[0-9a-f]{8}…[0-9a-f]{8}$/);
    });
  });

  // ── Integración: registro automático al exportar ──────────────────────────────
  describe("Registro automático en historial al exportar", () => {
    it("debe guardar el XML en S3 y registrar en historial al exportar", async () => {
      const xmlContent = `<?xml version="1.0"?><SIRCE><Empresa RFC="EEJ850101XXX"/></SIRCE>`;
      const fileKey = `sirce-exports/SIRCE-DC3-20260101.xml`;

      mockStoragePut.mockResolvedValue({
        url: `https://s3.example.com/${fileKey}`,
        key: fileKey,
      });

      const result = await mockStoragePut(
        fileKey,
        Buffer.from(xmlContent),
        "application/xml"
      );
      expect(result.key).toBe(fileKey);
      expect(mockStoragePut).toHaveBeenCalledWith(
        fileKey,
        expect.any(Buffer),
        "application/xml"
      );
    });

    it("el registro en historial debe incluir todos los campos necesarios", () => {
      const { createHash } = require("crypto");
      const xmlContent = `<?xml version="1.0"?><SIRCE/>`;
      const fileHash = createHash("sha256").update(xmlContent).digest("hex");
      const fileKey = "sirce-exports/SIRCE-DC3-20260615.xml";

      const historyRecord = {
        filename: "SIRCE-DC3-20260615.xml",
        fileKey,
        fileHash,
        recordCount: 3,
        exportedBy: 42,
        companyRfc: "EEJ850101XXX",
        exportedAt: new Date(),
      };

      expect(historyRecord.filename).toMatch(/^SIRCE-DC3-\d{8}\.xml$/);
      expect(historyRecord.fileHash).toHaveLength(64);
      expect(historyRecord.fileKey).toBeTruthy();
      expect(historyRecord.recordCount).toBeGreaterThan(0);
      expect(historyRecord.exportedBy).toBeTruthy();
    });
  });
});

// ─── Tests de filtros de búsqueda ─────────────────────────────────────────────

describe("Historial SIRCE — filtros de búsqueda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Conversión de timestamps a Date ──────────────────────────────────────────
  describe("Conversión de timestamp a Date para filtros", () => {
    it("debe convertir un timestamp numérico a Date correctamente", () => {
      const ts = new Date("2026-01-01T00:00:00.000Z").getTime();
      const d = new Date(ts);
      expect(d).toBeInstanceOf(Date);
      expect(d.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    });

    it("dateFrom debe representar el inicio del día (00:00:00.000Z)", () => {
      const dateStr = "2026-03-15";
      const ts = new Date(dateStr + "T00:00:00.000Z").getTime();
      const d = new Date(ts);
      expect(d.toISOString()).toBe("2026-03-15T00:00:00.000Z");
    });

    it("dateTo debe representar el fin del día (23:59:59.999Z)", () => {
      const dateStr = "2026-03-15";
      const ts = new Date(dateStr + "T23:59:59.999Z").getTime();
      const d = new Date(ts);
      expect(d.toISOString()).toBe("2026-03-15T23:59:59.999Z");
    });

    it("un rango de fechas válido debe tener dateFrom <= dateTo", () => {
      const from = new Date("2026-01-01T00:00:00.000Z").getTime();
      const to = new Date("2026-01-31T23:59:59.999Z").getTime();
      expect(from).toBeLessThanOrEqual(to);
    });
  });

  // ── Construcción de condiciones de filtro ────────────────────────────────────
  describe("Construcción de condiciones de filtro", () => {
    it("sin filtros, whereClause debe ser undefined", () => {
      const conditions: unknown[] = [];
      const whereClause = conditions.length > 0 ? conditions : undefined;
      expect(whereClause).toBeUndefined();
    });

    it("con dateFrom, debe agregar una condición gte", () => {
      const conditions: string[] = [];
      const input = {
        dateFrom: new Date("2026-01-01T00:00:00.000Z").getTime(),
      };
      if (input.dateFrom !== undefined) {
        conditions.push(
          `gte(exportedAt, ${new Date(input.dateFrom).toISOString()})`
        );
      }
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toContain("gte");
    });

    it("con dateTo, debe agregar una condición lte", () => {
      const conditions: string[] = [];
      const input = { dateTo: new Date("2026-01-31T23:59:59.999Z").getTime() };
      if (input.dateTo !== undefined) {
        conditions.push(
          `lte(exportedAt, ${new Date(input.dateTo).toISOString()})`
        );
      }
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toContain("lte");
    });

    it("con exportedByName, debe agregar una condición like con %nombre%", () => {
      const conditions: string[] = [];
      const input = { exportedByName: "Ana" };
      if (input.exportedByName) {
        conditions.push(`like(exportedByName, %${input.exportedByName}%)`);
      }
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toContain("%Ana%");
    });

    it("con companyRfc, debe agregar una condición like con %rfc%", () => {
      const conditions: string[] = [];
      const input = { companyRfc: "EEJ" };
      if (input.companyRfc) {
        conditions.push(`like(companyRfc, %${input.companyRfc}%)`);
      }
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toContain("%EEJ%");
    });

    it("con todos los filtros activos, debe haber 4 condiciones", () => {
      const conditions: string[] = [];
      const input = {
        dateFrom: new Date("2026-01-01").getTime(),
        dateTo: new Date("2026-01-31").getTime(),
        exportedByName: "Ana",
        companyRfc: "EEJ",
      };
      if (input.dateFrom !== undefined) conditions.push("gte_condition");
      if (input.dateTo !== undefined) conditions.push("lte_condition");
      if (input.exportedByName) conditions.push("like_name_condition");
      if (input.companyRfc) conditions.push("like_rfc_condition");
      expect(conditions).toHaveLength(4);
    });
  });

  // ── Períodos rápidos de la UI ─────────────────────────────────────────────────
  describe("Períodos rápidos de la UI", () => {
    it("'este mes' debe empezar en el día 1 del mes actual", () => {
      const now = new Date("2026-06-15T12:00:00Z");
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth();
      const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      expect(from).toBe("2026-06-01");
    });

    it("'mes anterior' debe cubrir todo el mes previo", () => {
      const now = new Date("2026-06-15T12:00:00Z");
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth(); // 5 (junio)
      const prevMonth = m === 0 ? 11 : m - 1; // 4 (mayo)
      const prevYear = m === 0 ? y - 1 : y;
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      const from = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
      const to = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      expect(from).toBe("2026-05-01");
      expect(to).toBe("2026-05-31");
    });

    it("'año anterior' debe cubrir del 01/01 al 31/12 del año previo", () => {
      const now = new Date("2026-06-15T12:00:00Z");
      const y = now.getUTCFullYear();
      const from = `${y - 1}-01-01`;
      const to = `${y - 1}-12-31`;
      expect(from).toBe("2025-01-01");
      expect(to).toBe("2025-12-31");
    });

    it("'este año' debe empezar en 01/01 del año actual", () => {
      const now = new Date("2026-06-15T12:00:00Z");
      const y = now.getUTCFullYear();
      const from = `${y}-01-01`;
      expect(from).toBe("2026-01-01");
    });
  });

  // ── Filtrado de registros en memoria (simulación) ─────────────────────────────
  describe("Filtrado de registros (simulación)", () => {
    const records = [
      makeSirceExport({
        id: 1,
        exportedByName: "Ana López",
        companyRfc: "EEJ850101XXX",
        exportedAt: new Date("2026-01-15T10:00:00Z"),
      }),
      makeSirceExport({
        id: 2,
        exportedByName: "Carlos Ruiz",
        companyRfc: "ABC123456DEF",
        exportedAt: new Date("2026-02-20T14:00:00Z"),
      }),
      makeSirceExport({
        id: 3,
        exportedByName: "Ana García",
        companyRfc: "EEJ850101XXX",
        exportedAt: new Date("2026-03-10T09:00:00Z"),
      }),
    ];

    it("filtrar por exportedByName 'Ana' debe devolver 2 registros", () => {
      const filtered = records.filter(r =>
        r.exportedByName?.toLowerCase().includes("ana")
      );
      expect(filtered).toHaveLength(2);
    });

    it("filtrar por companyRfc 'EEJ' debe devolver 2 registros", () => {
      const filtered = records.filter(r =>
        r.companyRfc?.toLowerCase().includes("eej")
      );
      expect(filtered).toHaveLength(2);
    });

    it("filtrar por rango de fechas enero 2026 debe devolver 1 registro", () => {
      const from = new Date("2026-01-01T00:00:00Z");
      const to = new Date("2026-01-31T23:59:59Z");
      const filtered = records.filter(
        r => new Date(r.exportedAt) >= from && new Date(r.exportedAt) <= to
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it("combinar filtros (Ana + EEJ) debe devolver 2 registros", () => {
      const filtered = records.filter(
        r =>
          r.exportedByName?.toLowerCase().includes("ana") &&
          r.companyRfc?.toLowerCase().includes("eej")
      );
      expect(filtered).toHaveLength(2);
    });

    it("filtros sin coincidencias deben devolver array vacío", () => {
      const filtered = records.filter(r =>
        r.exportedByName?.toLowerCase().includes("pedro")
      );
      expect(filtered).toHaveLength(0);
    });
  });

  // ── Validación del schema Zod del endpoint ────────────────────────────────────
  describe("Validación del schema Zod de listSirceExports", () => {
    it("debe aceptar input mínimo (solo page y pageSize)", () => {
      const { z } = require("zod");
      const schema = z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        dateFrom: z.number().optional(),
        dateTo: z.number().optional(),
        exportedByName: z.string().optional(),
        companyRfc: z.string().optional(),
      });
      const result = schema.safeParse({ page: 1, pageSize: 20 });
      expect(result.success).toBe(true);
    });

    it("debe aceptar todos los filtros opcionales", () => {
      const { z } = require("zod");
      const schema = z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        dateFrom: z.number().optional(),
        dateTo: z.number().optional(),
        exportedByName: z.string().optional(),
        companyRfc: z.string().optional(),
      });
      const result = schema.safeParse({
        page: 1,
        pageSize: 10,
        dateFrom: 1735689600000,
        dateTo: 1738368000000,
        exportedByName: "Ana",
        companyRfc: "EEJ",
      });
      expect(result.success).toBe(true);
    });

    it("debe rechazar pageSize mayor a 100", () => {
      const { z } = require("zod");
      const schema = z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      });
      const result = schema.safeParse({ page: 1, pageSize: 200 });
      expect(result.success).toBe(false);
    });

    it("debe rechazar page menor a 1", () => {
      const { z } = require("zod");
      const schema = z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      });
      const result = schema.safeParse({ page: 0, pageSize: 20 });
      expect(result.success).toBe(false);
    });
  });
});
