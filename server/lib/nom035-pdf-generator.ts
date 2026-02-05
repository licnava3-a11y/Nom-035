import PDFDocument from 'pdfkit';
import { storagePut } from '../storage';

/**
 * Generador de Reportes PDF Consolidados NOM-035
 * 
 * Genera reportes profesionales en PDF con gráficas y análisis multinivel
 * de los resultados de las encuestas NOM-035 (Guías I, II y III).
 */

interface SurveyResult {
  surveyTitle: string;
  surveyType: string;
  totalResponses: number;
  riskDistribution: {
    nulo: number;
    bajo: number;
    medio: number;
    alto: number;
    muyAlto: number;
  };
  averageScore: number;
  recommendations: string[];
}

interface MultilevelAnalysis {
  level: string;
  segments: Array<{
    name: string;
    totalResponses: number;
    averageScore: number;
    riskDistribution: {
      nulo: number;
      bajo: number;
      medio: number;
      alto: number;
      muyAlto: number;
    };
  }>;
}

interface ConsolidatedReportData {
  companyName: string;
  reportDate: Date;
  surveyResults: SurveyResult[];
  multilevelAnalysis: MultilevelAnalysis[];
}

// Colores oficiales NOM-035
const COLORS = {
  nulo: '#10B981',     // Verde
  bajo: '#3B82F6',     // Azul
  medio: '#F59E0B',    // Amarillo
  alto: '#F97316',     // Naranja
  muyAlto: '#EF4444',  // Rojo
  primary: '#1E3A8A',  // Azul marino
  secondary: '#6B7280',// Gris
};

/**
 * Genera tabla de distribución de riesgo (alternativa ligera a gráfica)
 */
function addRiskDistributionTable(
  doc: PDFKit.PDFDocument,
  distribution: { nulo: number; bajo: number; medio: number; alto: number; muyAlto: number },
  yPosition: number
): number {
  const tableData = [
    { nivel: 'Nulo', cantidad: distribution.nulo, color: COLORS.nulo },
    { nivel: 'Bajo', cantidad: distribution.bajo, color: COLORS.bajo },
    { nivel: 'Medio', cantidad: distribution.medio, color: COLORS.medio },
    { nivel: 'Alto', cantidad: distribution.alto, color: COLORS.alto },
    { nivel: 'Muy Alto', cantidad: distribution.muyAlto, color: COLORS.muyAlto },
  ];

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('Distribución de Riesgo:', 50, yPosition);
  yPosition += 20;

  doc.fontSize(10).font('Helvetica');
  tableData.forEach((row) => {
    doc.fillColor(row.color).circle(60, yPosition + 5, 5).fill();
    doc.fillColor('#000000').text(`${row.nivel}: ${row.cantidad} respuestas (${((row.cantidad / (distribution.nulo + distribution.bajo + distribution.medio + distribution.alto + distribution.muyAlto)) * 100).toFixed(1)}%)`, 75, yPosition);
    yPosition += 20;
  });

  return yPosition + 10;
}



/**
 * Agrega encabezado al PDF
 */
function addHeader(doc: PDFKit.PDFDocument, companyName: string, reportDate: Date) {
  // Fondo azul para encabezado
  doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);

  // Título
  doc.fillColor('#FFFFFF')
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('Reporte Consolidado NOM-035 STPS 2018', 50, 25);

  // Información de empresa y fecha
  doc.fontSize(12)
    .font('Helvetica')
    .text(companyName, 50, 55)
    .text(`Fecha: ${reportDate.toLocaleDateString('es-MX')}`, doc.page.width - 200, 55);

  doc.moveDown(3);
}

/**
 * Agrega pie de página al PDF
 */
function addFooter(doc: PDFKit.PDFDocument, pageNumber: number) {
  const bottomY = doc.page.height - 50;
  
  doc.fontSize(10)
    .fillColor(COLORS.secondary)
    .text(
      `Página ${pageNumber} | Generado por Sistema de Gestión NOM-035 | ${new Date().toLocaleDateString('es-MX')}`,
      50,
      bottomY,
      { align: 'center', width: doc.page.width - 100 }
    );
}

/**
 * Agrega sección de resultados por encuesta
 */
async function addSurveyResultsSection(doc: PDFKit.PDFDocument, surveyResults: SurveyResult[]) {
  doc.fillColor('#000000')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('Resultados por Encuesta', 50, doc.y);

  doc.moveDown(1);

  for (const result of surveyResults) {
    // Título de encuesta
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(COLORS.primary)
      .text(result.surveyTitle, 50, doc.y);

    doc.moveDown(0.5);

    // Información general
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#000000')
      .text(`Total de respuestas: ${result.totalResponses}`, 50, doc.y)
      .text(`Puntaje promedio: ${result.averageScore.toFixed(2)}`, 50, doc.y);

    doc.moveDown(1);

    // Tabla de distribución de riesgo
    const newY = addRiskDistributionTable(doc, result.riskDistribution, doc.y);
    doc.y = newY;

    doc.moveDown(1);

    // Recomendaciones
    if (result.recommendations.length > 0) {
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('Recomendaciones:', 50, doc.y);

      doc.moveDown(0.5);

      doc.fontSize(10)
        .font('Helvetica');

      result.recommendations.forEach((rec, index) => {
        doc.text(`${index + 1}. ${rec}`, 70, doc.y, { width: doc.page.width - 140 });
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(2);

    // Nueva página si es necesario
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }
  }
}

/**
 * Agrega sección de análisis multinivel
 */
async function addMultilevelAnalysisSection(doc: PDFKit.PDFDocument, multilevelAnalysis: MultilevelAnalysis[]) {
  doc.addPage();

  doc.fillColor('#000000')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('Análisis Multinivel', 50, 50);

  doc.moveDown(1);

  for (const analysis of multilevelAnalysis) {
    // Título del nivel
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(COLORS.primary)
      .text(analysis.level, 50, doc.y);

    doc.moveDown(1);

    // Tabla de datos
    if (analysis.segments.length > 0) {

      // Tabla de datos
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Detalle por Segmento:', 50, doc.y);

      doc.moveDown(0.5);

      // Encabezados de tabla
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 250;
      const col3 = 350;
      const col4 = 450;

      doc.fontSize(10)
        .font('Helvetica-Bold')
        .text('Segmento', col1, tableTop)
        .text('Respuestas', col2, tableTop)
        .text('Promedio', col3, tableTop)
        .text('Riesgo Alto+', col4, tableTop);

      doc.moveDown(0.5);

      // Línea separadora
      doc.moveTo(col1, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();

      doc.moveDown(0.5);

      // Datos de tabla
      doc.font('Helvetica');
      analysis.segments.forEach((segment) => {
        const riesgoAlto = segment.riskDistribution.alto + segment.riskDistribution.muyAlto;
        
        doc.text(segment.name.substring(0, 25), col1, doc.y)
          .text(segment.totalResponses.toString(), col2, doc.y)
          .text(segment.averageScore.toFixed(1), col3, doc.y)
          .text(riesgoAlto.toString(), col4, doc.y);

        doc.moveDown(0.5);
      });

      doc.moveDown(2);
    }

    // Nueva página si es necesario
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }
  }
}

/**
 * Genera reporte PDF consolidado NOM-035
 */
export async function generateConsolidatedNOM035Report(
  data: ConsolidatedReportData
): Promise<{ url: string; key: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'letter', margin: 50 });
      const chunks: Buffer[] = [];

      // Capturar chunks del PDF
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          
          // Subir a S3
          const timestamp = Date.now();
          const fileKey = `reports/nom035-consolidated-${timestamp}.pdf`;
          const result = await storagePut(fileKey, pdfBuffer, 'application/pdf');

          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // Generar contenido del PDF
      let pageNumber = 1;

      // Encabezado
      addHeader(doc, data.companyName, data.reportDate);

      // Resumen ejecutivo
      doc.fillColor('#000000')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Resumen Ejecutivo', 50, doc.y);

      doc.moveDown(1);

      doc.fontSize(11)
        .font('Helvetica')
        .text(`Este reporte consolida los resultados de las encuestas NOM-035 STPS 2018 aplicadas en ${data.companyName}.`, 50, doc.y, {
          width: doc.page.width - 100,
          align: 'justify',
        });

      doc.moveDown(1);

      const totalResponses = data.surveyResults.reduce((sum, r) => sum + r.totalResponses, 0);
      doc.text(`Total de respuestas recopiladas: ${totalResponses}`, 50, doc.y);
      doc.text(`Encuestas aplicadas: ${data.surveyResults.map(r => r.surveyTitle).join(', ')}`, 50, doc.y);

      doc.moveDown(2);

      // Pie de página
      addFooter(doc, pageNumber++);

      // Resultados por encuesta
      await addSurveyResultsSection(doc, data.surveyResults);

      // Análisis multinivel
      if (data.multilevelAnalysis.length > 0) {
        await addMultilevelAnalysisSection(doc, data.multilevelAnalysis);
      }

      // Finalizar PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
