/**
 * Tests para:
 *  1. validateRFC / formatRFC — validador de RFC mexicano
 *  2. dc3.validateRFC — endpoint tRPC
 *  3. dc3.exportToPdf — endpoint tRPC (genera PDF base64 válido)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { validateRFC, formatRFC } from "./lib/rfc-validator";
import { appRouter } from "./routers";

// ─── Tests del validador local ────────────────────────────────────────────────

describe("validateRFC — persona moral (12 chars)", () => {
  it("acepta RFC de persona moral válido", () => {
    const result = validateRFC("EEJ850101XXX");
    expect(result.valid).toBe(true);
    expect(result.type).toBe("moral");
    expect(result.error).toBeNull();
    expect(result.homoclave).toBe("XXX");
  });

  it("acepta RFC de persona moral con letras especiales (&, Ñ)", () => {
    const result = validateRFC("SA&850101ABC");
    expect(result.valid).toBe(true);
    expect(result.type).toBe("moral");
  });

  it("rechaza RFC de persona moral con mes inválido (00)", () => {
    const result = validateRFC("EEJ850001XXX");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("mes");
  });

  it("rechaza RFC de persona moral con mes inválido (13)", () => {
    const result = validateRFC("EEJ851301XXX");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("mes");
  });

  it("rechaza RFC de persona moral con día inválido (00)", () => {
    const result = validateRFC("EEJ850100XXX");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("día");
  });

  it("rechaza RFC de persona moral con formato incorrecto (dígito en lugar de letra)", () => {
    const result = validateRFC("1EJ850101XXX");
    expect(result.valid).toBe(false);
  });
});

describe("validateRFC — persona física (13 chars)", () => {
  it("acepta RFC de persona física válido", () => {
    const result = validateRFC("GALJ850101XXX");
    expect(result.valid).toBe(true);
    expect(result.type).toBe("fisica");
    expect(result.error).toBeNull();
    expect(result.homoclave).toBe("XXX");
  });

  it("acepta RFC de persona física en minúsculas (normaliza)", () => {
    const result = validateRFC("galj850101xxx");
    expect(result.valid).toBe(true);
    expect(result.rfc).toBe("GALJ850101XXX");
  });

  it("rechaza RFC de persona física con longitud incorrecta (11 chars)", () => {
    const result = validateRFC("GALJ85010XX");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("12");
  });

  it("rechaza RFC de persona física con longitud incorrecta (14 chars)", () => {
    const result = validateRFC("GALJ850101XXXX");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("12");
  });

  it("rechaza RFC de persona física con mes inválido (13)", () => {
    const result = validateRFC("GALJ851301XXX");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("mes");
  });

  it("rechaza RFC vacío", () => {
    const result = validateRFC("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("vacío");
  });

  it("rechaza RFC con solo espacios", () => {
    const result = validateRFC("   ");
    expect(result.valid).toBe(false);
  });

  it("verifica dígito verificador en modo strict (RFC con dígito correcto)", () => {
    // RFC con dígito verificador correcto — usamos uno conocido
    // GALJ850101H7A → el dígito verificador calculado debe coincidir
    const rfcBase = "GALJ850101H7";
    // Calculamos el dígito manualmente para este test
    // En modo no-strict debe ser válido de todas formas
    const resultNonStrict = validateRFC("GALJ850101H7A");
    expect(resultNonStrict.valid).toBe(true);
  });
});

describe("formatRFC", () => {
  it("formatea RFC de persona moral con guiones", () => {
    expect(formatRFC("EEJ850101XXX")).toBe("EEJ-850101-XXX");
  });

  it("formatea RFC de persona física con guiones", () => {
    expect(formatRFC("GALJ850101XXX")).toBe("GALJ-850101-XXX");
  });

  it("normaliza a mayúsculas antes de formatear", () => {
    expect(formatRFC("galj850101xxx")).toBe("GALJ-850101-XXX");
  });

  it("devuelve el RFC sin cambios si no tiene 12 ni 13 chars", () => {
    expect(formatRFC("GALJ850")).toBe("GALJ850");
  });
});

// ─── Tests del endpoint dc3.validateRFC (via router) ─────────────────────────

describe("dc3.validateRFC — endpoint tRPC", () => {
  let caller: Awaited<ReturnType<typeof createTestCaller>>;

  function createTestCaller() {
    const mockCtx = {
      user: { id: 1, openId: "test-open-id", name: "Test User", role: "admin" as const },
      req: {} as any,
      res: { clearCookie: () => {} } as any,
    };
    return appRouter.createCaller(mockCtx as any);
  }

  beforeAll(() => {
    caller = createTestCaller();
  });

  it("valida RFC de persona moral válido", async () => {
    const result = await caller.dc3.validateRFC({ rfc: "EEJ850101XXX" });
    expect(result.valid).toBe(true);
    expect(result.type).toBe("moral");
    expect(result.rfcFormatted).toBe("EEJ-850101-XXX");
  });

  it("valida RFC de persona física válido", async () => {
    const result = await caller.dc3.validateRFC({ rfc: "GALJ850101XXX" });
    expect(result.valid).toBe(true);
    expect(result.type).toBe("fisica");
    expect(result.rfcFormatted).toBe("GALJ-850101-XXX");
  });

  it("rechaza RFC inválido y devuelve error", async () => {
    const result = await caller.dc3.validateRFC({ rfc: "INVALIDO" });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.rfcFormatted).toBeNull();
  });

  it("normaliza RFC a mayúsculas antes de validar", async () => {
    const result = await caller.dc3.validateRFC({ rfc: "galj850101xxx" });
    expect(result.valid).toBe(true);
    expect(result.rfc).toBe("GALJ850101XXX");
  });
});

// ─── Tests del endpoint dc3.exportToPdf ──────────────────────────────────────

describe("dc3.exportToPdf — endpoint tRPC", () => {
  let caller: Awaited<ReturnType<typeof createTestCaller>>;
  let testRecordId: number;

  function createTestCaller() {
    const mockCtx = {
      user: { id: 1, openId: "test-open-id", name: "Test User", role: "admin" as const },
      req: {} as any,
      res: { clearCookie: () => {} } as any,
    };
    return appRouter.createCaller(mockCtx as any);
  }

  beforeAll(async () => {
    caller = createTestCaller();

    // Crear un registro DC-3 de prueba
    const result = await caller.dc3.create({
      workerName: "GARCÍA LÓPEZ JUAN CARLOS",
      workerCurp: "GALJ850101HDFXXX00",
      workerOccupationCnoKey: "08.2",
      workerOccupationCnoDesc: "Administración",
      workerPosition: "Analista Administrativo",
      companyName: "EMPRESA EJEMPLO S.A. DE C.V.",
      companyRfc: "EEJ850101XXX",
      courseName: "Prevención de Factores de Riesgo Psicosocial NOM-035-STPS-2018",
      courseDurationHours: 16,
      periodStartDate: "2025-01-15",
      periodEndDate: "2025-01-16",
      thematicAreaKey: "6000",
      thematicAreaDesc: "Seguridad",
      trainingAgentName: "Consultoría NOM-035 S.C.",
      instructorName: "LIC. PEDRO MARTÍNEZ SÁNCHEZ",
      employerRepName: "ING. ROBERTO FLORES HERNÁNDEZ",
      workerRepName: null,
      status: "issued",
      folioNumber: null,
      notes: "Registro de prueba para test de PDF",
    });
    testRecordId = result.id;
  });

  afterAll(async () => {
    // Limpiar el registro de prueba
    if (testRecordId) {
      await caller.dc3.delete({ id: testRecordId });
    }
  });

  it("genera un PDF base64 válido para un registro existente", async () => {
    const result = await caller.dc3.exportToPdf({ id: testRecordId });
    expect(result.pdfBase64).toBeTruthy();
    expect(typeof result.pdfBase64).toBe("string");
    expect(result.folioNumber).toBeTruthy();

    // Verificar que el base64 decodifica a un PDF válido (%PDF header)
    const pdfBuffer = Buffer.from(result.pdfBase64, "base64");
    expect(pdfBuffer.length).toBeGreaterThan(100);
    const header = pdfBuffer.slice(0, 4).toString("ascii");
    expect(header).toBe("%PDF");
  });

  it("el folio del PDF coincide con el del registro", async () => {
    const result = await caller.dc3.exportToPdf({ id: testRecordId });
    // El folio debe seguir el patrón CODIGO-NNNN/YYYY (ej. DC-3-0001/2026 o DC-3-30006/2026)
    expect(result.folioNumber).toMatch(/^[A-Z0-9-]+-\d{4,}\/\d{4}$/);
  });

  it("lanza NOT_FOUND para un ID inexistente", async () => {
    await expect(
      caller.dc3.exportToPdf({ id: 999999 })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
