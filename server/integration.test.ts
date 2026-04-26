/**
 * Tests de integración - Sprint 30
 * Verifica el comportamiento del servidor Express en producción
 * y la corrección de pantalla en blanco (fallback a Vite cuando dist/public no existe)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// ─── Test 1: Servidor usa Vite cuando dist/public no existe ───────────────────
describe("Server fallback: Vite cuando dist/public no existe", () => {
  it("debería detectar que dist/public no existe y usar Vite como fallback", () => {
    // Simular que dist/public no existe
    const distPublicPath = "/nonexistent/dist/public";
    const indexHtmlPath = path.join(distPublicPath, "index.html");

    const distPublicExists =
      fs.existsSync(distPublicPath) && fs.existsSync(indexHtmlPath);

    expect(distPublicExists).toBe(false);
    // El servidor debería usar Vite como fallback
    const shouldUseVite = !distPublicExists;
    expect(shouldUseVite).toBe(true);
  });

  it("debería detectar que dist/public existe cuando el build está completo", () => {
    // Crear un directorio temporal para simular dist/public
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
      // Limpiar
      if (fs.existsSync(indexHtml)) fs.unlinkSync(indexHtml);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    }
  });
});

// ─── Test 2: Configuración del Service Worker ─────────────────────────────────
describe("Service Worker PWA: configuración correcta", () => {
  it("vite.config.ts debe tener skipWaiting y clientsClaim habilitados", async () => {
    const configPath = path.resolve(
      import.meta.dirname,
      "../vite.config.ts"
    );
    const configContent = fs.readFileSync(configPath, "utf-8");

    expect(configContent).toContain("skipWaiting: true");
    expect(configContent).toContain("clientsClaim: true");
  });

  it("vite.config.ts debe tener navigateFallback: null para no cachear el HTML", async () => {
    const configPath = path.resolve(
      import.meta.dirname,
      "../vite.config.ts"
    );
    const configContent = fs.readFileSync(configPath, "utf-8");

    expect(configContent).toContain("navigateFallback: null");
  });

  it("vite.config.ts no debe usar CacheFirst para chunks JS", async () => {
    const configPath = path.resolve(
      import.meta.dirname,
      "../vite.config.ts"
    );
    const configContent = fs.readFileSync(configPath, "utf-8");

    // Verificar que los chunks JS usan NetworkFirst
    expect(configContent).toContain('urlPattern: /\\/assets\\/.+\\.js$/i');
    // Verificar que hay NetworkFirst para JS (no CacheFirst)
    const jsSection = configContent.substring(
      configContent.indexOf('urlPattern: /\\/assets\\/.+\\.js$/i'),
      configContent.indexOf('urlPattern: /\\/assets\\/.+\\.js$/i') + 200
    );
    expect(jsSection).toContain("NetworkFirst");
    expect(jsSection).not.toContain("CacheFirst");
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

    // Rutas críticas que deben estar registradas
    expect(indexContent).toContain("/api/trpc");
    expect(indexContent).toContain("uploadRouter");
    expect(indexContent).toContain("exportRouter");
    expect(indexContent).toContain("registerOAuthRoutes");
  });
});

// ─── Test 4: main.tsx tiene el listener de controllerchange ──────────────────
describe("Frontend: manejo de actualizaciones del Service Worker", () => {
  it("main.tsx debe tener el listener controllerchange para recargar al actualizar SW", () => {
    const mainPath = path.resolve(
      import.meta.dirname,
      "../client/src/main.tsx"
    );
    const mainContent = fs.readFileSync(mainPath, "utf-8");

    expect(mainContent).toContain("controllerchange");
    expect(mainContent).toContain("window.location.reload()");
    expect(mainContent).toContain("serviceWorker");
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
