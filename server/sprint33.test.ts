/**
 * Sprint 33 Tests
 * 1. Comparativa interanual en gráfica de tendencia (monthlyTrendPrevYear en backend y frontend)
 * 2. Botón Generar Plan de Acción con pre-llenado automático desde el AnalyticsDashboard
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(process.cwd());

// ── Test 1: Comparativa interanual ────────────────────────────────────────────
describe("Sprint 33 - Comparativa interanual en gráfica de tendencia", () => {
  it("el backend de getAnalytics retorna monthlyTrendPrevYear", () => {
    const filePath = path.join(ROOT, "server/routers/exitInterviews.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("monthlyTrendPrevYear");
  });

  it("el backend consulta datos del año anterior (INTERVAL 24 MONTH y INTERVAL 12 MONTH)", () => {
    const filePath = path.join(ROOT, "server/routers/exitInterviews.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("INTERVAL 24 MONTH");
    expect(content).toContain("INTERVAL 12 MONTH");
  });

  it("el getAnalytics incluye monthlyTrendPrevYear en el return", () => {
    const filePath = path.join(ROOT, "server/routers/exitInterviews.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    // Debe estar en el return del procedure
    const returnMatch = content.match(/return \{[\s\S]*?monthlyTrendPrevYear[\s\S]*?\};/);
    expect(returnMatch).not.toBeNull();
  });

  it("el frontend AnalyticsDashboard usa buildInterannualData para la gráfica", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("buildInterannualData");
    expect(content).toContain("monthlyTrendPrevYear");
  });

  it("la gráfica de tendencia muestra dos líneas: Año actual y Año anterior", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Año actual");
    expect(content).toContain("Año anterior");
  });

  it("el frontend tiene toggle para mostrar/ocultar el año anterior", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("showPrevYear");
    expect(content).toContain("setShowPrevYear");
  });

  it("la gráfica usa Legend de recharts para identificar las líneas", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Legend");
    expect(content).toContain("Comparativa interanual");
  });
});

// ── Test 2: Botón Generar Plan de Acción ──────────────────────────────────────
describe("Sprint 33 - Botón Generar Plan de Acción con pre-llenado", () => {
  it("el componente GenerateActionPlanButton existe en ExitInterviews.tsx", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("function GenerateActionPlanButton");
  });

  it("el botón se muestra cuando hay entrevistas completadas", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("analytics.totalCompleted > 0");
    expect(content).toContain("GenerateActionPlanButton analytics={analytics}");
  });

  it("el componente pre-llena el título con el período seleccionado", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Plan de Acción — Rotación de Personal");
    expect(content).toContain("filterLabel");
  });

  it("el componente pre-llena las causas con los top departamentos y motivos", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("topDepts");
    expect(content).toContain("topReasons");
    expect(content).toContain("primaryCauses");
  });

  it("el componente pre-llena las acciones propuestas automáticamente", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("suggestedActions");
    expect(content).toContain("proposedActions");
  });

  it("el formulario permite editar causas y acciones antes de guardar", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("handleCauseChange");
    expect(content).toContain("handleActionChange");
    expect(content).toContain("+ Agregar causa");
    expect(content).toContain("+ Agregar acción");
  });

  it("el formulario llama a trpc.exitInterviews.createActionPlan al guardar", () => {
    const filePath = path.join(ROOT, "client/src/pages/ExitInterviews.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("trpc.exitInterviews.createActionPlan.useMutation");
    expect(content).toContain("createMutation.mutate");
  });

  it("el backend createActionPlan existe en el router de exitInterviews (verificación de archivo)", () => {
    const filePath = path.join(ROOT, "server/routers/exitInterviews.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("createActionPlan: protectedProcedure");
  });

  it("el backend createActionPlan acepta primaryCauses y proposedActions", () => {
    const filePath = path.join(ROOT, "server/routers/exitInterviews.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("primaryCauses: z.array");
    expect(content).toContain("proposedActions: z.array");
    expect(content).toContain("analysisStartDate");
  });
});
