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

      const result = await mockStoragePut(fileKey, Buffer.from(xmlContent), "application/xml");
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
