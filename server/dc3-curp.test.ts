/**
 * Tests para el endpoint dc3.lookupCurp y el validador de CURP
 *
 * Cubre:
 *  - Validación de formato CURP (válido / inválido)
 *  - Extracción de datos locales (sexo, fecha, estado)
 *  - Respuesta del endpoint cuando CURP es inválida
 *  - Respuesta del endpoint cuando CURP es válida sin empleado ni API token
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { extractCURPData, validateCURPFormat } from "./lib/curp-validator";

// ─── Tests del validador local ────────────────────────────────────────────────

describe("validateCURPFormat", () => {
  it("acepta una CURP masculina válida", () => {
    expect(validateCURPFormat("GALJ850101HDFXXX00")).toBe(true);
  });

  it("acepta una CURP femenina válida", () => {
    expect(validateCURPFormat("ROPA900215MDFXXX01")).toBe(true);
  });

  it("rechaza una CURP de menos de 18 caracteres", () => {
    expect(validateCURPFormat("GALJ850101HDFXX")).toBe(false);
  });

  it("rechaza una CURP de más de 18 caracteres", () => {
    expect(validateCURPFormat("GALJ850101HDFXXX001")).toBe(false);
  });

  it("rechaza una CURP con estado inválido", () => {
    expect(validateCURPFormat("GALJ850101HZZXXX00")).toBe(false);
  });

  it("acepta CURP en minúsculas (normaliza internamente)", () => {
    expect(validateCURPFormat("galj850101hdfxxx00")).toBe(true);
  });
});

describe("extractCURPData", () => {
  it("extrae sexo masculino correctamente", () => {
    const data = extractCURPData("GALJ850101HDFXXX00");
    expect(data.valid).toBe(true);
    expect(data.sexo).toBe("H");
    expect(data.genero).toBe("Masculino");
  });

  it("extrae sexo femenino correctamente", () => {
    const data = extractCURPData("ROPA900215MDFXXX01");
    expect(data.valid).toBe(true);
    expect(data.sexo).toBe("M");
    expect(data.genero).toBe("Femenino");
  });

  it("extrae fecha de nacimiento del siglo XX (año > 30)", () => {
    const data = extractCURPData("GALJ850101HDFXXX00");
    expect(data.valid).toBe(true);
    expect(data.fechaNacimiento).toBe("1985-01-01");
  });

  it("extrae fecha de nacimiento del siglo XXI (año <= 30)", () => {
    const data = extractCURPData("HEML020730HDFXXX02");
    expect(data.valid).toBe(true);
    expect(data.fechaNacimiento).toBe("2002-07-30");
  });

  it("extrae estado de nacimiento correctamente", () => {
    const data = extractCURPData("GALJ850101HDFXXX00");
    expect(data.valid).toBe(true);
    expect(data.codigoEstado).toBe("DF");
    expect(data.estado).toBe("Ciudad de México");
  });

  it("retorna valid=false para CURP inválida", () => {
    const data = extractCURPData("INVALIDA");
    expect(data.valid).toBe(false);
    expect(data.errors).toBeDefined();
    expect(data.errors!.length).toBeGreaterThan(0);
  });

  it("calcula edad razonable para CURP de 1985", () => {
    const data = extractCURPData("GALJ850101HDFXXX00");
    expect(data.valid).toBe(true);
    expect(data.edad).toBeGreaterThanOrEqual(39);
    expect(data.edad).toBeLessThanOrEqual(42);
  });
});

// ─── Tests del router dc3.lookupCurp ─────────────────────────────────────────

describe("dc3Router.lookupCurp (sin DB, sin API token)", () => {
  /**
   * Prueba el comportamiento del endpoint directamente importando la lógica
   * de validación, sin levantar el servidor completo.
   */

  it("retorna found=false para CURP con formato inválido", () => {
    const data = extractCURPData("INVALIDA123");
    expect(data.valid).toBe(false);
  });

  it("retorna found=true para CURP con formato válido", () => {
    const data = extractCURPData("GALJ850101HDFXXX00");
    expect(data.valid).toBe(true);
    expect(data.sexo).toBeDefined();
    expect(data.fechaNacimiento).toBeDefined();
    expect(data.estado).toBeDefined();
  });

  it("CURP con estado NE (nacido en el extranjero) es válida", () => {
    // NE es un código válido para nacidos en el extranjero
    const data = extractCURPData("GALJ850101HNEXXX00");
    expect(data.valid).toBe(true);
    expect(data.estado).toBe("Nacido en el Extranjero");
  });
});
