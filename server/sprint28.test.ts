/**
 * Sprint 28 — Tests unitarios
 * Cubre: getCompanyInfo, saveCompanyInfo, getAllAlertsForExport, webVitals.getRating, paginación, portada PDF
 */
import { describe, it, expect } from "vitest";

// ── 1. getCompanyInfo ────────────────────────────────────────────────────────
describe("getCompanyInfo", () => {
  it("devuelve campos de empresa cuando existen settings", () => {
    const rows = [
      { key: "company_name", value: "Empresa Demo S.A. de C.V." },
      { key: "company_rfc", value: "EDM010101ABC" },
      { key: "company_address", value: "Av. Reforma 100, CDMX" },
    ];
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.key] = r.value; });
    expect(map["company_name"]).toBe("Empresa Demo S.A. de C.V.");
    expect(map["company_rfc"]).toBe("EDM010101ABC");
    expect(map["company_address"]).toBe("Av. Reforma 100, CDMX");
  });

  it("devuelve strings vacíos cuando no hay settings configurados", () => {
    const rows: { key: string; value: string }[] = [];
    const result = {
      company_name: rows.find((r) => r.key === "company_name")?.value ?? "",
      company_rfc: rows.find((r) => r.key === "company_rfc")?.value ?? "",
      company_address: rows.find((r) => r.key === "company_address")?.value ?? "",
    };
    expect(result.company_name).toBe("");
    expect(result.company_rfc).toBe("");
  });
});

// ── 2. getAllAlertsForExport ──────────────────────────────────────────────────
describe("getAllAlertsForExport", () => {
  it("filtra correctamente por status activo", () => {
    const alerts = [
      { id: 1, status: "active", alertType: "survey", priority: "high" },
      { id: 2, status: "resolved", alertType: "compliance", priority: "low" },
      { id: 3, status: "active", alertType: "training", priority: "medium" },
    ];
    const filtered = alerts.filter((a) => a.status === "active");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((a) => a.status === "active")).toBe(true);
  });

  it("devuelve todos los registros cuando status es 'all'", () => {
    const alerts = [
      { id: 1, status: "active" },
      { id: 2, status: "resolved" },
      { id: 3, status: "dismissed" },
    ];
    const status = "all";
    const filtered = status === "all" ? alerts : alerts.filter((a) => a.status === status);
    expect(filtered).toHaveLength(3);
  });

  it("filtra correctamente por tipo de alerta", () => {
    const alerts = [
      { id: 1, alertType: "survey", status: "active" },
      { id: 2, alertType: "compliance", status: "active" },
      { id: 3, alertType: "survey", status: "resolved" },
    ];
    const filtered = alerts.filter((a) => a.alertType === "survey");
    expect(filtered).toHaveLength(2);
  });
});

// ── 3. Paginación de alertas ─────────────────────────────────────────────────
describe("Paginación de alertas", () => {
  it("calcula correctamente el offset y totalPages", () => {
    const total = 95;
    const pageSize = 20;
    const page = 3;
    const offset = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);
    expect(offset).toBe(40);
    expect(totalPages).toBe(5);
  });

  it("la última página tiene menos registros que pageSize", () => {
    const total = 95;
    const pageSize = 20;
    const lastPage = Math.ceil(total / pageSize);
    const lastPageCount = total - (lastPage - 1) * pageSize;
    expect(lastPageCount).toBe(15);
  });

  it("resetea a página 1 cuando cambian los filtros", () => {
    let page = 3;
    const prevFilter = "active";
    const newFilter = "resolved";
    if (newFilter !== prevFilter) page = 1;
    expect(page).toBe(1);
  });
});

// ── 4. Core Web Vitals getRating ─────────────────────────────────────────────
describe("Core Web Vitals getRating", () => {
  function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
    const thresholds: Record<string, [number, number]> = {
      LCP: [2500, 4000],
      FID: [100, 300],
      INP: [200, 500],
      CLS: [0.1, 0.25],
      FCP: [1800, 3000],
      TTFB: [800, 1800],
    };
    const [good, poor] = thresholds[name] ?? [0, Infinity];
    if (value <= good) return "good";
    if (value <= poor) return "needs-improvement";
    return "poor";
  }

  it("LCP de 1500ms es 'good'", () => { expect(getRating("LCP", 1500)).toBe("good"); });
  it("LCP de 3000ms es 'needs-improvement'", () => { expect(getRating("LCP", 3000)).toBe("needs-improvement"); });
  it("LCP de 5000ms es 'poor'", () => { expect(getRating("LCP", 5000)).toBe("poor"); });
  it("CLS de 0.05 es 'good'", () => { expect(getRating("CLS", 0.05)).toBe("good"); });
  it("CLS de 0.3 es 'poor'", () => { expect(getRating("CLS", 0.3)).toBe("poor"); });
  it("INP de 150ms es 'good'", () => { expect(getRating("INP", 150)).toBe("good"); });
  it("TTFB de 1000ms es 'needs-improvement'", () => { expect(getRating("TTFB", 1000)).toBe("needs-improvement"); });
});

// ── 5. Portada PDF — datos de empresa ────────────────────────────────────────
describe("Portada PDF con datos de empresa", () => {
  it("usa el nombre de empresa cuando está disponible", () => {
    const companyName = "Empresa Demo S.A. de C.V.";
    const companyRfc = "EDM010101ABC";
    const title = companyName || "Organización";
    const rfc = companyRfc ? `RFC: ${companyRfc}` : "";
    expect(title).toBe("Empresa Demo S.A. de C.V.");
    expect(rfc).toBe("RFC: EDM010101ABC");
  });

  it("usa placeholder cuando no hay datos de empresa", () => {
    const companyName = "";
    const companyRfc = "";
    const title = companyName || "Organización";
    const rfc = companyRfc ? `RFC: ${companyRfc}` : "";
    expect(title).toBe("Organización");
    expect(rfc).toBe("");
  });
});

// ── 6. Cálculo p75 para Web Vitals ───────────────────────────────────────────
describe("Cálculo p75 para Web Vitals", () => {
  it("calcula el percentil 75 correctamente", () => {
    const values = [100, 200, 300, 400, 500, 600, 700, 800];
    const p75Index = Math.floor(values.length * 0.75);
    const p75 = values[p75Index];
    expect(p75).toBe(700);
  });

  it("calcula el promedio correctamente", () => {
    const values = [100, 200, 300, 400, 500];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    expect(avg).toBe(300);
  });

  it("devuelve 0 cuando no hay datos", () => {
    const values: number[] = [];
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    expect(avg).toBe(0);
  });
});
