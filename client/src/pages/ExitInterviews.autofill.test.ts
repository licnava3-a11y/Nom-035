import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("registro de baja con catálogo de empleados", () => {
  it("usa el selector centralizado en lugar de una consulta local duplicada", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/ExitInterviews.tsx"), "utf8");

    expect(source).toContain("EmployeeAutofillSelector");
    expect(source).toContain("handleEmployeeSelect");
    expect(source).not.toContain("employeesData?.employees");
  });
});
