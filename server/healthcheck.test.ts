/**
 * Health Check Tests — Endpoint /api/health
 *
 * Verifica:
 * 1. El endpoint /api/health existe en index.ts.
 * 2. El endpoint está registrado ANTES de la autenticación (disponible sin sesión).
 * 3. El Dockerfile usa /api/health en lugar de /api/auth/mode.
 * 4. El Dockerfile tiene start-period suficiente para Cloud Run cold start.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

describe("Health Check — Endpoint /api/health", () => {
  const indexPath = resolve(ROOT, "server/_core/index.ts");
  const dockerfilePath = resolve(ROOT, "Dockerfile");

  it("server/_core/index.ts define el endpoint GET /api/health", () => {
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain('app.get("/api/health"');
  });

  it("/api/health devuelve { ok: true } con timestamp", () => {
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain("ok: true");
    expect(content).toContain("ts: Date.now()");
  });

  it("/api/health está registrado ANTES de la autenticación OAuth/LocalAuth", () => {
    const content = readFileSync(indexPath, "utf-8");
    const healthIndex = content.indexOf('app.get("/api/health"');
    // Buscar la llamada a registerOAuthRoutes (no el import)
    const oauthIndex = content.indexOf("registerOAuthRoutes(app)");
    // Buscar la llamada a registerLocalAuthRoutes (no el import)
    const localAuthIndex = content.indexOf("registerLocalAuthRoutes(app)");
    
    expect(healthIndex).toBeGreaterThan(-1);
    expect(oauthIndex).toBeGreaterThan(-1);
    expect(localAuthIndex).toBeGreaterThan(-1);
    
    // El health check debe aparecer antes de la autenticación
    expect(healthIndex).toBeLessThan(oauthIndex);
    expect(healthIndex).toBeLessThan(localAuthIndex);
  });

  it("Dockerfile usa /api/health (no /api/auth/mode) en HEALTHCHECK", () => {
    const content = readFileSync(dockerfilePath, "utf-8");
    expect(content).toContain("/api/health");
    expect(content).not.toContain("/api/auth/mode");
  });

  it("Dockerfile tiene start-period >= 60s para Cloud Run cold start", () => {
    const content = readFileSync(dockerfilePath, "utf-8");
    // Extraer el valor de start-period
    const match = content.match(/--start-period=(\d+)s/);
    expect(match).not.toBeNull();
    const startPeriod = parseInt(match![1]);
    expect(startPeriod).toBeGreaterThanOrEqual(60);
  });

  it("Dockerfile tiene retries >= 3 para tolerar cold starts", () => {
    const content = readFileSync(dockerfilePath, "utf-8");
    const match = content.match(/--retries=(\d+)/);
    expect(match).not.toBeNull();
    const retries = parseInt(match![1]);
    expect(retries).toBeGreaterThanOrEqual(3);
  });

  it("/api/health NO requiere autenticación (es publicProcedure equivalente)", () => {
    const content = readFileSync(indexPath, "utf-8");
    // El handler no debe verificar cookies ni tokens
    const healthHandlerStart = content.indexOf('app.get("/api/health"');
    const healthHandlerEnd = content.indexOf("});", healthHandlerStart);
    const handlerCode = content.substring(healthHandlerStart, healthHandlerEnd);
    
    expect(handlerCode).not.toContain("cookie");
    expect(handlerCode).not.toContain("authenticate");
    expect(handlerCode).not.toContain("jwt");
  });
});
