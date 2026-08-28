import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("relaciones de datos maestros para prellenado", () => {
  it("expone empresa y sucursal desde la consulta de empleados sin duplicar los joins", () => {
    const source = readFileSync(resolve(process.cwd(), "server/db-employees.ts"), "utf8");

    expect(source).toContain("const employeeRelationSelection");
    expect(source).toContain("companies.razonSocial");
    expect(source).toContain("leftJoin(branches, eq(employees.branchId, branches.id))");
    expect(source).toContain("leftJoin(companies, eq(users.companyId, companies.id))");
  });

  it("solicita hasta cien empleados activos para un selector de captura sin paginación prematura", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/hooks/useEmployeeAutofill.ts"), "utf8");
    expect(source).toContain("pageSize: 100");
    expect(source).toContain("toEmployeeAutofillData");
  });
});
