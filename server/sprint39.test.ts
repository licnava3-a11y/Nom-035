/**
 * Sprint 39 Tests — Deuda Técnica y PWA
 * Cubre: PWAUpdateBanner, alertas LCP email, consolidación Skeletons
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

  it("PWAUpdateBanner importa useRegisterSW de virtual:pwa-register/react", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "client/src/components/PWAUpdateBanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("virtual:pwa-register/react");
    expect(content).toContain("useRegisterSW");
  });

  it("PWAUpdateBanner usa toast.info para notificar la actualización", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "client/src/components/PWAUpdateBanner.tsx"),
      "utf-8"
    );
    expect(content).toContain("toast.info");
    expect(content).toContain("Nueva versión disponible");
    expect(content).toContain("updateServiceWorker");
  });

  it("PWAUpdateBanner está integrado en App.tsx", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "client/src/App.tsx"),
      "utf-8"
    );
    expect(content).toContain("PWAUpdateBanner");
    expect(content).toContain("<PWAUpdateBanner />");
  });

  it("tsconfig.json incluye el tipo vite-plugin-pwa/react", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "tsconfig.json"),
      "utf-8"
    );
    expect(content).toContain("vite-plugin-pwa/react");
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

  it("el job está registrado en el scheduler de index.ts", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "server/_core/index.ts"),
      "utf-8"
    );
    expect(content).toContain("startPerformanceLcpAlertsJob");
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

// ── VitePWA configuración ──────────────────────────────────────────────────
describe("Sprint 39 — VitePWA configuración", () => {
  it("vite.config.ts tiene VitePWA configurado", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "vite.config.ts"),
      "utf-8"
    );
    expect(content).toContain("VitePWA");
    expect(content).toContain("registerType");
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
