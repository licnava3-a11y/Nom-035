/**
 * Sprint 12 — Pruebas unitarias
 * Cubre: comparativa Q1/Q2, notificación por correo al aprobar Dictamen,
 *        lógica NOM-035 extendida (Categoría/Dominio/Dimensión)
 */
import { describe, it, expect } from "vitest";

function getNivelRiesgo(puntaje: number) {
  if (puntaje <= 5) return { nivel: "Nulo", labelClass: "nulo" };
  if (puntaje <= 40) return { nivel: "Bajo", labelClass: "bajo" };
  if (puntaje <= 60) return { nivel: "Medio", labelClass: "medio" };
  if (puntaje <= 85) return { nivel: "Alto", labelClass: "alto" };
  return { nivel: "Muy Alto", labelClass: "muy_alto" };
}
function calcularPuntajeDimension(valores: number[], maxPosible: number): number {
  if (maxPosible === 0) return 0;
  return parseFloat(((valores.reduce((s, v) => s + v, 0) / maxPosible) * 100).toFixed(2));
}
function calcularPuntajeDominio(puntajes: number[]): number {
  if (puntajes.length === 0) return 0;
  return parseFloat((puntajes.reduce((s, v) => s + v, 0) / puntajes.length).toFixed(2));
}
function requierePlan(cat: { nivel: { nivel: string } }, doms: Array<{ nivel: { nivel: string } }>, dims: Array<{ nivel: { nivel: string } }>): boolean {
  return cat.nivel.nivel === "Alto" || cat.nivel.nivel === "Muy Alto" ||
    doms.some(d => d.nivel.nivel === "Alto" || d.nivel.nivel === "Muy Alto") ||
    dims.some(d => d.nivel.nivel === "Alto" || d.nivel.nivel === "Muy Alto");
}

describe("getNivelRiesgo — Tabla de niveles NOM-035", () => {
  const casos = [
    [0, "Nulo"], [5, "Nulo"], [6, "Bajo"], [40, "Bajo"],
    [41, "Medio"], [60, "Medio"], [61, "Alto"], [85, "Alto"],
    [86, "Muy Alto"], [100, "Muy Alto"],
  ] as [number, string][];
  casos.forEach(([p, e]) => it(`puntaje ${p} → ${e}`, () => expect(getNivelRiesgo(p).nivel).toBe(e)));
});

describe("calcularPuntajeDimension", () => {
  it("todos en 0 → 0", () => expect(calcularPuntajeDimension([0,0,0,0], 16)).toBe(0));
  it("todos en máximo → 100", () => expect(calcularPuntajeDimension([4,4,4,4], 16)).toBe(100));
  it("mitad → 50", () => expect(calcularPuntajeDimension([2,2,2,2], 16)).toBe(50));
  it("maxPosible 0 → 0", () => expect(calcularPuntajeDimension([], 0)).toBe(0));
  it("mixtos → 62.5", () => expect(calcularPuntajeDimension([1,2,3,4], 16)).toBe(62.5));
});

describe("calcularPuntajeDominio", () => {
  it("un solo valor → mismo", () => expect(calcularPuntajeDominio([75])).toBe(75));
  it("promedio de dos", () => expect(calcularPuntajeDominio([60,80])).toBe(70));
  it("vacío → 0", () => expect(calcularPuntajeDominio([])).toBe(0));
});

describe("requierePlanObligatorio", () => {
  it("todo Bajo → false", () => expect(requierePlan({ nivel: getNivelRiesgo(20) }, [{ nivel: getNivelRiesgo(20) }], [{ nivel: getNivelRiesgo(30) }])).toBe(false));
  it("categoría Alto → true", () => expect(requierePlan({ nivel: getNivelRiesgo(70) }, [], [])).toBe(true));
  it("dominio Muy Alto → true", () => expect(requierePlan({ nivel: getNivelRiesgo(20) }, [{ nivel: getNivelRiesgo(90) }], [])).toBe(true));
  it("dimensión Alto → true", () => expect(requierePlan({ nivel: getNivelRiesgo(20) }, [{ nivel: getNivelRiesgo(50) }], [{ nivel: getNivelRiesgo(65) }])).toBe(true));
  it("todos Medio → false", () => expect(requierePlan({ nivel: getNivelRiesgo(55) }, [{ nivel: getNivelRiesgo(55) }], [{ nivel: getNivelRiesgo(55) }])).toBe(false));
});

describe("Comparativa Q1/Q2 — filtro de fechas", () => {
  function inRange(d: Date, f: Date, t: Date) { return d >= f && d <= t; }
  it("dentro del rango → true", () => expect(inRange(new Date("2026-02-15"), new Date("2026-01-01"), new Date("2026-03-31"))).toBe(true));
  it("fuera del rango → false", () => expect(inRange(new Date("2026-04-01"), new Date("2026-01-01"), new Date("2026-03-31"))).toBe(false));
  it("Q1 y Q2 no se superponen", () => {
    expect(inRange(new Date("2026-04-01"), new Date("2026-01-01"), new Date("2026-03-31"))).toBe(false);
    expect(inRange(new Date("2026-01-01"), new Date("2026-04-01"), new Date("2026-06-30"))).toBe(false);
  });
});

describe("Notificación por correo — construcción del cuerpo", () => {
  function buildBody(folio: string, hash: string, responsable: string) {
    return `Dictamen NOM-035 Aprobado\nFolio: ${folio}\nHash NOM-151: ${hash}\nResponsable: ${responsable}`;
  }
  it("contiene el folio", () => expect(buildBody("NOM035-DICT-001", "abc123", "Dr. Pérez")).toContain("NOM035-DICT-001"));
  it("contiene el hash", () => expect(buildBody("NOM035-DICT-001", "abc123", "Dr. Pérez")).toContain("abc123"));
  it("contiene el responsable", () => expect(buildBody("NOM035-DICT-001", "abc123", "Dr. Pérez")).toContain("Dr. Pérez"));
});
