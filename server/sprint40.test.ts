/**
 * Sprint 40 Tests
 * - Tabla branches: CRUD y filtro en mapa de calor
 * - Exportar Catálogo de Puestos y Competencias a Excel (ya implementado)
 * - Importar preguntas de Entrevistas de Salida desde Excel
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ── Sprint 40.1: Tabla branches ─────────────────────────────────────────────

describe("Sprint 40.1 — Tabla branches y filtro mapa de calor", () => {
  it("branchesRouter existe y exporta el router", () => {
    const routerPath = path.resolve(__dirname, "routers/branches.ts");
    const content = readFileSync(routerPath, "utf-8");
    expect(content).toContain("branchesRouter");
    expect(content).toContain("create");
    expect(content).toContain("list");
    expect(content).toContain("update");
    expect(content).toContain("delete");
  });

  it("branchesRouter está registrado en routers.ts principal", () => {
    const routersPath = path.resolve(__dirname, "routers.ts");
    const content = readFileSync(routersPath, "utf-8");
    expect(content).toContain("branchesRouter");
    expect(content).toContain("branches:");
  });

  it("schema.ts contiene la tabla branches", () => {
    const schemaPath = path.resolve(__dirname, "../drizzle/schema.ts");
    const content = readFileSync(schemaPath, "utf-8");
    expect(content).toContain("branches");
    // El campo se llama 'name' en el schema (varchar "name")
    expect(content).toContain("is_active");
  });

  it("getDepartmentalRiskMetrics acepta filtro branchId", () => {
    const routerPath = path.resolve(__dirname, "routers/departmentalTrends.ts");
    const content = readFileSync(routerPath, "utf-8");
    expect(content).toContain("branchId");
  });

  it("DepartmentalTrends.tsx tiene selector de sucursal", () => {
    const frontendPath = path.resolve(
      __dirname,
      "../client/src/pages/DepartmentalTrends.tsx"
    );
    const content = readFileSync(frontendPath, "utf-8");
    expect(content).toContain("branchId");
    expect(content).toContain("branches.list");
  });
});

// ── Sprint 40.2: Exportar Catálogo de Puestos y Competencias ────────────────

describe("Sprint 40.2 — Exportar Catálogo de Puestos y Competencias a Excel", () => {
  it("Positions.tsx tiene función de exportación Excel", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/Positions.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).toMatch(/exportXLSX|exportToExcel|Exportar/);
  });

  it("OrganizationalCompetenciesManager.tsx tiene función de exportación Excel", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/OrganizationalCompetenciesManager.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).toMatch(/exportXLSX|exportToExcel|Exportar/);
  });
});

// ── Sprint 40.3: Importar preguntas desde Excel ──────────────────────────────

describe("Sprint 40.3 — Importar preguntas de Entrevistas de Salida desde Excel", () => {
  it("importQuestions procedure existe en exitInterviews router", () => {
    const routerPath = path.resolve(__dirname, "routers/exitInterviews.ts");
    const content = readFileSync(routerPath, "utf-8");
    expect(content).toContain("importQuestions");
    expect(content).toContain("replaceAll");
    expect(content).toContain("inserted");
    expect(content).toContain("skipped");
  });

  it("importQuestions procedure valida el array de preguntas", () => {
    const routerPath = path.resolve(__dirname, "routers/exitInterviews.ts");
    const content = readFileSync(routerPath, "utf-8");
    // Debe validar que questions es un array con questionText
    expect(content).toContain("z.array");
    expect(content).toContain("questionText");
  });

  it("ExitInterviews.tsx tiene botón Importar XLSX", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/ExitInterviews.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("handleImportXLSX");
    expect(content).toContain("importMutation");
    expect(content).toContain("Importar XLSX");
    expect(content).toContain(".xlsx");
  });

  it("ExitInterviews.tsx usa import dinámico de xlsx para importación", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/ExitInterviews.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("import('xlsx')");
  });

  it("ExitInterviews.tsx permite reemplazar o agregar preguntas al importar", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/ExitInterviews.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("replaceAll");
    expect(content).toContain("window.confirm");
  });

  it("importQuestions procedure está registrado en el router de exitInterviews", () => {
    const routerPath = path.resolve(__dirname, "routers/exitInterviews.ts");
    const content = readFileSync(routerPath, "utf-8");
    // Debe estar en el objeto del router
    expect(content).toContain("importQuestions:");
  });
});
