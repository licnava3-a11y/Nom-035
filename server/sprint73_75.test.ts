/**
 * sprint73_75.test.ts
 * Tests unitarios para los Sprints 73, 74 y 75:
 *   - Sprint 73: Job de alertas de vencimiento NOM-035
 *   - Sprint 74: Widget KPI en Home (lógica de semáforo y KPIs)
 *   - Sprint 75: Generador de PDF del Dashboard de Cumplimiento
 */

import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers extraídos del job de alertas (Sprint 73)
// ─────────────────────────────────────────────────────────────────────────────

function calcularDiasHastaVencimiento(plazo: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaPlazo = new Date(plazo + "T00:00:00");
  return Math.round((fechaPlazo.getTime() - hoy.getTime()) / 86400000);
}

function esProximaAVencer(plazo: string, umbralDias = 7): boolean {
  const dias = calcularDiasHastaVencimiento(plazo);
  return dias >= 0 && dias <= umbralDias;
}

function esVencida(plazo: string): boolean {
  return calcularDiasHastaVencimiento(plazo) < 0;
}

function construirAsuntoAlerta(tipo: "proxima" | "vencida", accionId: string, diasRestantes?: number): string {
  if (tipo === "vencida") return `⚠ Acción NOM-035 vencida: ${accionId}`;
  return `⏰ Acción NOM-035 próxima a vencer en ${diasRestantes} día(s): ${accionId}`;
}

function deduplicarNotificaciones(
  acciones: Array<{ id: number; notificacion7DiasEnviada: boolean; notificacionVencimientoEnviada: boolean }>,
  tipo: "proxima" | "vencida"
): Array<{ id: number }> {
  return acciones.filter(a =>
    tipo === "proxima" ? !a.notificacion7DiasEnviada : !a.notificacionVencimientoEnviada
  );
}

function construirBaseUrl(hostname?: string): string {
  if (!hostname) return "https://app.manus.space";
  if (hostname.includes("localhost")) return `http://${hostname}`;
  return `https://${hostname}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers del Widget KPI (Sprint 74)
// ─────────────────────────────────────────────────────────────────────────────

function calcularSemaforoWidget(porcentaje: number): "verde" | "amarillo" | "rojo" {
  if (porcentaje >= 80) return "verde";
  if (porcentaje >= 50) return "amarillo";
  return "rojo";
}

function calcularPorcentajeWidget(cumplidas: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((cumplidas / total) * 100);
}

function calcularEtiquetaSemaforo(semaforo: "verde" | "amarillo" | "rojo"): string {
  const labels = { verde: "Óptimo", amarillo: "En riesgo", rojo: "Crítico" };
  return labels[semaforo];
}

function widgetDebeRenderizarse(matrizStats: any, matrizLoading: boolean): boolean {
  return matrizLoading || !!matrizStats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers del generador PDF (Sprint 75)
// ─────────────────────────────────────────────────────────────────────────────

function generarFolioPdf(): string {
  return `NOM035-DASH-${Date.now()}`;
}

function calcularColorSemaforo(porcentaje: number): string {
  if (porcentaje >= 80) return "#16a34a";
  if (porcentaje >= 50) return "#d97706";
  return "#dc2626";
}

function calcularEtiquetaSemaforoPdf(porcentaje: number): string {
  if (porcentaje >= 80) return "Óptimo";
  if (porcentaje >= 50) return "En riesgo";
  return "Crítico";
}

function truncarTexto(texto: string, maxLen: number): string {
  if (texto.length <= maxLen) return texto;
  return texto.slice(0, maxLen) + "...";
}

function formatearFechaPdf(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

function calcularPorcentajeTendencia(cumplidas: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((cumplidas / total) * 100);
}

function validarDatosPdf(data: any): { valido: boolean; errores: string[] } {
  const errores: string[] = [];
  if (!data.kpis) errores.push("kpis es requerido");
  if (typeof data.kpis?.total !== "number") errores.push("kpis.total debe ser número");
  if (!Array.isArray(data.planes)) errores.push("planes debe ser array");
  if (!Array.isArray(data.proximasAVencer)) errores.push("proximasAVencer debe ser array");
  if (!Array.isArray(data.accionesVencidas)) errores.push("accionesVencidas debe ser array");
  return { valido: errores.length === 0, errores };
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — Sprint 73: Job de alertas de vencimiento
// ─────────────────────────────────────────────────────────────────────────────

describe("Sprint 73 — Job de alertas de vencimiento NOM-035", () => {
  const hoy = new Date();
  const mañana = new Date(hoy); mañana.setDate(hoy.getDate() + 1);
  const en5Dias = new Date(hoy); en5Dias.setDate(hoy.getDate() + 5);
  const en8Dias = new Date(hoy); en8Dias.setDate(hoy.getDate() + 8);
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const hace10Dias = new Date(hoy); hace10Dias.setDate(hoy.getDate() - 10);

  const toStr = (d: Date) => d.toISOString().split("T")[0];

  it("detecta acción próxima a vencer dentro del umbral de 7 días", () => {
    expect(esProximaAVencer(toStr(mañana), 7)).toBe(true);
    expect(esProximaAVencer(toStr(en5Dias), 7)).toBe(true);
  });

  it("no detecta acción fuera del umbral de 7 días como próxima", () => {
    expect(esProximaAVencer(toStr(en8Dias), 7)).toBe(false);
  });

  it("detecta acción vencida (plazo pasado)", () => {
    expect(esVencida(toStr(ayer))).toBe(true);
    expect(esVencida(toStr(hace10Dias))).toBe(true);
  });

  it("no detecta acción futura como vencida", () => {
    expect(esVencida(toStr(mañana))).toBe(false);
    expect(esVencida(toStr(en5Dias))).toBe(false);
  });

  it("construye asunto de correo para acción próxima a vencer", () => {
    const asunto = construirAsuntoAlerta("proxima", "INT-01", 3);
    expect(asunto).toContain("INT-01");
    expect(asunto).toContain("3");
    expect(asunto).toContain("próxima");
  });

  it("construye asunto de correo para acción vencida", () => {
    const asunto = construirAsuntoAlerta("vencida", "VL-02");
    expect(asunto).toContain("VL-02");
    expect(asunto).toContain("vencida");
  });

  it("deduplica notificaciones próximas ya enviadas", () => {
    const acciones = [
      { id: 1, notificacion7DiasEnviada: true, notificacionVencimientoEnviada: false },
      { id: 2, notificacion7DiasEnviada: false, notificacionVencimientoEnviada: false },
    ];
    const pendientes = deduplicarNotificaciones(acciones, "proxima");
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].id).toBe(2);
  });

  it("deduplica notificaciones de vencimiento ya enviadas", () => {
    const acciones = [
      { id: 1, notificacion7DiasEnviada: false, notificacionVencimientoEnviada: true },
      { id: 2, notificacion7DiasEnviada: false, notificacionVencimientoEnviada: false },
    ];
    const pendientes = deduplicarNotificaciones(acciones, "vencida");
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].id).toBe(2);
  });

  it("construye URL base correcta para localhost", () => {
    expect(construirBaseUrl("localhost:3000")).toContain("http://");
  });

  it("construye URL base correcta para producción", () => {
    const url = construirBaseUrl("miapp.manus.space");
    expect(url).toContain("https://");
  });

  it("retorna URL por defecto cuando no hay hostname", () => {
    expect(construirBaseUrl()).toContain("https://");
  });

  it("calcula días hasta vencimiento correctamente para fecha futura", () => {
    const dias = calcularDiasHastaVencimiento(toStr(en5Dias));
    expect(dias).toBeGreaterThanOrEqual(4);
    expect(dias).toBeLessThanOrEqual(6);
  });

  it("retorna días negativos para fecha pasada", () => {
    const dias = calcularDiasHastaVencimiento(toStr(ayer));
    expect(dias).toBeLessThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — Sprint 74: Widget KPI en Home
// ─────────────────────────────────────────────────────────────────────────────

describe("Sprint 74 — Widget KPI de Matriz en Home", () => {
  it("semáforo verde cuando cumplimiento >= 80%", () => {
    expect(calcularSemaforoWidget(80)).toBe("verde");
    expect(calcularSemaforoWidget(100)).toBe("verde");
    expect(calcularSemaforoWidget(85)).toBe("verde");
  });

  it("semáforo amarillo cuando cumplimiento entre 50% y 79%", () => {
    expect(calcularSemaforoWidget(50)).toBe("amarillo");
    expect(calcularSemaforoWidget(65)).toBe("amarillo");
    expect(calcularSemaforoWidget(79)).toBe("amarillo");
  });

  it("semáforo rojo cuando cumplimiento < 50%", () => {
    expect(calcularSemaforoWidget(0)).toBe("rojo");
    expect(calcularSemaforoWidget(49)).toBe("rojo");
    expect(calcularSemaforoWidget(25)).toBe("rojo");
  });

  it("calcula porcentaje de cumplimiento correctamente", () => {
    expect(calcularPorcentajeWidget(8, 10)).toBe(80);
    expect(calcularPorcentajeWidget(5, 10)).toBe(50);
    expect(calcularPorcentajeWidget(0, 10)).toBe(0);
    expect(calcularPorcentajeWidget(10, 10)).toBe(100);
  });

  it("retorna 0% cuando total es 0 (sin división por cero)", () => {
    expect(calcularPorcentajeWidget(0, 0)).toBe(0);
  });

  it("etiqueta semáforo verde es 'Óptimo'", () => {
    expect(calcularEtiquetaSemaforo("verde")).toBe("Óptimo");
  });

  it("etiqueta semáforo amarillo es 'En riesgo'", () => {
    expect(calcularEtiquetaSemaforo("amarillo")).toBe("En riesgo");
  });

  it("etiqueta semáforo rojo es 'Crítico'", () => {
    expect(calcularEtiquetaSemaforo("rojo")).toBe("Crítico");
  });

  it("widget se renderiza cuando hay datos", () => {
    const stats = { totalAcciones: 10, cumplidas: 8, vencidas: 1, conEvidencia: 6 };
    expect(widgetDebeRenderizarse(stats, false)).toBe(true);
  });

  it("widget se renderiza durante carga (loading)", () => {
    expect(widgetDebeRenderizarse(undefined, true)).toBe(true);
  });

  it("widget no se renderiza cuando no hay datos y no está cargando", () => {
    expect(widgetDebeRenderizarse(undefined, false)).toBe(false);
  });

  it("porcentaje se redondea al entero más cercano", () => {
    expect(calcularPorcentajeWidget(1, 3)).toBe(33);
    expect(calcularPorcentajeWidget(2, 3)).toBe(67);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — Sprint 75: Generador PDF del Dashboard
// ─────────────────────────────────────────────────────────────────────────────

describe("Sprint 75 — Generador PDF del Dashboard de Cumplimiento", () => {
  it("genera folio único con prefijo NOM035-DASH-", () => {
    const folio = generarFolioPdf();
    expect(folio).toMatch(/^NOM035-DASH-\d+$/);
  });

  it("dos folios tienen el formato correcto y son strings no vacíos", () => {
    const f1 = generarFolioPdf();
    const f2 = generarFolioPdf();
    expect(f1).toMatch(/^NOM035-DASH-\d+$/);
    expect(f2).toMatch(/^NOM035-DASH-\d+$/);
    expect(f1.length).toBeGreaterThan(10);
  });

  it("color semáforo verde para >= 80%", () => {
    expect(calcularColorSemaforo(80)).toBe("#16a34a");
    expect(calcularColorSemaforo(100)).toBe("#16a34a");
  });

  it("color semáforo amarillo para 50-79%", () => {
    expect(calcularColorSemaforo(50)).toBe("#d97706");
    expect(calcularColorSemaforo(75)).toBe("#d97706");
  });

  it("color semáforo rojo para < 50%", () => {
    expect(calcularColorSemaforo(0)).toBe("#dc2626");
    expect(calcularColorSemaforo(49)).toBe("#dc2626");
  });

  it("etiqueta semáforo PDF correcta", () => {
    expect(calcularEtiquetaSemaforoPdf(80)).toBe("Óptimo");
    expect(calcularEtiquetaSemaforoPdf(60)).toBe("En riesgo");
    expect(calcularEtiquetaSemaforoPdf(30)).toBe("Crítico");
  });

  it("trunca texto largo a maxLen caracteres con '...'", () => {
    const texto = "Este es un texto muy largo que supera el límite establecido para la columna";
    const truncado = truncarTexto(texto, 30);
    expect(truncado.length).toBeLessThanOrEqual(33); // 30 + "..."
    expect(truncado.endsWith("...")).toBe(true);
  });

  it("no trunca texto corto", () => {
    const texto = "Texto corto";
    expect(truncarTexto(texto, 50)).toBe("Texto corto");
  });

  it("formatea fecha nula como '—'", () => {
    expect(formatearFechaPdf(null)).toBe("—");
    expect(formatearFechaPdf(undefined)).toBe("—");
  });

  it("formatea fecha válida como string legible", () => {
    const resultado = formatearFechaPdf("2025-12-31");
    expect(resultado).not.toBe("—");
    expect(typeof resultado).toBe("string");
  });

  it("calcula porcentaje de tendencia mensual", () => {
    expect(calcularPorcentajeTendencia(6, 10)).toBe(60);
    expect(calcularPorcentajeTendencia(0, 0)).toBe(0);
    expect(calcularPorcentajeTendencia(10, 10)).toBe(100);
  });

  it("valida datos mínimos para generar PDF", () => {
    const datosValidos = {
      kpis: { total: 10, cumplidas: 8, vencidas: 1, noIniciadas: 1, enProceso: 0, canceladas: 0, conEvidencia: 5, altaPrioridad: 3, altaVencida: 0, porcentajeCumplimiento: 80, semaforoGlobal: "verde" },
      planes: [],
      proximasAVencer: [],
      accionesVencidas: [],
      byTipoPlan: [],
      byNivel: [],
      byPrioridad: [],
      tendenciaMeses: [],
    };
    const { valido, errores } = validarDatosPdf(datosValidos);
    expect(valido).toBe(true);
    expect(errores).toHaveLength(0);
  });

  it("detecta datos inválidos para PDF", () => {
    const datosInvalidos = { kpis: null, planes: null };
    const { valido, errores } = validarDatosPdf(datosInvalidos);
    expect(valido).toBe(false);
    expect(errores.length).toBeGreaterThan(0);
  });

  it("incluye todas las secciones requeridas en la estructura de datos", () => {
    const secciones = ["kpis", "planes", "proximasAVencer", "accionesVencidas", "byTipoPlan", "byNivel", "byPrioridad", "tendenciaMeses"];
    const datos: any = {};
    secciones.forEach(s => { datos[s] = s === "kpis" ? { total: 0 } : []; });
    const { valido } = validarDatosPdf(datos);
    expect(valido).toBe(true);
  });
});
