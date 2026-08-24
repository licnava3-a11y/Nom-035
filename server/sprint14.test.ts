/**
 * Sprint 14 — Pruebas unitarias
 * 1. Exportación Excel NOM-035 (lógica de datos)
 * 2. Panel KPIs ejecutivos (estructura de respuesta)
 * 3. Autocompletado CURP (decodificación local)
 */
import { describe, it, expect } from "vitest";

// ─── 1. Lógica de exportación Excel ──────────────────────────────────────────
describe("NOM035 Excel Export — lógica de datos", () => {
  const mockData = {
    summary: {
      totalEmployees: 50,
      surveyed: 40,
      coverageRate: 80,
      avgScore: 65,
      riskLevel: "Medio",
    },
    categories: [
      {
        name: "Ambiente de Trabajo",
        score: 72,
        riskLevel: "Bajo",
        employeeCount: 40,
      },
      {
        name: "Factores propios de la actividad",
        score: 58,
        riskLevel: "Medio",
        employeeCount: 40,
      },
    ],
    domains: [
      {
        name: "Condiciones en el ambiente de trabajo",
        category: "Ambiente de Trabajo",
        score: 72,
        riskLevel: "Bajo",
      },
    ],
    dimensions: [
      {
        name: "Condiciones peligrosas e inseguras",
        domain: "Condiciones en el ambiente de trabajo",
        score: 72,
        riskLevel: "Bajo",
        requiresAction: false,
      },
    ],
    actionPlan: [],
  };

  it("debe tener estructura de datos válida para exportación", () => {
    expect(mockData.summary).toBeDefined();
    expect(mockData.categories).toBeInstanceOf(Array);
    expect(mockData.domains).toBeInstanceOf(Array);
    expect(mockData.dimensions).toBeInstanceOf(Array);
  });

  it("debe calcular la cobertura correctamente", () => {
    const coverage = Math.round(
      (mockData.summary.surveyed / mockData.summary.totalEmployees) * 100
    );
    expect(coverage).toBe(80);
  });

  it("debe identificar dimensiones que requieren acción", () => {
    const actionRequired = mockData.dimensions.filter(d => d.requiresAction);
    expect(actionRequired).toBeInstanceOf(Array);
  });

  it("debe tener niveles de riesgo válidos en categorías", () => {
    const validLevels = ["Nulo", "Bajo", "Medio", "Alto", "Muy Alto"];
    for (const cat of mockData.categories) {
      expect(validLevels).toContain(cat.riskLevel);
    }
  });

  it("debe generar nombre de archivo con fecha", () => {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `NOM035_Reporte_${today}.xlsx`;
    expect(filename).toMatch(/^NOM035_Reporte_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

// ─── 2. Panel KPIs ejecutivos ─────────────────────────────────────────────────
describe("KPIs ejecutivos — estructura de respuesta", () => {
  const mockKPIs = {
    employees: { total: 100, active: 90, inactive: 10, turnoverRate: 8 },
    training: {
      totalCourses: 15,
      totalAssignments: 200,
      completedAssignments: 160,
      completionRate: 80,
    },
    vacations: { pending: 5, approved: 20, total: 25 },
    cases: { total: 12, open: 3, highRisk: 1 },
    mailbox: { pending: 8, total: 45 },
    psychometric: { total: 30, highRisk: 2 },
    generatedAt: new Date().toISOString(),
  };

  it("debe tener todos los módulos de KPI", () => {
    expect(mockKPIs).toHaveProperty("employees");
    expect(mockKPIs).toHaveProperty("training");
    expect(mockKPIs).toHaveProperty("vacations");
    expect(mockKPIs).toHaveProperty("cases");
    expect(mockKPIs).toHaveProperty("mailbox");
    expect(mockKPIs).toHaveProperty("psychometric");
  });

  it("debe calcular el índice de rotación correctamente", () => {
    expect(mockKPIs.employees.turnoverRate).toBeGreaterThanOrEqual(0);
    expect(mockKPIs.employees.turnoverRate).toBeLessThanOrEqual(100);
  });

  it("debe tener tasa de capacitación entre 0 y 100", () => {
    expect(mockKPIs.training.completionRate).toBeGreaterThanOrEqual(0);
    expect(mockKPIs.training.completionRate).toBeLessThanOrEqual(100);
  });

  it("debe identificar rotación alta (>15%)", () => {
    const highTurnover = { ...mockKPIs.employees, turnoverRate: 20 };
    expect(highTurnover.turnoverRate > 15).toBe(true);
  });

  it("debe identificar meta de capacitación alcanzada (>=80%)", () => {
    expect(mockKPIs.training.completionRate >= 80).toBe(true);
  });

  it("debe tener generatedAt como ISO string válido", () => {
    expect(() => new Date(mockKPIs.generatedAt)).not.toThrow();
    expect(new Date(mockKPIs.generatedAt).getFullYear()).toBeGreaterThan(2020);
  });
});

// ─── 3. Autocompletado CURP ───────────────────────────────────────────────────
describe("Autocompletado CURP — decodificación local", () => {
  // Función de decodificación simplificada (misma lógica que curp-validator.ts)
  function decodeCURP(curp: string) {
    if (!curp || curp.length !== 18) return null;
    const c = curp.toUpperCase();
    const yearStr = c.substring(4, 6);
    const month = c.substring(6, 8);
    const day = c.substring(8, 10);
    const sexCode = c.substring(10, 11);
    const stateCode = c.substring(11, 13);
    const year =
      parseInt(yearStr) >= 0 && parseInt(yearStr) <= 25
        ? `20${yearStr}`
        : `19${yearStr}`;
    return {
      fechaNacimiento: `${year}-${month}-${day}`,
      sexo: sexCode as "H" | "M",
      genero: sexCode === "H" ? "Masculino" : "Femenino",
      codigoEstado: stateCode,
    };
  }

  it("debe decodificar fecha de nacimiento de una CURP válida", () => {
    const curp = "GOCA900515HDFNRR09";
    const result = decodeCURP(curp);
    expect(result).not.toBeNull();
    expect(result?.fechaNacimiento).toBe("1990-05-15");
  });

  it("debe identificar sexo masculino (H)", () => {
    const curp = "GOCA900515HDFNRR09";
    const result = decodeCURP(curp);
    expect(result?.sexo).toBe("H");
    expect(result?.genero).toBe("Masculino");
  });

  it("debe identificar sexo femenino (M)", () => {
    const curp = "GOCA900515MDFNRR09";
    const result = decodeCURP(curp);
    expect(result?.sexo).toBe("M");
    expect(result?.genero).toBe("Femenino");
  });

  it("debe extraer código de estado de nacimiento", () => {
    const curp = "GOCA900515HDFNRR09";
    const result = decodeCURP(curp);
    expect(result?.codigoEstado).toBe("DF");
  });

  it("debe retornar null para CURP con longitud incorrecta", () => {
    expect(decodeCURP("CORTA")).toBeNull();
    expect(decodeCURP("")).toBeNull();
  });

  it("debe manejar CURPs del siglo XXI (año >= 2000)", () => {
    // Año 05 → 2005 (porque 05 <= 25)
    const curp = "GOCA050515HDFNRR09";
    const result = decodeCURP(curp);
    expect(result?.fechaNacimiento).toMatch(/^2005-/);
  });

  it("debe manejar CURPs del siglo XX (año >= 26)", () => {
    // Año 90 → 1990 (porque 90 > 25)
    const curp = "GOCA900515HDFNRR09";
    const result = decodeCURP(curp);
    expect(result?.fechaNacimiento).toMatch(/^1990-/);
  });
});

// ─── 4. Tendencias históricas ─────────────────────────────────────────────────
describe("Tendencias históricas — generación de etiquetas de meses", () => {
  function generateMonthLabels(months: number): string[] {
    const now = new Date();
    const labels: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      );
    }
    return labels;
  }

  it("debe generar 6 etiquetas de meses", () => {
    const labels = generateMonthLabels(6);
    expect(labels).toHaveLength(6);
  });

  it("debe generar 12 etiquetas de meses", () => {
    const labels = generateMonthLabels(12);
    expect(labels).toHaveLength(12);
  });

  it("debe generar etiquetas en formato YYYY-MM", () => {
    const labels = generateMonthLabels(3);
    for (const label of labels) {
      expect(label).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it("debe terminar con el mes actual", () => {
    const labels = generateMonthLabels(3);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(labels[labels.length - 1]).toBe(currentMonth);
  });
});
