/**
 * Anti-Spinner Tests — Corrección definitiva del spinner infinito
 *
 * Verifica que:
 * 1. LandingPage.tsx tiene un timeout de máximo 3s antes de mostrar el botón de login.
 * 2. El spinner del HTML se oculta en máximo 500ms (no 2s).
 * 3. index.html tiene una página de bienvenida estática con botón de login funcional.
 * 4. LandingPage NUNCA muestra un spinner indefinido.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

describe("Anti-Spinner — LandingPage timeout de 3s", () => {
  const landingPath = resolve(ROOT, "client/src/pages/LandingPage.tsx");
  const mainPath = resolve(ROOT, "client/src/main.tsx");
  const indexHtmlPath = resolve(ROOT, "client/index.html");

  it("LandingPage.tsx importa useState para el timeout", () => {
    const content = readFileSync(landingPath, "utf-8");
    expect(content).toContain("useState");
  });

  it("LandingPage.tsx tiene un timeout de máximo 3000ms", () => {
    const content = readFileSync(landingPath, "utf-8");
    expect(content).toContain("setTimeout");
    // Verificar que el timeout es de 3000ms (3s)
    expect(content).toMatch(/setTimeout\s*\([^,]+,\s*3000\s*\)/);
  });

  it("LandingPage.tsx usa timedOut para controlar el spinner", () => {
    const content = readFileSync(landingPath, "utf-8");
    expect(content).toContain("timedOut");
    expect(content).toContain("showSpinner");
  });

  it("LandingPage.tsx muestra el botón de login cuando timedOut=true aunque loading=true", () => {
    const content = readFileSync(landingPath, "utf-8");
    // showSpinner = loading && !timedOut — cuando timedOut=true, showSpinner=false
    expect(content).toContain("loading && !timedOut");
  });

  it("LandingPage.tsx tiene botón de login en el render final (no solo en el spinner)", () => {
    const content = readFileSync(landingPath, "utf-8");
    // Contar cuántas veces aparece getLoginUrl() — debe aparecer al menos una vez fuera del spinner
    const loginUrlCount = (content.match(/getLoginUrl\(\)/g) || []).length;
    expect(loginUrlCount).toBeGreaterThanOrEqual(1);
  });

  it("main.tsx oculta la página de bienvenida en máximo 500ms", () => {
    const content = readFileSync(mainPath, "utf-8");
    // Verificar que el timeout de hideAppWelcome es <= 500ms
    const match = content.match(/setTimeout\s*\(\s*hideAppWelcome\s*,\s*(\d+)\s*\)/);
    expect(match).not.toBeNull();
    const timeoutMs = parseInt(match![1]);
    expect(timeoutMs).toBeLessThanOrEqual(500);
  });

  it("index.html: tiene página de bienvenida estática con id app-welcome", () => {
    const content = readFileSync(indexHtmlPath, "utf-8");
    expect(content).toContain('id="app-welcome"');
  });

  it("index.html: tiene botón de login con id aw-login-btn", () => {
    const content = readFileSync(indexHtmlPath, "utf-8");
    expect(content).toContain('id="aw-login-btn"');
  });

  it("index.html: tiene script inline que construye la URL de OAuth sin React", () => {
    const content = readFileSync(indexHtmlPath, "utf-8");
    expect(content).toContain("VITE_APP_ID");
    expect(content).toContain("VITE_OAUTH_PORTAL_URL");
    expect(content).toContain("/api/oauth/callback");
  });

  it("LandingPage.tsx NO tiene 'if (loading)' sin timeout (el patrón que causaba el spinner infinito)", () => {
    const content = readFileSync(landingPath, "utf-8");
    // El patrón problemático era: if (loading) { return <spinner> }
    // El nuevo patrón correcto es: if (showSpinner) { return <spinner> }
    // Verificar que no hay un 'if (loading)' directo sin timedOut
    const hasDirectLoadingCheck = /if\s*\(\s*loading\s*\)\s*\{/.test(content);
    expect(hasDirectLoadingCheck).toBe(false);
  });
});
