import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("workflow de integración", () => {
  it("aísla MySQL y consume credenciales externas exclusivamente desde GitHub Secrets", () => {
    const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/integration.yml"), "utf8");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("run_external_services");
    expect(workflow).toContain("image: mysql:8.4");
    expect(workflow).toContain("DATABASE_URL: mysql://root:root@127.0.0.1:3306/nom035_integration");
    expect(workflow).toContain("${{ secrets.BUILT_IN_FORGE_API_URL }}");
    expect(workflow).toContain("${{ secrets.BUILT_IN_FORGE_API_KEY }}");
    expect(workflow).toContain("${{ secrets.OPENAI_API_KEY }}");
    expect(workflow).toContain("pnpm drizzle-kit push --force");
    expect(workflow).toContain("pnpm test:integration --pool=forks --maxWorkers=1 --minWorkers=1");
  });
});
