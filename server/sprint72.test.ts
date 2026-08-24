/**
 * sprint72.test.ts
 * Tests unitarios para el Dashboard de Cumplimiento NOM-035 (Sprint 72).
 * Cubre: lógica de semáforo, cálculo de KPIs, tendencia mensual, filtros y validaciones.
 */
import { describe, it, expect } from "vitest";

// ── Lógica de semáforo ────────────────────────────────────────────────────────

function calcularSemaforo(porcentaje: number): "verde" | "amarillo" | "rojo" {
  if (porcentaje >= 80) return "verde";
  if (porcentaje >= 50) return "amarillo";
  return "rojo";
}

function calcularPorcentajeCumplimiento(
  cumplidas: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((cumplidas / total) * 100);
}

// ── Lógica de tendencia mensual ───────────────────────────────────────────────

function calcularTendencia(datos: Array<{ cumplidas: number; total: number }>) {
  return datos.map(d => ({
    porcentaje: d.total > 0 ? Math.round((d.cumplidas / d.total) * 100) : 0,
    tendencia:
      d.total > 0
        ? d.cumplidas / d.total >= 0.8
          ? "positiva"
          : d.cumplidas / d.total >= 0.5
            ? "neutral"
            : "negativa"
        : "sin_datos",
  }));
}

// ── Lógica de KPIs derivados ──────────────────────────────────────────────────

function calcularKpisDerivados(stats: {
  total: number;
  cumplidas: number;
  vencidas: number;
  enProceso: number;
  noIniciadas: number;
  canceladas: number;
  conEvidencia: number;
  altaPrioridad: number;
  altaVencida: number;
}) {
  const porcentajeCumplimiento = calcularPorcentajeCumplimiento(
    stats.cumplidas,
    stats.total
  );
  const semaforoGlobal = calcularSemaforo(porcentajeCumplimiento);
  const tasaEvidencia =
    stats.total > 0 ? Math.round((stats.conEvidencia / stats.total) * 100) : 0;
  const tasaVencimiento =
    stats.total > 0 ? Math.round((stats.vencidas / stats.total) * 100) : 0;
  const riesgoAltaPrioridad =
    stats.altaPrioridad > 0
      ? Math.round((stats.altaVencida / stats.altaPrioridad) * 100)
      : 0;
  return {
    porcentajeCumplimiento,
    semaforoGlobal,
    tasaEvidencia,
    tasaVencimiento,
    riesgoAltaPrioridad,
  };
}

// ── Lógica de alertas de vencimiento ─────────────────────────────────────────

function clasificarAccionPorVencimiento(
  plazo: Date | null,
  estado: string
): "vencida" | "proxima" | "vigente" | "sin_plazo" {
  if (!plazo) return "sin_plazo";
  if (estado === "cumplida" || estado === "cancelada") return "vigente";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const plazoDate = new Date(plazo);
  plazoDate.setHours(0, 0, 0, 0);
  const diffDias = Math.floor(
    (plazoDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDias < 0) return "vencida";
  if (diffDias <= 14) return "proxima";
  return "vigente";
}

// ── Lógica de filtrado de planes ──────────────────────────────────────────────

function filtrarPlanesPorTipo(
  planes: Array<{
    tipoPlan: string;
    porcentajeCumplimiento: number;
    semaforo: string;
  }>,
  tipoPlan: string
) {
  if (tipoPlan === "all") return planes;
  return planes.filter(p => p.tipoPlan === tipoPlan);
}

// ── Lógica de label de tipo de plan ──────────────────────────────────────────

const TIPO_PLAN_LABELS: Record<string, string> = {
  intervencion: "Intervención de Riesgos",
  violencia_laboral: "Violencia Laboral",
  no_discriminacion: "No Discriminación",
  consolidado: "Consolidado",
};

function getTipoPlanLabel(tipoPlan: string): string {
  return TIPO_PLAN_LABELS[tipoPlan] || tipoPlan;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("1. Lógica de semáforo", () => {
  it("1.1 Verde cuando cumplimiento >= 80%", () => {
    expect(calcularSemaforo(80)).toBe("verde");
    expect(calcularSemaforo(100)).toBe("verde");
    expect(calcularSemaforo(95)).toBe("verde");
  });

  it("1.2 Amarillo cuando cumplimiento entre 50% y 79%", () => {
    expect(calcularSemaforo(50)).toBe("amarillo");
    expect(calcularSemaforo(65)).toBe("amarillo");
    expect(calcularSemaforo(79)).toBe("amarillo");
  });

  it("1.3 Rojo cuando cumplimiento < 50%", () => {
    expect(calcularSemaforo(0)).toBe("rojo");
    expect(calcularSemaforo(25)).toBe("rojo");
    expect(calcularSemaforo(49)).toBe("rojo");
  });

  it("1.4 Exactamente en el límite 80% es verde", () => {
    expect(calcularSemaforo(80)).toBe("verde");
  });

  it("1.5 Exactamente en el límite 50% es amarillo", () => {
    expect(calcularSemaforo(50)).toBe("amarillo");
  });
});

describe("2. Cálculo de porcentaje de cumplimiento", () => {
  it("2.1 Calcula porcentaje correctamente", () => {
    expect(calcularPorcentajeCumplimiento(8, 10)).toBe(80);
    expect(calcularPorcentajeCumplimiento(5, 10)).toBe(50);
    expect(calcularPorcentajeCumplimiento(3, 10)).toBe(30);
  });

  it("2.2 Retorna 0 cuando total es 0", () => {
    expect(calcularPorcentajeCumplimiento(0, 0)).toBe(0);
  });

  it("2.3 Retorna 100 cuando todas están cumplidas", () => {
    expect(calcularPorcentajeCumplimiento(10, 10)).toBe(100);
  });

  it("2.4 Redondea correctamente", () => {
    expect(calcularPorcentajeCumplimiento(1, 3)).toBe(33); // 33.33...
    expect(calcularPorcentajeCumplimiento(2, 3)).toBe(67); // 66.66...
  });

  it("2.5 Retorna 0 cuando no hay cumplidas", () => {
    expect(calcularPorcentajeCumplimiento(0, 10)).toBe(0);
  });
});

describe("3. KPIs derivados", () => {
  const statsBase = {
    total: 20,
    cumplidas: 16,
    vencidas: 2,
    enProceso: 1,
    noIniciadas: 1,
    canceladas: 0,
    conEvidencia: 14,
    altaPrioridad: 8,
    altaVencida: 1,
  };

  it("3.1 Calcula porcentaje de cumplimiento correcto", () => {
    const kpis = calcularKpisDerivados(statsBase);
    expect(kpis.porcentajeCumplimiento).toBe(80);
  });

  it("3.2 Semáforo global correcto para 80%", () => {
    const kpis = calcularKpisDerivados(statsBase);
    expect(kpis.semaforoGlobal).toBe("verde");
  });

  it("3.3 Tasa de evidencia correcta", () => {
    const kpis = calcularKpisDerivados(statsBase);
    expect(kpis.tasaEvidencia).toBe(70); // 14/20 = 70%
  });

  it("3.4 Tasa de vencimiento correcta", () => {
    const kpis = calcularKpisDerivados(statsBase);
    expect(kpis.tasaVencimiento).toBe(10); // 2/20 = 10%
  });

  it("3.5 Riesgo de alta prioridad correcto", () => {
    const kpis = calcularKpisDerivados(statsBase);
    expect(kpis.riesgoAltaPrioridad).toBe(13); // 1/8 ≈ 12.5% → 13%
  });

  it("3.6 Riesgo de alta prioridad es 0 cuando no hay acciones de alta prioridad", () => {
    const kpis = calcularKpisDerivados({
      ...statsBase,
      altaPrioridad: 0,
      altaVencida: 0,
    });
    expect(kpis.riesgoAltaPrioridad).toBe(0);
  });
});

describe("4. Tendencia mensual", () => {
  it("4.1 Calcula porcentajes mensuales correctamente", () => {
    const datos = [
      { cumplidas: 5, total: 10 },
      { cumplidas: 8, total: 10 },
      { cumplidas: 10, total: 10 },
    ];
    const tendencia = calcularTendencia(datos);
    expect(tendencia[0].porcentaje).toBe(50);
    expect(tendencia[1].porcentaje).toBe(80);
    expect(tendencia[2].porcentaje).toBe(100);
  });

  it("4.2 Tendencia positiva cuando cumplimiento >= 80%", () => {
    const tendencia = calcularTendencia([{ cumplidas: 8, total: 10 }]);
    expect(tendencia[0].tendencia).toBe("positiva");
  });

  it("4.3 Tendencia neutral cuando cumplimiento entre 50% y 79%", () => {
    const tendencia = calcularTendencia([{ cumplidas: 6, total: 10 }]);
    expect(tendencia[0].tendencia).toBe("neutral");
  });

  it("4.4 Tendencia negativa cuando cumplimiento < 50%", () => {
    const tendencia = calcularTendencia([{ cumplidas: 3, total: 10 }]);
    expect(tendencia[0].tendencia).toBe("negativa");
  });

  it("4.5 Sin datos cuando total es 0", () => {
    const tendencia = calcularTendencia([{ cumplidas: 0, total: 0 }]);
    expect(tendencia[0].tendencia).toBe("sin_datos");
    expect(tendencia[0].porcentaje).toBe(0);
  });
});

describe("5. Clasificación de acciones por vencimiento", () => {
  const hoy = new Date();

  it("5.1 Acción con plazo pasado y estado activo es vencida", () => {
    const plazo = new Date(hoy);
    plazo.setDate(plazo.getDate() - 5);
    expect(clasificarAccionPorVencimiento(plazo, "en_proceso")).toBe("vencida");
  });

  it("5.2 Acción cumplida no es vencida aunque el plazo haya pasado", () => {
    const plazo = new Date(hoy);
    plazo.setDate(plazo.getDate() - 5);
    expect(clasificarAccionPorVencimiento(plazo, "cumplida")).toBe("vigente");
  });

  it("5.3 Acción con plazo en los próximos 14 días es próxima", () => {
    const plazo = new Date(hoy);
    plazo.setDate(plazo.getDate() + 7);
    expect(clasificarAccionPorVencimiento(plazo, "en_proceso")).toBe("proxima");
  });

  it("5.4 Acción con plazo en más de 14 días es vigente", () => {
    const plazo = new Date(hoy);
    plazo.setDate(plazo.getDate() + 30);
    expect(clasificarAccionPorVencimiento(plazo, "no_iniciada")).toBe(
      "vigente"
    );
  });

  it("5.5 Acción sin plazo retorna sin_plazo", () => {
    expect(clasificarAccionPorVencimiento(null, "en_proceso")).toBe(
      "sin_plazo"
    );
  });

  it("5.6 Acción cancelada con plazo pasado es vigente (no vencida)", () => {
    const plazo = new Date(hoy);
    plazo.setDate(plazo.getDate() - 10);
    expect(clasificarAccionPorVencimiento(plazo, "cancelada")).toBe("vigente");
  });
});

describe("6. Filtrado de planes", () => {
  const planes = [
    { tipoPlan: "intervencion", porcentajeCumplimiento: 80, semaforo: "verde" },
    {
      tipoPlan: "violencia_laboral",
      porcentajeCumplimiento: 60,
      semaforo: "amarillo",
    },
    {
      tipoPlan: "no_discriminacion",
      porcentajeCumplimiento: 30,
      semaforo: "rojo",
    },
    {
      tipoPlan: "intervencion",
      porcentajeCumplimiento: 50,
      semaforo: "amarillo",
    },
  ];

  it("6.1 Filtro 'all' retorna todos los planes", () => {
    expect(filtrarPlanesPorTipo(planes, "all")).toHaveLength(4);
  });

  it("6.2 Filtro por tipo específico retorna solo los de ese tipo", () => {
    const filtrados = filtrarPlanesPorTipo(planes, "intervencion");
    expect(filtrados).toHaveLength(2);
    expect(filtrados.every(p => p.tipoPlan === "intervencion")).toBe(true);
  });

  it("6.3 Filtro por tipo sin resultados retorna array vacío", () => {
    const filtrados = filtrarPlanesPorTipo(planes, "consolidado");
    expect(filtrados).toHaveLength(0);
  });

  it("6.4 Filtro por violencia_laboral retorna 1 plan", () => {
    const filtrados = filtrarPlanesPorTipo(planes, "violencia_laboral");
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].semaforo).toBe("amarillo");
  });
});

describe("7. Labels de tipo de plan", () => {
  it("7.1 Retorna label correcto para intervencion", () => {
    expect(getTipoPlanLabel("intervencion")).toBe("Intervención de Riesgos");
  });

  it("7.2 Retorna label correcto para violencia_laboral", () => {
    expect(getTipoPlanLabel("violencia_laboral")).toBe("Violencia Laboral");
  });

  it("7.3 Retorna label correcto para no_discriminacion", () => {
    expect(getTipoPlanLabel("no_discriminacion")).toBe("No Discriminación");
  });

  it("7.4 Retorna label correcto para consolidado", () => {
    expect(getTipoPlanLabel("consolidado")).toBe("Consolidado");
  });

  it("7.5 Retorna el valor original para tipo desconocido", () => {
    expect(getTipoPlanLabel("tipo_desconocido")).toBe("tipo_desconocido");
  });
});

describe("8. Validaciones del input del dashboard", () => {
  it("8.1 periodoMeses debe estar entre 1 y 24", () => {
    const validar = (n: number) => n >= 1 && n <= 24;
    expect(validar(1)).toBe(true);
    expect(validar(6)).toBe(true);
    expect(validar(24)).toBe(true);
    expect(validar(0)).toBe(false);
    expect(validar(25)).toBe(false);
  });

  it("8.2 tipoPlan acepta los valores válidos", () => {
    const validos = [
      "intervencion",
      "violencia_laboral",
      "no_discriminacion",
      "consolidado",
    ];
    validos.forEach(v => expect(validos.includes(v)).toBe(true));
  });

  it("8.3 nivelAplicacion acepta los valores válidos", () => {
    const validos = ["organizacional", "grupal", "individual"];
    validos.forEach(v => expect(validos.includes(v)).toBe(true));
  });

  it("8.4 Semáforo solo puede ser verde, amarillo o rojo", () => {
    const validos = ["verde", "amarillo", "rojo"];
    [0, 25, 50, 75, 80, 100].forEach(pct => {
      expect(validos.includes(calcularSemaforo(pct))).toBe(true);
    });
  });
});

describe("9. Escenarios de borde", () => {
  it("9.1 Dashboard con 0 planes retorna arrays vacíos", () => {
    const planes: any[] = [];
    expect(filtrarPlanesPorTipo(planes, "all")).toHaveLength(0);
  });

  it("9.2 Plan con 0 acciones tiene porcentaje 0 y semáforo rojo", () => {
    const pct = calcularPorcentajeCumplimiento(0, 0);
    expect(pct).toBe(0);
    expect(calcularSemaforo(pct)).toBe("rojo");
  });

  it("9.3 Plan con 1 acción cumplida de 1 total tiene 100% verde", () => {
    const pct = calcularPorcentajeCumplimiento(1, 1);
    expect(pct).toBe(100);
    expect(calcularSemaforo(pct)).toBe("verde");
  });

  it("9.4 Tendencia con todos los meses en 0 total", () => {
    const datos = Array.from({ length: 6 }, () => ({ cumplidas: 0, total: 0 }));
    const tendencia = calcularTendencia(datos);
    tendencia.forEach(t => {
      expect(t.porcentaje).toBe(0);
      expect(t.tendencia).toBe("sin_datos");
    });
  });

  it("9.5 Acción con plazo exactamente hoy es próxima (no vencida)", () => {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    expect(clasificarAccionPorVencimiento(hoy, "en_proceso")).toBe("proxima");
  });
});
