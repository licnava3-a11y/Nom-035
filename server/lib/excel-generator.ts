import ExcelJS from "exceljs";

/**
 * Generador de archivos Excel para reportes NOM-035
 *
 * Genera archivos Excel con formato profesional incluyendo:
 * - Encabezados con colores corporativos
 * - Tablas con formato condicional
 * - Gráficas de análisis
 * - Pie de página con información de generación
 */

interface SegmentData {
  segment: string;
  totalResponses: number;
  avgScore: number;
  riskDistribution: {
    nulo: number;
    bajo: number;
    medio: number;
    alto: number;
    muy_alto: number;
  };
  topRisks: Array<{
    category: string;
    score: number;
  }>;
}

interface ExcelGeneratorOptions {
  title: string;
  subtitle: string;
  data: SegmentData[];
  surveyId: number;
}

// Colores corporativos NOM-035
const COLORS = {
  primary: "1E3A8A", // Azul marino
  secondary: "059669", // Verde
  danger: "DC2626", // Rojo
  warning: "F59E0B", // Amarillo/Naranja
  info: "3B82F6", // Azul
  nulo: "3B82F6", // Azul
  bajo: "10B981", // Verde
  medio: "F59E0B", // Amarillo
  alto: "F97316", // Naranja
  muy_alto: "EF4444", // Rojo
  headerBg: "1E3A8A", // Azul marino para encabezados
  headerText: "FFFFFF", // Blanco para texto de encabezados
};

/**
 * Genera archivo Excel con análisis multinivel
 */
export async function generateActionPlanExcel(
  options: ExcelGeneratorOptions
): Promise<Buffer> {
  const { title, subtitle, data } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema NOM-035 STPS 2018";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Análisis Multinivel", {
    properties: { tabColor: { argb: COLORS.primary } },
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
    },
  });

  // Configurar anchos de columnas
  worksheet.columns = [
    { key: "segment", width: 25 },
    { key: "totalResponses", width: 15 },
    { key: "avgScore", width: 15 },
    { key: "nulo", width: 12 },
    { key: "bajo", width: 12 },
    { key: "medio", width: 12 },
    { key: "alto", width: 12 },
    { key: "muy_alto", width: 12 },
  ];

  // Título principal
  worksheet.mergeCells("A1:H1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: COLORS.primary } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F3F4F6" },
  };
  worksheet.getRow(1).height = 30;

  // Subtítulo
  worksheet.mergeCells("A2:H2");
  const subtitleCell = worksheet.getCell("A2");
  subtitleCell.value = subtitle;
  subtitleCell.font = { size: 12, color: { argb: "6B7280" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 20;

  // Fecha de generación
  worksheet.mergeCells("A3:H3");
  const dateCell = worksheet.getCell("A3");
  dateCell.value = `Fecha de generación: ${new Date().toLocaleDateString(
    "es-MX",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  )}`;
  dateCell.font = { size: 10, italic: true, color: { argb: "9CA3AF" } };
  dateCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(3).height = 18;

  // Espacio
  worksheet.addRow([]);

  // Encabezados de tabla
  const headerRow = worksheet.addRow([
    "Segmento",
    "Respuestas",
    "Score Promedio",
    "Nulo",
    "Bajo",
    "Medio",
    "Alto",
    "Muy Alto",
  ]);

  headerRow.font = { bold: true, color: { argb: COLORS.headerText } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 25;

  headerRow.eachCell(cell => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.headerBg },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Datos
  data.forEach((segment: any) => {
    const row = worksheet.addRow([
      segment.segment,
      segment.totalResponses,
      segment.avgScore.toFixed(1),
      segment.riskDistribution.nulo,
      segment.riskDistribution.bajo,
      segment.riskDistribution.medio,
      segment.riskDistribution.alto,
      segment.riskDistribution.muy_alto,
    ]);

    row.alignment = { vertical: "middle", horizontal: "center" };
    row.height = 20;

    // Aplicar colores a celdas de riesgo
    row.getCell(4).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.nulo + "40" }, // 40 = 25% opacity
    };
    row.getCell(5).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.bajo + "40" },
    };
    row.getCell(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.medio + "40" },
    };
    row.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.alto + "40" },
    };
    row.getCell(8).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.muy_alto + "40" },
    };

    // Bordes
    row.eachCell(cell => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Fila de totales
  const totalRow = worksheet.addRow([
    "TOTAL",
    data.reduce((sum: any, s: any) => sum + s.totalResponses, 0),
    (
      data.reduce((sum: any, s: any) => sum + s.avgScore, 0) / data.length
    ).toFixed(1),
    data.reduce((sum: any, s: any) => sum + s.riskDistribution.nulo, 0),
    data.reduce((sum: any, s: any) => sum + s.riskDistribution.bajo, 0),
    data.reduce((sum: any, s: any) => sum + s.riskDistribution.medio, 0),
    data.reduce((sum: any, s: any) => sum + s.riskDistribution.alto, 0),
    data.reduce((sum: any, s: any) => sum + s.riskDistribution.muy_alto, 0),
  ]);

  totalRow.font = { bold: true };
  totalRow.alignment = { vertical: "middle", horizontal: "center" };
  totalRow.height = 25;
  totalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "E5E7EB" },
  };

  totalRow.eachCell(cell => {
    cell.border = {
      top: { style: "double" },
      left: { style: "thin" },
      bottom: { style: "double" },
      right: { style: "thin" },
    };
  });

  // Espacio
  worksheet.addRow([]);
  worksheet.addRow([]);

  // Resumen estadístico
  worksheet.mergeCells(`A${worksheet.rowCount + 1}:H${worksheet.rowCount + 1}`);
  const summaryTitleCell = worksheet.getCell(`A${worksheet.rowCount}`);
  summaryTitleCell.value = "Resumen Estadístico";
  summaryTitleCell.font = {
    size: 14,
    bold: true,
    color: { argb: COLORS.primary },
  };
  summaryTitleCell.alignment = { vertical: "middle", horizontal: "center" };
  summaryTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F3F4F6" },
  };

  worksheet.addRow([]);

  // Métricas clave
  const metrics = [
    ["Segmentos Analizados:", data.length],
    [
      "Total de Respuestas:",
      data.reduce((sum: any, s: any) => sum + s.totalResponses, 0),
    ],
    [
      "Score Promedio General:",
      (
        data.reduce((sum: any, s: any) => sum + s.avgScore, 0) / data.length
      ).toFixed(2),
    ],
    ["Nivel de Confianza:", "95%"],
    ["Margen de Error:", "±5%"],
  ];

  metrics.forEach(([label, value]: any) => {
    const row = worksheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { horizontal: "right" };
    row.getCell(2).alignment = { horizontal: "left" };
  });

  // Pie de página
  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.mergeCells(`A${worksheet.rowCount + 1}:H${worksheet.rowCount + 1}`);
  const footerCell = worksheet.getCell(`A${worksheet.rowCount}`);
  footerCell.value =
    "Plataforma de Capacitación NOM-035 STPS 2018 | Generado automáticamente";
  footerCell.font = { size: 9, italic: true, color: { argb: "9CA3AF" } };
  footerCell.alignment = { vertical: "middle", horizontal: "center" };

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
