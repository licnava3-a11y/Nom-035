import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("workflow de integración", () => {
  it("aísla MySQL por defecto y ejecuta almacenamiento solo cuando se autoriza con secretos", () => {
    const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/integration.yml"), "utf8");
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("run_storage_integration");
    expect(workflow).toContain("image: mysql:8.4");
    expect(workflow).toContain("DATABASE_URL: mysql://root:root@127.0.0.1:3306/nom035_integration");
    expect(workflow).toContain("${{ secrets.BUILT_IN_FORGE_API_URL }}");
    expect(workflow).toContain("${{ secrets.BUILT_IN_FORGE_API_KEY }}");
    expect(workflow).toContain("if: inputs.run_storage_integration == 'true'");
    expect(workflow).toContain("pnpm drizzle-kit push --force");
    expect(workflow).toContain("pnpm test:integration:database --pool=forks --maxWorkers=1 --minWorkers=1");
    expect(workflow).toContain("pnpm test:integration:storage --pool=forks --maxWorkers=1 --minWorkers=1");
    expect(packageJson.scripts["test:integration"]).toContain("test:integration:database");
    expect(packageJson.scripts["test:integration"]).toContain("test:integration:storage");
  });
});
