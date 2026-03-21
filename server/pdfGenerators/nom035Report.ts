/**
 * Generador PDF de Informe Numeral 7.5 NOM-035-STPS-2018
 * 
 * Genera el informe oficial requerido por el Numeral 7.5 de la NOM-035 que debe contener:
 * - Datos generales del centro de trabajo
 * - Resultados de identificación y análisis de factores de riesgo psicosocial
 * - Medidas de control y prevención adoptadas
 * - Conclusiones y recomendaciones
 * - Firmas digitales de responsables
 * - Código QR NOM-151 para validación
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { storagePut } from '../storage';

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
  signatureUrl?: string;
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
  validationUrl: string;
}

export async function generateNom035Report(data: Nom035ReportData): Promise<{ url: string; key: string }> {
  const doc = new PDFDocument({
    size: 'letter', // 612 x 792 puntos
    margins: { top: 72, bottom: 72, left: 72, right: 72 }, // 1 pulgada
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // === ENCABEZADO ===
  await addHeader(doc, data.company, data.folio);

  // === TÍTULO ===
  doc.moveDown(2);
  doc.fontSize(16).font('Helvetica-Bold').text(
    'INFORME DE RESULTADOS',
    { align: 'center' }
  );
  doc.fontSize(14).text(
    'Identificación, Análisis y Prevención de Factores de Riesgo Psicosocial',
    { align: 'center' }
  );
  doc.fontSize(12).text(
    'NOM-035-STPS-2018, Numeral 7.5',
    { align: 'center' }
  );

  // === SECCIÓN 1: DATOS GENERALES ===
  doc.moveDown(2);
  addSection(doc, '1. DATOS GENERALES DEL CENTRO DE TRABAJO');
  
  doc.fontSize(10).font('Helvetica');
  addField(doc, 'Razón Social:', data.company.name);
  addField(doc, 'RFC:', data.company.rfc);
  addField(doc, 'Domicilio:', data.company.address);
  addField(doc, 'Actividad Preponderante:', data.company.mainActivity);
  addField(doc, 'Total de Trabajadores:', data.company.totalEmployees.toString());
  addField(doc, 'Período del Informe:', 
    `${formatDate(data.reportPeriod.startDate)} al ${formatDate(data.reportPeriod.endDate)}`
  );

  // === SECCIÓN 2: METODOLOGÍA ===
  doc.moveDown(1);
  addSection(doc, '2. METODOLOGÍA APLICADA');
  
  doc.fontSize(10).font('Helvetica');
  doc.text(
    'De conformidad con la NOM-035-STPS-2018, se aplicaron las siguientes guías de referencia:',
    { indent: 20 }
  );
  doc.moveDown(0.5);

  if (data.surveyResults.guideI.applied) {
    doc.text(`• Guía de Referencia I: Identificación de trabajadores expuestos a acontecimientos traumáticos severos`, { indent: 40 });
    doc.text(`  Casos identificados: ${data.surveyResults.guideI.casesIdentified}`, { indent: 60 });
  }
  if (data.surveyResults.guideII.applied) {
    doc.text(`• Guía de Referencia II: Identificación y análisis de factores de riesgo psicosocial`, { indent: 40 });
    doc.text(`  Trabajadores evaluados: ${data.surveyResults.guideII.totalResponses}`, { indent: 60 });
  }
  if (data.surveyResults.guideIII.applied) {
    doc.text(`• Guía de Referencia III: Identificación y análisis de factores de riesgo psicosocial y evaluación del entorno organizacional`, { indent: 40 });
    doc.text(`  Trabajadores evaluados: ${data.surveyResults.guideIII.totalResponses}`, { indent: 60 });
  }

  // === SECCIÓN 3: RESULTADOS ===
  doc.addPage();
  addSection(doc, '3. RESULTADOS DE IDENTIFICACIÓN Y ANÁLISIS');

  doc.fontSize(10).font('Helvetica');
  doc.text(
    'Se identificaron los siguientes factores de riesgo psicosocial:',
    { indent: 20 }
  );
  doc.moveDown(1);

  // Tabla de factores de riesgo
  const tableTop = doc.y;
  const colWidths = [120, 80, 60, 80, 80];
  const headers = ['Categoría/Dominio', 'Dimensión', 'Nivel', 'Calificación', 'Trabajadores'];
  
  // Encabezados de tabla
  let xPos = 72;
  doc.fontSize(9).font('Helvetica-Bold');
  headers.forEach((header: any, i: number) => {
    doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
    xPos += colWidths[i];
  });

  // Línea separadora
  doc.moveTo(72, tableTop + 15).lineTo(492, tableTop + 15).stroke();

  // Datos de la tabla
  let yPos = tableTop + 20;
  doc.fontSize(8).font('Helvetica');
  
  data.riskFactors.forEach((factor: any) => {
    if (yPos > 720) { // Nueva página si es necesario
      doc.addPage();
      yPos = 72;
    }

    xPos = 72;
    const rowData = [
      `${factor.category}\n${factor.domain}`,
      factor.dimension,
      factor.level,
      factor.score.toFixed(1),
      factor.affectedEmployees.toString()
    ];

    rowData.forEach((data: any, i: number) => {
      doc.text(data, xPos, yPos, { width: colWidths[i], align: i === 0 ? 'left' : 'center' });
      xPos += colWidths[i];
    });

    yPos += 25;
  });

  // === SECCIÓN 4: MEDIDAS DE CONTROL ===
  doc.addPage();
  addSection(doc, '4. MEDIDAS DE CONTROL Y PREVENCIÓN ADOPTADAS');

  doc.fontSize(10).font('Helvetica');
  doc.text(
    'Se han establecido las siguientes medidas de control y prevención:',
    { indent: 20 }
  );
  doc.moveDown(1);

  data.controlMeasures.forEach((measure: any, index: number) => {
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(`${index + 1}. Factor de Riesgo: ${measure.riskFactor}`, { indent: 40 });
    doc.fontSize(9).font('Helvetica');
    doc.text(`   Medida: ${measure.measure}`, { indent: 40 });
    doc.text(`   Responsable: ${measure.responsiblePerson}`, { indent: 40 });
    doc.text(`   Fecha límite: ${formatDate(measure.deadline)}`, { indent: 40 });
    doc.text(`   Estado: ${measure.status}`, { indent: 40 });
    doc.moveDown(0.5);
  });

  // === SECCIÓN 5: CONCLUSIONES ===
  doc.addPage();
  addSection(doc, '5. CONCLUSIONES');
  doc.fontSize(10).font('Helvetica');
  doc.text(data.conclusions, { indent: 20, align: 'justify' });

  // === SECCIÓN 6: RECOMENDACIONES ===
  doc.moveDown(1);
  addSection(doc, '6. RECOMENDACIONES');
  doc.fontSize(10).font('Helvetica');
  doc.text(data.recommendations, { indent: 20, align: 'justify' });

  // === FIRMAS DIGITALES ===
  doc.addPage();
  doc.moveDown(2);
  doc.fontSize(12).font('Helvetica-Bold').text('FIRMAS DE RESPONSABLES', { align: 'center' });
  doc.moveDown(2);

  // Grid de 2 columnas para firmas
  const signatureWidth = 200;
  const signatureHeight = 80;
  const signatureGap = 40;
  let sigX = 72;
  let sigY = doc.y;

  for (let i = 0; i < data.signers.length; i++) {
    const signer = data.signers[i];
    
    if (i > 0 && i % 2 === 0) {
      sigY += signatureHeight + 60;
      sigX = 72;
      
      if (sigY > 650) {
        doc.addPage();
        sigY = 72;
      }
    }

    // Firma (imagen si existe)
    if (signer.signatureUrl) {
      try {
        // Aquí se cargaría la imagen de la firma desde S3
        // doc.image(signatureBuffer, sigX, sigY, { width: signatureWidth, height: signatureHeight });
      } catch (error) {
        console.error('Error loading signature:', error);
      }
    }

    // Línea de firma
    doc.moveTo(sigX, sigY + signatureHeight).lineTo(sigX + signatureWidth, sigY + signatureHeight).stroke();
    
    // Nombre y cargo
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(signer.name, sigX, sigY + signatureHeight + 5, { width: signatureWidth, align: 'center' });
    doc.fontSize(9).font('Helvetica');
    doc.text(signer.position, sigX, sigY + signatureHeight + 20, { width: signatureWidth, align: 'center' });
    doc.text(formatDate(signer.signatureDate), sigX, sigY + signatureHeight + 35, { width: signatureWidth, align: 'center' });

    sigX += signatureWidth + signatureGap;
  }

  // === CÓDIGO QR NOM-151 ===
  doc.moveDown(4);
  const qrCode = await QRCode.toDataURL(data.validationUrl);
  const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
  
  doc.image(qrBuffer, 250, doc.y, { width: 100, height: 100 });
  doc.moveDown(7);
  doc.fontSize(8).font('Helvetica').text('Código de Validación NOM-151', { align: 'center' });
  doc.fontSize(7).text(data.validationUrl, { align: 'center' });

  // === PIE DE PÁGINA EN TODAS LAS PÁGINAS ===
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    addFooter(doc, data.folio, i + 1, pages.count);
  }

  doc.end();

  // Esperar a que termine de generar
  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });

  // Subir a S3
  const fileName = `nom035-informe-${data.folio}-${Date.now()}.pdf`;
  const result = await storagePut(
    `reports/nom035/${fileName}`,
    pdfBuffer,
    'application/pdf'
  );

  return result;
}

// === FUNCIONES AUXILIARES ===

async function addHeader(doc: PDFKit.PDFDocument, company: CompanyData, folio: string) {
  // Logo (si existe)
  if (company.logoUrl) {
    try {
      // Aquí se cargaría el logo desde S3
      // doc.image(logoBuffer, 72, 40, { width: 80, height: 80 });
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  // Información del encabezado
  doc.fontSize(14).font('Helvetica-Bold').text(company.name, 170, 50, { width: 300 });
  doc.fontSize(10).font('Helvetica').text(`RFC: ${company.rfc}`, 170, 70);
  doc.fontSize(8).text(`Folio: ${folio}`, 450, 50, { align: 'right' });
  doc.fontSize(8).text(`Fecha: ${formatDate(new Date())}`, 450, 65, { align: 'right' });

  // Línea separadora
  doc.moveTo(72, 100).lineTo(540, 100).stroke();
}

function addSection(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(12).font('Helvetica-Bold').text(title);
  doc.moveDown(0.5);
}

function addField(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.fontSize(10).font('Helvetica-Bold').text(label, { continued: true });
  doc.font('Helvetica').text(` ${value}`);
  doc.moveDown(0.3);
}

function addFooter(doc: PDFKit.PDFDocument, folio: string, pageNum: number, totalPages: number) {
  doc.fontSize(8).font('Helvetica');
  doc.text(
    `Folio: ${folio} | Generado: ${formatDate(new Date())} | Página ${pageNum} de ${totalPages}`,
    72,
    752,
    { align: 'center', width: 468 }
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
