import { gzipSync } from "node:zlib";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const ASSETS_DIR = resolve(ROOT, "dist/public/assets");
const REPORT_DIR = resolve(ROOT, "reports");
const BUDGET_BYTES = 900 * 1024;

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

if (!statSync(ASSETS_DIR, { throwIfNoEntry: false })) {
  console.error("No se encontró dist/public/assets. Ejecuta vite build antes del reporte de bundle.");
  process.exit(1);
}

const assets = listFiles(ASSETS_DIR)
  .filter((file) => /\.(js|css)$/i.test(file))
  .map((file) => {
    const bytes = readFileSync(file);
    return {
      file: relative(ROOT, file),
      bytes: bytes.byteLength,
      gzipBytes: gzipSync(bytes).byteLength,
      exceedsBudget: bytes.byteLength > BUDGET_BYTES,
    };
  })
  .sort((a, b) => b.bytes - a.bytes);

const report = {
  generatedAt: new Date().toISOString(),
  budgetBytes: BUDGET_BYTES,
  assetCount: assets.length,
  totalBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
  totalGzipBytes: assets.reduce((total, asset) => total + asset.gzipBytes, 0),
  oversizedAssets: assets.filter((asset) => asset.exceedsBudget).map((asset) => asset.file),
  xlsxAssets: assets.filter((asset) => asset.file.includes("vendor-xlsx")),
  assets,
};
report.vendorXlsxBytes = report.xlsxAssets.reduce((total, asset) => total + asset.bytes, 0);
report.vendorXlsxGzipBytes = report.xlsxAssets.reduce((total, asset) => total + asset.gzipBytes, 0);

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(join(REPORT_DIR, "bundle-budget.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  join(REPORT_DIR, "bundle-budget.md"),
  [
    "# Reporte de presupuesto de bundle",
    "",
    `Generado: ${report.generatedAt}`,
    `Presupuesto por asset: ${(BUDGET_BYTES / 1024).toFixed(0)} KB sin comprimir.`,
    `Total: ${(report.totalBytes / 1024).toFixed(1)} KB (${(report.totalGzipBytes / 1024).toFixed(1)} KB gzip).`,
    `vendor-xlsx: ${(report.vendorXlsxBytes / 1024).toFixed(1)} KB (${(report.vendorXlsxGzipBytes / 1024).toFixed(1)} KB gzip) en ${report.xlsxAssets.length} asset(s).`,
    "",
    "| Asset | Tamaño | Gzip | Estado |",
    "|---|---:|---:|---|",
    ...assets.map((asset) => `| ${asset.file} | ${(asset.bytes / 1024).toFixed(1)} KB | ${(asset.gzipBytes / 1024).toFixed(1)} KB | ${asset.exceedsBudget ? "Excede" : "OK"} |`),
  ].join("\n") + "\n",
);

console.log(`Reporte de bundle guardado en reports/bundle-budget.{json,md}; ${report.oversizedAssets.length} assets exceden el presupuesto.`);
