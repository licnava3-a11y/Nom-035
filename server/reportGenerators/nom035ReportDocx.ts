/**
 * Generador DOCX de Informe Numeral 7.5 NOM-035-STPS-2018
 * 
 * Genera el informe oficial en formato Word editable que contiene:
 * - Datos generales del centro de trabajo
 * - Resultados de identificación y análisis de factores de riesgo psicosocial
 * - Medidas de control y prevención adoptadas
 * - Conclusiones y recomendaciones
 * - Tablas formateadas profesionalmente
 */

import { Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel, WidthType, BorderStyle } from 'docx';
import { storagePut } from '../storage';
import axios from 'axios';

interface CompanyData {
  name: string;
  rfc: string;
  address: string;
  mainActivity: string;
  totalEmployees: number;
  logoUrl?: string;
}

interface RiskFactor {
  category: string;
  domain: string;
  dimension: string;
  score: number;
  level: 'Nulo' | 'Bajo' | 'Medio' | 'Alto' | 'Muy alto';
  affectedEmployees: number;
}

interface ControlMeasure {
  riskFactor: string;
  measure: string;
  responsiblePerson: string;
  deadline: Date;
  status: 'Pendiente' | 'En proceso' | 'Completada';
}

interface Signer {
  name: string;
  position: string;
  signatureDate: Date;
}

interface Nom035ReportData {
  company: CompanyData;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  surveyResults: {
    guideI: { applied: boolean; casesIdentified: number };
    guideII: { applied: boolean; totalResponses: number };
    guideIII: { applied: boolean; totalResponses: number };
  };
  riskFactors: RiskFactor[];
  controlMeasures: ControlMeasure[];
  conclusions: string;
  recommendations: string;
  signers: Signer[];
  folio: string;
}

export async function generateNom035ReportDocx(data: Nom035ReportData): Promise<{ url: string; key: string }> {
  const doc = new Document({
    sections: [{
      properties: {},
      headers: {
        default: {
          options: {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Informe NOM-035-STPS-2018 | Folio: ${data.folio}`,
                    size: 18,
                    color: "666666",
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          },
        },
      },
      footers: {
        default: {
          options: {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                    size: 18,
                    color: "666666",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          },
        },
      },
      children: [
        // === PORTADA ===
        new Paragraph({
          text: "INFORME DE IDENTIFICACIÓN Y ANÁLISIS",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 1440, after: 240 },
        }),
        new Paragraph({
          text: "DE FACTORES DE RIESGO PSICOSOCIAL",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
        }),
        new Paragraph({
          text: "(Numeral 7.5 NOM-035-STPS-2018)",
          alignment: AlignmentType.CENTER,
          spacing: { after: 960 },
        }),

        // === DATOS GENERALES ===
        new Paragraph({
          text: "1. DATOS GENERALES DEL CENTRO DE TRABAJO",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
        }),
        
        createDataTable([
          ["Razón Social", data.company.name],
          ["RFC", data.company.rfc],
          ["Domicilio", data.company.address],
          ["Actividad Principal", data.company.mainActivity],
          ["Total de Empleados", data.company.totalEmployees.toString()],
        ]),

        new Paragraph({
          text: "Período de Evaluación",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 120 },
        }),
        
        createDataTable([
          ["Fecha de Inicio", data.reportPeriod.startDate.toLocaleDateString('es-MX')],
          ["Fecha de Término", data.reportPeriod.endDate.toLocaleDateString('es-MX')],
        ]),

        // === RESULTADOS DE ENCUESTAS ===
        new Paragraph({
          text: "2. RESULTADOS DE APLICACIÓN DE GUÍAS",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
        }),

        createDataTable([
          ["Guía", "Aplicada", "Resultados"],
          [
            "Guía I - Identificación de factores de riesgo",
            data.surveyResults.guideI.applied ? "Sí" : "No",
            data.surveyResults.guideI.applied ? `${data.surveyResults.guideI.casesIdentified} casos identificados` : "N/A"
          ],
          [
            "Guía II - Identificación y análisis (centros 16-50 trabajadores)",
            data.surveyResults.guideII.applied ? "Sí" : "No",
            data.surveyResults.guideII.applied ? `${data.surveyResults.guideII.totalResponses} respuestas` : "N/A"
          ],
          [
            "Guía III - Identificación y análisis (centros +50 trabajadores)",
            data.surveyResults.guideIII.applied ? "Sí" : "No",
            data.surveyResults.guideIII.applied ? `${data.surveyResults.guideIII.totalResponses} respuestas` : "N/A"
          ],
        ]),

        // === FACTORES DE RIESGO IDENTIFICADOS ===
        new Paragraph({
          text: "3. FACTORES DE RIESGO PSICOSOCIAL IDENTIFICADOS",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
        }),

        ...(data.riskFactors.length > 0 ? [
          createRiskFactorsTable(data.riskFactors),
        ] : [
          new Paragraph({
            children: [new TextRun({ text: "No se identificaron factores de riesgo psicosocial significativos en el período evaluado.", italics: true })],
            spacing: { after: 240 },
          }),
        ]),

        // === MEDIDAS DE CONTROL ===
        new Paragraph({
          text: "4. MEDIDAS DE CONTROL Y PREVENCIÓN ADOPTADAS",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
        }),

        ...(data.controlMeasures.length > 0 ? [
          createControlMeasuresTable(data.controlMeasures),
        ] : [
          new Paragraph({
            children: [new TextRun({ text: "No se han implementado medidas de control específicas en el período evaluado.", italics: true })],
            spacing: { after: 240 },
          }),
        ]),

        // === CONCLUSIONES ===
        new Paragraph({
          text: "5. CONCLUSIONES",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
        }),
        new Paragraph({
          text: data.conclusions || "Sin conclusiones registradas.",
          spacing: { after: 360 },
          alignment: AlignmentType.JUSTIFIED,
        }),

        // === RECOMENDACIONES ===
        new Paragraph({
          text: "6. RECOMENDACIONES",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
        }),
        new Paragraph({
          text: data.recommendations || "Sin recomendaciones registradas.",
          spacing: { after: 360 },
          alignment: AlignmentType.JUSTIFIED,
        }),

        // === FIRMAS ===
        new Paragraph({
          text: "7. RESPONSABLES DE LA EVALUACIÓN",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
        }),

        ...data.signers.map(signer => 
          new Paragraph({
            children: [
              new TextRun({
                text: `${signer.name}\n`,
                bold: true,
              }),
              new TextRun({
                text: `${signer.position}\n`,
                italics: true,
              }),
              new TextRun({
                text: `Fecha: ${signer.signatureDate.toLocaleDateString('es-MX')}`,
                size: 20,
                color: "666666",
              }),
            ],
            spacing: { after: 240 },
          })
        ),
      ],
    }],
  });

  // Convertir documento a buffer usando Packer
  const { Packer } = await import('docx');
  const buffer = await Packer.toBuffer(doc);

  // Subir a S3
  const fileKey = `reports/nom035-${data.folio}-${Date.now()}.docx`;
  const result = await storagePut(fileKey, buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  return result;
}

// === FUNCIONES AUXILIARES ===

function createDataTable(rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(row => new TableRow({
      children: row.map((cell, index) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: cell, bold: index === 0 })],
        })],
        shading: index === 0 ? { fill: "E8F4F8" } : undefined,
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
      })),
    })),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    },
  });
}

function createRiskFactorsTable(factors: RiskFactor[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Categoría", bold: true })] })], shading: { fill: "E8F4F8" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Dominio", bold: true })] })], shading: { fill: "E8F4F8" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Dimensión", bold: true })] })], shading: { fill: "E8F4F8" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nivel", bold: true })] })], shading: { fill: "E8F4F8" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Empleados Afectados", bold: true })] })], shading: { fill: "E8F4F8" } }),
        ],
      }),
      ...factors.map(factor => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(factor.category)] }),
          new TableCell({ children: [new Paragraph(factor.domain)] }),
          new TableCell({ children: [new Paragraph(factor.dimension)] }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: factor.level,
                bold: factor.level === 'Alto' || factor.level === 'Muy alto',
              })],
            })],
            shading: factor.level === 'Muy alto' ? { fill: "FFE6E6" } : factor.level === 'Alto' ? { fill: "FFF4E6" } : undefined,
          }),
          new TableCell({ children: [new Paragraph(factor.affectedEmployees.toString())] }),
        ],
      })),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    },
  });
}

function createControlMeasuresTable(measures: ControlMeasure[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Factor de Riesgo", bold: true })] })], shading: { fill: "E8F4F8" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Medida de Control", bold: true })] })], shading: { fill: "E8F4F8" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Responsable", bold: true })] })], shading: { fill: "E8F4F8" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fecha Límite", bold: true })] })], shading: { fill: "E8F4F8" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })], shading: { fill: "E8F4F8" } }),
        ],
      }),
      ...measures.map(measure => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(measure.riskFactor)] }),
          new TableCell({ children: [new Paragraph(measure.measure)] }),
          new TableCell({ children: [new Paragraph(measure.responsiblePerson)] }),
          new TableCell({ children: [new Paragraph(measure.deadline.toLocaleDateString('es-MX'))] }),
          new TableCell({ 
            children: [new Paragraph(measure.status)],
            shading: measure.status === 'Completada' ? { fill: "E6F4EA" } : measure.status === 'Pendiente' ? { fill: "FFE6E6" } : { fill: "FFF4E6" },
          }),
        ],
      })),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    },
  });
}
