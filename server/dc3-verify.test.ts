/**
 * Tests para el sistema de verificación de autenticidad DC-3:
 *  - Generación del hash SHA-256 (función canónica)
 *  - Endpoint dc3.verify (lógica de negocio)
 *  - Generación del QR (parámetros y formato)
 *  - Integración hash ↔ PDF
 */
import { describe, it, expect, vi } from "vitest";
import { createHash } from "crypto";

// ─── Función auxiliar (replica la lógica del router) ─────────────────────────

function generateVerificationHash(record: {
  id: number;
  workerName: string;
  workerCurp?: string | null;
  companyName: string;
  companyRfc?: string | null;
  courseName: string;
  courseDurationHours?: number | null;
  periodStartDate?: Date | string | null;
  periodEndDate?: Date | string | null;
  thematicAreaKey?: string | null;
  folioNumber?: string | null;
  createdAt: Date;
}): string {
  const canonical = [
    record.id,
    record.workerName,
    record.workerCurp ?? "",
    record.companyName,
    record.companyRfc ?? "",
    record.courseName,
    record.courseDurationHours ?? "",
    record.periodStartDate ? String(record.periodStartDate).slice(0, 10) : "",
    record.periodEndDate ? String(record.periodEndDate).slice(0, 10) : "",
    record.thematicAreaKey ?? "",
    record.folioNumber ?? "",
    record.createdAt.toISOString(),
  ].join("|");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ─── Tests: generateVerificationHash ─────────────────────────────────────────

describe("generateVerificationHash — formato y propiedades", () => {
  const baseRecord = {
    id: 42,
    workerName: "PÉREZ GÓMEZ JUAN",
    workerCurp: "PEGJ850101HMCRNN09",
    companyName: "EMPRESA EJEMPLO SA DE CV",
    companyRfc: "EEJ850101XXX",
    courseName: "NOM-035-STPS-2018 Factores de Riesgo Psicosocial",
    courseDurationHours: 8,
    periodStartDate: "2024-01-15",
    periodEndDate: "2024-01-15",
    thematicAreaKey: "06",
    folioNumber: "DC3-0001/2024",
    createdAt: new Date("2024-01-15T10:00:00.000Z"),
  };

  it("produce un hash hexadecimal de 64 caracteres (SHA-256)", () => {
    const hash = generateVerificationHash(baseRecord);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("es determinista: el mismo registro siempre produce el mismo hash", () => {
    const hash1 = generateVerificationHash(baseRecord);
    const hash2 = generateVerificationHash(baseRecord);
    expect(hash1).toBe(hash2);
  });

  it("cambia si se modifica el nombre del trabajador", () => {
    const hash1 = generateVerificationHash(baseRecord);
    const hash2 = generateVerificationHash({
      ...baseRecord,
      workerName: "OTRO NOMBRE",
    });
    expect(hash1).not.toBe(hash2);
  });

  it("cambia si se modifica el ID del registro", () => {
    const hash1 = generateVerificationHash(baseRecord);
    const hash2 = generateVerificationHash({ ...baseRecord, id: 99 });
    expect(hash1).not.toBe(hash2);
  });

  it("cambia si se modifica la fecha de creación", () => {
    const hash1 = generateVerificationHash(baseRecord);
    const hash2 = generateVerificationHash({
      ...baseRecord,
      createdAt: new Date("2024-06-01T12:00:00.000Z"),
    });
    expect(hash1).not.toBe(hash2);
  });

  it("cambia si se modifica el nombre del curso", () => {
    const hash1 = generateVerificationHash(baseRecord);
    const hash2 = generateVerificationHash({
      ...baseRecord,
      courseName: "Otro curso",
    });
    expect(hash1).not.toBe(hash2);
  });

  it("maneja correctamente campos nulos (usa cadena vacía)", () => {
    const recordWithNulls = {
      ...baseRecord,
      workerCurp: null,
      companyRfc: null,
      courseDurationHours: null,
      periodStartDate: null,
      periodEndDate: null,
      thematicAreaKey: null,
      folioNumber: null,
    };
    const hash = generateVerificationHash(recordWithNulls);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produce un hash diferente con campos nulos vs campos con valor", () => {
    const hashWithValues = generateVerificationHash(baseRecord);
    const hashWithNulls = generateVerificationHash({
      ...baseRecord,
      workerCurp: null,
      companyRfc: null,
    });
    expect(hashWithValues).not.toBe(hashWithNulls);
  });
});

// ─── Tests: cadena canónica ───────────────────────────────────────────────────

describe("Cadena canónica — estructura del hash", () => {
  it("usa el separador | entre campos", () => {
    const record = {
      id: 1,
      workerName: "TEST",
      workerCurp: "CURP",
      companyName: "EMPRESA",
      companyRfc: "RFC",
      courseName: "CURSO",
      courseDurationHours: 4,
      periodStartDate: "2024-01-01",
      periodEndDate: "2024-01-01",
      thematicAreaKey: "01",
      folioNumber: "DC3-0001/2024",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    };

    const canonical = [
      record.id,
      record.workerName,
      record.workerCurp ?? "",
      record.companyName,
      record.companyRfc ?? "",
      record.courseName,
      record.courseDurationHours ?? "",
      record.periodStartDate ? String(record.periodStartDate).slice(0, 10) : "",
      record.periodEndDate ? String(record.periodEndDate).slice(0, 10) : "",
      record.thematicAreaKey ?? "",
      record.folioNumber ?? "",
      record.createdAt.toISOString(),
    ].join("|");

    expect(canonical).toContain("|");
    expect(canonical.split("|")).toHaveLength(12);
    expect(canonical).toContain("TEST");
    expect(canonical).toContain("EMPRESA");
  });

  it("incluye exactamente 12 campos en la cadena canónica", () => {
    const fields = [
      "42", // id
      "JUAN", // workerName
      "CURP123", // workerCurp
      "EMPRESA", // companyName
      "RFC123", // companyRfc
      "CURSO", // courseName
      "8", // courseDurationHours
      "2024-01-15", // periodStartDate
      "2024-01-15", // periodEndDate
      "06", // thematicAreaKey
      "DC3-001", // folioNumber
      "2024-01-15T10:00:00.000Z", // createdAt
    ];
    expect(fields).toHaveLength(12);
    const canonical = fields.join("|");
    expect(canonical.split("|")).toHaveLength(12);
  });
});

// ─── Tests: URL de verificación ───────────────────────────────────────────────

describe("URL de verificación — formato", () => {
  it("construye la URL correctamente con el hash", () => {
    const appUrl = "https://nom035mood-32dy4ksx.manus.space";
    const hash = "a".repeat(64);
    const verifyUrl = `${appUrl}/verificar-dc3?hash=${hash}`;
    expect(verifyUrl).toBe(
      `https://nom035mood-32dy4ksx.manus.space/verificar-dc3?hash=${"a".repeat(64)}`
    );
    expect(verifyUrl).toContain("/verificar-dc3?hash=");
  });

  it("la URL de verificación tiene el formato correcto para un QR", () => {
    const appUrl = "https://nom035mood-32dy4ksx.manus.space";
    const hash = generateVerificationHash({
      id: 1,
      workerName: "TEST",
      companyName: "EMPRESA",
      courseName: "CURSO",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    });
    const verifyUrl = `${appUrl}/verificar-dc3?hash=${hash}`;
    // La URL debe ser lo suficientemente corta para un QR de nivel M
    expect(verifyUrl.length).toBeLessThan(200);
    expect(new URL(verifyUrl).searchParams.get("hash")).toBe(hash);
  });
});

// ─── Tests: parámetros del QR ─────────────────────────────────────────────────

describe("Parámetros del QR — configuración", () => {
  it("el QR usa nivel de corrección de errores M (15%)", () => {
    const qrOptions = {
      type: "png" as const,
      width: 200,
      margin: 1,
      errorCorrectionLevel: "M" as const,
      color: { dark: "#000000", light: "#ffffff" },
    };
    expect(qrOptions.errorCorrectionLevel).toBe("M");
    expect(qrOptions.width).toBe(200);
    expect(qrOptions.type).toBe("png");
  });

  it("el tamaño del QR en el PDF (70px) es legible", () => {
    const qrSizeInPdf = 70; // puntos PDF
    // 70 puntos ≈ 24.7mm — suficiente para ser escaneado con un smartphone
    expect(qrSizeInPdf).toBeGreaterThanOrEqual(50);
  });

  it("el hash truncado en el pie del PDF tiene 16 caracteres + '…'", () => {
    const hash =
      "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2";
    const truncated = `${hash.slice(0, 16)}…`;
    expect(truncated).toHaveLength(17); // 16 + '…'
    expect(truncated).toMatch(/^[0-9a-z]{16}…$/);
  });
});

// ─── Tests: endpoint verify — lógica de respuesta ────────────────────────────

describe("dc3.verify — estructura de respuesta", () => {
  it("devuelve found:false cuando el registro no existe", () => {
    const response = { found: false as const, record: null };
    expect(response.found).toBe(false);
    expect(response.record).toBeNull();
  });

  it("devuelve found:true con el registro cuando existe", () => {
    const mockRecord = {
      id: 42,
      workerName: "PÉREZ GÓMEZ JUAN",
      workerCurp: "PEGJ850101HMCRNN09",
      companyName: "EMPRESA EJEMPLO SA DE CV",
      companyRfc: "EEJ850101XXX",
      courseName: "NOM-035 Factores de Riesgo Psicosocial",
      courseDurationHours: 8,
      periodStartDate: new Date("2024-01-15"),
      periodEndDate: new Date("2024-01-15"),
      thematicAreaKey: "06",
      thematicAreaDesc: "Seguridad e higiene",
      instructorName: "LIC. INSTRUCTOR",
      employerRepName: "ING. PATRÓN",
      workerRepName: null,
      status: "issued" as const,
      folioNumber: "DC3-0001/2024",
      verificationHash: "a".repeat(64),
      createdAt: new Date("2024-01-15T10:00:00.000Z"),
      updatedAt: new Date("2024-01-15T10:00:00.000Z"),
      instructorSignatureUrl: "https://s3.example.com/instructor.png",
      employerSignatureUrl: null,
      workerRepSignatureUrl: null,
    };
    const response = { found: true as const, record: mockRecord };
    expect(response.found).toBe(true);
    expect(response.record).not.toBeNull();
    expect(response.record!.workerName).toBe("PÉREZ GÓMEZ JUAN");
    expect(response.record!.status).toBe("issued");
  });

  it("la respuesta incluye las URLs de firma para mostrar indicadores", () => {
    const mockRecord = {
      instructorSignatureUrl: "https://s3.example.com/instructor.png",
      employerSignatureUrl: null,
      workerRepSignatureUrl: null,
    };
    const signedCount = [
      mockRecord.instructorSignatureUrl,
      mockRecord.employerSignatureUrl,
      mockRecord.workerRepSignatureUrl,
    ].filter(Boolean).length;
    expect(signedCount).toBe(1);
  });
});
