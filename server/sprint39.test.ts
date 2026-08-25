/**
 * Sprint 39 Tests — Deuda Técnica y PWA
 * Cubre: PWAUpdateBanner, alertas LCP email, consolidación Skeletons.
 * El Service Worker permanece deshabilitado para prevenir bucles de recarga.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function projectDependencies() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
  );
  return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

describe("Sprint 39 — PWAUpdateBanner", () => {
  it("el componente PWAUpdateBanner existe", () => {
    expect(
      fs.existsSync(
        path.join(ROOT, "client/src/components/PWAUpdateBanner.tsx")
      )
    ).toBe(true);
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
    const parsed = JSON.parse(
      fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf-8")
    );
    expect(parsed.compilerOptions).toBeDefined();
  });

  it("package.json no incluye vite-plugin-pwa porque el Service Worker está deshabilitado", () => {
    expect(projectDependencies()["vite-plugin-pwa"]).toBeUndefined();
  });

  it("index.html desregistra Service Workers heredados", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "client/index.html"),
      "utf-8"
    );
    expect(content).toContain("serviceWorker");
    expect(content).toContain("unregister");
  });
});

describe("Sprint 39 — Alertas LCP Email", () => {
  const jobPath = path.join(ROOT, "server/jobs/performance-lcp-alerts-job.ts");

  it("performance-lcp-alerts-job.ts existe", () => {
    expect(fs.existsSync(jobPath)).toBe(true);
  });

  it("el job integra sendEmail, systemSettings y el resultado emailSent", () => {
    const content = fs.readFileSync(jobPath, "utf-8");
    expect(content).toContain("sendEmail");
    expect(content).toContain("systemSettings");
    expect(content).toContain("getHrEmail");
    expect(content).toContain("Alerta de Rendimiento");
    expect(content).toContain("LCP POOR");
    expect(content).toContain("emailSent?: boolean");
  });

  it("el scheduler documenta que el job LCP está deshabilitado por no ser crítico", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "server/_core/index.ts"),
      "utf-8"
    );
    expect(content).toContain("DESHABILITADO: performance-lcp-alerts-job");
  });
});

describe("Sprint 39 — Consolidación Skeletons", () => {
  it("mantiene los skeletons consolidados", () => {
    const dir = path.join(ROOT, "client/src/components/skeletons");
    for (const name of [
      "DashboardSkeleton.tsx",
      "TableSkeleton.tsx",
      "ChartSkeleton.tsx",
      "CalendarSkeleton.tsx",
    ]) {
      expect(fs.existsSync(path.join(dir, name))).toBe(true);
    }
  });
});

describe("Sprint 39 — VitePWA deshabilitado", () => {
  it("vite.config.ts no importa VitePWA", () => {
    const content = fs.readFileSync(path.join(ROOT, "vite.config.ts"), "utf-8");
    expect(content).not.toContain('from "vite-plugin-pwa"');
  });

  it("el plugin no permanece en las dependencias del proyecto", () => {
    expect(projectDependencies()["vite-plugin-pwa"]).toBeUndefined();
  });
});
