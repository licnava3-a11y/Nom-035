import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("dashboard de encuestas: dominios de Guía III", () => {
  it("muestra dominios disponibles y explica la ausencia de datos o no aplicabilidad", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/surveys/Dashboard.tsx"), "utf8");

    expect(source).toContain("domainRiskStatus === \"available\"");
    expect(source).toContain("stats.domainRisks.map");
    expect(source).toContain("not_applicable");
    expect(source).toContain("no_domain_data");
  });
});
