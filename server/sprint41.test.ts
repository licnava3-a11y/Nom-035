/**
 * Sprint 41 Tests
 * - Fix LandingPage spinner (main.tsx timeout)
 * - BranchesManagement page created
 * - ExitInterviews: plantilla XLSX descargable
 * - KPI Dashboard: filtro de sucursal
 * - executiveReport.getKPIs: acepta branchId
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

// ── 1. main.tsx: timeout de seguridad para hideAppLoading ─────────────────────
describe("main.tsx – spinner safety timeout", () => {
  it("debe incluir setTimeout(hideAppLoading, 2000) como fallback", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/main.tsx"),
      "utf-8"
    );
    expect(content).toContain("setTimeout(hideAppLoading, 2000)");
  });

  it("debe incluir requestAnimationFrame como primer intento de ocultar el spinner", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/main.tsx"),
      "utf-8"
    );
    expect(content).toContain("requestAnimationFrame");
    expect(content).toContain("hideAppLoading");
  });
});

// ── 2. BranchesManagement.tsx: página creada ─────────────────────────────────
describe("BranchesManagement.tsx – página de sucursales", () => {
  const filePath = path.join(ROOT, "client/src/pages/BranchesManagement.tsx");

  it("debe existir el archivo BranchesManagement.tsx", () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it("debe usar trpc.branches.listAll para obtener todas las sucursales", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("trpc.branches.listAll");
  });

  it("debe usar trpc.branches.create para crear sucursales", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("trpc.branches.create");
  });

  it("debe usar trpc.branches.update para editar y toggle de estado", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("trpc.branches.update");
  });

  it("debe incluir un formulario con campos: nombre, dirección, ciudad, estado, teléfono", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("branch-name");
    expect(content).toContain("branch-address");
    expect(content).toContain("branch-city");
    expect(content).toContain("branch-state");
    expect(content).toContain("branch-phone");
  });

  it("debe incluir confirmación de toggle (AlertDialog) para activar/desactivar", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("AlertDialog");
    expect(content).toContain("confirmToggle");
  });
});

// ── 3. App.tsx: ruta /branches registrada ────────────────────────────────────
describe("App.tsx – ruta /branches", () => {
  it("debe importar BranchesManagement con lazy", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/App.tsx"),
      "utf-8"
    );
    expect(content).toContain('import("./pages/BranchesManagement")');
  });

  it("debe registrar la ruta /branches con DashboardLayout", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/App.tsx"),
      "utf-8"
    );
    expect(content).toContain('path={"/branches"}');
    expect(content).toContain("BranchesManagement");
  });
});

// ── 4. DashboardLayout.tsx: enlace a /branches en sidebar ────────────────────
describe("DashboardLayout.tsx – enlace a sucursales en sidebar", () => {
  it("debe incluir el enlace a /branches en el menú de Administración", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/components/DashboardLayout.tsx"),
      "utf-8"
    );
    expect(content).toContain('path: "/branches"');
    expect(content).toContain("Sucursales");
  });
});

// ── 5. ExitInterviews.tsx: botón de plantilla XLSX ───────────────────────────
describe("ExitInterviews.tsx – plantilla XLSX descargable", () => {
  it("debe importar FileDown de lucide-react", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/pages/ExitInterviews.tsx"),
      "utf-8"
    );
    expect(content).toContain("FileDown");
  });

  it("debe incluir el botón de Plantilla con descarga de CSV", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/pages/ExitInterviews.tsx"),
      "utf-8"
    );
    expect(content).toContain("Plantilla_Preguntas_EntrevistasSalida.csv");
    expect(content).toContain("Plantilla descargada");
  });

  it("debe incluir ejemplos de preguntas en la plantilla (al menos 3 filas)", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/pages/ExitInterviews.tsx"),
      "utf-8"
    );
    expect(content).toContain("Clima Laboral");
    // La cadena está como unicode escape literal en el archivo fuente
    expect(content).toContain("Relaci\\u00f3n con Jefes");
    expect(content).toContain("Reconocimiento");
  });
});

// ── 6. KPIDashboard.tsx: filtro de sucursal ──────────────────────────────────
describe("KPIDashboard.tsx – filtro de sucursal", () => {
  it("debe tener estado selectedBranchId", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/pages/KPIDashboard.tsx"),
      "utf-8"
    );
    expect(content).toContain("selectedBranchId");
  });

  it("debe usar trpc.branches.list para obtener las sucursales activas", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/pages/KPIDashboard.tsx"),
      "utf-8"
    );
    expect(content).toContain("trpc.branches.list");
  });

  it("debe pasar branchId al query de getKPIs", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/pages/KPIDashboard.tsx"),
      "utf-8"
    );
    expect(content).toContain("branchId: selectedBranchId");
  });

  it("debe mostrar un badge verde cuando hay una sucursal seleccionada", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/pages/KPIDashboard.tsx"),
      "utf-8"
    );
    expect(content).toContain("bg-emerald-100");
    expect(content).toContain("text-emerald-800");
  });
});

// ── 7. executiveReport.ts: getKPIs acepta branchId ───────────────────────────
describe("executiveReport.ts – getKPIs con branchId", () => {
  it("debe aceptar branchId como parámetro opcional en getKPIs", () => {
    const content = readFileSync(
      path.join(ROOT, "server/routers/executiveReport.ts"),
      "utf-8"
    );
    expect(content).toContain("branchId: z.number().optional()");
  });

  it("debe filtrar empleados por branchId cuando se especifica", () => {
    const content = readFileSync(
      path.join(ROOT, "server/routers/executiveReport.ts"),
      "utf-8"
    );
    expect(content).toContain("eq(employees.branchId, branchId)");
  });

  it("debe soportar filtro combinado departmentId + branchId", () => {
    const content = readFileSync(
      path.join(ROOT, "server/routers/executiveReport.ts"),
      "utf-8"
    );
    expect(content).toContain("departmentId && branchId");
  });
});

// ── 8. vite.config.ts: VitePWA eliminado para evitar loops ─────────────────────────────────────────────
describe("vite.config.ts – Service Worker eliminado", () => {
  it("VitePWA debe estar deshabilitado (comentado o eliminado) para evitar loops en iOS", () => {
    const content = readFileSync(path.join(ROOT, "vite.config.ts"), "utf-8");
    // VitePWA fue eliminado completamente del array de plugins
    // El import está comentado y el bloque VitePWA() ya no está activo
    const hasActiveVitePWA = content.match(/^\s*VitePWA\(/m);
    expect(hasActiveVitePWA).toBeNull();
  });

  it("PWAUpdateBanner debe ser un stub vacío sin import de virtual:pwa-register", () => {
    const content = readFileSync(
      path.join(ROOT, "client/src/components/PWAUpdateBanner.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("virtual:pwa-register");
    expect(content).toContain("return null");
  });

  it("index.html debe desregistrar Service Workers antes de que React cargue", () => {
    const content = readFileSync(path.join(ROOT, "client/index.html"), "utf-8");
    expect(content).toContain("serviceWorker");
    expect(content).toContain("getRegistrations");
    expect(content).toContain("unregister");
  });
});
