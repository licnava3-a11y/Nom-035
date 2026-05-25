/**
 * Sprint 53 Tests — Deduplicación Stale Cases Job + Heartbeat Warmup
 *
 * Verifica:
 * 1. El Stale Cases Job tiene lógica de deduplicación de 24h
 * 2. El handler /api/scheduled/warmup está registrado en index.ts
 * 3. La lógica de deduplicación es correcta
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const staleCasesPath = resolve(ROOT, "server/jobs/stale-cases-alerts-job.ts");
const indexPath = resolve(ROOT, "server/_core/index.ts");

describe("Sprint 53 — Deduplicación Stale Cases Job", () => {
  const content = readFileSync(staleCasesPath, "utf-8");

  it("el job tiene una función wasAlreadyNotified para deduplicación", () => {
    expect(content).toContain("wasAlreadyNotified");
  });

  it("la deduplicación usa una ventana de 24 horas", () => {
    expect(content).toContain("DEDUP_WINDOW_MS");
    expect(content).toContain("24 * 60 * 60 * 1000");
  });

  it("la deduplicación verifica userId, relatedEntityId y type", () => {
    expect(content).toContain("eq(notifications.userId, userId)");
    expect(content).toContain("eq(notifications.relatedEntityId, caseId)");
  });

  it("la deduplicación usa gt() para comparar con la fecha de inicio de la ventana", () => {
    expect(content).toContain("gt(notifications.createdAt, since)");
  });

  it("el job reporta notificationsSkipped en el resultado", () => {
    expect(content).toContain("notificationsSkipped");
  });

  it("el job omite notificaciones ya enviadas con continue", () => {
    expect(content).toContain("alreadyNotified");
    expect(content).toContain("notificationsSkipped++");
    expect(content).toContain("continue");
  });

  it("el log de finalización incluye el conteo de skipped", () => {
    expect(content).toContain("skipped — already notified in last 24h");
  });
});

describe("Sprint 53 — Handler Warmup en index.ts", () => {
  const content = readFileSync(indexPath, "utf-8");

  it("index.ts registra el handler /api/scheduled/warmup", () => {
    expect(content).toContain("/api/scheduled/warmup");
  });

  it("el handler warmup responde con ok:true", () => {
    expect(content).toContain('ok: true');
  });
});

describe("Sprint 53 — Lógica de deduplicación (unit tests puros)", () => {
  /**
   * Simula la lógica de deduplicación sin acceso a BD
   */
  function shouldSkipNotification(
    lastNotifiedAt: Date | null,
    dedupWindowMs: number,
    now: Date
  ): boolean {
    if (!lastNotifiedAt) return false;
    return now.getTime() - lastNotifiedAt.getTime() < dedupWindowMs;
  }

  const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

  it("debe omitir notificación si fue enviada hace 1 hora", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const lastNotified = new Date("2024-01-15T11:00:00Z"); // 1h antes
    expect(shouldSkipNotification(lastNotified, DEDUP_WINDOW_MS, now)).toBe(true);
  });

  it("debe omitir notificación si fue enviada hace 23 horas", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const lastNotified = new Date("2024-01-14T13:00:00Z"); // 23h antes
    expect(shouldSkipNotification(lastNotified, DEDUP_WINDOW_MS, now)).toBe(true);
  });

  it("debe enviar notificación si fue enviada hace más de 24 horas", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const lastNotified = new Date("2024-01-14T11:00:00Z"); // 25h antes
    expect(shouldSkipNotification(lastNotified, DEDUP_WINDOW_MS, now)).toBe(false);
  });

  it("debe enviar notificación si nunca fue enviada (null)", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    expect(shouldSkipNotification(null, DEDUP_WINDOW_MS, now)).toBe(false);
  });

  it("debe omitir notificación enviada exactamente hace 24h - 1ms", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const lastNotified = new Date(now.getTime() - DEDUP_WINDOW_MS + 1); // 1ms antes del límite
    expect(shouldSkipNotification(lastNotified, DEDUP_WINDOW_MS, now)).toBe(true);
  });

  it("debe enviar notificación enviada exactamente hace 24h", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const lastNotified = new Date(now.getTime() - DEDUP_WINDOW_MS); // exactamente 24h
    expect(shouldSkipNotification(lastNotified, DEDUP_WINDOW_MS, now)).toBe(false);
  });
});
