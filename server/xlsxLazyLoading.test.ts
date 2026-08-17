import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("XLSX diferido", () => {
  it("no incorpora XLSX en el módulo inicial del organigrama ni de exportaciones prioritarias", () => {
    const organization = readFileSync(resolve(process.cwd(), "client/src/pages/OrganizationChart.tsx"), "utf8");
    expect(organization).toContain("await import('xlsx')");
    expect(organization).not.toContain("import * as XLSX from 'xlsx'");

    for (const page of ["AlertHistory.tsx", "ExecutiveReport.tsx", "KPIDashboard.tsx", "VacationManagement.tsx", "Positions.tsx"]) {
      const source = readFileSync(resolve(process.cwd(), "client/src/pages", page), "utf8");
      expect(source).toContain("loadXlsx");
      expect(source).not.toContain("import * as XLSX from \"xlsx\"");
    }
  });
});
