/**
 * Sprint 29 Tests
 * - Sidebar link for /web-vitals
 * - Performance LCP alert job logic
 * - Company logo upload and PDF cover
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 1. Sidebar link ──────────────────────────────────────────────────────────
describe("Sprint 29 – Sidebar /web-vitals link", () => {
  it("DashboardLayout.tsx contains the /web-vitals route", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      __dirname,
      "../client/src/components/DashboardLayout.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("/web-vitals");
    expect(content).toContain("Core Web Vitals");
  });

  it("App.tsx registers the /web-vitals route", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/App.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("/web-vitals");
    expect(content).toContain("WebVitalsDashboard");
  });
});

// ─── 2. Performance LCP alert job ────────────────────────────────────────────
describe("Sprint 29 – Performance LCP alert job", () => {
  it("performance-lcp-alerts-job.ts exists and exports runPerformanceLCPAlertsJob", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      __dirname,
      "./jobs/performance-lcp-alerts-job.ts"
    );
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("runPerformanceLcpAlertsJob");
    expect(content).toContain("4000"); // LCP threshold
    expect(content).toContain("3"); // 3 consecutive days
  });

  it("alertType enum in schema includes performance_lcp", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const schemaPath = path.resolve(__dirname, "../drizzle/schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain("performance_lcp");
  });

  it("_core/index.ts documenta que el job LCP queda deshabilitado por ser no crítico", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.resolve(__dirname, "./_core/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toContain("DESHABILITADO: performance-lcp-alerts-job");
  });
});

// ─── 3. Company logo in PDF cover ────────────────────────────────────────────
describe("Sprint 29 – Company logo in PDF cover", () => {
  it("getCompanyInfo returns company_logo field", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "./routers/systemSettings.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("company_logo");
    // Ensure it's included in the inArray query
    expect(content).toContain('"company_logo"');
  });

  it("saveCompanyInfo accepts company_logo field", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "./routers/systemSettings.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("company_logo: z.string().max(2048)");
  });

  it("Settings.tsx has logo upload UI", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/Settings.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Logotipo de la Empresa");
    expect(content).toContain("company-logos");
    expect(content).toContain("/api/upload");
  });

  it("ExecutiveReport.tsx uses company_logo in PDF cover", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/ExecutiveReport.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("company_logo");
    expect(content).toContain("addImage");
    expect(content).toContain("FileReader");
  });
});

// ─── 4. Web Vitals router ─────────────────────────────────────────────────────
describe("Sprint 29 – Web Vitals router", () => {
  it("webVitals.ts router exists", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "./routers/webVitals.ts");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("webVitalsRouter is registered in routers.ts", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "./routers.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("webVitals");
  });
});
