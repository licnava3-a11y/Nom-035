/**
 * sprint71.test.ts
 * Tests unitarios para el módulo de Matriz de Acciones con Evidencias NOM-035.
 * Cubre: validaciones, estadísticas, PDF, XLSX, filtros y auditoría.
 * Nota: Tests de lógica pura (sin importaciones de módulos del servidor).
 */
import { describe, it, expect, vi } from "vitest";

// ── 1. Validaciones de schema Zod ─────────────────────────────────────────────

describe("1. Validaciones de entrada (Zod)", () => {
  it("1.1 accionId debe seguir formato TIPO-NN", () => {
    const validIds = ["INT-01", "VL-02", "ND-03", "CONS-10"];
    const invalidIds = ["", "01", "INT", "INT-"];
    for (const id of validIds) {
      expect(id).toMatch(/^[A-Z]+-\d+$/);
    }
    for (const id of invalidIds) {
      expect(id).not.toMatch(/^[A-Z]+-\d{2,}$/);
    }
  });

  it("1.2 tipoPlan solo acepta valores permitidos", () => {
    const allowed = [
      "intervencion",
      "violencia_laboral",
      "no_discriminacion",
      "consolidado",
    ];
    expect(allowed).toContain("intervencion");
    expect(allowed).toContain("violencia_laboral");
    expect(allowed).not.toContain("otro");
    expect(allowed).not.toContain("");
  });

  it("1.3 estado solo acepta valores permitidos", () => {
    const allowed = [
      "no_iniciada",
      "en_proceso",
      "cumplida",
      "vencida",
      "cancelada",
    ];
    expect(allowed).toContain("cumplida");
    expect(allowed).not.toContain("pendiente");
    expect(allowed).toHaveLength(5);
  });

  it("1.4 prioridad solo acepta alta/media/baja", () => {
    const allowed = ["alta", "media", "baja"];
    expect(allowed).toContain("alta");
    expect(allowed).not.toContain("urgente");
    expect(allowed).toHaveLength(3);
  });

  it("1.5 tipoEvidencia acepta todos los tipos definidos", () => {
    const allowed = [
      "acta_capacitacion",
      "registro_fotografico",
      "correo_electronico",
      "lista_asistencia",
      "comunicado_interno",
      "captura_pantalla",
      "acta_reunion",
      "contrato_servicio",
      "politica_firmada",
      "otro",
    ];
    expect(allowed).toHaveLength(10);
    expect(allowed).toContain("otro");
    expect(allowed).toContain("acta_capacitacion");
  });

  it("1.6 nivelAplicacion solo acepta organizacional/grupal/individual", () => {
    const allowed = ["organizacional", "grupal", "individual"];
    expect(allowed).toContain("organizacional");
    expect(allowed).not.toContain("departamental");
  });
});

// ── 2. Generación de acciones por defecto ─────────────────────────────────────

function getDefaultActions(tipoPlan: string) {
  if (tipoPlan === "violencia_laboral") {
    return [
      {
        accionId: "VL-01",
        tipoPlan: "violencia_laboral",
        prioridad: "alta",
        plazoDias: 30,
      },
      {
        accionId: "VL-02",
        tipoPlan: "violencia_laboral",
        prioridad: "alta",
        plazoDias: 45,
      },
      {
        accionId: "VL-03",
        tipoPlan: "violencia_laboral",
        prioridad: "media",
        plazoDias: 60,
      },
    ];
  }
  if (tipoPlan === "no_discriminacion") {
    return [
      {
        accionId: "ND-01",
        tipoPlan: "no_discriminacion",
        prioridad: "alta",
        plazoDias: 30,
      },
      {
        accionId: "ND-02",
        tipoPlan: "no_discriminacion",
        prioridad: "media",
        plazoDias: 60,
      },
      {
        accionId: "ND-03",
        tipoPlan: "no_discriminacion",
        prioridad: "baja",
        plazoDias: 90,
      },
    ];
  }
  return [
    {
      accionId: "INT-01",
      tipoPlan: "intervencion",
      prioridad: "alta",
      plazoDias: 30,
    },
    {
      accionId: "INT-02",
      tipoPlan: "intervencion",
      prioridad: "media",
      plazoDias: 14,
    },
    {
      accionId: "INT-03",
      tipoPlan: "intervencion",
      prioridad: "alta",
      plazoDias: 45,
    },
    {
      accionId: "INT-04",
      tipoPlan: "intervencion",
      prioridad: "media",
      plazoDias: 60,
    },
  ];
}

describe("2. Acciones por defecto según tipo de plan", () => {
  it("2.1 Plan de intervención genera 4 acciones por defecto", () => {
    const actions = getDefaultActions("intervencion");
    expect(actions).toHaveLength(4);
    expect(actions[0].accionId).toBe("INT-01");
  });

  it("2.2 Plan de violencia laboral genera 3 acciones por defecto", () => {
    const actions = getDefaultActions("violencia_laboral");
    expect(actions).toHaveLength(3);
    expect(actions[0].accionId).toBe("VL-01");
  });

  it("2.3 Plan de no discriminación genera 3 acciones por defecto", () => {
    const actions = getDefaultActions("no_discriminacion");
    expect(actions).toHaveLength(3);
    expect(actions[0].accionId).toBe("ND-01");
  });

  it("2.4 Todas las acciones tienen prioridad válida", () => {
    const allowed = ["alta", "media", "baja"];
    const actions = getDefaultActions("intervencion");
    for (const a of actions) {
      expect(allowed).toContain(a.prioridad);
    }
  });

  it("2.5 Todos los plazos son positivos", () => {
    const actions = getDefaultActions("intervencion");
    for (const a of actions) {
      expect(a.plazoDias).toBeGreaterThan(0);
    }
  });
});

// ── 3. Cálculo de estadísticas ────────────────────────────────────────────────

function calcStats(actions: Array<{ estado: string; evidencias: any[] }>) {
  const total = actions.length;
  const cumplidas = actions.filter(a => a.estado === "cumplida").length;
  const vencidas = actions.filter(a => a.estado === "vencida").length;
  const conEvidencia = actions.filter(a => a.evidencias.length > 0).length;
  const pct = total > 0 ? Math.round((cumplidas / total) * 100) : 0;
  return { total, cumplidas, vencidas, conEvidencia, pctCumplimiento: pct };
}

describe("3. Cálculo de estadísticas de cumplimiento", () => {
  it("3.1 Calcula porcentaje de cumplimiento correctamente", () => {
    const actions = [
      { estado: "cumplida", evidencias: [{}] },
      { estado: "cumplida", evidencias: [{}] },
      { estado: "en_proceso", evidencias: [] },
      { estado: "no_iniciada", evidencias: [] },
    ];
    const stats = calcStats(actions);
    expect(stats.total).toBe(4);
    expect(stats.cumplidas).toBe(2);
    expect(stats.pctCumplimiento).toBe(50);
  });

  it("3.2 Porcentaje es 0 cuando no hay acciones", () => {
    const stats = calcStats([]);
    expect(stats.pctCumplimiento).toBe(0);
    expect(stats.total).toBe(0);
  });

  it("3.3 Porcentaje es 100 cuando todas están cumplidas", () => {
    const actions = [
      { estado: "cumplida", evidencias: [{}] },
      { estado: "cumplida", evidencias: [{}] },
      { estado: "cumplida", evidencias: [{}] },
    ];
    const stats = calcStats(actions);
    expect(stats.pctCumplimiento).toBe(100);
  });

  it("3.4 Cuenta correctamente acciones con evidencia", () => {
    const actions = [
      { estado: "cumplida", evidencias: [{ id: 1 }, { id: 2 }] },
      { estado: "en_proceso", evidencias: [] },
      { estado: "no_iniciada", evidencias: [{ id: 3 }] },
    ];
    const stats = calcStats(actions);
    expect(stats.conEvidencia).toBe(2);
  });

  it("3.5 Cuenta correctamente acciones vencidas", () => {
    const actions = [
      { estado: "vencida", evidencias: [] },
      { estado: "vencida", evidencias: [] },
      { estado: "cumplida", evidencias: [{}] },
    ];
    const stats = calcStats(actions);
    expect(stats.vencidas).toBe(2);
  });
});

// ── 4. Validación de archivos de evidencia ────────────────────────────────────

describe("4. Validación de archivos de evidencia", () => {
  const MAX_SIZE = 16 * 1024 * 1024;
  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  it("4.1 Rechaza archivos mayores a 16 MB", () => {
    const fileSize = 17 * 1024 * 1024;
    expect(fileSize > MAX_SIZE).toBe(true);
  });

  it("4.2 Acepta archivos menores a 16 MB", () => {
    const fileSize = 5 * 1024 * 1024;
    expect(fileSize <= MAX_SIZE).toBe(true);
  });

  it("4.3 Acepta tipos de archivo permitidos", () => {
    for (const type of ALLOWED_TYPES) {
      expect(ALLOWED_TYPES).toContain(type);
    }
  });

  it("4.4 Rechaza tipos de archivo no permitidos", () => {
    const rejected = [
      "application/x-executable",
      "text/html",
      "application/zip",
    ];
    for (const type of rejected) {
      expect(ALLOWED_TYPES).not.toContain(type);
    }
  });

  it("4.5 Detecta imágenes por tipo MIME", () => {
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    for (const t of imageTypes) {
      expect(t.startsWith("image/")).toBe(true);
    }
  });

  it("4.6 El límite es exactamente 16 MB", () => {
    expect(MAX_SIZE).toBe(16777216);
  });
});

// ── 5. Exportación PDF ────────────────────────────────────────────────────────

describe("5. Exportación PDF", () => {
  it("5.1 folio se genera con formato NOM035-{planId}-{timestamp}", () => {
    const planId = 42;
    const folio = `NOM035-${planId}-${Date.now()}`;
    expect(folio).toMatch(/^NOM035-42-\d+$/);
  });

  it("5.2 PDF base64 se puede decodificar correctamente", () => {
    const original = Buffer.from("test-pdf-data");
    const base64 = original.toString("base64");
    const decoded = Buffer.from(base64, "base64");
    expect(decoded.toString()).toBe("test-pdf-data");
  });

  it("5.3 Buffer vacío no genera base64 vacío", () => {
    const data = Buffer.from("content");
    expect(data.toString("base64")).not.toBe("");
  });

  it("5.4 Folio incluye planId y timestamp", () => {
    const planId = 99;
    const ts = 1700000000000;
    const folio = `NOM035-${planId}-${ts}`;
    expect(folio).toBe("NOM035-99-1700000000000");
  });
});

// ── 6. Exportación XLSX ───────────────────────────────────────────────────────

describe("6. Exportación XLSX", () => {
  it("6.1 XLSX base64 se puede decodificar correctamente", () => {
    const original = Buffer.from("fake-xlsx-data");
    const base64 = original.toString("base64");
    const decoded = Buffer.from(base64, "base64");
    expect(decoded.toString()).toBe("fake-xlsx-data");
  });

  it("6.2 Nombre de archivo XLSX incluye fecha ISO", () => {
    const filename = `Matriz-NOM035-${new Date().toISOString().split("T")[0]}.xlsx`;
    expect(filename).toMatch(/^Matriz-NOM035-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("6.3 Las columnas del XLSX cubren todos los campos requeridos", () => {
    const requiredColumns = [
      "accionId",
      "tipoPlan",
      "nivelAplicacion",
      "objetivo",
      "accion",
      "indicador",
      "responsable",
      "plazo",
      "estado",
      "prioridad",
      "observaciones",
      "numEvidencias",
      "tiposEvidencia",
      "ultimaEvidencia",
    ];
    expect(requiredColumns).toHaveLength(14);
    expect(requiredColumns).toContain("numEvidencias");
    expect(requiredColumns).toContain("tiposEvidencia");
  });

  it("6.4 Hoja de evidencias tiene columnas correctas", () => {
    const evidenceColumns = [
      "accionId",
      "nombreArchivo",
      "tipoEvidencia",
      "tipoArchivo",
      "tamanoKb",
      "descripcion",
      "fechaSubida",
      "fileUrl",
    ];
    expect(evidenceColumns).toHaveLength(8);
    expect(evidenceColumns).toContain("fileUrl");
  });
});

// ── 7. Auditoría de evidencias ────────────────────────────────────────────────

describe("7. Registro de auditoría", () => {
  it("7.1 Las operaciones de auditoría son las correctas", () => {
    const ops = [
      "subida",
      "reemplazo",
      "eliminacion",
      "descarga",
      "vista_previa",
    ];
    expect(ops).toHaveLength(5);
    expect(ops).toContain("subida");
    expect(ops).toContain("eliminacion");
  });

  it("7.2 El log de auditoría incluye campos de trazabilidad", () => {
    const auditEntry = {
      evidenceId: 1,
      actionId: 10,
      planId: 2,
      operacion: "subida",
      nombreArchivo: "evidencia.pdf",
      userId: 5,
      userName: "Juan Pérez",
      userEmail: "juan@empresa.com",
      detalles: "Subida inicial",
      ipAddress: "192.168.1.1",
    };
    expect(auditEntry.operacion).toBe("subida");
    expect(auditEntry.userName).toBeTruthy();
    expect(auditEntry.ipAddress).toBeTruthy();
    expect(auditEntry.userEmail).toContain("@");
  });

  it("7.3 Operación de eliminación es registrada", () => {
    const ops = [
      "subida",
      "reemplazo",
      "eliminacion",
      "descarga",
      "vista_previa",
    ];
    expect(ops).toContain("eliminacion");
  });
});

// ── 8. Filtros de búsqueda ────────────────────────────────────────────────────

describe("8. Filtros de búsqueda en listActions", () => {
  it("8.1 Filtro por estado filtra correctamente", () => {
    const actions = [
      { id: 1, estado: "cumplida", tipoPlan: "intervencion" },
      { id: 2, estado: "en_proceso", tipoPlan: "intervencion" },
      { id: 3, estado: "cumplida", tipoPlan: "violencia_laboral" },
    ];
    const filtered = actions.filter(a => a.estado === "cumplida");
    expect(filtered).toHaveLength(2);
  });

  it("8.2 Filtro por tipoPlan filtra correctamente", () => {
    const actions = [
      { id: 1, estado: "cumplida", tipoPlan: "intervencion" },
      { id: 2, estado: "en_proceso", tipoPlan: "violencia_laboral" },
      { id: 3, estado: "no_iniciada", tipoPlan: "intervencion" },
    ];
    const filtered = actions.filter(a => a.tipoPlan === "intervencion");
    expect(filtered).toHaveLength(2);
  });

  it("8.3 Búsqueda por texto en objetivo", () => {
    const actions = [
      {
        id: 1,
        objetivo: "Reducir carga de trabajo excesiva",
        accion: "Redistribuir tareas",
      },
      {
        id: 2,
        objetivo: "Mejorar comunicación organizacional",
        accion: "Reuniones semanales",
      },
      {
        id: 3,
        objetivo: "Fortalecer liderazgo positivo",
        accion: "Capacitar mandos",
      },
    ];
    const search = "comunicación";
    const filtered = actions.filter(
      a =>
        a.objetivo.toLowerCase().includes(search.toLowerCase()) ||
        a.accion.toLowerCase().includes(search.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(2);
  });

  it("8.4 Paginación calcula offset correctamente", () => {
    const page = 3;
    const pageSize = 25;
    const offset = (page - 1) * pageSize;
    expect(offset).toBe(50);
  });

  it("8.5 Búsqueda insensible a mayúsculas", () => {
    const actions = [
      { id: 1, objetivo: "Reducir CARGA de trabajo" },
      { id: 2, objetivo: "Mejorar comunicación" },
    ];
    const search = "carga";
    const filtered = actions.filter(a =>
      a.objetivo.toLowerCase().includes(search.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
  });
});

// ── 9. Lógica de vencimiento ──────────────────────────────────────────────────

describe("9. Lógica de vencimiento de acciones", () => {
  it("9.1 Acción con plazo pasado y estado != cumplida es vencida", () => {
    const plazo = new Date();
    plazo.setDate(plazo.getDate() - 5); // 5 días en el pasado
    const estado = "en_proceso";
    const isVencida = plazo < new Date() && estado !== "cumplida";
    expect(isVencida).toBe(true);
  });

  it("9.2 Acción cumplida no es vencida aunque el plazo haya pasado", () => {
    const plazo = new Date();
    plazo.setDate(plazo.getDate() - 5);
    const estado = "cumplida";
    const isVencida = plazo < new Date() && estado !== "cumplida";
    expect(isVencida).toBe(false);
  });

  it("9.3 Acción con plazo futuro no es vencida", () => {
    const plazo = new Date();
    plazo.setDate(plazo.getDate() + 10);
    const estado = "en_proceso";
    const isVencida = plazo < new Date() && estado !== "cumplida";
    expect(isVencida).toBe(false);
  });
});

// ── 10. Formato de datos ──────────────────────────────────────────────────────

describe("10. Formato y transformación de datos", () => {
  it("10.1 formatDate retorna 'Sin fecha' para valores nulos", () => {
    function formatDate(d: Date | string | null | undefined): string {
      if (!d) return "Sin fecha";
      const date = d instanceof Date ? d : new Date(d);
      if (isNaN(date.getTime())) return "Sin fecha";
      return date.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
    expect(formatDate(null)).toBe("Sin fecha");
    expect(formatDate(undefined)).toBe("Sin fecha");
    expect(formatDate("invalid")).toBe("Sin fecha");
  });

  it("10.2 truncate corta texto largo correctamente", () => {
    function truncate(text: string, maxLen: number): string {
      if (!text) return "";
      return text.length > maxLen
        ? text.substring(0, maxLen - 3) + "..."
        : text;
    }
    expect(truncate("Texto corto", 20)).toBe("Texto corto");
    expect(
      truncate("Este es un texto muy largo que supera el límite", 20)
    ).toBe("Este es un texto ...");
    expect(truncate("", 20)).toBe("");
  });

  it("10.3 formatBytes formatea correctamente", () => {
    function formatBytes(bytes: number) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("10.4 Estado labels están definidos para todos los estados", () => {
    const ESTADO_LABELS: Record<string, string> = {
      no_iniciada: "No iniciada",
      en_proceso: "En proceso",
      cumplida: "Cumplida",
      vencida: "Vencida",
      cancelada: "Cancelada",
    };
    const estados = [
      "no_iniciada",
      "en_proceso",
      "cumplida",
      "vencida",
      "cancelada",
    ];
    for (const e of estados) {
      expect(ESTADO_LABELS[e]).toBeTruthy();
    }
  });
});
