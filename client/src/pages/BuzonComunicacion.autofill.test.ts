import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("prellenado del Buzón de Comunicación", () => {
  it("ofrece selección de empleado tanto para quejas como para felicitaciones", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/BuzonComunicacion.tsx"), "utf8");
    const selectorUses = source.match(/<EmployeeAutofillSelector/g) ?? [];

    expect(selectorUses.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain("handleRecognizedEmployeeSelect");
    expect(source).toContain("recognizedEmployeeId");
  });
});
