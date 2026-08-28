import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("canalización de calidad", () => {
  it("ejecuta tipos, seguridad de tipos y pruebas secuenciales", () => {
    const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/quality.yml"), "utf8");
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    expect(workflow).toContain("pnpm check:server");
    expect(workflow).toContain("pnpm check:client");
    expect(workflow).toContain("pnpm check:type-safety");
    expect(workflow).toContain("pnpm test:ci");
    expect(workflow).toContain("--frozen-lockfile");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("reports/dependency-audit.json");
    expect(workflow).toContain("reports/bundle-budget.json");
    expect(workflow).toContain("actions/github-script@v7");
    expect(workflow).toContain("nom035-bundle-budget");
    expect(workflow).toContain("image: mysql:8.4");
    expect(workflow).toContain("DATABASE_URL: mysql://root:root@127.0.0.1:3306/nom035_test");
    expect(workflow).toContain("pnpm drizzle-kit push --force");
    expect(workflow.indexOf("pnpm/action-setup@v4")).toBeLessThan(workflow.indexOf("actions/setup-node@v4"));
    expect(workflow).not.toMatch(/pnpm\/action-setup@v4[\s\S]{0,160}version:\s*10/);
    expect(packageJson.scripts["test:ci"]).toContain("--maxWorkers=1");
    expect(packageJson.scripts["test:ci"]).toContain("correctiveActions.generatePDF");
    expect(packageJson.scripts["test:integration"]).toContain("test:integration:database");
    expect(packageJson.scripts["test:integration"]).toContain("test:integration:storage");
    expect(packageJson.scripts["test:integration"]).toContain("test:integration:ai");
    expect(packageJson.scripts["test:integration:storage"]).toContain("correctiveActions.generatePDF.test.ts");
  });
});
