/**
 * Sprint 48 Tests — Página de Bienvenida Pública /welcome
 *
 * Verifica:
 * 1. El archivo Welcome.tsx existe y exporta un componente por defecto.
 * 2. La ruta /welcome está registrada en App.tsx como ruta pública (sin DashboardLayout).
 * 3. La página Welcome usa getLoginUrl para el botón de inicio de sesión.
 * 4. La página Welcome NO importa useAuth (es completamente pública).
 * 5. La ruta /welcome está FUERA del DashboardLayout.
 * 6. El import lazy de Welcome está registrado en App.tsx.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

describe("Sprint 48 — Página de Bienvenida Pública /welcome", () => {
  const welcomePath = resolve(ROOT, "client/src/pages/Welcome.tsx");
  const appPath = resolve(ROOT, "client/src/App.tsx");

  it("Welcome.tsx existe en client/src/pages/", () => {
    expect(existsSync(welcomePath)).toBe(true);
  });

  it("Welcome.tsx exporta un componente por defecto", () => {
    const content = readFileSync(welcomePath, "utf-8");
    expect(content).toContain("export default function Welcome");
  });

  it("Welcome.tsx usa getLoginUrl para el botón de inicio de sesión", () => {
    const content = readFileSync(welcomePath, "utf-8");
    expect(content).toContain("getLoginUrl");
    expect(content).toContain("loginUrl");
  });

  it("Welcome.tsx NO importa useAuth (es completamente pública, sin autenticación)", () => {
    const content = readFileSync(welcomePath, "utf-8");
    expect(content).not.toContain("useAuth");
  });

  it("Welcome.tsx NO importa trpc (no requiere llamadas al backend)", () => {
    const content = readFileSync(welcomePath, "utf-8");
    expect(content).not.toContain("trpc");
  });

  it("Welcome.tsx tiene sección de módulos de la plataforma", () => {
    const content = readFileSync(welcomePath, "utf-8");
    expect(content).toContain("Módulos");
  });

  it("Welcome.tsx tiene botón de Iniciar sesión", () => {
    const content = readFileSync(welcomePath, "utf-8");
    expect(content).toContain("Iniciar sesión");
  });

  it("Welcome.tsx usa el tema oscuro de la plataforma (#0f172a)", () => {
    const content = readFileSync(welcomePath, "utf-8");
    expect(content).toContain("#0f172a");
  });

  it("Welcome.tsx usa el color verde corporativo (#22c55e o green-400/500)", () => {
    const content = readFileSync(welcomePath, "utf-8");
    const hasGreenHex = content.includes("#22c55e");
    const hasGreenClass = content.includes("green-4") || content.includes("green-5");
    expect(hasGreenHex || hasGreenClass).toBe(true);
  });

  it("App.tsx tiene import lazy de Welcome", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toContain("import(\"./pages/Welcome\")");
  });

  it("App.tsx tiene la ruta /welcome registrada", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toContain('path="/welcome"');
  });

  it("La ruta /welcome en App.tsx NO está dentro de DashboardLayout", () => {
    const content = readFileSync(appPath, "utf-8");
    // Buscar el bloque de la ruta /welcome y verificar que no está envuelto en DashboardLayout
    const welcomeRouteIndex = content.indexOf('path="/welcome"');
    expect(welcomeRouteIndex).toBeGreaterThan(-1);

    // Extraer solo el bloque de la ruta /welcome (desde la apertura <Route hasta el cierre </Route>)
    const routeStart = content.lastIndexOf("<Route", welcomeRouteIndex);
    const routeEnd = content.indexOf("</Route>", welcomeRouteIndex);
    const routeBlock = content.substring(routeStart, routeEnd + 8);

    // Verificar que el bloque de la ruta /welcome NO contiene DashboardLayout
    expect(routeBlock).not.toContain("DashboardLayout");
    // Verificar que sí contiene Welcome
    expect(routeBlock).toContain("Welcome");
  });

  it("La ruta /welcome aparece ANTES de la ruta catch-all (NotFound)", () => {
    const content = readFileSync(appPath, "utf-8");
    const welcomeIndex = content.indexOf('path="/welcome"');
    const notFoundIndex = content.lastIndexOf("<NotFound");
    expect(welcomeIndex).toBeGreaterThan(-1);
    expect(notFoundIndex).toBeGreaterThan(-1);
    expect(welcomeIndex).toBeLessThan(notFoundIndex);
  });

  it("Welcome.tsx incluye el logo SVG de NOM-035 (capas con stroke verde)", () => {
    const content = readFileSync(welcomePath, "utf-8");
    // El logo usa polígonos con stroke verde
    expect(content).toContain("polygon");
    expect(content).toContain("stroke");
  });

  it("Welcome.tsx incluye descripción de la plataforma NOM-035 STPS 2018", () => {
    const content = readFileSync(welcomePath, "utf-8");
    expect(content).toContain("NOM-035");
    expect(content).toContain("STPS");
  });
});
