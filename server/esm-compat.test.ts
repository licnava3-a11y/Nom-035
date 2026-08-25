/**
 * ESM Compatibility Regression Tests
 *
 * Verifica que el código de producción (server/ y shared/) NO usa variables
 * exclusivas de CommonJS (__dirname, __filename, require) que causan
 * ReferenceError en Cloud Run cuando el proyecto compila como ESM.
 *
 * Historia: el despliegue falló con:
 *   ReferenceError: __dirname is not defined
 *   at startServer (file:///usr/src/app/dist/index.js:72590:37)
 *
 * Causa: se agregó path.join(__dirname, ...) en server/_core/index.ts.
 * Corrección: usar import.meta.dirname (ESM-compatible).
 *
 * Este test previene que el error regrese en futuras modificaciones.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join, extname } from "path";

const ROOT = resolve(import.meta.dirname, "..");

/**
 * Obtiene recursivamente todos los archivos .ts y .tsx de un directorio,
 * excluyendo node_modules, dist, y archivos de test.
 */
function getSourceFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (["node_modules", "dist", ".git", "coverage"].includes(entry))
        continue;
      getSourceFiles(fullPath, files);
    } else {
      const ext = extname(entry);
      if (
        [".ts", ".tsx"].includes(ext) &&
        !entry.endsWith(".test.ts") &&
        !entry.endsWith(".test.tsx")
      ) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

/**
 * Detecta uso real de __dirname (no en comentarios ni strings).
 * Patrón: __dirname seguido de ) , + o espacio — excluye menciones en comentarios.
 */
function findDirnameCalls(content: string, filePath: string): string[] {
  const violations: string[] = [];
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trimStart();
    // Ignorar líneas que son comentarios
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*")
    )
      return;
    // Detectar __dirname usado como valor (no en comentarios inline)
    // Eliminar la parte de comentario inline antes de buscar
    const codeOnly = line.replace(/\/\/.*$/, "");
    if (/\b__dirname\b/.test(codeOnly)) {
      violations.push(`  ${filePath}:${idx + 1} → ${line.trim()}`);
    }
  });
  return violations;
}

/**
 * Detecta uso real de __filename (no en comentarios).
 */
function findFilenameCalls(content: string, filePath: string): string[] {
  const violations: string[] = [];
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trimStart();
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*")
    )
      return;
    const codeOnly = line.replace(/\/\/.*$/, "");
    if (/\b__filename\b/.test(codeOnly)) {
      violations.push(`  ${filePath}:${idx + 1} → ${line.trim()}`);
    }
  });
  return violations;
}

/**
 * Detecta require() en código de producción (no en comentarios ni strings de documentación).
 * Permite require() en archivos de configuración como vite.config.ts y drizzle.config.ts.
 */
function findRequireCalls(content: string, filePath: string): string[] {
  // Archivos de configuración que pueden usar require() legítimamente
  const allowedFiles = [
    "vite.config.ts",
    "drizzle.config.ts",
    "tailwind.config.ts",
    "postcss.config.ts",
  ];
  const fileName = filePath.split("/").pop() ?? "";
  if (allowedFiles.includes(fileName)) return [];

  const violations: string[] = [];
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trimStart();
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*")
    )
      return;
    const codeOnly = line.replace(/\/\/.*$/, "");
    // Detectar require() como llamada de función (no en strings)
    if (
      /\brequire\s*\(/.test(codeOnly) &&
      !codeOnly.includes('"require"') &&
      !codeOnly.includes("'require'")
    ) {
      violations.push(`  ${filePath}:${idx + 1} → ${line.trim()}`);
    }
  });
  return violations;
}

describe("ESM Compatibility — Prevención de errores de despliegue en Cloud Run", () => {
  const serverFiles = getSourceFiles(join(ROOT, "server"));
  const sharedFiles = getSourceFiles(join(ROOT, "shared"));
  const allSourceFiles = [...serverFiles, ...sharedFiles];

  it("ningún archivo de producción usa __dirname (CJS-only, causa ReferenceError en ESM)", () => {
    const allViolations: string[] = [];
    for (const file of allSourceFiles) {
      const content = readFileSync(file, "utf-8");
      const relPath = file.replace(ROOT + "/", "");
      const violations = findDirnameCalls(content, relPath);
      allViolations.push(...violations);
    }
    if (allViolations.length > 0) {
      const msg = [
        `Se encontraron ${allViolations.length} uso(s) de __dirname en código de producción.`,
        "Reemplazar con import.meta.dirname (ESM-compatible):",
        ...allViolations,
      ].join("\n");
      expect.fail(msg);
    }
    expect(allViolations).toHaveLength(0);
  });

  it("ningún archivo de producción usa __filename (CJS-only, causa ReferenceError en ESM)", () => {
    const allViolations: string[] = [];
    for (const file of allSourceFiles) {
      const content = readFileSync(file, "utf-8");
      const relPath = file.replace(ROOT + "/", "");
      const violations = findFilenameCalls(content, relPath);
      allViolations.push(...violations);
    }
    if (allViolations.length > 0) {
      const msg = [
        `Se encontraron ${allViolations.length} uso(s) de __filename en código de producción.`,
        "Reemplazar con import.meta.filename (ESM-compatible):",
        ...allViolations,
      ].join("\n");
      expect.fail(msg);
    }
    expect(allViolations).toHaveLength(0);
  });

  it("ningún archivo de producción usa require() (CJS-only, incompatible con ESM puro)", () => {
    const allViolations: string[] = [];
    for (const file of allSourceFiles) {
      const content = readFileSync(file, "utf-8");
      const relPath = file.replace(ROOT + "/", "");
      const violations = findRequireCalls(content, relPath);
      allViolations.push(...violations);
    }
    if (allViolations.length > 0) {
      const msg = [
        `Se encontraron ${allViolations.length} uso(s) de require() en código de producción.`,
        "Reemplazar con import estático o import() dinámico (ESM-compatible):",
        ...allViolations,
      ].join("\n");
      expect.fail(msg);
    }
    expect(allViolations).toHaveLength(0);
  });

  it("server/_core/index.ts usa Vite en desarrollo y estáticos ESM en producción", () => {
    const indexPath = join(ROOT, "server/_core/index.ts");
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain(
      'import { serveStatic, setupVite } from "./vite"'
    );
    expect(content).toContain('process.env.NODE_ENV === "development"');
    expect(content).toContain("await setupVite(app, server)");
    expect(content).toContain("serveStatic(app)");
  });

  it("el proyecto tiene package.json con type:module (confirma que el runtime es ESM)", () => {
    const pkgPath = join(ROOT, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    expect(pkg.type).toBe("module");
  });

  it("server/_core/vite.ts resuelve el directorio estático con import.meta.dirname", () => {
    const vitePath = join(ROOT, "server/_core/vite.ts");
    const content = readFileSync(vitePath, "utf-8");
    expect(content).toContain("const distPath");
    expect(content).toContain("import.meta.dirname");
  });
});
