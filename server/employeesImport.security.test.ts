import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("endurecimiento de importación XLSX", () => {
  it("restringe formato, tamaño y evaluación de contenido activo", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers/employees.ts"), "utf8");
    expect(source).toContain("Solo se permiten archivos XLSX o CSV");
    expect(source).toContain("10 * 1024 * 1024");
    expect(source).toContain("cellFormula: false");
    expect(source).toContain("bookVBA: false");
  });
});
