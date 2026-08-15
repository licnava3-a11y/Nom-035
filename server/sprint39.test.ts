/**
 * Sprint 39 Tests — Deuda Técnica y PWA
 * Cubre: PWAUpdateBanner, alertas LCP email, consolidación Skeletons
 *
 * Sprint 42: VitePWA fue comentado/deshabilitado para solucionar el spinner infinito.
 * PWAUpdateBanner sigue en el código pero VitePWA está deshabilitado.
 * Los tests han sido actualizados para reflejar el estado actual.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

// ── PWA Update Banner ──────────────────────────────────────────────────────
describe("Sprint 39 — PWAUpdateBanner", () => {
  it("el componente PWAUpdateBanner existe", () => {
    const filePath = path.join(ROOT, "client/src/components/PWAUpdateBanner.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("PWAUpdateBanner está integrado en App.tsx", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "client/src/App.tsx"),
      "utf-8"
    );
    expect(content).toContain("PWAUpdateBanner");
    expect(content).toContain("<PWAUpdateBanner />");
  });

  it("tsconfig.json es un JSON válido con compilerOptions", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "tsconfig.json"),
      "utf-8"
    );
    const parsed = JSON.parse(content);
    expect(parsed.compilerOptions).toBeDefined();
  });

  it("package.json tiene vite-plugin-pwa como dependencia", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    expect(allDeps["vite-plugin-pwa"]).toBeDefined();
  });

  it("index.html tiene script de desregistro de Service Workers (Sprint 42)", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "client/index.html"),
      "utf-8"
    );
    // Sprint 42: se agregó script para desregistrar SWs y evitar loops
    expect(content).toContain("serviceWorker");
    expect(content).toContain("unregister");
  });
});

// ── Alertas LCP por Email ──────────────────────────────────────────────────
describe("Sprint 39 — Alertas LCP Email", () => {
  it("performance-lcp-alerts-job.ts existe", () => {
    const filePath = path.join(ROOT, "server/jobs/performance-lcp-alerts-job.ts");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("el job importa sendEmail y systemSettings", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "server/jobs/performance-lcp-alerts-job.ts"),
      "utf-8"
    );
    expect(content).toContain("sendEmail");
    expect(content).toContain("systemSettings");
  });

  it("el job obtiene hrEmail desde systemSettings", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "server/jobs/performance-lcp-alerts-job.ts"),
      "utf-8"
    );
    expect(content).toContain("getHrEmail");
    expect(content).toContain("hrEmail");
  });

  it("el job envía email con asunto de alerta LCP", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "server/jobs/performance-lcp-alerts-job.ts"),
      "utf-8"
    );
    expect(content).toContain("Alerta de Rendimiento");
    expect(content).toContain("LCP POOR");
    expect(content).toContain("emailSent");
  });

  it("el job retorna emailSent en el resultado", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "server/jobs/performance-lcp-alerts-job.ts"),
      "utf-8"
    );
    expect(content).toContain("emailSent?: boolean");
    expect(content).toContain("return { success: true, alertCreated: true, emailSent");
  });

  it("el scheduler documenta que el job LCP está deshabilitado por no ser crítico", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "server/_core/index.ts"),
      "utf-8"
    );
    expect(content).toContain("DESHABILITADO: performance-lcp-alerts-job");
  });
});

// ── Consolidación de Skeletons ─────────────────────────────────────────────
describe("Sprint 39 — Consolidación Skeletons", () => {
  it("existe el directorio de skeletons consolidados", () => {
    const dirPath = path.join(ROOT, "client/src/components/skeletons");
    expect(fs.existsSync(dirPath)).toBe(true);
  });

  it("DashboardSkeleton existe en el directorio de skeletons", () => {
    const filePath = path.join(ROOT, "client/src/components/skeletons/DashboardSkeleton.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("TableSkeleton existe en el directorio de skeletons", () => {
    const filePath = path.join(ROOT, "client/src/components/skeletons/TableSkeleton.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("ChartSkeleton existe en el directorio de skeletons", () => {
    const filePath = path.join(ROOT, "client/src/components/skeletons/ChartSkeleton.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("CalendarSkeleton existe en el directorio de skeletons", () => {
    const filePath = path.join(ROOT, "client/src/components/skeletons/CalendarSkeleton.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

// ── VitePWA configuración (deshabilitado en Sprint 42) ────────────────────
// Sprint 42: VitePWA fue comentado para solucionar el spinner infinito en iOS Safari.
describe("Sprint 39 — VitePWA configuración (deshabilitado en Sprint 42)", () => {
  it("vite.config.ts tiene el import de VitePWA comentado (deshabilitado)", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "vite.config.ts"),
      "utf-8"
    );
    // VitePWA fue comentado en Sprint 42 para solucionar el spinner infinito
    expect(content).toContain("// import { VitePWA }");
  });

  it("vite-plugin-pwa está en las dependencias del proyecto", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    expect(allDeps["vite-plugin-pwa"]).toBeDefined();
  });
});
