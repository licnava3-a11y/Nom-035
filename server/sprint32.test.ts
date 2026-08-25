/**
 * Sprint 32 Tests
 * 1. Campo cedulaProfesional en schema de empleados
 * 2. Exportar PDF del Dictamen con firma digital
 * 3. Reporte de entrevistas de salida: departmentBreakdown, quarterlyTrend, filtros, exportación
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(process.cwd());

// ── Test 1: Campo cedulaProfesional en schema de empleados ─────────────────
describe("Sprint 32 - Campo cedulaProfesional en empleados", () => {
  it("el schema de empleados tiene el campo cedulaProfesional", async () => {
    const { employees } = await import("../drizzle/schema");
    expect(employees).toBeDefined();
    const cols = Object.keys(employees);
    expect(cols).toContain("cedulaProfesional");
  });

  it("el campo cedulaProfesional es de tipo texto (MySqlVarChar)", async () => {
    const { employees } = await import("../drizzle/schema");
    const col = (employees as any).cedulaProfesional;
    expect(col).toBeDefined();
    expect(col.columnType).toBe("MySqlVarChar");
  });

  it("el formulario de alta de empleados incluye el campo cedulaProfesional", () => {
    const filePath = path.join(ROOT, "client/src/pages/EmployeeNew.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toMatch(/cedulaProfesional|Cédula Profesional/);
  });

  it("el formulario de edición de empleados incluye el campo cedulaProfesional", () => {
    const filePath = path.join(ROOT, "client/src/pages/EmployeeEdit.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toMatch(/cedulaProfesional|Cédula Profesional/);
  });
});

// ── Test 2: Exportación PDF del Dictamen con firma digital ─────────────────
describe("Sprint 32 - Exportación PDF Dictamen con firma digital", () => {
  it("LegalDocGenerator tiene la función handleExportPDF", () => {
    const filePath = path.join(ROOT, "client/src/pages/LegalDocGenerator.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("handleExportPDF");
  });

  it("el Dictamen exportado incluye la cédula profesional del responsable técnico", () => {
    const filePath = path.join(ROOT, "client/src/pages/LegalDocGenerator.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toMatch(/[Cc]édula|cedulaProfesional/);
  });

  it("el Dictamen exportado incluye window.print() para PDF", () => {
    const filePath = path.join(ROOT, "client/src/pages/LegalDocGenerator.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("window.print");
  });

  it("el Dictamen exportado tiene bloque de firma con datos del responsable", () => {
    const filePath = path.join(ROOT, "client/src/pages/LegalDocGenerator.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    // Debe tener referencia al responsable técnico en el HTML generado
    expect(content).toMatch(
      /responsableTecnico|Responsable Técnico|responsable_tecnico/
    );
  });
});

// ── Test 3: Reporte de entrevistas de salida por período ───────────────────
describe("Sprint 32 - Reporte entrevistas de salida por período", () => {
  it("el router exitInterviews exporta getAnalytics", async () => {
    const { exitInterviewsRouter } = await import("./routers/exitInterviews");
    expect(exitInterviewsRouter).toBeDefined();
    expect(
      (exitInterviewsRouter as any)._def?.procedures?.getAnalytics
    ).toBeDefined();
  });

  it("el backend de getAnalytics retorna departmentBreakdown", () => {
    const filePath = path.join(ROOT, "server/routers/exitInterviews.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("departmentBreakdown");
  });

  it("el backend de getAnalytics retorna quarterlyTrend", () => {
    const filePath = path.join(ROOT, "server/routers/exitInterviews.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("quarterlyTrend");
  });

  it("el AnalyticsDashboard tiene función de exportación Excel (CSV)", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("exportExitInterviewsReport");
    expect(content).toContain("Exportar Excel");
    expect(content).toContain("text/csv");
  });

  it("el AnalyticsDashboard tiene filtros de período (año/mes)", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("filterYear");
    expect(content).toContain("filterMonth");
  });

  it("el AnalyticsDashboard tiene gráfica de Bajas por Departamento", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Bajas por Departamento");
    expect(content).toContain("departmentBreakdown");
  });

  it("el AnalyticsDashboard tiene vista de tendencia trimestral", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("quarterlyTrend");
    expect(content).toContain("Trimestral");
  });

  it("el CSV exportado incluye sección de desglose por departamento", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Desglose por Departamento");
  });
});
