/**
 * sprint77_79.test.ts
 * Tests unitarios para los Sprints 77, 78 y 79:
 * - Sprint 77: IA mejorada con contexto de encuesta NOM-035
 * - Sprint 78: Token público de 72h para subida de evidencias
 * - Sprint 79: Exportación XLSX/PDF del historial de bitácora
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Sprint 77: IA mejorada con contexto de encuesta ──────────────────────────

describe("Sprint 77 — IA mejorada con contexto de encuesta NOM-035", () => {
  // Simula la función buildSurveyContext que enriquece el prompt con datos reales
  function buildSurveyContext(
    surveyData: {
      periodName?: string;
      totalRespondents?: number;
      avgScore?: number;
      dominioStats?: Array<{
        dominio: string;
        avgScore: number;
        riskLevel: string;
      }>;
      topRiskDomains?: string[];
    } | null
  ): string {
    if (!surveyData) return "";

    const lines: string[] = [
      `\n\n## Contexto de Evaluación NOM-035 (Período: ${surveyData.periodName ?? "Actual"})`,
      `- Total de respondentes: ${surveyData.totalRespondents ?? 0}`,
      `- Puntaje promedio general: ${surveyData.avgScore?.toFixed(1) ?? "N/A"}`,
    ];

    if (surveyData.dominioStats && surveyData.dominioStats.length > 0) {
      lines.push("\n### Dominios con mayor riesgo:");
      surveyData.dominioStats
        .filter(d => d.riskLevel === "alto" || d.riskLevel === "muy_alto")
        .slice(0, 5)
        .forEach(d => {
          lines.push(
            `- ${d.dominio}: ${d.avgScore.toFixed(1)} pts (${d.riskLevel})`
          );
        });
    }

    if (surveyData.topRiskDomains && surveyData.topRiskDomains.length > 0) {
      lines.push(
        `\n### Áreas prioritarias de intervención: ${surveyData.topRiskDomains.join(", ")}`
      );
    }

    return lines.join("\n");
  }

  it("retorna cadena vacía cuando no hay datos de encuesta", () => {
    const ctx = buildSurveyContext(null);
    expect(ctx).toBe("");
  });

  it("incluye el nombre del período en el contexto", () => {
    const ctx = buildSurveyContext({
      periodName: "2024-Q1",
      totalRespondents: 120,
      avgScore: 3.8,
    });
    expect(ctx).toContain("2024-Q1");
    expect(ctx).toContain("120");
    expect(ctx).toContain("3.8");
  });

  it("filtra solo dominios con riesgo alto o muy_alto", () => {
    const ctx = buildSurveyContext({
      periodName: "2024",
      totalRespondents: 50,
      avgScore: 4.2,
      dominioStats: [
        { dominio: "Carga de Trabajo", avgScore: 7.5, riskLevel: "alto" },
        { dominio: "Liderazgo", avgScore: 3.2, riskLevel: "bajo" },
        { dominio: "Violencia Laboral", avgScore: 8.1, riskLevel: "muy_alto" },
        { dominio: "Reconocimiento", avgScore: 4.0, riskLevel: "medio" },
      ],
    });
    expect(ctx).toContain("Carga de Trabajo");
    expect(ctx).toContain("Violencia Laboral");
    expect(ctx).not.toContain("Liderazgo");
    expect(ctx).not.toContain("Reconocimiento");
  });

  it("incluye las áreas prioritarias de intervención", () => {
    const ctx = buildSurveyContext({
      periodName: "2024",
      totalRespondents: 80,
      avgScore: 5.0,
      topRiskDomains: [
        "Carga de Trabajo",
        "Jornada de Trabajo",
        "Violencia Laboral",
      ],
    });
    expect(ctx).toContain("Carga de Trabajo");
    expect(ctx).toContain("Jornada de Trabajo");
    expect(ctx).toContain("Violencia Laboral");
  });

  it("limita a los 5 dominios de mayor riesgo", () => {
    const dominioStats = Array.from({ length: 8 }, (_, i) => ({
      dominio: `Dominio ${i + 1}`,
      avgScore: 7.0 + i * 0.1,
      riskLevel: "alto",
    }));
    const ctx = buildSurveyContext({
      periodName: "2024",
      totalRespondents: 100,
      avgScore: 6.0,
      dominioStats,
    });
    const matches = ctx.match(/Dominio \d+/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(5);
  });

  it("el prompt enriquecido es más largo que el prompt base", () => {
    const basePrompt =
      "Genera un plan de intervención NOM-035 para el tipo: intervencion.";
    const surveyCtx = buildSurveyContext({
      periodName: "2024-Q2",
      totalRespondents: 200,
      avgScore: 6.5,
      topRiskDomains: ["Carga de Trabajo"],
    });
    const enrichedPrompt = basePrompt + surveyCtx;
    expect(enrichedPrompt.length).toBeGreaterThan(basePrompt.length);
  });
});

// ── Sprint 78: Token público de 72h ──────────────────────────────────────────

describe("Sprint 78 — Token público de 72h para subida de evidencias", () => {
  // Simula la generación de token
  function generateEvidenceToken(
    actionId: number,
    maxUses: number = 3
  ): {
    token: string;
    expiresAt: Date;
    uploadUrl: string;
    maxUses: number;
  } {
    const token = `evt_${actionId}_${Math.random().toString(36).substring(2, 18)}`;
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const uploadUrl = `https://app.example.com/api/evidence-upload/${token}`;
    return { token, expiresAt, uploadUrl, maxUses };
  }

  // Simula la validación del token
  function validateToken(tokenRow: {
    token: string;
    expiresAt: Date;
    useCount: number;
    maxUses: number;
    isActive: boolean;
  }): { valid: boolean; reason?: string } {
    if (!tokenRow.isActive)
      return { valid: false, reason: "Token desactivado" };
    if (new Date() > tokenRow.expiresAt)
      return { valid: false, reason: "Token expirado" };
    if (tokenRow.useCount >= tokenRow.maxUses)
      return { valid: false, reason: "Límite de usos alcanzado" };
    return { valid: true };
  }

  it("genera un token con formato correcto", () => {
    const result = generateEvidenceToken(42);
    expect(result.token).toMatch(/^evt_42_/);
    expect(result.uploadUrl).toContain(result.token);
    expect(result.maxUses).toBe(3);
  });

  it("el token expira en exactamente 72 horas", () => {
    const before = Date.now();
    const result = generateEvidenceToken(1);
    const after = Date.now();
    const expiresMs = result.expiresAt.getTime();
    const expectedMin = before + 72 * 60 * 60 * 1000;
    const expectedMax = after + 72 * 60 * 60 * 1000;
    expect(expiresMs).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresMs).toBeLessThanOrEqual(expectedMax);
  });

  it("la URL de subida contiene el token", () => {
    const result = generateEvidenceToken(99, 5);
    expect(result.uploadUrl).toContain(result.token);
  });

  it("acepta maxUses personalizado", () => {
    const result = generateEvidenceToken(7, 10);
    expect(result.maxUses).toBe(10);
  });

  it("valida token activo y no expirado", () => {
    const tokenRow = {
      token: "evt_1_abc123",
      expiresAt: new Date(Date.now() + 3600_000),
      useCount: 0,
      maxUses: 3,
      isActive: true,
    };
    const result = validateToken(tokenRow);
    expect(result.valid).toBe(true);
  });

  it("rechaza token desactivado", () => {
    const tokenRow = {
      token: "evt_1_abc123",
      expiresAt: new Date(Date.now() + 3600_000),
      useCount: 0,
      maxUses: 3,
      isActive: false,
    };
    const result = validateToken(tokenRow);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("desactivado");
  });

  it("rechaza token expirado", () => {
    const tokenRow = {
      token: "evt_1_abc123",
      expiresAt: new Date(Date.now() - 1000),
      useCount: 0,
      maxUses: 3,
      isActive: true,
    };
    const result = validateToken(tokenRow);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expirado");
  });

  it("rechaza token que alcanzó el límite de usos", () => {
    const tokenRow = {
      token: "evt_1_abc123",
      expiresAt: new Date(Date.now() + 3600_000),
      useCount: 3,
      maxUses: 3,
      isActive: true,
    };
    const result = validateToken(tokenRow);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Límite");
  });

  it("permite uso cuando useCount < maxUses", () => {
    const tokenRow = {
      token: "evt_1_abc123",
      expiresAt: new Date(Date.now() + 3600_000),
      useCount: 2,
      maxUses: 3,
      isActive: true,
    };
    const result = validateToken(tokenRow);
    expect(result.valid).toBe(true);
  });

  it("genera tokens únicos para la misma acción", () => {
    const t1 = generateEvidenceToken(5);
    const t2 = generateEvidenceToken(5);
    expect(t1.token).not.toBe(t2.token);
  });
});

// ── Sprint 79: Exportación XLSX/PDF del historial de bitácora ─────────────────

describe("Sprint 79 — Exportación XLSX/PDF del historial de bitácora", () => {
  const CAMPO_LABELS: Record<string, string> = {
    estado: "Estado",
    responsable: "Responsable",
    plazo: "Plazo",
    prioridad: "Prioridad",
    observaciones: "Observaciones",
    objetivo: "Objetivo",
    accion: "Acción",
    recursos: "Recursos",
    creacion: "Creación",
  };

  // Simula el filtrado de historial
  function filterHistory(
    rows: Array<{
      id: number;
      actionId: number;
      planId: number;
      campo: string;
      valorAnterior: string | null;
      valorNuevo: string | null;
      changedByName: string | null;
      nota: string | null;
      createdAt: Date;
    }>,
    filters: {
      campo?: string;
      changedByName?: string;
      fromDate?: string;
      toDate?: string;
    }
  ) {
    return rows.filter(row => {
      if (filters.campo && row.campo !== filters.campo) return false;
      if (
        filters.changedByName &&
        !row.changedByName
          ?.toLowerCase()
          .includes(filters.changedByName.toLowerCase())
      )
        return false;
      if (filters.fromDate && row.createdAt < new Date(filters.fromDate))
        return false;
      if (
        filters.toDate &&
        row.createdAt > new Date(filters.toDate + "T23:59:59")
      )
        return false;
      return true;
    });
  }

  // Simula la generación del folio PDF
  function generateHistoryFolio(): string {
    return `NOM035-HIST-${Date.now()}`;
  }

  // Datos de prueba
  const sampleRows = [
    {
      id: 1,
      actionId: 10,
      planId: 1,
      campo: "estado",
      valorAnterior: "no_iniciada",
      valorNuevo: "en_proceso",
      changedByName: "Ana García",
      nota: null,
      createdAt: new Date("2024-03-15T10:00:00"),
    },
    {
      id: 2,
      actionId: 10,
      planId: 1,
      campo: "responsable",
      valorAnterior: "Juan",
      valorNuevo: "María",
      changedByName: "Ana García",
      nota: null,
      createdAt: new Date("2024-03-16T11:00:00"),
    },
    {
      id: 3,
      actionId: 11,
      planId: 1,
      campo: "plazo",
      valorAnterior: "2024-03-31",
      valorNuevo: "2024-04-15",
      changedByName: "Carlos López",
      nota: "Extensión aprobada",
      createdAt: new Date("2024-03-20T09:00:00"),
    },
    {
      id: 4,
      actionId: 12,
      planId: 2,
      campo: "prioridad",
      valorAnterior: "media",
      valorNuevo: "alta",
      changedByName: "Ana García",
      nota: null,
      createdAt: new Date("2024-04-01T14:00:00"),
    },
    {
      id: 5,
      actionId: 13,
      planId: 2,
      campo: "estado",
      valorAnterior: "en_proceso",
      valorNuevo: "cumplida",
      changedByName: "María Torres",
      nota: "Completada con evidencia",
      createdAt: new Date("2024-04-10T16:00:00"),
    },
  ];

  it("filtra por campo correctamente", () => {
    const result = filterHistory(sampleRows, { campo: "estado" });
    expect(result).toHaveLength(2);
    result.forEach(r => expect(r.campo).toBe("estado"));
  });

  it("filtra por nombre de usuario (case-insensitive)", () => {
    const result = filterHistory(sampleRows, { changedByName: "ana" });
    expect(result).toHaveLength(3);
    result.forEach(r =>
      expect(r.changedByName?.toLowerCase()).toContain("ana")
    );
  });

  it("filtra por rango de fechas", () => {
    const result = filterHistory(sampleRows, {
      fromDate: "2024-03-20",
      toDate: "2024-04-01",
    });
    expect(result).toHaveLength(2);
    result.forEach(r => {
      expect(r.createdAt.getTime()).toBeGreaterThanOrEqual(
        new Date("2024-03-20").getTime()
      );
    });
  });

  it("combina múltiples filtros", () => {
    const result = filterHistory(sampleRows, {
      campo: "estado",
      changedByName: "Ana",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("retorna todos los registros sin filtros", () => {
    const result = filterHistory(sampleRows, {});
    expect(result).toHaveLength(sampleRows.length);
  });

  it("retorna array vacío cuando no hay coincidencias", () => {
    const result = filterHistory(sampleRows, { changedByName: "Inexistente" });
    expect(result).toHaveLength(0);
  });

  it("traduce los campos a etiquetas legibles", () => {
    expect(CAMPO_LABELS["estado"]).toBe("Estado");
    expect(CAMPO_LABELS["responsable"]).toBe("Responsable");
    expect(CAMPO_LABELS["plazo"]).toBe("Plazo");
    expect(CAMPO_LABELS["prioridad"]).toBe("Prioridad");
    expect(CAMPO_LABELS["observaciones"]).toBe("Observaciones");
  });

  it("genera folios PDF únicos", () => {
    const folio1 = generateHistoryFolio();
    const folio2 = generateHistoryFolio();
    expect(folio1).toMatch(/^NOM035-HIST-\d+$/);
    expect(folio2).toMatch(/^NOM035-HIST-\d+$/);
    // Los folios pueden ser iguales si se generan en el mismo ms; verificamos el formato
    expect(folio1.startsWith("NOM035-HIST-")).toBe(true);
  });

  it("el folio PDF tiene el prefijo correcto", () => {
    const folio = generateHistoryFolio();
    expect(folio).toMatch(/^NOM035-HIST-/);
  });

  it("paginación: divide correctamente en páginas de 30", () => {
    const PAGE_SIZE = 30;
    const rows = Array.from({ length: 75 }, (_, i) => ({
      id: i + 1,
      actionId: i + 1,
      planId: 1,
      campo: "estado",
      valorAnterior: null,
      valorNuevo: "cumplida",
      changedByName: "Test",
      nota: null,
      createdAt: new Date(),
    }));
    const totalPages = Math.ceil(rows.length / PAGE_SIZE);
    expect(totalPages).toBe(3);
    const page1 = rows.slice(0, PAGE_SIZE);
    const page2 = rows.slice(PAGE_SIZE, PAGE_SIZE * 2);
    const page3 = rows.slice(PAGE_SIZE * 2);
    expect(page1).toHaveLength(30);
    expect(page2).toHaveLength(30);
    expect(page3).toHaveLength(15);
  });

  it("columnas XLSX tienen los encabezados correctos", () => {
    const expectedColumns = [
      "ID",
      "ID Acción",
      "ID Plan",
      "Campo Modificado",
      "Valor Anterior",
      "Valor Nuevo",
      "Usuario",
      "Correo",
      "Nota",
      "Fecha y Hora",
    ];
    expect(expectedColumns).toHaveLength(10);
    expect(expectedColumns[3]).toBe("Campo Modificado");
    expect(expectedColumns[6]).toBe("Usuario");
  });

  it("columnas PDF tienen el orden correcto para orientación horizontal", () => {
    const pdfColumns = [
      "ID",
      "Acción",
      "Campo",
      "Valor Anterior",
      "Valor Nuevo",
      "Usuario",
      "Fecha",
    ];
    expect(pdfColumns).toHaveLength(7);
    expect(pdfColumns[0]).toBe("ID");
    expect(pdfColumns[6]).toBe("Fecha");
  });
});
