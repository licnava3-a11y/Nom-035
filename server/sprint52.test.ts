/**
 * Sprint 52 Tests — Corrección definitiva del spinner en producción
 *
 * Verifica que todos los jobs de alertas están dentro del setTimeout de 30s
 * para que Cloud Run pase el health check ANTES de que los jobs saturen la CPU.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const indexPath = resolve(ROOT, "server/_core/index.ts");

describe("Sprint 52 — Jobs con delay de arranque (anti-cold-start)", () => {
  const content = readFileSync(indexPath, "utf-8");

  it("index.ts define JOB_STARTUP_DELAY_MS de 30 segundos", () => {
    expect(content).toContain("JOB_STARTUP_DELAY_MS = 30_000");
  });

  it("index.ts tiene un setTimeout que envuelve todos los jobs", () => {
    expect(content).toContain("setTimeout(() => {");
    expect(content).toContain("}, JOB_STARTUP_DELAY_MS)");
  });

  it("startSurveyAlertsJob está DENTRO del setTimeout (después de él)", () => {
    const setTimeoutIdx = content.indexOf("setTimeout(() => {");
    const surveyJobIdx = content.indexOf("startSurveyAlertsJob()");
    expect(setTimeoutIdx).toBeGreaterThan(-1);
    expect(surveyJobIdx).toBeGreaterThan(-1);
    // El job debe estar DESPUÉS del setTimeout
    expect(surveyJobIdx).toBeGreaterThan(setTimeoutIdx);
  });

  it("startStaleCasesJob está DENTRO del setTimeout", () => {
    const setTimeoutIdx = content.indexOf("setTimeout(() => {");
    const staleJobIdx = content.indexOf("startStaleCasesJob()");
    expect(setTimeoutIdx).toBeGreaterThan(-1);
    expect(staleJobIdx).toBeGreaterThan(-1);
    expect(staleJobIdx).toBeGreaterThan(setTimeoutIdx);
  });

  it("startSecurityAlertsJob está DENTRO del setTimeout", () => {
    const setTimeoutIdx = content.indexOf("setTimeout(() => {");
    const secJobIdx = content.indexOf("startSecurityAlertsJob()");
    expect(setTimeoutIdx).toBeGreaterThan(-1);
    expect(secJobIdx).toBeGreaterThan(-1);
    expect(secJobIdx).toBeGreaterThan(setTimeoutIdx);
  });

  it("el cierre del setTimeout está ANTES del cierre del server.listen", () => {
    const closeSetTimeoutIdx = content.indexOf("}, JOB_STARTUP_DELAY_MS)");
    const closeListenIdx = content.indexOf("  });\n}", closeSetTimeoutIdx);
    expect(closeSetTimeoutIdx).toBeGreaterThan(-1);
    expect(closeListenIdx).toBeGreaterThan(-1);
    expect(closeSetTimeoutIdx).toBeLessThan(closeListenIdx);
  });

  it("el servidor imprime mensaje de delay al arrancar", () => {
    expect(content).toContain("jobs iniciarán en");
    expect(content).toContain("health check de Cloud Run");
  });
});
