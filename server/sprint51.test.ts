/**
 * Sprint 51 Tests — Mejoras de rendimiento y UX
 *
 * Verifica:
 * 1. Compresión gzip: el middleware compression está importado y configurado en index.ts.
 * 2. Heartbeat warmup: el handler /api/scheduled/warmup está registrado en index.ts.
 * 3. Redirección automática: LandingPage.tsx usa localStorage para redirigir usuarios recurrentes.
 * 4. El paquete compression está en package.json.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

describe("Sprint 51 — Compresión gzip en Express", () => {
  const indexPath = resolve(ROOT, "server/_core/index.ts");
  const pkgPath = resolve(ROOT, "package.json");

  it("package.json incluye 'compression' como dependencia", () => {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps).toHaveProperty("compression");
  });

  it("index.ts importa el módulo compression", () => {
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain('import compression from "compression"');
  });

  it("index.ts aplica app.use(compression(...)) antes de los rate limiters", () => {
    const content = readFileSync(indexPath, "utf-8");
    const compressionIdx = content.indexOf("app.use(compression(");
    const rateLimitIdx = content.indexOf("app.use(globalLimiter)");
    expect(compressionIdx).toBeGreaterThan(-1);
    expect(rateLimitIdx).toBeGreaterThan(-1);
    // La compresión debe estar ANTES del rate limiter
    expect(compressionIdx).toBeLessThan(rateLimitIdx);
  });

  it("index.ts configura level y threshold en compression", () => {
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain("level:");
    expect(content).toContain("threshold:");
  });
});

describe("Sprint 51 — Heartbeat anti-cold-start /api/scheduled/warmup", () => {
  const indexPath = resolve(ROOT, "server/_core/index.ts");

  it("index.ts registra el handler POST /api/scheduled/warmup", () => {
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain('"/api/scheduled/warmup"');
  });

  it("el handler warmup está registrado ANTES del middleware tRPC (app.use con createExpressMiddleware)", () => {
    const content = readFileSync(indexPath, "utf-8");
    const warmupIdx = content.indexOf('"/api/scheduled/warmup"');
    // Buscar la segunda ocurrencia de createExpressMiddleware (la del uso, no el import)
    const firstOccurrence = content.indexOf("createExpressMiddleware");
    const trpcMiddlewareIdx = content.indexOf(
      "createExpressMiddleware",
      firstOccurrence + 1
    );
    expect(warmupIdx).toBeGreaterThan(-1);
    expect(trpcMiddlewareIdx).toBeGreaterThan(-1);
    expect(warmupIdx).toBeLessThan(trpcMiddlewareIdx);
  });

  it("el handler warmup responde con JSON { ok: true }", () => {
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain("ok: true");
  });

  it("el handler warmup lee el header x-manus-cron-task-uid", () => {
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain("x-manus-cron-task-uid");
  });
});

describe("Sprint 51 — Redirección automática de usuarios autenticados", () => {
  const landingPath = resolve(ROOT, "client/src/pages/LandingPage.tsx");

  it("LandingPage.tsx lee manus-runtime-user-info de localStorage", () => {
    const content = readFileSync(landingPath, "utf-8");
    expect(content).toContain("manus-runtime-user-info");
    expect(content).toContain("localStorage.getItem");
  });

  it("LandingPage.tsx redirige instantáneamente si hay sesión cacheada válida", () => {
    const content = readFileSync(landingPath, "utf-8");
    expect(content).toContain("redirecting");
    expect(content).toContain('navigate("/dashboard")');
  });

  it("LandingPage.tsx valida que el objeto cacheado tiene campo 'id' antes de redirigir", () => {
    const content = readFileSync(landingPath, "utf-8");
    expect(content).toContain("parsed.id");
  });

  it("LandingPage.tsx tiene manejo de errores para JSON inválido en localStorage", () => {
    const content = readFileSync(landingPath, "utf-8");
    // Debe tener try/catch alrededor del localStorage.getItem
    expect(content).toContain("} catch {");
  });

  it("LandingPage.tsx muestra spinner mientras está redirigiendo", () => {
    const content = readFileSync(landingPath, "utf-8");
    // showSpinner debe incluir || redirecting
    expect(content).toContain("|| redirecting");
  });
});
