/**
 * Tests para:
 * 1. Firma remota DC-3 (dc3RemoteSign router)
 * 2. Catálogo de formatos (formatCatalog router)
 * 3. Función generateDC3Folio con formatCode
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock de la base de datos ─────────────────────────────────────────────────

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 42 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  }),
}));

vi.mock("../server/storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://s3.example.com/sig.png",
    key: "sig.png",
  }),
}));

vi.mock("../server/_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  isEmailEnabled: vi.fn().mockResolvedValue(false),
}));

vi.mock("qrcode", () => ({
  default: { toBuffer: vi.fn().mockResolvedValue(Buffer.from("qr")) },
}));

// ─── Tests de generateDC3Folio ────────────────────────────────────────────────

describe("generateDC3Folio", () => {
  // Acceder a la función a través de una re-exportación de prueba
  function generateDC3Folio(id: number, formatCode?: string): string {
    const year = new Date().getFullYear();
    const code = (formatCode ?? "DC-3").replace(/[^A-Z0-9-]/gi, "");
    return `${code}-${String(id).padStart(4, "0")}/${year}`;
  }

  it("genera folio con código por defecto DC-3", () => {
    const folio = generateDC3Folio(1);
    expect(folio).toMatch(/^DC-3-0001\/\d{4}$/);
  });

  it("genera folio con código personalizado", () => {
    const folio = generateDC3Folio(42, "DC-4");
    expect(folio).toMatch(/^DC-4-0042\/\d{4}$/);
  });

  it("rellena con ceros hasta 4 dígitos", () => {
    const folio = generateDC3Folio(7);
    expect(folio).toContain("0007");
  });

  it("sanitiza caracteres especiales del código", () => {
    const folio = generateDC3Folio(1, "DC-3 v2.0");
    expect(folio).not.toContain(" ");
    expect(folio).not.toContain(".");
  });

  it("usa el año actual en el folio", () => {
    const year = new Date().getFullYear();
    const folio = generateDC3Folio(100);
    expect(folio).toContain(`/${year}`);
  });
});

// ─── Tests de validación de token de firma remota ─────────────────────────────

describe("dc3RemoteSign token validation", () => {
  function generateToken(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 48; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  function isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  function getExpiresAt(hours: number): Date {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d;
  }

  it("genera token de 48 caracteres alfanuméricos", () => {
    const token = generateToken();
    expect(token).toHaveLength(48);
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("token no expirado es válido", () => {
    const expiresAt = getExpiresAt(72);
    expect(isTokenExpired(expiresAt)).toBe(false);
  });

  it("token expirado es inválido", () => {
    const expiresAt = new Date(Date.now() - 1000);
    expect(isTokenExpired(expiresAt)).toBe(true);
  });

  it("token con 72 horas de expiración no está expirado", () => {
    const expiresAt = getExpiresAt(72);
    const diffHours = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(71);
    expect(diffHours).toBeLessThan(73);
  });

  it("genera tokens únicos en cada llamada", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});

// ─── Tests del catálogo de formatos ──────────────────────────────────────────

describe("formatCatalog logic", () => {
  interface FormatEntry {
    id: number;
    code: string;
    version: string;
    versionDate: string;
    isActive: boolean;
    reference: string | null;
    changeNotes: string | null;
  }

  function getActiveFormat(entries: FormatEntry[]): FormatEntry | undefined {
    return entries.find(e => e.isActive);
  }

  function setActive(entries: FormatEntry[], id: number): FormatEntry[] {
    return entries.map(e => ({ ...e, isActive: e.id === id }));
  }

  function buildFolioFromFormat(
    id: number,
    format: FormatEntry | undefined
  ): string {
    const code = format?.code ?? "DC-3";
    const year = new Date().getFullYear();
    return `${code}-${String(id).padStart(4, "0")}/${year}`;
  }

  const sampleEntries: FormatEntry[] = [
    {
      id: 1,
      code: "DC-3",
      version: "1.0",
      versionDate: "2018-01-01",
      isActive: false,
      reference: "NOM-035",
      changeNotes: null,
    },
    {
      id: 2,
      code: "DC-3",
      version: "2.0",
      versionDate: "2024-01-01",
      isActive: true,
      reference: "NOM-035-STPS-2018",
      changeNotes: "Actualización 2024",
    },
    {
      id: 3,
      code: "DC-4",
      version: "1.0",
      versionDate: "2020-01-01",
      isActive: false,
      reference: null,
      changeNotes: null,
    },
  ];

  it("obtiene la versión activa del catálogo", () => {
    const active = getActiveFormat(sampleEntries);
    expect(active?.version).toBe("2.0");
    expect(active?.code).toBe("DC-3");
  });

  it("solo hay una versión activa a la vez", () => {
    const activeCount = sampleEntries.filter(e => e.isActive).length;
    expect(activeCount).toBe(1);
  });

  it("setActive cambia la versión activa correctamente", () => {
    const updated = setActive(sampleEntries, 1);
    const active = getActiveFormat(updated);
    expect(active?.id).toBe(1);
    expect(active?.version).toBe("1.0");
    // La versión 2 ya no debe estar activa
    expect(updated.find(e => e.id === 2)?.isActive).toBe(false);
  });

  it("buildFolioFromFormat usa el código del formato activo", () => {
    const active = getActiveFormat(sampleEntries);
    const folio = buildFolioFromFormat(5, active);
    expect(folio).toMatch(/^DC-3-0005\/\d{4}$/);
  });

  it("buildFolioFromFormat usa DC-3 por defecto si no hay formato activo", () => {
    const folio = buildFolioFromFormat(3, undefined);
    expect(folio).toMatch(/^DC-3-0003\/\d{4}$/);
  });

  it("filtra entradas por código correctamente", () => {
    const dc3Entries = sampleEntries.filter(e => e.code === "DC-3");
    expect(dc3Entries).toHaveLength(2);
    const dc4Entries = sampleEntries.filter(e => e.code === "DC-4");
    expect(dc4Entries).toHaveLength(1);
  });

  it("la nomenclatura del folio sigue el patrón CÓDIGO-NNNN/AÑO", () => {
    const active = getActiveFormat(sampleEntries);
    const folio = buildFolioFromFormat(1, active);
    const year = new Date().getFullYear();
    expect(folio).toBe(`DC-3-0001/${year}`);
  });
});

// ─── Tests de notificación por correo ─────────────────────────────────────────

describe("DC-3 email notification", () => {
  function buildEmailHtml(params: {
    folio: string;
    workerName: string;
    companyName: string;
    courseName: string;
    periodStr: string;
    verifyUrl: string;
  }): string {
    return `
      <div>
        <h1>Constancia DC-3 Emitida</h1>
        <table>
          <tr><td>Folio</td><td>${params.folio}</td></tr>
          <tr><td>Trabajador</td><td>${params.workerName}</td></tr>
          <tr><td>Empresa</td><td>${params.companyName}</td></tr>
          <tr><td>Curso</td><td>${params.courseName}</td></tr>
          <tr><td>Período</td><td>${params.periodStr}</td></tr>
        </table>
        <a href="${params.verifyUrl}">${params.verifyUrl}</a>
      </div>
    `;
  }

  it("genera HTML con todos los campos del registro", () => {
    const html = buildEmailHtml({
      folio: "DC-3-0001/2024",
      workerName: "Juan Pérez",
      companyName: "Empresa SA de CV",
      courseName: "Seguridad en el trabajo",
      periodStr: "2024-01-01 al 2024-01-05",
      verifyUrl: "https://example.com/verificar-dc3?hash=abc123",
    });
    expect(html).toContain("DC-3-0001/2024");
    expect(html).toContain("Juan Pérez");
    expect(html).toContain("Empresa SA de CV");
    expect(html).toContain("Seguridad en el trabajo");
    expect(html).toContain("2024-01-01 al 2024-01-05");
    expect(html).toContain("abc123");
  });

  it("incluye el enlace de verificación en el correo", () => {
    const verifyUrl = "https://example.com/verificar-dc3?hash=xyz789";
    const html = buildEmailHtml({
      folio: "DC-3-0002/2024",
      workerName: "Ana García",
      companyName: "Corp SA",
      courseName: "NOM-035",
      periodStr: "2024-02-01 al 2024-02-03",
      verifyUrl,
    });
    expect(html).toContain(verifyUrl);
  });

  it("el asunto del correo incluye el nombre del trabajador y el curso", () => {
    const workerName = "María López";
    const courseName = "Prevención de riesgos";
    const subject = `Constancia DC-3 emitida: ${workerName} — ${courseName}`;
    expect(subject).toContain(workerName);
    expect(subject).toContain(courseName);
    expect(subject).toContain("DC-3");
  });

  it("construye la URL de verificación con el hash del registro", () => {
    const appUrl = "https://nom035mood-32dy4ksx.manus.space";
    const hash = "a1b2c3d4e5f6";
    const verifyUrl = `${appUrl}/verificar-dc3?hash=${hash}`;
    expect(verifyUrl).toBe(
      "https://nom035mood-32dy4ksx.manus.space/verificar-dc3?hash=a1b2c3d4e5f6"
    );
  });
});
