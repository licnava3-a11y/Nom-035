import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("reporte de presupuesto de bundle", () => {
  it("registra tamaño bruto, gzip y assets que exceden el presupuesto", () => {
    const source = readFileSync(resolve(process.cwd(), "scripts/report-bundle.mjs"), "utf8");
    const manifest = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(source).toContain("BUDGET_BYTES = 900 * 1024");
    expect(source).toContain("gzipSync");
    expect(source).toContain("bundle-budget.json");
    expect(manifest).toContain('"report:bundle"');
    expect(manifest).toContain("pnpm report:bundle");
    const viteConfig = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    expect(viteConfig).toContain("reportCompressedSize: false");
  });
});
