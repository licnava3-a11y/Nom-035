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
  });
});
