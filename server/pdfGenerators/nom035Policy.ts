/**
 * Generador PDF de Políticas NOM-035-STPS-2018
 * 
 * Genera documentos oficiales de políticas de prevención de riesgos psicosociales
 * con logotipo de empresa, firma digital del representante legal y código QR NOM-151
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { storagePut } from '../storage';
import { getDb } from '../db';
import { companyGeneralData, companyLogo, companyLegalRepresentative, companyDigitalSignature } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

interface PolicyData {
  id: number;
  nombre: string;
  descripcion: string;
  fechaPublicacion: Date;
  representanteLegalId?: number | null;
}

export async function generateNom035PolicyPDF(policy: PolicyData): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener datos de la empresa
  const companyDataResult = await db.select().from(companyGeneralData).limit(1);
  const companyData = companyDataResult[0];

  // Obtener logotipo
  const logoResult = await db.select().from(companyLogo).limit(1);
  const logo = logoResult[0];

  // Obtener representante legal y firma
  let legalRep = null;
  let signature = null;
  
  if (policy.representanteLegalId) {
    const legalRepResult = await db
      .select()
      .from(companyLegalRepresentative)
      .where(eq(companyLegalRepresentative.id, policy.representanteLegalId))
      .limit(1);
    legalRep = legalRepResult[0];

    if (legalRep) {
      const signatureResult = await db
        .select()
        .from(companyDigitalSignature)
        .where(eq(companyDigitalSignature.userId, legalRep.id))
        .limit(1);
      signature = signatureResult[0];
    }
  }

  const doc = new PDFDocument({
    size: 'letter', // 612 x 792 puntos
    margins: { top: 72, bottom: 72, left: 72, right: 72 }, // 1 pulgada
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // === ENCABEZADO CON LOGOTIPO ===
  if (logo && logo.logoUrl) {
    try {
      // Descargar logotipo y agregarlo al PDF
      const logoResponse = await fetch(logo.logoUrl);
      const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
      
      doc.image(logoBuffer, 72, 72, { width: 100, height: 100, fit: [100, 100] });
    } catch (error) {
      console.error('Error al cargar logotipo:', error);
    }
  }

  // Nombre de la empresa (superior derecha)
  if (companyData) {
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(companyData.razonSocial || '', 200, 72, { align: 'right' });
    doc.fontSize(10).font('Helvetica');
    doc.text(`RFC: ${companyData.rfc || ''}`, 200, 90, { align: 'right' });
  }

  // === TÍTULO DE LA POLÍTICA ===
  doc.moveDown(8);
  doc.fontSize(18).font('Helvetica-Bold').text(
    'POLÍTICA DE PREVENCIÓN DE RIESGOS PSICOSOCIALES',
    { align: 'center' }
  );
  
  doc.moveDown(1);
  doc.fontSize(16).font('Helvetica-Bold').text(
    policy.nombre,
    { align: 'center' }
  );

  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(
    `Fecha de publicación: ${policy.fechaPublicacion.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`,
    { align: 'center' }
  );

  // === LÍNEA DIVISORIA ===
  doc.moveDown(1);
  doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();
  doc.moveDown(1);

  // === DESCRIPCIÓN DE LA POLÍTICA ===
  doc.fontSize(11).font('Helvetica');
  
  // Dividir descripción en párrafos
  const paragraphs = policy.descripcion.split('\n');
  paragraphs.forEach((paragraph) => {
    if (paragraph.trim()) {
      doc.text(paragraph.trim(), {
        align: 'justify',
        lineGap: 5,
      });
      doc.moveDown(0.8);
    }
  });

  // === FIRMA DEL REPRESENTANTE LEGAL ===
  doc.moveDown(3);
  
  if (legalRep) {
    const signatureY = doc.y;
    
    // Agregar firma digital si existe
    if (signature && signature.firmaUrl) {
      try {
        // Descargar firma desde URL
        const signatureResponse = await fetch(signature.firmaUrl);
        const signatureBuffer = Buffer.from(await signatureResponse.arrayBuffer());
        
        const signatureX = 306 - 75; // Centrado
        doc.image(signatureBuffer, signatureX, signatureY, { width: 150, height: 60 });
        doc.moveDown(4);
      } catch (error) {
        console.error('Error al cargar firma:', error);
        doc.moveDown(3);
      }
    } else {
      doc.moveDown(3);
    }

    // Línea de firma
    doc.moveTo(231, doc.y).lineTo(381, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Nombre y cargo
    doc.fontSize(11).font('Helvetica-Bold').text(
      legalRep.nombre || '',
      { align: 'center' }
    );
    doc.fontSize(10).font('Helvetica').text(
      'Representante Legal',
      { align: 'center' }
    );
    
    if (legalRep.cargo) {
      doc.text(legalRep.cargo, { align: 'center' });
    }
  }

  // === CÓDIGO QR NOM-151 ===
  const validationUrl = `https://nom035.manus.space/policies/${policy.id}/validate`;
  const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
    width: 100,
    margin: 1,
  });
  
  const qrBuffer = Buffer.from(qrCodeDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  doc.image(qrBuffer, 72, doc.page.height - 150, { width: 80, height: 80 });
  
  doc.fontSize(8).font('Helvetica').text(
    'Código QR de validación NOM-151',
    72,
    doc.page.height - 60,
    { width: 80, align: 'center' }
  );

  // === PIE DE PÁGINA ===
  const folio = `POL-${String(policy.id).padStart(6, '0')}`;
  doc.fontSize(8).font('Helvetica').text(
    `Folio: ${folio}`,
    200,
    doc.page.height - 50,
    { align: 'center' }
  );
  
  doc.text(
    `Generado el ${new Date().toLocaleDateString('es-MX')}`,
    200,
    doc.page.height - 35,
    { align: 'center' }
  );

  doc.end();

  // Esperar a que se complete el PDF
  await new Promise<void>((resolve) => {
    doc.on('end', () => resolve());
  });

  const pdfBuffer = Buffer.concat(chunks);
  
  // Subir a S3
  const fileName = `policy-${policy.id}-${Date.now()}.pdf`;
  const { url } = await storagePut(
    `nom035/policies/${fileName}`,
    pdfBuffer,
    'application/pdf'
  );

  return url;
}
