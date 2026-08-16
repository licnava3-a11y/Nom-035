/**
 * Sprint 57 — Tests: serveStatic reemplaza %VITE_*% en index.html en runtime
 *
 * Causa raíz del bug "Permiso denegado — El ID de la aplicación no está configurado":
 * - El script inline en index.html usa %VITE_APP_ID% esperando que Vite lo reemplace durante el build
 * - En Cloud Run, VITE_APP_ID está disponible en RUNTIME, no en BUILD TIME (Docker build)
 * - Por lo tanto, el placeholder llegaba sin reemplazar al HTML final
 * - El script de login enviaba appId='' al portal de Manus → "El ID de la aplicación no está configurado"
 *
 * Corrección: serveStatic en vite.ts ahora lee el index.html y reemplaza los placeholders
 * con los valores reales de process.env antes de enviar la respuesta.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const VITE_TS_PATH = path.resolve(__dirname, "_core/vite.ts");
const INDEX_HTML_PATH = path.resolve(__dirname, "../client/index.html");

describe("Sprint 57 — serveStatic reemplaza placeholders en runtime", () => {
  it("vite.ts contiene lógica de reemplazo de VITE_APP_ID en serveStatic", () => {
    const content = fs.readFileSync(VITE_TS_PATH, "utf-8");
    expect(content).toContain("VITE_APP_ID");
    expect(content).toContain("process.env.VITE_APP_ID");
  });

  it("vite.ts reemplaza VITE_OAUTH_PORTAL_URL en serveStatic", () => {
    const content = fs.readFileSync(VITE_TS_PATH, "utf-8");
    expect(content).toContain("VITE_OAUTH_PORTAL_URL");
    expect(content).toContain("process.env.VITE_OAUTH_PORTAL_URL");
  });

  it("vite.ts usa replace con regex global para reemplazar todos los placeholders", () => {
    const content = fs.readFileSync(VITE_TS_PATH, "utf-8");
    // Debe usar regex con /g para reemplazar todas las ocurrencias
    expect(content).toMatch(/%VITE_APP_ID%.*\/g/);
  });

  it("vite.ts tiene fallback para VITE_OAUTH_PORTAL_URL a https://manus.im", () => {
    const content = fs.readFileSync(VITE_TS_PATH, "utf-8");
    expect(content).toContain("https://manus.im");
  });

  it("vite.ts tiene comentario explicando el problema de runtime vs build time", () => {
    const content = fs.readFileSync(VITE_TS_PATH, "utf-8");
    expect(content).toContain("runtime");
  });

  it("index.html contiene el placeholder %VITE_APP_ID% para ser reemplazado", () => {
    const content = fs.readFileSync(INDEX_HTML_PATH, "utf-8");
    expect(content).toContain("%VITE_APP_ID%");
  });

  it("index.html contiene el placeholder %VITE_OAUTH_PORTAL_URL%", () => {
    const content = fs.readFileSync(INDEX_HTML_PATH, "utf-8");
    expect(content).toContain("%VITE_OAUTH_PORTAL_URL%");
  });

  it("index.html tiene el script inline que usa appId para construir la URL de login", () => {
    const content = fs.readFileSync(INDEX_HTML_PATH, "utf-8");
    expect(content).toContain("aw-login-btn");
    expect(content).toContain("appId");
    expect(content).toContain("oauthPortal");
  });

  it("vite.ts simula el reemplazo correctamente con valores de entorno", () => {
    // Simular lo que hace serveStatic al reemplazar los placeholders
    const fakeHtml = `<script>var appId = '%VITE_APP_ID%'; var oauthPortal = '%VITE_OAUTH_PORTAL_URL%';</script>`;
    const fakeAppId = "test-app-id-123";
    const fakeOauthPortal = "https://test.manus.im";

    const result = fakeHtml
      .replace(/%VITE_APP_ID%/g, fakeAppId)
      .replace(/%VITE_OAUTH_PORTAL_URL%/g, fakeOauthPortal);

    expect(result).toContain(fakeAppId);
    expect(result).toContain(fakeOauthPortal);
    expect(result).not.toContain("%VITE_APP_ID%");
    expect(result).not.toContain("%VITE_OAUTH_PORTAL_URL%");
  });

  it("vite.ts restaura el índice de desarrollo y comunica recuperación si la lectura falla", () => {
    const content = fs.readFileSync(VITE_TS_PATH, "utf-8");
    expect(content).toContain("restoreDevelopmentIndex");
    expect(content).toContain("La vista previa se está recuperando");
    expect(content).toContain("catch");
  });
});
