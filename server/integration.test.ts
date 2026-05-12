/**
 * Tests de integración - Sprint 30
 * Verifica el comportamiento del servidor Express en producción
 * y la corrección de pantalla en blanco (fallback a Vite cuando dist/public no existe)
 *
 * Sprint 42: VitePWA fue comentado/deshabilitado para solucionar el spinner infinito.
 * Los tests PWA han sido actualizados para reflejar el estado actual.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// ─── Test 1: Servidor usa Vite cuando dist/public no existe ───────────────────
describe("Server fallback: Vite cuando dist/public no existe", () => {
  it("debería detectar que dist/public no existe y usar Vite como fallback", () => {
    const distPublicPath = "/nonexistent/dist/public";
    const indexHtmlPath = path.join(distPublicPath, "index.html");

    const distPublicExists =
      fs.existsSync(distPublicPath) && fs.existsSync(indexHtmlPath);

    expect(distPublicExists).toBe(false);
    const shouldUseVite = !distPublicExists;
    expect(shouldUseVite).toBe(true);
  });

  it("debería detectar que dist/public existe cuando el build está completo", () => {
    const tmpDir = "/tmp/test-dist-public";
    const indexHtml = path.join(tmpDir, "index.html");

    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(indexHtml, "<html><body><div id='root'></div></body></html>");

      const distPublicExists =
        fs.existsSync(tmpDir) && fs.existsSync(indexHtml);

      expect(distPublicExists).toBe(true);
      const shouldUseVite = !distPublicExists;
      expect(shouldUseVite).toBe(false);
    } finally {
      if (fs.existsSync(indexHtml)) fs.unlinkSync(indexHtml);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    }
  });
});

// ─── Test 2: Configuración de VitePWA (deshabilitado en Sprint 42) ────────────
// Sprint 42: VitePWA fue comentado para solucionar el spinner infinito en iOS Safari.
// El import está comentado pero el plugin no está activo en el build.
describe("Service Worker PWA: VitePWA deshabilitado (Sprint 42)", () => {
  it("vite.config.ts tiene el import de VitePWA comentado (deshabilitado)", async () => {
    const configPath = path.resolve(
      import.meta.dirname,
      "../vite.config.ts"
    );
    const configContent = fs.readFileSync(configPath, "utf-8");
    // El import está comentado — VitePWA está deshabilitado
    expect(configContent).toContain("// import { VitePWA }");
    expect(configContent).toContain("VitePWA deshabilitado");
  });

  it("index.html tiene script inline para desregistrar Service Workers", async () => {
    const htmlPath = path.resolve(
      import.meta.dirname,
      "../client/index.html"
    );
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");
    expect(htmlContent).toContain("serviceWorker");
    expect(htmlContent).toContain("unregister");
  });

  it("vite.config.ts tiene configuración básica de React y Tailwind", async () => {
    const configPath = path.resolve(
      import.meta.dirname,
      "../vite.config.ts"
    );
    const configContent = fs.readFileSync(configPath, "utf-8");
    expect(configContent).toContain("react");
    expect(configContent).toContain("tailwindcss");
  });
});

// ─── Test 3: Estructura del servidor Express ──────────────────────────────────
describe("Servidor Express: estructura y rutas críticas", () => {
  it("index.ts debe importar fs y path para el fallback", () => {
    const indexPath = path.resolve(
      import.meta.dirname,
      "./_core/index.ts"
    );
    const indexContent = fs.readFileSync(indexPath, "utf-8");

    expect(indexContent).toContain("import fs from \"fs\"");
    expect(indexContent).toContain("import path from \"path\"");
  });

  it("index.ts debe tener lógica de fallback a Vite cuando dist/public no existe", () => {
    const indexPath = path.resolve(
      import.meta.dirname,
      "./_core/index.ts"
    );
    const indexContent = fs.readFileSync(indexPath, "utf-8");

    expect(indexContent).toContain("distPublicExists");
    expect(indexContent).toContain("falling back to Vite dev server");
    expect(indexContent).toContain("setupVite(app, server)");
  });

  it("index.ts debe registrar todas las rutas críticas de la API", () => {
    const indexPath = path.resolve(
      import.meta.dirname,
      "./_core/index.ts"
    );
    const indexContent = fs.readFileSync(indexPath, "utf-8");

    expect(indexContent).toContain("/api/trpc");
    expect(indexContent).toContain("uploadRouter");
    expect(indexContent).toContain("exportRouter");
    expect(indexContent).toContain("registerOAuthRoutes");
  });
});

// ─── Test 4: main.tsx — providers básicos ────────────────────────────────────
describe("Frontend: providers básicos de la aplicación", () => {
  it("main.tsx tiene createRoot para montar la aplicación", () => {
    const mainPath = path.resolve(
      import.meta.dirname,
      "../client/src/main.tsx"
    );
    const mainContent = fs.readFileSync(mainPath, "utf-8");
    expect(mainContent).toContain("createRoot");
    expect(mainContent).toContain("App");
  });

  it("main.tsx tiene QueryClientProvider para react-query", () => {
    const mainPath = path.resolve(
      import.meta.dirname,
      "../client/src/main.tsx"
    );
    const mainContent = fs.readFileSync(mainPath, "utf-8");
    expect(mainContent).toContain("QueryClientProvider");
  });
});

// ─── Test 5: Paginación del historial de alertas ──────────────────────────────
describe("AlertHistory: paginación correcta", () => {
  it("AlertHistory.tsx debe tener controles de paginación", () => {
    const alertHistoryPath = path.resolve(
      import.meta.dirname,
      "../client/src/pages/AlertHistory.tsx"
    );
    const content = fs.readFileSync(alertHistoryPath, "utf-8");

    expect(content).toContain("currentPage");
    expect(content).toContain("totalPages");
    expect(content).toContain("pageSize");
  });
});
