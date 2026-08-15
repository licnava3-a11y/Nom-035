/**
 * Sprint 52 Tests — Corrección definitiva del spinner en producción
 *
 * Verifica que el cargador dinámico de jobs críticos inicia después del health check
 * sin importar módulos no críticos al arranque.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const indexPath = resolve(ROOT, "server/_core/index.ts");

describe("Sprint 52 — Jobs con delay de arranque (anti-cold-start)", () => {
  const content = readFileSync(indexPath, "utf-8");

  it("index.ts define JOB_STARTUP_DELAY_MS de 15 segundos", () => {
    expect(content).toContain("JOB_STARTUP_DELAY_MS = 15_000");
  });

  it("index.ts tiene un setTimeout que envuelve todos los jobs", () => {
    expect(content).toContain("setTimeout(() => {");
    expect(content).toContain("}, JOB_STARTUP_DELAY_MS)");
  });

  it("startJobs dinámico está dentro del setTimeout", () => {
    const setTimeoutIdx = content.indexOf("setTimeout(() => {");
    const startJobsIdx = content.indexOf("startJobs().catch");
    expect(setTimeoutIdx).toBeGreaterThan(-1);
    expect(startJobsIdx).toBeGreaterThan(setTimeoutIdx);
  });

  it("los módulos de jobs se cargan dinámicamente dentro de startJobs", () => {
    expect(content).toContain("async function startJobs()");
    expect(content).toContain("await import(");
    expect(content).toContain("Jobs críticos NOM-035");
  });

  it("el cierre del setTimeout está ANTES del cierre del server.listen", () => {
    const closeSetTimeoutIdx = content.indexOf("}, JOB_STARTUP_DELAY_MS)");
    const closeListenIdx = content.indexOf("  });\n}", closeSetTimeoutIdx);
    expect(closeSetTimeoutIdx).toBeGreaterThan(-1);
    expect(closeListenIdx).toBeGreaterThan(-1);
    expect(closeSetTimeoutIdx).toBeLessThan(closeListenIdx);
  });

  it("el servidor imprime mensaje de delay al arrancar", () => {
    expect(content).toContain("Jobs críticos NOM-035 iniciarán en");
    expect(content).toContain("Cloud Run pase el health check");
  });
});
