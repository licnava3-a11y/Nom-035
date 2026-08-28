#!/usr/bin/env node
/**
 * Prepara una migración gradual y reversible de exportaciones ExcelJS.
 *
 * Uso:
 *   node scripts/prepare-export-migration.mjs --inventory
 *   node scripts/prepare-export-migration.mjs --prepare-adapter
 *
 * No reescribe archivos de negocio ni cambia el motor de exportación en producción.
 * Genera un inventario verificable y un adaptador CSV opt-in para exportaciones simples.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const reportDir = path.join(root, "reports", "dependency-remediation");
const adapterPath = path.join(root, "server", "services", "exports", "csvExport.ts");
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (extensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function inventory() {
  const files = [...walk(path.join(root, "server")), ...walk(path.join(root, "client"))];
  const findings = files.flatMap((file) => {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    return lines.flatMap((line, index) =>
      /(?:from\s+["']exceljs["']|require\(["']exceljs["']\)|ExcelJS)/.test(line)
        ? [{ file: path.relative(root, file), line: index + 1, snippet: line.trim() }]
        : []
    );
  });
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "exceljs-inventory.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: findings.length, findings }, null, 2) + "\n"
  );
  console.log(`Inventario creado: ${findings.length} uso(s) de ExcelJS.`);
  console.log(path.join(reportDir, "exceljs-inventory.json"));
}

function prepareAdapter() {
  fs.mkdirSync(path.dirname(adapterPath), { recursive: true });
  if (!fs.existsSync(adapterPath)) {
    fs.writeFileSync(
      adapterPath,
      `/** Exportador CSV ligero para reportes tabulares sin formato avanzado. */\nexport function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {\n  const escape = (value: string | number | null | undefined) => {\n    const text = String(value ?? \"\");\n    return /[\\\",\\n]/.test(text) ? \\\"\\\" + text.replace(/\\\"/g, \\\"\\\"\\\") + \\\"\\\" : text;\n  };\n  return [headers, ...rows].map((row) => row.map(escape).join(\",\")).join(\"\\n\");\n}\n`
    );
    console.log("Adaptador CSV opt-in creado.");
  } else {
    console.log("Adaptador CSV existente; no se sobrescribió.");
  }
  console.log("Siguiente paso: migrar únicamente exportaciones tabulares inventariadas y cubrirlas con pruebas de archivo.");
}

const mode = process.argv[2] ?? "--inventory";
if (mode === "--inventory") inventory();
else if (mode === "--prepare-adapter") prepareAdapter();
else {
  console.error("Uso: --inventory | --prepare-adapter");
  process.exitCode = 1;
}
