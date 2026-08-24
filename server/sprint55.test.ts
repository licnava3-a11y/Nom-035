/**
 * Sprint 55 — Tests: Corrección definitiva del segfault en producción
 *
 * Causa raíz: server/_core/vite.ts importaba vite.config.ts ESTÁTICAMENTE.
 * esbuild bundleaba vite.config.ts en dist/index.js, incluyendo:
 *   - @tailwindcss/oxide (binario nativo .node)
 *   - @rollup/rollup-linux-x64-gnu (binario nativo .node)
 *   - vite-plugin-manus-runtime
 * Estos binarios nativos causan SIGSEGV en Cloud Run al cargar el módulo.
 *
 * Corrección:
 *   1. vite.ts ahora usa import() dinámico para vite y vite.config
 *   2. package.json build script excluye vite y plugins con --external:
 *   3. index.ts en NODE_ENV=production NUNCA llama setupVite
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const viteTsPath = path.join(ROOT, "server/_core/vite.ts");
const indexTsPath = path.join(ROOT, "server/_core/index.ts");
const packageJsonPath = path.join(ROOT, "package.json");

describe("Sprint 55 — Corrección definitiva del segfault en producción", () => {
  it("vite.ts NO tiene import estático de vite", () => {
    const content = fs.readFileSync(viteTsPath, "utf-8");
    // No debe haber import estático de vite (solo dinámico con await import)
    const staticViteImport = /^import\s+.*from\s+["']vite["']/m.test(content);
    expect(staticViteImport).toBe(false);
  });

  it("vite.ts NO tiene import estático de vite.config", () => {
    const content = fs.readFileSync(viteTsPath, "utf-8");
    // No debe haber import estático de vite.config
    const staticViteConfigImport =
      /^import\s+.*from\s+["'].*vite\.config/m.test(content);
    expect(staticViteConfigImport).toBe(false);
  });

  it("vite.ts usa import() dinámico para vite", () => {
    const content = fs.readFileSync(viteTsPath, "utf-8");
    expect(content).toContain('await import("vite")');
  });

  it("index.ts usa Vite solo en desarrollo y estáticos compatibles en producción", () => {
    const content = fs.readFileSync(indexTsPath, "utf-8");
    // Producción entrega el SPA compilado; desarrollo usa Vite para transformar main.tsx.
    expect(content).toContain("serveStatic(app)");
    expect(content).toContain("await setupVite(app, server)");
    expect(content).toContain('process.env.NODE_ENV === "development"');
  });

  it("package.json build script excluye vite y sus plugins nativos", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const buildScript = pkg.scripts?.build || "";
    expect(buildScript).toContain("--external:vite");
    expect(buildScript).toContain("--external:@vitejs/plugin-react");
    expect(buildScript).toContain("--external:@tailwindcss/vite");
    expect(buildScript).toContain("--external:vite-plugin-manus-runtime");
    expect(buildScript).not.toContain("@builder.io/vite-plugin-jsx-loc");
  });

  it("package.json build script usa NODE_OPTIONS=--max-old-space-size=4096", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const buildScript = pkg.scripts?.build || "";
    expect(buildScript).toContain("--max-old-space-size=4096");
  });

  it("Dockerfile usa pnpm build (que incluye los flags de esbuild)", () => {
    const dockerfilePath = path.join(ROOT, "Dockerfile");
    const content = fs.readFileSync(dockerfilePath, "utf-8");
    expect(content).toContain("pnpm build");
  });

  it("Dockerfile tiene HEALTHCHECK con /api/health", () => {
    const dockerfilePath = path.join(ROOT, "Dockerfile");
    const content = fs.readFileSync(dockerfilePath, "utf-8");
    expect(content).toContain("/api/health");
  });
});
