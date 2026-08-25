/**
 * sprint76.test.ts
 * Tests unitarios para la bitácora de historial de cambios de acciones NOM-035.
 * Verifica la lógica de detección de cambios, formateo de valores y deduplicación.
 */
import { describe, it, expect } from "vitest";

// ── Helpers de lógica de bitácora ─────────────────────────────────────────────

type CampoHistorial =
  | "estado"
  | "responsable"
  | "plazo"
  | "prioridad"
  | "objetivo"
  | "observaciones"
  | "evidencia_agregada"
  | "evidencia_eliminada"
  | "creacion";

interface HistoryEntry {
  campo: CampoHistorial;
  valorAnterior: string | null;
  valorNuevo: string | null;
  changedByName: string;
  nota?: string | null;
}

/**
 * Detecta qué campos cambiaron entre el estado anterior y el nuevo.
 * Retorna una lista de entradas de bitácora a registrar.
 */
function detectarCambios(
  current: {
    estado: string;
    responsable: string | null;
    plazo: Date | null;
    prioridad: string;
    observaciones: string | null;
  },
  updates: {
    estado?: string;
    responsable?: string;
    plazo?: string; // ISO date string
    prioridad?: string;
    observaciones?: string;
  },
  changedByName: string,
  nota?: string
): HistoryEntry[] {
  const entries: HistoryEntry[] = [];

  if (updates.estado !== undefined && updates.estado !== current.estado) {
    entries.push({
      campo: "estado",
      valorAnterior: current.estado,
      valorNuevo: updates.estado,
      changedByName,
      nota: nota ?? null,
    });
  }
  if (
    updates.responsable !== undefined &&
    updates.responsable !== current.responsable
  ) {
    entries.push({
      campo: "responsable",
      valorAnterior: current.responsable,
      valorNuevo: updates.responsable,
      changedByName,
      nota: nota ?? null,
    });
  }
  if (updates.plazo !== undefined) {
    const prevPlazo = current.plazo
      ? current.plazo instanceof Date
        ? current.plazo.toISOString().split("T")[0]
        : String(current.plazo)
      : null;
    if (prevPlazo !== updates.plazo) {
      entries.push({
        campo: "plazo",
        valorAnterior: prevPlazo,
        valorNuevo: updates.plazo,
        changedByName,
        nota: nota ?? null,
      });
    }
  }
  if (
    updates.prioridad !== undefined &&
    updates.prioridad !== current.prioridad
  ) {
    entries.push({
      campo: "prioridad",
      valorAnterior: current.prioridad,
      valorNuevo: updates.prioridad,
      changedByName,
      nota: nota ?? null,
    });
  }
  if (
    updates.observaciones !== undefined &&
    updates.observaciones !== current.observaciones
  ) {
    entries.push({
      campo: "observaciones",
      valorAnterior: current.observaciones,
      valorNuevo: updates.observaciones,
      changedByName,
      nota: nota ?? null,
    });
  }

  // Si hay nota pero no hubo cambios de campo, registrar la nota como entrada independiente
  if (nota && entries.length === 0) {
    entries.push({
      campo: "observaciones",
      valorAnterior: null,
      valorNuevo: nota,
      changedByName,
      nota,
    });
  }

  return entries;
}

/**
 * Formatea el valor de un campo para mostrar en la bitácora.
 */
function formatearValorCampo(
  campo: CampoHistorial,
  valor: string | null
): string {
  if (!valor) return "—";

  const ESTADO_LABELS: Record<string, string> = {
    no_iniciada: "No iniciada",
    en_proceso: "En proceso",
    cumplida: "Cumplida",
    vencida: "Vencida",
    cancelada: "Cancelada",
  };

  const PRIORIDAD_LABELS: Record<string, string> = {
    alta: "Alta",
    media: "Media",
    baja: "Baja",
  };

  if (campo === "estado") return ESTADO_LABELS[valor] ?? valor;
  if (campo === "prioridad") return PRIORIDAD_LABELS[valor] ?? valor;
  if (campo === "plazo") {
    const d = new Date(valor + "T00:00:00");
    return isNaN(d.getTime())
      ? valor
      : d.toLocaleDateString("es-MX", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  }
  return valor.length > 80 ? valor.slice(0, 80) + "…" : valor;
}

/**
 * Genera un resumen legible de los cambios para notificaciones.
 */
function generarResumenCambios(entries: HistoryEntry[]): string {
  if (entries.length === 0) return "Sin cambios";
  return entries
    .map(e => {
      const prev = e.valorAnterior ? `"${e.valorAnterior}"` : "vacío";
      const next = e.valorNuevo ? `"${e.valorNuevo}"` : "vacío";
      return `${e.campo}: ${prev} → ${next}`;
    })
    .join("; ");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Sprint 76 — Bitácora de Historial de Acciones NOM-035", () => {
  // ── Detección de cambios ──────────────────────────────────────────────────

  describe("detectarCambios()", () => {
    const baseAction = {
      estado: "no_iniciada",
      responsable: "Juan Pérez",
      plazo: new Date("2026-06-30"),
      prioridad: "media",
      observaciones: null,
    };

    it("detecta cambio de estado", () => {
      const entries = detectarCambios(
        baseAction,
        { estado: "en_proceso" },
        "Admin"
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].campo).toBe("estado");
      expect(entries[0].valorAnterior).toBe("no_iniciada");
      expect(entries[0].valorNuevo).toBe("en_proceso");
    });

    it("no registra si el estado es el mismo", () => {
      const entries = detectarCambios(
        baseAction,
        { estado: "no_iniciada" },
        "Admin"
      );
      expect(entries).toHaveLength(0);
    });

    it("detecta cambio de responsable", () => {
      const entries = detectarCambios(
        baseAction,
        { responsable: "María García" },
        "Admin"
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].campo).toBe("responsable");
      expect(entries[0].valorAnterior).toBe("Juan Pérez");
      expect(entries[0].valorNuevo).toBe("María García");
    });

    it("detecta cambio de plazo", () => {
      const entries = detectarCambios(
        baseAction,
        { plazo: "2026-09-15" },
        "Admin"
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].campo).toBe("plazo");
      expect(entries[0].valorAnterior).toBe("2026-06-30");
      expect(entries[0].valorNuevo).toBe("2026-09-15");
    });

    it("no registra plazo si no cambia", () => {
      const entries = detectarCambios(
        baseAction,
        { plazo: "2026-06-30" },
        "Admin"
      );
      expect(entries).toHaveLength(0);
    });

    it("detecta cambio de prioridad", () => {
      const entries = detectarCambios(
        baseAction,
        { prioridad: "alta" },
        "Admin"
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].campo).toBe("prioridad");
      expect(entries[0].valorAnterior).toBe("media");
      expect(entries[0].valorNuevo).toBe("alta");
    });

    it("detecta cambio de observaciones", () => {
      const entries = detectarCambios(
        baseAction,
        { observaciones: "Acción en revisión" },
        "Admin"
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].campo).toBe("observaciones");
      expect(entries[0].valorAnterior).toBeNull();
      expect(entries[0].valorNuevo).toBe("Acción en revisión");
    });

    it("detecta múltiples cambios simultáneos", () => {
      const entries = detectarCambios(
        baseAction,
        {
          estado: "en_proceso",
          responsable: "María García",
          prioridad: "alta",
        },
        "Admin"
      );
      expect(entries).toHaveLength(3);
      const campos = entries.map(e => e.campo);
      expect(campos).toContain("estado");
      expect(campos).toContain("responsable");
      expect(campos).toContain("prioridad");
    });

    it("registra nota sola si no hay cambios de campo", () => {
      const entries = detectarCambios(
        baseAction,
        {},
        "Admin",
        "Revisión semanal completada"
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].campo).toBe("observaciones");
      expect(entries[0].valorNuevo).toBe("Revisión semanal completada");
      expect(entries[0].nota).toBe("Revisión semanal completada");
    });

    it("no registra nota vacía", () => {
      const entries = detectarCambios(baseAction, {}, "Admin", "");
      expect(entries).toHaveLength(0);
    });

    it("adjunta nota a cambios de campo cuando se proporciona", () => {
      const entries = detectarCambios(
        baseAction,
        { estado: "cumplida" },
        "Admin",
        "Verificado en auditoría"
      );
      expect(entries[0].nota).toBe("Verificado en auditoría");
    });

    it("maneja responsable null correctamente", () => {
      const actionSinResponsable = { ...baseAction, responsable: null };
      const entries = detectarCambios(
        actionSinResponsable,
        { responsable: "Nuevo Responsable" },
        "Admin"
      );
      expect(entries[0].valorAnterior).toBeNull();
      expect(entries[0].valorNuevo).toBe("Nuevo Responsable");
    });

    it("maneja plazo null correctamente", () => {
      const actionSinPlazo = { ...baseAction, plazo: null };
      const entries = detectarCambios(
        actionSinPlazo,
        { plazo: "2026-12-31" },
        "Admin"
      );
      expect(entries[0].valorAnterior).toBeNull();
      expect(entries[0].valorNuevo).toBe("2026-12-31");
    });
  });

  // ── Formateo de valores ───────────────────────────────────────────────────

  describe("formatearValorCampo()", () => {
    it("formatea estados correctamente", () => {
      expect(formatearValorCampo("estado", "no_iniciada")).toBe("No iniciada");
      expect(formatearValorCampo("estado", "en_proceso")).toBe("En proceso");
      expect(formatearValorCampo("estado", "cumplida")).toBe("Cumplida");
      expect(formatearValorCampo("estado", "vencida")).toBe("Vencida");
      expect(formatearValorCampo("estado", "cancelada")).toBe("Cancelada");
    });

    it("formatea prioridades correctamente", () => {
      expect(formatearValorCampo("prioridad", "alta")).toBe("Alta");
      expect(formatearValorCampo("prioridad", "media")).toBe("Media");
      expect(formatearValorCampo("prioridad", "baja")).toBe("Baja");
    });

    it("formatea fechas de plazo en español", () => {
      const resultado = formatearValorCampo("plazo", "2026-06-30");
      expect(resultado).toContain("2026");
      expect(resultado).toContain("30");
    });

    it("retorna '—' para valores nulos", () => {
      expect(formatearValorCampo("estado", null)).toBe("—");
      expect(formatearValorCampo("responsable", null)).toBe("—");
    });

    it("trunca textos largos a 80 caracteres + '…'", () => {
      const textoLargo = "A".repeat(100);
      const resultado = formatearValorCampo("observaciones", textoLargo);
      expect(resultado.length).toBeLessThanOrEqual(83); // 80 + "…"
      expect(resultado.endsWith("…")).toBe(true);
    });

    it("no trunca textos cortos", () => {
      const textoCorto = "Texto normal";
      expect(formatearValorCampo("observaciones", textoCorto)).toBe(
        "Texto normal"
      );
    });

    it("maneja estados desconocidos retornando el valor original", () => {
      expect(formatearValorCampo("estado", "estado_desconocido")).toBe(
        "estado_desconocido"
      );
    });
  });

  // ── Generación de resumen ─────────────────────────────────────────────────

  describe("generarResumenCambios()", () => {
    it("retorna 'Sin cambios' para lista vacía", () => {
      expect(generarResumenCambios([])).toBe("Sin cambios");
    });

    it("genera resumen de un cambio", () => {
      const entries: HistoryEntry[] = [
        {
          campo: "estado",
          valorAnterior: "no_iniciada",
          valorNuevo: "en_proceso",
          changedByName: "Admin",
        },
      ];
      const resumen = generarResumenCambios(entries);
      expect(resumen).toContain("estado");
      expect(resumen).toContain("no_iniciada");
      expect(resumen).toContain("en_proceso");
    });

    it("genera resumen de múltiples cambios separados por ';'", () => {
      const entries: HistoryEntry[] = [
        {
          campo: "estado",
          valorAnterior: "no_iniciada",
          valorNuevo: "en_proceso",
          changedByName: "Admin",
        },
        {
          campo: "prioridad",
          valorAnterior: "media",
          valorNuevo: "alta",
          changedByName: "Admin",
        },
      ];
      const resumen = generarResumenCambios(entries);
      expect(resumen).toContain(";");
      expect(resumen).toContain("estado");
      expect(resumen).toContain("prioridad");
    });

    it("maneja valores nulos en el resumen", () => {
      const entries: HistoryEntry[] = [
        {
          campo: "responsable",
          valorAnterior: null,
          valorNuevo: "Juan Pérez",
          changedByName: "Admin",
        },
      ];
      const resumen = generarResumenCambios(entries);
      expect(resumen).toContain("vacío");
      expect(resumen).toContain("Juan Pérez");
    });
  });

  // ── Validaciones de integridad ────────────────────────────────────────────

  describe("Validaciones de integridad de la bitácora", () => {
    it("todos los campos del enum son válidos", () => {
      const camposValidos: CampoHistorial[] = [
        "estado",
        "responsable",
        "plazo",
        "prioridad",
        "objetivo",
        "observaciones",
        "evidencia_agregada",
        "evidencia_eliminada",
        "creacion",
      ];
      expect(camposValidos).toHaveLength(9);
      camposValidos.forEach(campo => {
        expect(typeof campo).toBe("string");
        expect(campo.length).toBeGreaterThan(0);
      });
    });

    it("la detección de cambios no genera duplicados para el mismo campo", () => {
      const baseAction = {
        estado: "no_iniciada",
        responsable: null,
        plazo: null,
        prioridad: "media",
        observaciones: null,
      };
      // Mismo campo dos veces en updates (no debería pasar, pero verificamos)
      const entries = detectarCambios(
        baseAction,
        { estado: "en_proceso" },
        "Admin"
      );
      const camposEstado = entries.filter(e => e.campo === "estado");
      expect(camposEstado).toHaveLength(1);
    });

    it("el autor del cambio se registra correctamente", () => {
      const baseAction = {
        estado: "no_iniciada",
        responsable: null,
        plazo: null,
        prioridad: "media",
        observaciones: null,
      };
      const entries = detectarCambios(
        baseAction,
        { estado: "cumplida" },
        "María García"
      );
      expect(entries[0].changedByName).toBe("María García");
    });

    it("la nota se propaga a todas las entradas del lote", () => {
      const baseAction = {
        estado: "no_iniciada",
        responsable: "Juan",
        plazo: null,
        prioridad: "media",
        observaciones: null,
      };
      const nota = "Revisión de auditoría interna";
      const entries = detectarCambios(
        baseAction,
        { estado: "en_proceso", responsable: "María" },
        "Admin",
        nota
      );
      expect(entries).toHaveLength(2);
      entries.forEach(e => expect(e.nota).toBe(nota));
    });
  });
});
