import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("canalización de calidad", () => {
  it("ejecuta tipos, seguridad de tipos y pruebas secuenciales", () => {
    const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/quality.yml"), "utf8");
    expect(workflow).toContain("pnpm check:server");
    expect(workflow).toContain("pnpm check:client");
    expect(workflow).toContain("pnpm check:type-safety");
    expect(workflow).toContain("--maxWorkers=1");
    expect(workflow).toContain("--frozen-lockfile");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("reports/dependency-audit.json");
    expect(workflow).toContain("reports/bundle-budget.json");
    expect(workflow).toContain("actions/github-script@v7");
    expect(workflow).toContain("nom035-bundle-budget");
  });
});
