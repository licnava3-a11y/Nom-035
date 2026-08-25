import { describe, it, expect } from "vitest";
import {
  validateCURPFormat,
  extractCURPData,
  validateCURP,
} from "./lib/curp-validator";

describe("CURP Validator", () => {
  describe("validateCURPFormat", () => {
    it("should validate correct CURP format", () => {
      expect(validateCURPFormat("PEGG850101HCHRRN09")).toBe(true);
      expect(validateCURPFormat("MARA900215MDFRRN08")).toBe(true);
    });

    it("should reject invalid CURP format", () => {
      expect(validateCURPFormat("INVALID")).toBe(false);
      expect(validateCURPFormat("PEGG85010")).toBe(false); // Too short
      expect(validateCURPFormat("PEGG850101HCHRRN099")).toBe(false); // Too long
      expect(validateCURPFormat("")).toBe(false);
    });

    it("should handle lowercase CURP", () => {
      expect(validateCURPFormat("pegg850101hchrrn09")).toBe(true);
    });
  });

  describe("extractCURPData", () => {
    it("should extract data from valid CURP", () => {
      const result = extractCURPData("PEGG850101HCHRRN09");

      expect(result.valid).toBe(true);
      expect(result.curp).toBe("PEGG850101HCHRRN09");
      expect(result.fechaNacimiento).toBe("1985-01-01");
      expect(result.sexo).toBe("H");
      expect(result.genero).toBe("Masculino");
      expect(result.codigoEstado).toBe("CH");
      expect(result.estado).toBe("Chihuahua");
    });

    it("should extract data from female CURP", () => {
      const result = extractCURPData("MARA900215MDFRRN08");

      expect(result.valid).toBe(true);
      expect(result.sexo).toBe("M");
      expect(result.genero).toBe("Femenino");
      expect(result.fechaNacimiento).toBe("1990-02-15");
      expect(result.codigoEstado).toBe("DF");
      expect(result.estado).toBe("Ciudad de México");
    });

    it("should calculate age correctly", () => {
      // CURP de alguien nacido en 1985
      const result = extractCURPData("PEGG850101HCHRRN09");

      expect(result.edad).toBeGreaterThan(38); // Debería tener más de 38 años
      expect(result.edad).toBeLessThan(42); // Pero menos de 42
    });

    it("should handle 21st century births", () => {
      // CURP de alguien nacido en 2005
      const result = extractCURPData("PEGG050101HCHRRN09");

      expect(result.fechaNacimiento).toBe("2005-01-01");
      expect(result.edad).toBeGreaterThan(19);
      expect(result.edad).toBeLessThan(23);
    });

    it("should return error for invalid CURP", () => {
      const result = extractCURPData("INVALID");

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe("validateCURP", () => {
    it("should validate and extract data", () => {
      const result = validateCURP("PEGG850101HCHRRN09");

      expect(result.valid).toBe(true);
      expect(result.fechaNacimiento).toBe("1985-01-01");
      expect(result.genero).toBe("Masculino");
    });

    it("should handle invalid CURP", () => {
      const result = validateCURP("INVALID123");

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
