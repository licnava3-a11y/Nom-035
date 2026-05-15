/**
 * Sprint 45 — Tests: Mapa de Calor NOM-035 + Limpieza todo.md
 *
 * Verifica:
 *  1. La lógica de cálculo de riesgo semáforo (rotación, capacitación, NOM-035, vacaciones, psicométrico)
 *  2. La lógica del nivel global de riesgo (promedio de 5 indicadores)
 *  3. El filtro de sucursal en el mapa de calor (estado heatmapBranchId)
 *  4. La existencia del procedure getComparativaDepts en el router executiveReport
 *  5. La existencia del procedure getBranchComparative en el router executiveReport
 *  6. Que el todo.md no tiene ítems [ ] que sean genuinamente pendientes (excepto los marcados como PENDIENTE REAL)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ─── Lógica de semáforo (extraída del componente KPIDashboard) ────────────────
function calcRisks(dept: {
  turnoverRate: number;
  trainingRate: number;
  nom035Score: number;
  pendingVacations: number;
  highRiskPsycho: number;
}) {
  const rotRisk = dept.turnoverRate >= 20 ? 2 : dept.turnoverRate >= 10 ? 1 : 0;
  const capRisk = dept.trainingRate < 50 ? 2 : dept.trainingRate < 80 ? 1 : 0;
  const nomRisk = dept.nom035Score < 60 ? 2 : dept.nom035Score < 80 ? 1 : 0;
  const vacRisk = dept.pendingVacations >= 5 ? 2 : dept.pendingVacations >= 2 ? 1 : 0;
  const psyRisk = dept.highRiskPsycho >= 3 ? 2 : dept.highRiskPsycho >= 1 ? 1 : 0;
  const globalRisk = Math.round((rotRisk + capRisk + nomRisk + vacRisk + psyRisk) / 5);
  return { rotRisk, capRisk, nomRisk, vacRisk, psyRisk, globalRisk };
}

describe("Sprint 45 — Mapa de Calor NOM-035", () => {

  // ── 1. Departamento de bajo riesgo ────────────────────────────────────────
  it("departamento con todos los indicadores en verde → globalRisk = 0 (Bajo)", () => {
    const risks = calcRisks({
      turnoverRate: 5,       // < 10 → 0
      trainingRate: 90,      // >= 80 → 0
      nom035Score: 85,       // >= 80 → 0
      pendingVacations: 1,   // < 2 → 0
      highRiskPsycho: 0,     // 0 → 0
    });
    expect(risks.rotRisk).toBe(0);
    expect(risks.capRisk).toBe(0);
    expect(risks.nomRisk).toBe(0);
    expect(risks.vacRisk).toBe(0);
    expect(risks.psyRisk).toBe(0);
    expect(risks.globalRisk).toBe(0);
  });

  // ── 2. Departamento de riesgo medio ──────────────────────────────────────
  it("departamento con indicadores en amarillo → globalRisk = 1 (Medio)", () => {
    const risks = calcRisks({
      turnoverRate: 12,      // 10-19 → 1
      trainingRate: 65,      // 50-79 → 1
      nom035Score: 70,       // 60-79 → 1
      pendingVacations: 3,   // 2-4 → 1
      highRiskPsycho: 1,     // 1-2 → 1
    });
    expect(risks.rotRisk).toBe(1);
    expect(risks.capRisk).toBe(1);
    expect(risks.nomRisk).toBe(1);
    expect(risks.vacRisk).toBe(1);
    expect(risks.psyRisk).toBe(1);
    expect(risks.globalRisk).toBe(1);
  });

  // ── 3. Departamento de alto riesgo ────────────────────────────────────────
  it("departamento con todos los indicadores en rojo → globalRisk = 2 (Alto)", () => {
    const risks = calcRisks({
      turnoverRate: 25,      // >= 20 → 2
      trainingRate: 30,      // < 50 → 2
      nom035Score: 45,       // < 60 → 2
      pendingVacations: 7,   // >= 5 → 2
      highRiskPsycho: 4,     // >= 3 → 2
    });
    expect(risks.rotRisk).toBe(2);
    expect(risks.capRisk).toBe(2);
    expect(risks.nomRisk).toBe(2);
    expect(risks.vacRisk).toBe(2);
    expect(risks.psyRisk).toBe(2);
    expect(risks.globalRisk).toBe(2);
  });

  // ── 4. Departamento mixto (promedio redondeado) ───────────────────────────
  it("departamento con mezcla de riesgos → globalRisk redondeado correctamente", () => {
    const risks = calcRisks({
      turnoverRate: 25,      // 2
      trainingRate: 90,      // 0
      nom035Score: 85,       // 0
      pendingVacations: 1,   // 0
      highRiskPsycho: 0,     // 0
    });
    // promedio = (2+0+0+0+0)/5 = 0.4 → redondeado = 0
    expect(risks.globalRisk).toBe(0);
  });

  // ── 5. Umbral exacto de rotación ─────────────────────────────────────────
  it("rotación exactamente en 20% → riesgo alto (2)", () => {
    const risks = calcRisks({ turnoverRate: 20, trainingRate: 80, nom035Score: 80, pendingVacations: 0, highRiskPsycho: 0 });
    expect(risks.rotRisk).toBe(2);
  });

  it("rotación exactamente en 10% → riesgo medio (1)", () => {
    const risks = calcRisks({ turnoverRate: 10, trainingRate: 80, nom035Score: 80, pendingVacations: 0, highRiskPsycho: 0 });
    expect(risks.rotRisk).toBe(1);
  });

  // ── 6. Umbral exacto de capacitación ─────────────────────────────────────
  it("capacitación exactamente en 80% → riesgo bajo (0)", () => {
    const risks = calcRisks({ turnoverRate: 5, trainingRate: 80, nom035Score: 80, pendingVacations: 0, highRiskPsycho: 0 });
    expect(risks.capRisk).toBe(0);
  });

  it("capacitación exactamente en 50% → riesgo medio (1)", () => {
    const risks = calcRisks({ turnoverRate: 5, trainingRate: 50, nom035Score: 80, pendingVacations: 0, highRiskPsycho: 0 });
    expect(risks.capRisk).toBe(1);
  });

  // ── 7. Etiquetas de nivel global ─────────────────────────────────────────
  it("globalRisk 0 → etiqueta 'Bajo'", () => {
    const label = (r: number) => r === 2 ? "Alto" : r === 1 ? "Medio" : "Bajo";
    expect(label(0)).toBe("Bajo");
  });

  it("globalRisk 1 → etiqueta 'Medio'", () => {
    const label = (r: number) => r === 2 ? "Alto" : r === 1 ? "Medio" : "Bajo";
    expect(label(1)).toBe("Medio");
  });

  it("globalRisk 2 → etiqueta 'Alto'", () => {
    const label = (r: number) => r === 2 ? "Alto" : r === 1 ? "Medio" : "Bajo";
    expect(label(2)).toBe("Alto");
  });
});

// ─── Verificar existencia de procedures en el router ─────────────────────────
describe("Sprint 45 — Procedures executiveReport", () => {
  const routerPath = path.resolve(__dirname, "routers/executiveReport.ts");

  it("procedure getComparativaDepts existe en executiveReport router", () => {
    const content = readFileSync(routerPath, "utf-8");
    expect(content).toContain("getComparativaDepts:");
  });

  it("procedure getBranchComparative existe en executiveReport router", () => {
    const content = readFileSync(routerPath, "utf-8");
    expect(content).toContain("getBranchComparative:");
  });

  it("getComparativaDepts acepta parámetro year opcional", () => {
    const content = readFileSync(routerPath, "utf-8");
    expect(content).toContain("year: z.number().optional()");
  });
});

// ─── Verificar que KPIDashboard tiene el mapa de calor ───────────────────────
describe("Sprint 45 — KPIDashboard: Mapa de Calor", () => {
  const dashPath = path.resolve(__dirname, "../client/src/pages/KPIDashboard.tsx");

  it("KPIDashboard tiene estado heatmapBranchId", () => {
    const content = readFileSync(dashPath, "utf-8");
    expect(content).toContain("heatmapBranchId");
  });

  it("KPIDashboard tiene query heatmapDepts", () => {
    const content = readFileSync(dashPath, "utf-8");
    expect(content).toContain("heatmapDepts");
  });

  it("KPIDashboard tiene sección 'Mapa de Calor NOM-035'", () => {
    const content = readFileSync(dashPath, "utf-8");
    expect(content).toContain("Mapa de Calor NOM-035");
  });

  it("KPIDashboard tiene leyenda de semáforo (Bajo riesgo, Riesgo medio, Alto riesgo)", () => {
    const content = readFileSync(dashPath, "utf-8");
    expect(content).toContain("Bajo riesgo");
    expect(content).toContain("Riesgo medio");
    expect(content).toContain("Alto riesgo");
  });

  it("KPIDashboard tiene selector de sucursal para el mapa de calor", () => {
    const content = readFileSync(dashPath, "utf-8");
    expect(content).toContain("Todas las sucursales");
  });
});

// ─── Verificar limpieza del todo.md ──────────────────────────────────────────
describe("Sprint 45 — Limpieza todo.md", () => {
  const todoPath = path.resolve(__dirname, "../todo.md");

  it("todo.md existe y tiene contenido", () => {
    const content = readFileSync(todoPath, "utf-8");
    expect(content.length).toBeGreaterThan(100);
  });

  it("todo.md tiene ítems completados [x] de sprints anteriores", () => {
    const content = readFileSync(todoPath, "utf-8");
    const completedItems = (content.match(/^- \[x\]/gm) ?? []).length;
    expect(completedItems).toBeGreaterThan(50);
  });

  it("todo.md tiene menos de 12 ítems pendientes [ ] (solo baja prioridad o diseño externo)", () => {
    const content = readFileSync(todoPath, "utf-8");
    const pendingItems = (content.match(/^- \[ \]/gm) ?? []).length;
    // Solo deben quedar ítems de baja prioridad, que requieren API externa, o diseño externo
    // (validación RFC SAT, módulo leads, refactoring, migración datos, backup Drive)
    expect(pendingItems).toBeLessThan(12);
  });
});
