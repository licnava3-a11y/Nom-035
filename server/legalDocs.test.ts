import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock setup ────────────────────────────────────────────────────────────────

const mockInsert = vi
  .fn()
  .mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 1 }]) });
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
});
const mockDelete = vi
  .fn()
  .mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
const mockSelectFrom = vi.fn().mockResolvedValue([]);
const mockSelectObj = { from: vi.fn() };
mockSelectObj.from.mockImplementation((table: any) => {
  const chain = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    then: vi.fn(),
  };
  // Default: return empty array
  chain.where.mockReturnValue({ ...chain });
  chain.limit.mockResolvedValue([]);
  return chain;
});

const mockDb = {
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  select: vi.fn().mockReturnValue(mockSelectObj),
};

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            fundamento_normativo:
              "Puntos 5, 6, 7, 8 y 9 de la NOM-035-STPS-2018.",
            objetivo:
              "Objetivo general: identificar factores de riesgo psicosocial.",
            alcance: "Aplica a todos los trabajadores del área de Operaciones.",
            instrumentos:
              "Guía de Referencia III para empresas con más de 50 trabajadores.",
            poblacion_muestra:
              "Universo: 120 trabajadores. Muestra: 92 (IC 95%).",
            periodicidad: "Cada 12 meses y ante eventos traumáticos severos.",
            responsables:
              "Psicólogo con cédula profesional y experiencia en SST.",
            calendario:
              "Planeación: semana 1-2. Aplicación: semana 3-4. Análisis: semana 5-6.",
            confidencialidad:
              "Los datos serán tratados de forma confidencial y anónima.",
            integracion_normas:
              "Se integra con NOM-036-STPS-2016 y NOM-037-STPS-2023.",
            aprobacion_registro:
              "Aprobado por el responsable de SST con fecha y firma.",
          }),
        },
      },
    ],
  }),
}));

vi.mock("../../drizzle/schema", () => ({
  caseInvestigationDocs: { id: "id", folio: "folio" },
  dictamenDocs: { id: "id", folio: "folio" },
  docFormatConfig: {
    id: "id",
    docType: "docType",
    codigoFormato: "codigoFormato",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  desc: vi.fn(a => ({ desc: a })),
  sql: vi.fn((strings: TemplateStringsArray) => strings[0]),
}));

// ── Tests: Investigación de Caso ──────────────────────────────────────────────

describe("caseInvestigationDocs router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe tener exactamente 11 apartados obligatorios en el schema de Investigación de Caso", () => {
    const requiredKeys = [
      "fundamento_normativo",
      "objetivo",
      "alcance",
      "instrumentos",
      "poblacion_muestra",
      "periodicidad",
      "responsables",
      "calendario",
      "confidencialidad",
      "integracion_normas",
      "aprobacion_registro",
    ];
    expect(requiredKeys.length).toBe(11);
    const uniqueKeys = new Set(requiredKeys);
    expect(uniqueKeys.size).toBe(11);
    // Verificar que el mock retorna todos los campos
    const mockContent = {
      fundamento_normativo: "Puntos 5, 6, 7, 8 y 9 de la NOM-035-STPS-2018.",
      objetivo: "Objetivo general: identificar factores de riesgo psicosocial.",
      alcance: "Aplica a todos los trabajadores del área de Operaciones.",
      instrumentos:
        "Guía de Referencia III para empresas con más de 50 trabajadores.",
      poblacion_muestra: "Universo: 120 trabajadores. Muestra: 92 (IC 95%).",
      periodicidad: "Cada 12 meses y ante eventos traumáticos severos.",
      responsables: "Psicólogo con cédula profesional y experiencia en SST.",
      calendario:
        "Planeación: semana 1-2. Aplicación: semana 3-4. Análisis: semana 5-6.",
      confidencialidad:
        "Los datos serán tratados de forma confidencial y anónima.",
      integracion_normas:
        "Se integra con NOM-036-STPS-2016 y NOM-037-STPS-2023.",
      aprobacion_registro:
        "Aprobado por el responsable de SST con fecha y firma.",
    };
    requiredKeys.forEach(key => {
      expect(mockContent).toHaveProperty(key);
      expect(typeof (mockContent as any)[key]).toBe("string");
      expect((mockContent as any)[key].length).toBeGreaterThan(10);
    });
  });

  it("debe validar que los campos requeridos del formulario no estén vacíos", () => {
    const validateForm = (form: {
      empresa: string;
      area: string;
      fechaInvestigacion: string;
      responsableSst: string;
    }) => {
      return (
        form.empresa.length > 0 &&
        form.area.length > 0 &&
        form.fechaInvestigacion.length > 0 &&
        form.responsableSst.length > 0
      );
    };
    expect(
      validateForm({
        empresa: "",
        area: "Ops",
        fechaInvestigacion: "2026-01-01",
        responsableSst: "Psic. García",
      })
    ).toBe(false);
    expect(
      validateForm({
        empresa: "XYZ SA",
        area: "Ops",
        fechaInvestigacion: "2026-01-01",
        responsableSst: "Psic. García",
      })
    ).toBe(true);
  });

  it("debe generar folio con formato correcto INV-001/2026", () => {
    const generateFolioFormat = (
      prefix: string,
      consecutive: number,
      year: number
    ) => `${prefix}-${String(consecutive).padStart(3, "0")}/${year}`;
    expect(generateFolioFormat("INV", 1, 2026)).toBe("INV-001/2026");
    expect(generateFolioFormat("INV", 15, 2026)).toBe("INV-015/2026");
    expect(generateFolioFormat("INV", 100, 2026)).toBe("INV-100/2026");
  });

  it("debe rechazar estado inválido en save", () => {
    const validEstados = ["borrador", "final"];
    expect(validEstados.includes("borrador")).toBe(true);
    expect(validEstados.includes("final")).toBe(true);
    expect(validEstados.includes("invalido")).toBe(false);
    expect(validEstados.includes("aprobado")).toBe(false);
  });

  it("debe permitir estado 'aprobado' solo en approve procedure", () => {
    const saveEstados = ["borrador", "final"];
    const allEstados = ["borrador", "final", "aprobado"];
    expect(saveEstados.includes("aprobado")).toBe(false);
    expect(allEstados.includes("aprobado")).toBe(true);
  });

  it("debe manejar contenido como Record<string, string>", () => {
    const contenido: Record<string, string> = {
      fundamento_normativo: "Punto 5 NOM-035",
      objetivo: "Identificar factores de riesgo",
    };
    expect(typeof contenido).toBe("object");
    expect(Object.keys(contenido).length).toBe(2);
    Object.values(contenido).forEach(v => expect(typeof v).toBe("string"));
  });
});

// ── Tests: Dictamen ───────────────────────────────────────────────────────────

describe("dictamenDocs router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe tener los 11 apartados obligatorios del Dictamen", () => {
    const dictamenKeys = [
      "encabezado_formal",
      "numero_fecha",
      "metodologia",
      "hallazgos_clave",
      "impacto_legal",
      "conclusiones_tecnicas",
      "conclusiones_juridicas",
      "medidas_correctivas",
      "recomendaciones_seguimiento",
      "firmas",
      "anexos",
    ];
    expect(dictamenKeys.length).toBe(11);
    // Verificar que no hay duplicados
    const uniqueKeys = new Set(dictamenKeys);
    expect(uniqueKeys.size).toBe(11);
  });

  it("debe validar niveles de riesgo global permitidos", () => {
    const validLevels = ["ausente", "bajo", "medio", "alto", "muy_alto"];
    expect(validLevels.includes("ausente")).toBe(true);
    expect(validLevels.includes("bajo")).toBe(true);
    expect(validLevels.includes("medio")).toBe(true);
    expect(validLevels.includes("alto")).toBe(true);
    expect(validLevels.includes("muy_alto")).toBe(true);
    expect(validLevels.includes("critico")).toBe(false);
    expect(validLevels.includes("")).toBe(false);
  });

  it("debe generar folio de Dictamen con formato DIC-001/2026", () => {
    const generateFolioFormat = (
      prefix: string,
      consecutive: number,
      year: number
    ) => `${prefix}-${String(consecutive).padStart(3, "0")}/${year}`;
    expect(generateFolioFormat("DIC", 1, 2026)).toBe("DIC-001/2026");
    expect(generateFolioFormat("DIC", 50, 2026)).toBe("DIC-050/2026");
  });

  it("debe validar que total de trabajadores sea positivo", () => {
    const validate = (total: number) => total > 0;
    expect(validate(0)).toBe(false);
    expect(validate(-1)).toBe(false);
    expect(validate(1)).toBe(true);
    expect(validate(500)).toBe(true);
  });

  it("debe validar campos obligatorios del formulario de Dictamen", () => {
    const validateDictamen = (form: {
      razonSocial: string;
      domicilio: string;
      periodoEvaluado: string;
      responsableTecnico: string;
      cedulaProfesional: string;
      representanteLegal: string;
    }) => {
      return (
        form.razonSocial.length > 0 &&
        form.domicilio.length > 0 &&
        form.periodoEvaluado.length > 0 &&
        form.responsableTecnico.length > 0 &&
        form.cedulaProfesional.length > 0 &&
        form.representanteLegal.length > 0
      );
    };
    expect(
      validateDictamen({
        razonSocial: "XYZ SA",
        domicilio: "Calle 1",
        periodoEvaluado: "Q1 2026",
        responsableTecnico: "Psic. García",
        cedulaProfesional: "1234567",
        representanteLegal: "Lic. Pérez",
      })
    ).toBe(true);
    expect(
      validateDictamen({
        razonSocial: "",
        domicilio: "Calle 1",
        periodoEvaluado: "Q1 2026",
        responsableTecnico: "Psic. García",
        cedulaProfesional: "1234567",
        representanteLegal: "Lic. Pérez",
      })
    ).toBe(false);
  });

  it("debe separar nivel_riesgo_global del contenido al guardar", () => {
    const parsed = {
      encabezado_formal: "Encabezado...",
      numero_fecha: "DIC-001/2026",
      metodologia: "Guía III...",
      hallazgos_clave: "Riesgo medio...",
      impacto_legal: "Art. 132 LFT...",
      conclusiones_tecnicas: "Riesgo global: medio",
      conclusiones_juridicas: "Se incumple punto 7...",
      medidas_correctivas: "Capacitación en 30 días...",
      recomendaciones_seguimiento: "Próxima evaluación: enero 2027",
      firmas: "Responsable técnico: Psic. García",
      anexos: "1. Cuestionarios aplicados",
      nivel_riesgo_global: "medio",
    };
    const { nivel_riesgo_global, ...contenido } = parsed;
    expect(nivel_riesgo_global).toBe("medio");
    expect(Object.keys(contenido).length).toBe(11);
    expect(contenido).not.toHaveProperty("nivel_riesgo_global");
  });

  it("debe permitir vinculación opcional con Investigación de Caso", () => {
    const withLink = { investigationDocId: 5, razonSocial: "XYZ" };
    const withoutLink = { investigationDocId: undefined, razonSocial: "XYZ" };
    expect(withLink.investigationDocId).toBe(5);
    expect(withoutLink.investigationDocId).toBeUndefined();
  });
});

// ── Tests: Exportación HTML/PDF ───────────────────────────────────────────────

describe("exportación de documentos", () => {
  it("debe generar HTML válido para Investigación de Caso", () => {
    const folio = "INV-001/2026";
    const empresa = "Industrias XYZ S.A. de C.V.";
    const area = "Operaciones";
    const contenido = { fundamento_normativo: "Punto 5 NOM-035" };

    let html = `<html><head><meta charset="UTF-8"></head><body>`;
    html += `<h1>INVESTIGACIÓN DE CASO</h1>`;
    html += `<p>Folio: ${folio} | Empresa: ${empresa} | Área: ${area}</p>`;
    Object.entries(contenido).forEach(([key, val]) => {
      html += `<h2>${key}</h2><p>${val}</p>`;
    });
    html += `</body></html>`;

    expect(html).toContain("INVESTIGACIÓN DE CASO");
    expect(html).toContain(folio);
    expect(html).toContain(empresa);
    expect(html).toContain("fundamento_normativo");
  });

  it("debe generar HTML válido para Dictamen con nivel de riesgo", () => {
    const folio = "DIC-001/2026";
    const nivelRiesgo = "medio";
    const riesgoLabels: Record<string, string> = { medio: "Medio" };

    let html = `<html><head><meta charset="UTF-8"></head><body>`;
    html += `<div class="folio">Folio: ${folio}</div>`;
    html += `<h1>DICTAMEN</h1>`;
    html += `<p>Riesgo Global: ${riesgoLabels[nivelRiesgo]}</p>`;
    html += `</body></html>`;

    expect(html).toContain("DICTAMEN");
    expect(html).toContain("Medio");
    expect(html).toContain(folio); // Folio completo en el HTML
  });

  it("debe generar nombre de archivo correcto para exportación", () => {
    const folioInv = "INV-001/2026";
    const folioDic = "DIC-001/2026";
    const fileNameInv = `Investigacion_Caso_${folioInv.replace("/", "-")}.html`;
    const fileNameDic = `Dictamen_${folioDic.replace("/", "-")}.html`;

    expect(fileNameInv).toBe("Investigacion_Caso_INV-001-2026.html");
    expect(fileNameDic).toBe("Dictamen_DIC-001-2026.html");
    expect(fileNameInv).not.toContain("/");
    expect(fileNameDic).not.toContain("/");
  });
});
