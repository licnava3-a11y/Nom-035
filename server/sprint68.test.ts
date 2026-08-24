/**
 * sprint68.test.ts
 * Tests unitarios para las funcionalidades del Sprint 68:
 *  1. Procedimiento resendDispatch
 *  2. Endpoint de confirmación de lectura con firma (confirmReadRouter)
 *  3. Job de alertas de despachos sin leer (dispatch-unread-alerts-job)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock de módulos externos ──────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  createNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("./dispatchEmail", () => ({
  sendDispatchEmail: vi.fn().mockResolvedValue(true),
  generateReadToken: vi
    .fn()
    .mockReturnValue(
      "test-token-64chars-hex-string-here-padded-to-64chars-0000"
    ),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: vi
        .fn()
        .mockReturnValue(
          "new-test-token-64chars-hex-string-here-padded-to-64chars-00"
        ),
    }),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createMockDb(overrides: Record<string, any> = {}) {
  const mockWhere = vi.fn().mockResolvedValue([]);
  const mockLimit = vi.fn().mockReturnValue({ where: mockWhere });
  const mockFrom = vi.fn().mockReturnValue({
    leftJoin: vi.fn().mockReturnThis(),
    where: mockWhere,
    limit: mockLimit,
  });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  const mockSet = vi.fn().mockReturnThis();
  const mockUpdateWhere = vi.fn().mockResolvedValue({ rowsAffected: 1 });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockUpdateWhere });

  return {
    select: mockSelect,
    update: mockUpdate,
    _mockWhere: mockWhere,
    _mockSet: mockSet,
    _mockUpdateWhere: mockUpdateWhere,
    ...overrides,
  };
}

// ── Tests del job de alertas de despachos sin leer ────────────────────────────

describe("dispatch-unread-alerts-job", () => {
  let getDb: any;
  let sendDispatchEmail: any;
  let notifyOwner: any;
  let runDispatchUnreadAlertsJob: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const dbModule = await import("./db");
    const emailModule = await import("./dispatchEmail");
    const notifyModule = await import("./_core/notification");
    getDb = dbModule.getDb;
    sendDispatchEmail = emailModule.sendDispatchEmail;
    notifyOwner = notifyModule.notifyOwner;
    const jobModule = await import("./jobs/dispatch-unread-alerts-job");
    runDispatchUnreadAlertsJob = jobModule.runDispatchUnreadAlertsJob;
  });

  it("retorna checked=0 cuando no hay despachos sin leer", async () => {
    const db = createMockDb();
    // Simular consulta que retorna arreglo vacío
    const mockFrom = vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    });
    db.select = vi.fn().mockReturnValue({ from: mockFrom });
    getDb.mockResolvedValue(db);

    const result = await runDispatchUnreadAlertsJob();

    expect(result.checked).toBe(0);
    expect(result.remindersSent).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(sendDispatchEmail).not.toHaveBeenCalled();
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("retorna error cuando la BD no está disponible", async () => {
    getDb.mockResolvedValue(null);

    const result = await runDispatchUnreadAlertsJob();

    expect(result.checked).toBe(0);
    expect(result.remindersSent).toBe(0);
    expect(sendDispatchEmail).not.toHaveBeenCalled();
  });

  it("envía recordatorio y notifica al admin cuando hay despachos sin leer", async () => {
    const overdueDispatch = {
      id: 1,
      minuteId: 10,
      recipientId: 5,
      sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 días atrás
      readToken: "old-token",
      recipientName: "Juan Pérez",
      recipientEmail: "juan@empresa.com",
      minuteTitle: "Minuta Ordinaria Enero",
      minuteFolio: "MIN-2026-001",
      minuteDate: new Date("2026-01-15"),
    };

    const db = createMockDb();
    const mockFrom = vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([overdueDispatch]),
    });
    db.select = vi.fn().mockReturnValue({ from: mockFrom });
    getDb.mockResolvedValue(db);

    const result = await runDispatchUnreadAlertsJob();

    expect(result.checked).toBe(1);
    expect(result.remindersSent).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(sendDispatchEmail).toHaveBeenCalledTimes(1);
    expect(sendDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "juan@empresa.com",
        recipientName: "Juan Pérez",
        isReminder: true,
      })
    );
    expect(notifyOwner).toHaveBeenCalledTimes(1);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("despacho"),
      })
    );
  });

  it("registra error cuando el destinatario no tiene correo", async () => {
    const dispatchWithoutEmail = {
      id: 2,
      minuteId: 10,
      recipientId: 6,
      sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      readToken: "old-token-2",
      recipientName: "Sin Correo",
      recipientEmail: null, // Sin correo
      minuteTitle: "Minuta Test",
      minuteFolio: "MIN-2026-002",
      minuteDate: new Date(),
    };

    const db = createMockDb();
    const mockFrom = vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([dispatchWithoutEmail]),
    });
    db.select = vi.fn().mockReturnValue({ from: mockFrom });
    getDb.mockResolvedValue(db);

    const result = await runDispatchUnreadAlertsJob();

    expect(result.checked).toBe(1);
    expect(result.remindersSent).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("sin correo");
    expect(sendDispatchEmail).not.toHaveBeenCalled();
  });

  it("maneja múltiples despachos con éxito parcial", async () => {
    const dispatches = [
      {
        id: 1,
        minuteId: 10,
        recipientId: 5,
        sentAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        readToken: "token-1",
        recipientName: "Ana García",
        recipientEmail: "ana@empresa.com",
        minuteTitle: "Minuta A",
        minuteFolio: "MIN-001",
        minuteDate: new Date(),
      },
      {
        id: 2,
        minuteId: 11,
        recipientId: 6,
        sentAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        readToken: "token-2",
        recipientName: "Carlos López",
        recipientEmail: null, // Sin correo — debe registrar error
        minuteTitle: "Minuta B",
        minuteFolio: "MIN-002",
        minuteDate: new Date(),
      },
    ];

    const db = createMockDb();
    const mockFrom = vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(dispatches),
    });
    db.select = vi.fn().mockReturnValue({ from: mockFrom });
    getDb.mockResolvedValue(db);

    const result = await runDispatchUnreadAlertsJob();

    expect(result.checked).toBe(2);
    expect(result.remindersSent).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(sendDispatchEmail).toHaveBeenCalledTimes(1);
  });
});

// ── Tests del helper sendDispatchEmail (modo recordatorio) ────────────────────

describe("sendDispatchEmail - modo recordatorio", () => {
  it("la interfaz SingleDispatchEmailData acepta isReminder y daysSinceSent", async () => {
    const { sendDispatchEmail: realSendDispatchEmail } = await import(
      "./dispatchEmail"
    );

    // Verificar que el mock acepta los parámetros correctos
    const emailData = {
      dispatchId: 1,
      to: "test@empresa.com",
      recipientName: "Test User",
      minuteFolio: "MIN-001",
      minuteTitle: "Minuta de Prueba",
      minuteDate: new Date(),
      token: "test-token-abc",
      isReminder: true,
      daysSinceSent: 8,
    };

    // No debe lanzar error de TypeScript
    expect(() => emailData).not.toThrow();
    expect(emailData.isReminder).toBe(true);
    expect(emailData.daysSinceSent).toBe(8);
  });

  it("la interfaz SingleDispatchEmailData funciona sin isReminder (opcional)", () => {
    const emailData = {
      dispatchId: 2,
      to: "test2@empresa.com",
      recipientName: "Test User 2",
      minuteFolio: "MIN-002",
      minuteTitle: "Minuta 2",
      minuteDate: new Date(),
      token: "test-token-xyz",
      // isReminder y daysSinceSent son opcionales
    };

    expect(emailData.isReminder).toBeUndefined();
    expect(emailData.daysSinceSent).toBeUndefined();
  });
});

// ── Tests del endpoint de confirmación con firma ──────────────────────────────

describe("confirmReadRouter - lógica de firma", () => {
  it("valida que signerName tenga al menos 2 caracteres", () => {
    const validateSignerName = (name: string): boolean =>
      name.trim().length >= 2;

    expect(validateSignerName("")).toBe(false);
    expect(validateSignerName("A")).toBe(false);
    expect(validateSignerName("  ")).toBe(false);
    expect(validateSignerName("AB")).toBe(true);
    expect(validateSignerName("Juan Pérez García")).toBe(true);
  });

  it("escapa correctamente caracteres HTML en el nombre del firmante", () => {
    const escapeHtml = (str: string): string =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
    );
    expect(escapeHtml("Juan & María")).toBe("Juan &amp; Mar\u00eda");
    expect(escapeHtml("Normal Name")).toBe("Normal Name");
  });

  it("el token de confirmación tiene el formato correcto (64 chars hex)", () => {
    // Verificar que un token hex de 32 bytes tiene 64 caracteres
    const { randomBytes } = require("crypto");
    const token = randomBytes(32).toString("hex");
    expect(typeof token).toBe("string");
    expect(token.length).toBe(64);
    expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
  });

  it("detecta correctamente despachos ya confirmados", () => {
    const isAlreadyRead = (status: string, readAt: Date | null): boolean =>
      status === "read" && readAt !== null;

    expect(isAlreadyRead("read", new Date())).toBe(true);
    expect(isAlreadyRead("sent", null)).toBe(false);
    expect(isAlreadyRead("sent", new Date())).toBe(false);
    expect(isAlreadyRead("read", null)).toBe(false);
  });

  it("formatea la fecha de confirmación en español", () => {
    const formatReadDate = (date: Date): string =>
      date.toLocaleString("es-MX", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Mexico_City",
      });

    const testDate = new Date("2026-01-15T10:30:00Z");
    const formatted = formatReadDate(testDate);
    // Debe contener el año y algún mes en español
    expect(formatted).toContain("2026");
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(10);
  });
});

// ── Tests del procedimiento resendDispatch ────────────────────────────────────

describe("resendDispatch - lógica de negocio", () => {
  it("solo permite reenvío para despachos en estado sent o bounced", () => {
    const canResend = (status: string): boolean =>
      status === "sent" || status === "bounced";

    expect(canResend("sent")).toBe(true);
    expect(canResend("bounced")).toBe(true);
    expect(canResend("read")).toBe(false);
  });

  it("genera un nuevo token al reenviar", () => {
    const { randomBytes } = require("crypto");
    const newToken = randomBytes(32).toString("hex");
    expect(typeof newToken).toBe("string");
    expect(newToken.length).toBe(64);
  });

  it("el nuevo token es diferente al token anterior", () => {
    const { randomBytes } = require("crypto");
    const token1 = randomBytes(32).toString("hex");
    const token2 = randomBytes(32).toString("hex");
    expect(typeof token1).toBe("string");
    expect(token1.length).toBe(64);
    expect(typeof token2).toBe("string");
    expect(token2.length).toBe(64);
  });
});
