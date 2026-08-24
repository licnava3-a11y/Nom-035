import { describe, it, expect } from "vitest";

/**
 * Tests unitarios para el Panel de Despachos Globales (Sprint 66).
 * Se prueban las funciones de lógica pura: cálculo de stats, filtrado
 * en memoria, paginación y rangos de fechas por período.
 */

// ── Helpers de lógica del procedimiento getAllDispatches ──────────────────────

function computeStats(allForCount: { status: string; readAt: Date | null }[]) {
  const totalCount = allForCount.length;
  const readCount = allForCount.filter(d => d.readAt !== null).length;
  const sentCount = allForCount.filter(d => d.status === "sent").length;
  const bouncedCount = allForCount.filter(d => d.status === "bounced").length;
  const readRate =
    totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
  return {
    total: totalCount,
    read: readCount,
    unread: totalCount - readCount - bouncedCount,
    bounced: bouncedCount,
    sent: sentCount,
    readRate,
  };
}

function filterDispatches(
  dispatches: {
    recipientName?: string | null;
    minuteTitle?: string | null;
    minuteFolio?: string | null;
    recipientEmail?: string | null;
  }[],
  search: string
) {
  if (!search || search.trim() === "") return dispatches;
  const term = search.toLowerCase().trim();
  return dispatches.filter(
    d =>
      (d.recipientName ?? "").toLowerCase().includes(term) ||
      (d.minuteTitle ?? "").toLowerCase().includes(term) ||
      (d.minuteFolio ?? "").toLowerCase().includes(term) ||
      (d.recipientEmail ?? "").toLowerCase().includes(term)
  );
}

function computePagination(total: number, page: number, pageSize: number) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    offset: (page - 1) * pageSize,
  };
}

function getPeriodDates(
  period: string,
  now: Date
): { dateFrom: string | null; dateTo: string | null } {
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  switch (period) {
    case "today":
      return { dateFrom: fmt(now), dateTo: fmt(now) };
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { dateFrom: fmt(start), dateTo: fmt(now) };
    }
    case "month":
      return {
        dateFrom: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        dateTo: fmt(now),
      };
    case "prev_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: fmt(first), dateTo: fmt(last) };
    }
    case "year":
      return {
        dateFrom: fmt(new Date(now.getFullYear(), 0, 1)),
        dateTo: fmt(now),
      };
    default:
      return { dateFrom: null, dateTo: null };
  }
}

function buildEndDate(dateTo: string): Date {
  const endDate = new Date(dateTo);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Panel de Despachos Globales — computeStats", () => {
  it("debería retornar stats vacíos cuando no hay despachos", () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.read).toBe(0);
    expect(stats.unread).toBe(0);
    expect(stats.bounced).toBe(0);
    expect(stats.sent).toBe(0);
    expect(stats.readRate).toBe(0);
  });

  it("debería calcular stats correctamente con despachos mixtos", () => {
    const data = [
      { status: "sent", readAt: null },
      { status: "read", readAt: new Date() },
      { status: "read", readAt: new Date() },
      { status: "bounced", readAt: null },
      { status: "sent", readAt: null },
    ];
    const stats = computeStats(data);
    expect(stats.total).toBe(5);
    expect(stats.read).toBe(2);
    expect(stats.sent).toBe(2);
    expect(stats.bounced).toBe(1);
    expect(stats.unread).toBe(2); // total - read - bounced = 5 - 2 - 1 = 2
    expect(stats.readRate).toBe(40);
  });

  it("debería calcular tasa de lectura 100% cuando todos están leídos", () => {
    const data = [
      { status: "read", readAt: new Date() },
      { status: "read", readAt: new Date() },
      { status: "read", readAt: new Date() },
    ];
    const stats = computeStats(data);
    expect(stats.readRate).toBe(100);
    expect(stats.unread).toBe(0);
    expect(stats.bounced).toBe(0);
  });

  it("debería calcular tasa de lectura 0% cuando ninguno está leído", () => {
    const data = [
      { status: "sent", readAt: null },
      { status: "sent", readAt: null },
    ];
    const stats = computeStats(data);
    expect(stats.readRate).toBe(0);
    expect(stats.read).toBe(0);
  });

  it("debería redondear la tasa de lectura correctamente", () => {
    const data = [
      { status: "read", readAt: new Date() },
      { status: "sent", readAt: null },
      { status: "sent", readAt: null },
    ];
    const stats = computeStats(data);
    // 1/3 = 33.33... → redondeado a 33
    expect(stats.readRate).toBe(33);
  });
});

describe("Panel de Despachos Globales — filterDispatches", () => {
  const dispatches = [
    {
      recipientName: "Juan Pérez",
      minuteTitle: "Reunión Mensual",
      minuteFolio: "MIN-001/2026",
      recipientEmail: "juan@empresa.com",
    },
    {
      recipientName: "María García",
      minuteTitle: "Junta de Trabajo",
      minuteFolio: "MIN-002/2026",
      recipientEmail: "maria@empresa.com",
    },
    {
      recipientName: "Carlos López",
      minuteTitle: "Reunión Mensual",
      minuteFolio: "MIN-001/2026",
      recipientEmail: "carlos@empresa.com",
    },
  ];

  it("debería retornar todos los resultados con búsqueda vacía", () => {
    expect(filterDispatches(dispatches, "")).toHaveLength(3);
    expect(filterDispatches(dispatches, "  ")).toHaveLength(3);
  });

  it("debería filtrar por nombre del destinatario", () => {
    const result = filterDispatches(dispatches, "juan");
    expect(result).toHaveLength(1);
    expect(result[0].recipientName).toBe("Juan Pérez");
  });

  it("debería filtrar por folio de minuta", () => {
    const result = filterDispatches(dispatches, "min-002");
    expect(result).toHaveLength(1);
    expect(result[0].minuteFolio).toBe("MIN-002/2026");
  });

  it("debería filtrar por título de minuta (múltiples resultados)", () => {
    const result = filterDispatches(dispatches, "reunión mensual");
    expect(result).toHaveLength(2);
  });

  it("debería filtrar por correo electrónico", () => {
    const result = filterDispatches(dispatches, "maria@empresa.com");
    expect(result).toHaveLength(1);
    expect(result[0].recipientName).toBe("María García");
  });

  it("debería ser insensible a mayúsculas/minúsculas", () => {
    const result = filterDispatches(dispatches, "JUAN");
    expect(result).toHaveLength(1);
    expect(result[0].recipientName).toBe("Juan Pérez");
  });

  it("debería retornar arreglo vacío si no hay coincidencias", () => {
    const result = filterDispatches(dispatches, "zzz_no_existe");
    expect(result).toHaveLength(0);
  });
});

describe("Panel de Despachos Globales — computePagination", () => {
  it("debería calcular paginación correctamente para página 3 de 127 registros", () => {
    const p = computePagination(127, 3, 25);
    expect(p.totalPages).toBe(6);
    expect(p.offset).toBe(50);
  });

  it("debería calcular paginación con exactamente un múltiplo del pageSize", () => {
    const p = computePagination(100, 1, 25);
    expect(p.totalPages).toBe(4);
    expect(p.offset).toBe(0);
  });

  it("debería calcular paginación con un solo registro", () => {
    const p = computePagination(1, 1, 25);
    expect(p.totalPages).toBe(1);
    expect(p.offset).toBe(0);
  });

  it("debería calcular paginación con cero registros", () => {
    const p = computePagination(0, 1, 25);
    expect(p.totalPages).toBe(0);
    expect(p.offset).toBe(0);
  });

  it("debería calcular offset correctamente para la última página", () => {
    const p = computePagination(127, 6, 25);
    expect(p.offset).toBe(125);
  });
});

describe("Panel de Despachos Globales — getPeriodDates", () => {
  const now = new Date("2026-05-28T12:00:00Z");

  it("debería retornar fecha de hoy para período 'today'", () => {
    const { dateFrom, dateTo } = getPeriodDates("today", now);
    expect(dateFrom).toBe("2026-05-28");
    expect(dateTo).toBe("2026-05-28");
  });

  it("debería retornar inicio del mes para período 'month'", () => {
    const { dateFrom } = getPeriodDates("month", now);
    expect(dateFrom).toBe("2026-05-01");
  });

  it("debería retornar inicio del año para período 'year'", () => {
    const { dateFrom } = getPeriodDates("year", now);
    expect(dateFrom).toBe("2026-01-01");
  });

  it("debería retornar mes anterior completo para período 'prev_month'", () => {
    const { dateFrom, dateTo } = getPeriodDates("prev_month", now);
    expect(dateFrom).toBe("2026-04-01");
    expect(dateTo).toBe("2026-04-30");
  });

  it("debería retornar nulls para período 'all'", () => {
    const { dateFrom, dateTo } = getPeriodDates("all", now);
    expect(dateFrom).toBeNull();
    expect(dateTo).toBeNull();
  });

  it("debería retornar nulls para período desconocido", () => {
    const { dateFrom, dateTo } = getPeriodDates("unknown_period", now);
    expect(dateFrom).toBeNull();
    expect(dateTo).toBeNull();
  });
});

describe("Panel de Despachos Globales — buildEndDate", () => {
  it("debería establecer la hora al final del día", () => {
    const endDate = buildEndDate("2026-05-28");
    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
    expect(endDate.getSeconds()).toBe(59);
    expect(endDate.getMilliseconds()).toBe(999);
  });

  it("debería mantener la fecha correcta", () => {
    const endDate = buildEndDate("2026-01-15");
    expect(endDate.getFullYear()).toBe(2026);
    expect(endDate.getMonth()).toBe(0); // enero
    expect(endDate.getDate()).toBe(15);
  });
});
