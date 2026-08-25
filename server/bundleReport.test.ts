import { describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

describe("reporte de presupuesto de bundle", () => {
  it("registra tamaño bruto, gzip y assets que exceden el presupuesto", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/report-bundle.mjs"),
      "utf8"
    );
    const manifest = readFileSync(
      resolve(process.cwd(), "package.json"),
      "utf8"
    );
    expect(source).toContain("BUDGET_BYTES = 900 * 1024");
    expect(source).toContain("gzipSync");
    expect(source).toContain("bundle-budget.json");
    expect(source).toContain("vendorXlsxBytes");
    expect(source).toContain("vendorXlsxGzipBytes");
    expect(source).toContain("vendor-xlsx");
    expect(manifest).toContain('"report:bundle"');
    expect(manifest).toContain("pnpm report:bundle");
    const viteConfig = readFileSync(
      resolve(process.cwd(), "vite.config.ts"),
      "utf8"
    );
    expect(viteConfig).toContain("reportCompressedSize: false");
    expect(viteConfig).toContain("vendor-xlsx");
    expect(viteConfig).toContain("vendor-pdf");
    expect(viteConfig).toContain("vendor-export-utils");
  });

  it("mide vendor-xlsx de forma independiente en el reporte generado", () => {
    const workspace = mkdtempSync(join(tmpdir(), "nom035-bundle-report-"));
    const assetsDir = join(workspace, "dist", "public", "assets");

    try {
      mkdirSync(assetsDir, { recursive: true });
      writeFileSync(
        join(assetsDir, "vendor-xlsx-fixture.js"),
        "export const workbook = 'xlsx';\n"
      );
      writeFileSync(
        join(assetsDir, "application-fixture.js"),
        "export const app = 'nom035';\n"
      );

      const result = spawnSync(
        process.execPath,
        [resolve(process.cwd(), "scripts/report-bundle.mjs")],
        {
          cwd: workspace,
          encoding: "utf8",
        }
      );
      expect(result.status, result.stderr).toBe(0);

      const report = JSON.parse(
        readFileSync(join(workspace, "reports", "bundle-budget.json"), "utf8")
      );
      expect(report.vendorXlsxBytes).toBeGreaterThan(0);
      expect(report.vendorXlsxGzipBytes).toBeGreaterThan(0);
      expect(report.xlsxAssets).toHaveLength(1);
      expect(report.xlsxAssets[0].file).toContain("vendor-xlsx-fixture.js");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
