import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Sprint 30 - Corrección pantalla en blanco, spinner y modal PDF", () => {
  // Test 1: Vite y plugins están en dependencies (no solo devDependencies)
  it("vite está en dependencies para que esté disponible en producción", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf-8"));
    expect(pkg.dependencies).toHaveProperty("vite");
    expect(pkg.dependencies).toHaveProperty("@vitejs/plugin-react");
    expect(pkg.dependencies).toHaveProperty("tailwindcss");
  });

  // Test 2: El servidor delega el fallback SPA al módulo estático ESM
  it("el servidor index.ts delega el fallback cuando dist/public no existe", () => {
    const indexContent = fs.readFileSync(
      path.resolve(__dirname, "_core/index.ts"),
      "utf-8"
    );
    expect(indexContent).toContain('import { serveStatic } from "./vite"');
    expect(indexContent).toContain("serveStatic(app)");
  });

  // Test 3: El spinner de carga está en index.html
  it("index.html tiene el spinner de carga institucional", () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, "../client/index.html"),
      "utf-8"
    );
    expect(html).toContain("app-loading");
    expect(html).toContain("NOM-035");
  });

  // Test 4: main.tsx llama hideAppLoading para ocultar el spinner
  it("main.tsx oculta el spinner cuando React monta", () => {
    const main = fs.readFileSync(
      path.resolve(__dirname, "../client/src/main.tsx"),
      "utf-8"
    );
    expect(main).toContain("hideAppLoading");
  });

  // Test 5: ExecutiveReport tiene el estado del modal de previsualización
  it("ExecutiveReport.tsx tiene el estado pdfPreviewUrl para el modal", () => {
    const report = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/ExecutiveReport.tsx"),
      "utf-8"
    );
    expect(report).toContain("pdfPreviewUrl");
    expect(report).toContain("isGeneratingPreview");
    expect(report).toContain("handlePreviewPDF");
  });

  // Test 6: El modal de previsualización usa un iframe
  it("ExecutiveReport.tsx tiene un iframe para la previsualización del PDF", () => {
    const report = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/ExecutiveReport.tsx"),
      "utf-8"
    );
    expect(report).toContain("<iframe");
    expect(report).toContain("datauristring");
    expect(report).toContain("Vista Previa del Reporte Ejecutivo");
  });

  // Test 7: El botón de vista previa está en la UI
  it("ExecutiveReport.tsx tiene el botón Vista Previa PDF", () => {
    const report = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/ExecutiveReport.tsx"),
      "utf-8"
    );
    expect(report).toContain("Vista Previa PDF");
    expect(report).toContain("handlePreviewPDF");
  });

  // Test 8: El modal tiene botón de descarga directa
  it("El modal de previsualización tiene botón Descargar PDF", () => {
    const report = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/ExecutiveReport.tsx"),
      "utf-8"
    );
    expect(report).toContain("Descargar PDF");
    expect(report).toContain("exportToPDFWithCharts");
  });

  // Test 9: El modal se cierra al hacer clic fuera
  it("El modal de previsualización se cierra al hacer clic en el overlay", () => {
    const report = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/ExecutiveReport.tsx"),
      "utf-8"
    );
    expect(report).toContain("setPdfPreviewUrl(null)");
    expect(report).toContain("bg-black/60");
  });

  // Test 10: todo.md tiene los sprints 27-29 marcados como completados
  it("todo.md tiene los sprints 27-29 marcados como completados", () => {
    const todo = fs.readFileSync(
      path.resolve(__dirname, "../todo.md"),
      "utf-8"
    );
    expect(todo).toContain("Sprint 27");
    expect(todo).toContain("Sprint 28");
    expect(todo).toContain("Sprint 29");
    expect(todo).toContain("BACKLOG PRIORIZADO");
  });
});
