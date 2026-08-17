import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("XLSX diferido", () => {
  it("no incorpora XLSX en el módulo inicial del organigrama", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/OrganizationChart.tsx"), "utf8");
    expect(source).toContain("await import('xlsx')");
    expect(source).not.toContain("import * as XLSX from 'xlsx'");
  });
});
