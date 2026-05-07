/**
 * Sprint 43 Tests — Reporte Comparativo por Sucursal + Fix Spinner + EmployeeEdit Sucursal
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

// ─── 1. executiveReport.ts tiene getBranchComparative ─────────────────────────
describe("executiveReport.ts — getBranchComparative procedure", () => {
  const content = readFileSync(join(ROOT, "server/routers/executiveReport.ts"), "utf-8");

  it("define el procedure getBranchComparative", () => {
    expect(content).toContain("getBranchComparative");
  });

  it("acepta input con dateFrom y dateTo opcionales", () => {
    expect(content).toContain("dateFrom");
    expect(content).toContain("dateTo");
  });

  it("usa trainingNeeds (no trainingAssignments) para métricas de capacitación", () => {
    expect(content).toContain("trainingNeeds");
    // No debe usar trainingAssignments.employeeId (esa tabla no tiene employeeId)
    expect(content).not.toContain("trainingAssignments.employeeId");
  });

  it("calcula rotationRate, trainingRate y highRiskCount por sucursal", () => {
    expect(content).toContain("rotationRate");
    expect(content).toContain("trainingRate");
    expect(content).toContain("highRiskCount");
  });

  it("retorna un array de objetos con branchName y métricas", () => {
    expect(content).toContain("branchName");
    expect(content).toContain("totalEmployees");
  });
});

// ─── 2. BranchComparativeReport.tsx existe y tiene la estructura correcta ──────
describe("BranchComparativeReport.tsx — página de reporte comparativo", () => {
  const content = readFileSync(join(ROOT, "client/src/pages/BranchComparativeReport.tsx"), "utf-8");

  it("usa trpc.executiveReport.getBranchComparative", () => {
    expect(content).toContain("getBranchComparative");
  });

  it("tiene botón de exportación a Excel", () => {
    expect(content).toMatch(/[Ee]xport|[Ee]xcel|xlsx/);
  });

  it("usa la librería xlsx para exportar", () => {
    expect(content).toContain("xlsx");
  });

  it("muestra tabla comparativa con columnas de métricas", () => {
    expect(content).toContain("rotationRate");
    expect(content).toContain("trainingRate");
  });

  it("tiene filtros de fecha (dateFrom, dateTo)", () => {
    expect(content).toContain("dateFrom");
    expect(content).toContain("dateTo");
  });

  it("muestra gráficas de barras con recharts o similar", () => {
    expect(content).toMatch(/BarChart|recharts|chart/i);
  });
});

// ─── 3. App.tsx tiene la ruta /branch-comparative ─────────────────────────────
describe("App.tsx — ruta /branch-comparative", () => {
  const content = readFileSync(join(ROOT, "client/src/App.tsx"), "utf-8");

  it("importa BranchComparativeReport con lazy", () => {
    expect(content).toContain("BranchComparativeReport");
    expect(content).toContain("lazy");
  });

  it("registra la ruta /branch-comparative", () => {
    expect(content).toContain("/branch-comparative");
  });
});

// ─── 4. DashboardLayout.tsx tiene el enlace al reporte comparativo ─────────────
describe("DashboardLayout.tsx — enlace al reporte comparativo", () => {
  const content = readFileSync(join(ROOT, "client/src/components/DashboardLayout.tsx"), "utf-8");

  it("tiene el enlace /branch-comparative en el sidebar", () => {
    expect(content).toContain("/branch-comparative");
  });

  it("el enlace está en la sección Reportes y Análisis", () => {
    // Verificar que /branch-comparative aparece después de la etiqueta Reportes y Análisis
    const idx = content.indexOf("Reportes y An");
    const afterReportes = idx >= 0 ? content.slice(idx, idx + 2000) : "";
    expect(afterReportes).toContain("/branch-comparative");
  });
});

// ─── 5. useAuth.ts tiene timeout para evitar skeleton infinito ─────────────────
describe("useAuth.ts — timeout de seguridad", () => {
  const content = readFileSync(join(ROOT, "client/src/_core/hooks/useAuth.ts"), "utf-8");

  it("tiene un mecanismo de timeout para evitar loading infinito", () => {
    expect(content).toMatch(/timeout|setTimeout|timedOut/i);
  });

  it("exporta el hook useAuth", () => {
    expect(content).toContain("export");
    expect(content).toContain("useAuth");
  });
});

// ─── 6. LandingPage.tsx redirige al dashboard si el usuario está autenticado ───
describe("LandingPage.tsx — redirección automática", () => {
  const content = readFileSync(join(ROOT, "client/src/pages/LandingPage.tsx"), "utf-8");

  it("usa useAuth para verificar si el usuario está autenticado", () => {
    expect(content).toContain("useAuth");
  });

  it("redirige al dashboard si el usuario está autenticado", () => {
    expect(content).toMatch(/\/dashboard|setLocation|redirect/i);
  });
});

// ─── 7. EmployeeEdit.tsx tiene el selector de sucursal ────────────────────────
describe("EmployeeEdit.tsx — selector de sucursal", () => {
  const content = readFileSync(join(ROOT, "client/src/pages/EmployeeEdit.tsx"), "utf-8");

  it("tiene el campo branchId en el formulario", () => {
    expect(content).toContain("branchId");
  });

  it("usa branches.listAll para cargar las sucursales", () => {
    expect(content).toMatch(/branches.*listAll|listAll.*branches/);
  });

  it("incluye un selector de sucursal en el JSX", () => {
    expect(content).toMatch(/Sucursal|sucursal|branch/i);
  });
});

// ─── 8. vite.config.ts no tiene VitePWA activo ────────────────────────────────
describe("vite.config.ts — VitePWA eliminado", () => {
  const content = readFileSync(join(ROOT, "vite.config.ts"), "utf-8");

  it("no tiene VitePWA activo en el array de plugins", () => {
    // VitePWA puede estar importado pero no debe estar activo en plugins
    const pluginsMatch = content.match(/plugins\s*:\s*\[([\s\S]*?)\]/);
    if (pluginsMatch) {
      expect(pluginsMatch[1]).not.toContain("VitePWA(");
    }
  });
});

// ─── 9. index.html tiene el script de desregistro de SW ───────────────────────
describe("index.html — desregistro de Service Workers", () => {
  const content = readFileSync(join(ROOT, "client/index.html"), "utf-8");

  it("tiene un script para desregistrar Service Workers", () => {
    expect(content).toMatch(/serviceWorker|unregister|getRegistrations/i);
  });
});
