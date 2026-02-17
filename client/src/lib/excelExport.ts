import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MetricsData {
  totalEvents: number;
  totalConverted: number;
  conversionRate: number;
}

interface ComparisonData {
  current: MetricsData;
  comparison: MetricsData;
  changes: {
    totalEvents: { absolute: number; percentage: number };
    totalConverted: { absolute: number; percentage: number };
    conversionRate: { absolute: number; percentage: number };
  };
}

interface EventData {
  id: string;
  eventType: string;
  normativas: string[];
  createdAt: Date;
  userId?: string;
  conversionStatus: string;
}

interface NormativaData {
  normativa: string;
  count: number;
}

export interface ExportData {
  comparisonData?: ComparisonData;
  currentEvents: EventData[];
  comparisonEvents: EventData[];
  currentNormativas: NormativaData[];
  comparisonNormativas: NormativaData[];
  dateRange: { from?: Date; to?: Date };
  comparisonDateRange: { from?: Date; to?: Date };
}

export function exportComparisonToExcel(data: ExportData) {
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Métricas Comparativas
  if (data.comparisonData) {
    const metricsData = [
      ["Métricas de Conversión WhatsApp - Comparación"],
      [],
      ["Período Actual:", data.dateRange.from && data.dateRange.to 
        ? `${format(data.dateRange.from, "PPP", { locale: es })} - ${format(data.dateRange.to, "PPP", { locale: es })}`
        : "N/A"],
      ["Período de Comparación:", data.comparisonDateRange.from && data.comparisonDateRange.to
        ? `${format(data.comparisonDateRange.from, "PPP", { locale: es })} - ${format(data.comparisonDateRange.to, "PPP", { locale: es })}`
        : "N/A"],
      [],
      ["Métrica", "Período Actual", "Período Comparación", "Cambio Absoluto", "Cambio %"],
      [
        "Total de Clics",
        data.comparisonData.current.totalEvents,
        data.comparisonData.comparison.totalEvents,
        data.comparisonData.changes.totalEvents.absolute,
        `${data.comparisonData.changes.totalEvents.percentage.toFixed(2)}%`,
      ],
      [
        "Conversiones",
        data.comparisonData.current.totalConverted,
        data.comparisonData.comparison.totalConverted,
        data.comparisonData.changes.totalConverted.absolute,
        `${data.comparisonData.changes.totalConverted.percentage.toFixed(2)}%`,
      ],
      [
        "Tasa de Conversión",
        `${data.comparisonData.current.conversionRate.toFixed(2)}%`,
        `${data.comparisonData.comparison.conversionRate.toFixed(2)}%`,
        `${data.comparisonData.changes.conversionRate.absolute.toFixed(2)} p.p.`,
        `${data.comparisonData.changes.conversionRate.percentage.toFixed(2)}%`,
      ],
    ];

    const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
    
    // Aplicar estilos (ancho de columnas)
    metricsSheet["!cols"] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(workbook, metricsSheet, "Métricas Comparativas");
  }

  // Hoja 2: Eventos del Período Actual
  if (data.currentEvents.length > 0) {
    const currentEventsData = [
      ["Eventos - Período Actual"],
      [],
      ["ID", "Tipo de Evento", "Normativas", "Fecha", "Usuario", "Estado"],
      ...data.currentEvents.map(event => [
        event.id,
        event.eventType,
        event.normativas.join(", "),
        format(new Date(event.createdAt), "PPP HH:mm", { locale: es }),
        event.userId || "Anónimo",
        event.conversionStatus,
      ]),
    ];

    const currentEventsSheet = XLSX.utils.aoa_to_sheet(currentEventsData);
    currentEventsSheet["!cols"] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(workbook, currentEventsSheet, "Eventos Actuales");
  }

  // Hoja 3: Eventos del Período de Comparación
  if (data.comparisonEvents.length > 0) {
    const comparisonEventsData = [
      ["Eventos - Período de Comparación"],
      [],
      ["ID", "Tipo de Evento", "Normativas", "Fecha", "Usuario", "Estado"],
      ...data.comparisonEvents.map(event => [
        event.id,
        event.eventType,
        event.normativas.join(", "),
        format(new Date(event.createdAt), "PPP HH:mm", { locale: es }),
        event.userId || "Anónimo",
        event.conversionStatus,
      ]),
    ];

    const comparisonEventsSheet = XLSX.utils.aoa_to_sheet(comparisonEventsData);
    comparisonEventsSheet["!cols"] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(workbook, comparisonEventsSheet, "Eventos Comparación");
  }

  // Hoja 4: Distribución de Normativas Comparativa
  if (data.currentNormativas.length > 0 || data.comparisonNormativas.length > 0) {
    // Combinar normativas de ambos períodos
    const allNormativas = Array.from(new Set([
      ...data.currentNormativas.map(n => n.normativa),
      ...data.comparisonNormativas.map(n => n.normativa),
    ]));

    const normativasData = [
      ["Distribución de Normativas - Comparación"],
      [],
      ["Normativa", "Período Actual", "Período Comparación", "Diferencia"],
      ...allNormativas.map(normativa => {
        const currentCount = data.currentNormativas.find(n => n.normativa === normativa)?.count || 0;
        const comparisonCount = data.comparisonNormativas.find(n => n.normativa === normativa)?.count || 0;
        const difference = currentCount - comparisonCount;
        
        return [
          normativa,
          currentCount,
          comparisonCount,
          difference,
        ];
      }),
    ];

    const normativasSheet = XLSX.utils.aoa_to_sheet(normativasData);
    normativasSheet["!cols"] = [
      { wch: 35 },
      { wch: 18 },
      { wch: 22 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(workbook, normativasSheet, "Normativas");
  }

  // Generar y descargar archivo
  const fileName = `comparacion_whatsapp_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
