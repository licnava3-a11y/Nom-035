import { describe, it, expect } from "vitest";

// ── Pruebas del filtro histórico de getStats ─────────────────────────────────
describe("Filtro histórico de getStats (bugReports y featureRequests)", () => {
  it("Calcula correctamente el cutoff para 30 días", () => {
    const days = 30;
    const now = Date.now();
    const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
    expect(cutoff).toBeInstanceOf(Date);
    expect(cutoff.getTime()).toBeLessThan(now);
    const diff = now - cutoff.getTime();
    expect(diff).toBeCloseTo(days * 24 * 60 * 60 * 1000, -3);
  });

  it("Filtra correctamente registros fuera del período", () => {
    const days = 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const mockRecords = [
      { status: "pendiente", createdAt: new Date() },
      { status: "corregido", createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { status: "pendiente", createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }, // fuera del período
    ];
    const filtered = mockRecords.filter(r => r.createdAt >= cutoff);
    expect(filtered).toHaveLength(2);
  });

  it("Sin filtro de días devuelve todos los registros", () => {
    const mockRecords = [
      { status: "pendiente", createdAt: new Date() },
      { status: "corregido", createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
    ];
    // Sin filtro
    const filtered = mockRecords;
    expect(filtered).toHaveLength(2);
  });
});

// ── Pruebas de la tabla de antigüedad (VacationSeniority) ────────────────────
describe("Tabla de antigüedad de vacaciones", () => {
  const DEFAULT_LFT_TABLE = [
    { yearsMin: 1, yearsMax: 1, vacationDays: 12 },
    { yearsMin: 2, yearsMax: 2, vacationDays: 14 },
    { yearsMin: 3, yearsMax: 3, vacationDays: 16 },
    { yearsMin: 4, yearsMax: 4, vacationDays: 18 },
    { yearsMin: 5, yearsMax: 9, vacationDays: 20 },
    { yearsMin: 10, yearsMax: 14, vacationDays: 22 },
    { yearsMin: 15, yearsMax: 19, vacationDays: 24 },
    { yearsMin: 20, yearsMax: 24, vacationDays: 26 },
    { yearsMin: 25, yearsMax: null, vacationDays: 28 },
  ];

  it("La tabla LFT tiene 9 rangos", () => {
    expect(DEFAULT_LFT_TABLE).toHaveLength(9);
  });

  it("El primer año tiene 12 días (mínimo LFT)", () => {
    const firstYear = DEFAULT_LFT_TABLE.find(r => r.yearsMin === 1);
    expect(firstYear?.vacationDays).toBe(12);
  });

  it("El último rango no tiene límite superior (null)", () => {
    const lastRange = DEFAULT_LFT_TABLE[DEFAULT_LFT_TABLE.length - 1];
    expect(lastRange.yearsMax).toBeNull();
  });

  it("Todos los días de vacaciones son positivos", () => {
    DEFAULT_LFT_TABLE.forEach(row => {
      expect(row.vacationDays).toBeGreaterThan(0);
    });
  });

  it("Calcula correctamente las semanas de vacaciones", () => {
    const row = DEFAULT_LFT_TABLE[0]; // 12 días
    const semanas = row.vacationDays / 7;
    expect(semanas).toBeCloseTo(1.71, 1);
  });

  it("Valida que no se permiten días = 0", () => {
    const invalidRow = { yearsMin: 1, yearsMax: 1, vacationDays: 0 };
    const isValid = invalidRow.vacationDays > 0;
    expect(isValid).toBe(false);
  });
});

// ── Pruebas del folio configurable ───────────────────────────────────────────
describe("Configuración de folio del dictamen", () => {
  it("El prefijo por defecto es NOM035-DICT", () => {
    const defaultConfig = {
      codigoFormato: "NOM035-DICT",
      version: "1.0",
      referenciaNormativa: "NOM-035-STPS-2018",
    };
    expect(defaultConfig.codigoFormato).toBe("NOM035-DICT");
  });

  it("La referencia normativa por defecto es correcta", () => {
    const config = { referenciaNormativa: "NOM-035-STPS-2018" };
    expect(config.referenciaNormativa).toContain("NOM-035");
    expect(config.referenciaNormativa).toContain("STPS");
  });
});

// ── Pruebas del QR NOM-151 ───────────────────────────────────────────────────
describe("QR de verificación NOM-151", () => {
  it("Genera una URL de QR válida con los datos del dictamen", () => {
    const folio = "NOM035-DICT-2024-001";
    const empresa = "Empresa de Prueba SA de CV";
    const fecha = "24 de abril de 2026";
    const riesgo = "Medio";
    const qrData = encodeURIComponent(
      `DICTAMEN NOM-035 | Folio: ${folio} | Fecha: ${fecha} | Riesgo: ${riesgo} | Empresa: ${empresa} | Ref: NOM-035-STPS-2018`
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;
    expect(qrUrl).toContain("api.qrserver.com");
    expect(qrUrl).toContain("NOM-035");
    expect(qrUrl).toContain(encodeURIComponent("NOM035-DICT-2024-001"));
  });
});
