import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/**
 * Módulo de generación de PDFs para documentos formales NOM-035
 * 
 * Características:
 * - Formato oficial en hoja carta (letter size)
 * - Encabezado con logo y folio
 * - Contenido estructurado profesional
 * - Firmas digitales incluidas como imágenes
 * - Código QR NOM-151 para validación
 * - Pie de página con información legal y timestamp
 */

interface Signature {
  signerName: string;
  signerRole: string | null;
  signatureImageUrl: string;
  signedAt: Date;
  signatureHash: string | null;
}

interface Participant {
  name: string;
  curp: string | null;
  ine: string | null;
  role: string | null;
}

interface ActaRecorridoData {
  folio: string;
  title: string;
  content: {
    fecha: string;
    hora: string;
    lugar: string;
    objetivo: string;
    areaInspeccionada: string;
    observaciones: string;
    hallazgos: string;
    recomendaciones: string;
  };
  participants: Participant[];
  signatures: Signature[];
  qrCode: string;
  createdAt: Date;
}

interface ActaFinalResultadosData {
  folio: string;
  title: string;
  content: {
    fecha: string;
    periodo: string;
    introduccion: string;
    metodologia: string;
    resultados: string;
    conclusiones: string;
    recomendaciones: string;
    planAccion: string;
  };
  signatures: Signature[];
  qrCode: string;
  createdAt: Date;
}

/**
 * Genera código QR como data URL
 */
async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Agrega encabezado del documento
 */
function addHeader(doc: jsPDF, folio: string, title: string) {
  // Logo (placeholder - se puede reemplazar con logo real)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('NOM-035-STPS-2018', 105, 20, { align: 'center' });
  
  // Folio
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Folio: ${folio}`, 190, 20, { align: 'right' });
  
  // Título del documento
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, 35, { align: 'center' });
  
  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(20, 40, 190, 40);
}

/**
 * Agrega pie de página con información legal
 */
function addFooter(doc: jsPDF, pageNumber: number, totalPages: number, timestamp: Date) {
  const pageHeight = doc.internal.pageSize.height;
  
  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(20, pageHeight - 25, 190, pageHeight - 25);
  
  // Información legal
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Documento generado conforme a la NOM-151-SCFI-2016 para trazabilidad y validez legal',
    105,
    pageHeight - 20,
    { align: 'center' }
  );
  
  // Timestamp
  doc.text(
    `Generado: ${timestamp.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
    105,
    pageHeight - 15,
    { align: 'center' }
  );
  
  // Número de página
  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    105,
    pageHeight - 10,
    { align: 'center' }
  );
}

/**
 * Agrega sección de firmas al PDF
 */
async function addSignaturesSection(doc: jsPDF, signatures: Signature[], startY: number): Promise<number> {
  let currentY = startY;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Firmas Autorizadas', 20, currentY);
  currentY += 10;
  
  // Agregar cada firma
  for (const signature of signatures) {
    // Verificar si necesitamos nueva página
    if (currentY > 240) {
      doc.addPage();
      currentY = 50;
    }
    
    try {
      // Agregar imagen de firma (base64)
      if (signature.signatureImageUrl.startsWith('data:image')) {
        doc.addImage(signature.signatureImageUrl, 'PNG', 20, currentY, 60, 24);
      }
    } catch (error) {
      console.error('Error adding signature image:', error);
      // Continuar sin la imagen si falla
    }
    
    // Información del firmante
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${signature.signerName}`, 20, currentY + 30);
    if (signature.signerRole) {
      doc.text(`Cargo: ${signature.signerRole}`, 20, currentY + 35);
    }
    doc.text(
      `Fecha: ${signature.signedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
      20,
      currentY + 40
    );
    
    // Hash de validación (si existe)
    if (signature.signatureHash) {
      doc.setFontSize(8);
      doc.text(`Hash: ${signature.signatureHash.substring(0, 32)}...`, 20, currentY + 45);
    }
    
    // Línea separadora
    doc.setLineWidth(0.3);
    doc.line(20, currentY + 50, 100, currentY + 50);
    
    currentY += 60;
  }
  
  return currentY;
}

/**
 * Genera PDF para Acta de Recorrido NOM-019
 */
export async function generateActaRecorridoPDF(data: ActaRecorridoData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // 8.5" x 11"
  });
  
  let currentY = 50;
  
  // Encabezado
  addHeader(doc, data.folio, data.title);
  
  // Contenido del acta
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Recorrido', 20, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Fecha y hora
  doc.text(`Fecha: ${data.content.fecha}`, 20, currentY);
  doc.text(`Hora: ${data.content.hora}`, 120, currentY);
  currentY += 7;
  
  // Lugar
  doc.text(`Lugar: ${data.content.lugar}`, 20, currentY);
  currentY += 7;
  
  // Área inspeccionada
  doc.text(`Área Inspeccionada: ${data.content.areaInspeccionada}`, 20, currentY);
  currentY += 10;
  
  // Objetivo
  doc.setFont('helvetica', 'bold');
  doc.text('Objetivo:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const objetivoLines = doc.splitTextToSize(data.content.objetivo, 170);
  doc.text(objetivoLines, 20, currentY);
  currentY += objetivoLines.length * 5 + 5;
  
  // Observaciones
  doc.setFont('helvetica', 'bold');
  doc.text('Observaciones:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const observacionesLines = doc.splitTextToSize(data.content.observaciones, 170);
  doc.text(observacionesLines, 20, currentY);
  currentY += observacionesLines.length * 5 + 5;
  
  // Hallazgos
  doc.setFont('helvetica', 'bold');
  doc.text('Hallazgos:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const hallazgosLines = doc.splitTextToSize(data.content.hallazgos, 170);
  doc.text(hallazgosLines, 20, currentY);
  currentY += hallazgosLines.length * 5 + 5;
  
  // Recomendaciones
  doc.setFont('helvetica', 'bold');
  doc.text('Recomendaciones:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const recomendacionesLines = doc.splitTextToSize(data.content.recomendaciones, 170);
  doc.text(recomendacionesLines, 20, currentY);
  currentY += recomendacionesLines.length * 5 + 10;
  
  // Participantes
  if (data.participants.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 50;
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Participantes', 20, currentY);
    currentY += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    data.participants.forEach((participant, index) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 50;
      }
      
      doc.text(`${index + 1}. ${participant.name}`, 20, currentY);
      if (participant.role) {
        doc.text(`   Rol: ${participant.role}`, 20, currentY + 4);
      }
      if (participant.curp) {
        doc.text(`   CURP: ${participant.curp}`, 20, currentY + 8);
      }
      currentY += 15;
    });
    
    currentY += 5;
  }
  
  // Nueva página para firmas
  doc.addPage();
  currentY = 50;
  
  // Firmas
  currentY = await addSignaturesSection(doc, data.signatures, currentY);
  
  // Código QR
  if (currentY > 220) {
    doc.addPage();
    currentY = 50;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Validación NOM-151-SCFI-2016', 20, currentY);
  currentY += 8;
  
  try {
    const qrDataURL = await generateQRCodeDataURL(data.qrCode);
    doc.addImage(qrDataURL, 'PNG', 20, currentY, 40, 40);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Escanee el código QR para validar', 20, currentY + 45);
    doc.text('la autenticidad de este documento', 20, currentY + 50);
  } catch (error) {
    console.error('Error adding QR code:', error);
  }
  
  // Pie de página en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, data.createdAt);
  }
  
  // Convertir a Buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

/**
 * Genera PDF para Acta Final de Resultados
 */
export async function generateActaFinalResultadosPDF(data: ActaFinalResultadosData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });
  
  let currentY = 50;
  
  // Encabezado
  addHeader(doc, data.folio, data.title);
  
  // Contenido del acta
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Información General', 20, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Fecha y periodo
  doc.text(`Fecha: ${data.content.fecha}`, 20, currentY);
  currentY += 7;
  doc.text(`Periodo: ${data.content.periodo}`, 20, currentY);
  currentY += 10;
  
  // Introducción
  doc.setFont('helvetica', 'bold');
  doc.text('Introducción:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const introduccionLines = doc.splitTextToSize(data.content.introduccion, 170);
  doc.text(introduccionLines, 20, currentY);
  currentY += introduccionLines.length * 5 + 5;
  
  // Metodología
  if (currentY > 230) {
    doc.addPage();
    currentY = 50;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Metodología:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const metodologiaLines = doc.splitTextToSize(data.content.metodologia, 170);
  doc.text(metodologiaLines, 20, currentY);
  currentY += metodologiaLines.length * 5 + 5;
  
  // Resultados
  if (currentY > 230) {
    doc.addPage();
    currentY = 50;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Resultados:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const resultadosLines = doc.splitTextToSize(data.content.resultados, 170);
  doc.text(resultadosLines, 20, currentY);
  currentY += resultadosLines.length * 5 + 5;
  
  // Conclusiones
  if (currentY > 230) {
    doc.addPage();
    currentY = 50;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Conclusiones:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const conclusionesLines = doc.splitTextToSize(data.content.conclusiones, 170);
  doc.text(conclusionesLines, 20, currentY);
  currentY += conclusionesLines.length * 5 + 5;
  
  // Recomendaciones
  if (currentY > 230) {
    doc.addPage();
    currentY = 50;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Recomendaciones:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const recomendacionesLines = doc.splitTextToSize(data.content.recomendaciones, 170);
  doc.text(recomendacionesLines, 20, currentY);
  currentY += recomendacionesLines.length * 5 + 5;
  
  // Plan de Acción
  if (currentY > 230) {
    doc.addPage();
    currentY = 50;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Plan de Acción:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const planAccionLines = doc.splitTextToSize(data.content.planAccion, 170);
  doc.text(planAccionLines, 20, currentY);
  currentY += planAccionLines.length * 5 + 10;
  
  // Nueva página para firmas
  doc.addPage();
  currentY = 50;
  
  // Firmas
  currentY = await addSignaturesSection(doc, data.signatures, currentY);
  
  // Código QR
  if (currentY > 220) {
    doc.addPage();
    currentY = 50;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Validación NOM-151-SCFI-2016', 20, currentY);
  currentY += 8;
  
  try {
    const qrDataURL = await generateQRCodeDataURL(data.qrCode);
    doc.addImage(qrDataURL, 'PNG', 20, currentY, 40, 40);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Escanee el código QR para validar', 20, currentY + 45);
    doc.text('la autenticidad de este documento', 20, currentY + 50);
  } catch (error) {
    console.error('Error adding QR code:', error);
  }
  
  // Pie de página en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, data.createdAt);
  }
  
  // Convertir a Buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

interface MeetingMinuteParticipant {
  name: string;
  role: string;
  curp: string;
  ineNumber: string;
  signature: string;
  signedAt: Date | null;
}

interface MeetingMinuteAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
}

interface MeetingMinuteData {
  folio: string;
  title: string;
  meetingDate: Date;
  meetingType: string;
  location: string;
  agenda: string;
  agreements: string;
  observations: string;
  participants: MeetingMinuteParticipant[];
  attachments: MeetingMinuteAttachment[];
  qrCode: string;
  createdAt: Date;
}

/**
 * Genera PDF de Minuta de Reunión con firmas digitales y código QR NOM-151
 */
export async function generateMeetingMinutePDF(data: MeetingMinuteData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // 8.5" x 11"
  });
  
  let currentY = 50;
  
  // Encabezado
  addHeader(doc, data.folio, data.title);
  
  // Información general
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Información General', 20, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Fecha y tipo de reunión
  const fechaReunion = new Date(data.meetingDate).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Fecha: ${fechaReunion}`, 20, currentY);
  currentY += 7;
  doc.text(`Tipo de Reunión: ${data.meetingType}`, 20, currentY);
  currentY += 7;
  
  // Lugar
  if (data.location) {
    doc.text(`Lugar: ${data.location}`, 20, currentY);
    currentY += 10;
  } else {
    currentY += 3;
  }
  
  // Orden del día (Agenda)
  doc.setFont('helvetica', 'bold');
  doc.text('Orden del Día:', 20, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const agendaLines = doc.splitTextToSize(data.agenda, 170);
  doc.text(agendaLines, 20, currentY);
  currentY += agendaLines.length * 5 + 5;
  
  // Acuerdos tomados
  if (data.agreements) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Acuerdos Tomados:', 20, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const agreementsLines = doc.splitTextToSize(data.agreements, 170);
    doc.text(agreementsLines, 20, currentY);
    currentY += agreementsLines.length * 5 + 5;
  }
  
  // Observaciones
  if (data.observations) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones:', 20, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const observationsLines = doc.splitTextToSize(data.observations, 170);
    doc.text(observationsLines, 20, currentY);
    currentY += observationsLines.length * 5 + 10;
  }
  
  // Participantes y firmas
  if (data.participants.length > 0) {
    if (currentY > 200) {
      doc.addPage();
      currentY = 50;
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Participantes y Firmas', 20, currentY);
    currentY += 8;
    
    doc.setFontSize(9);
    
    for (const participant of data.participants) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 50;
      }
      
      // Nombre y rol
      doc.setFont('helvetica', 'bold');
      doc.text(`${participant.name}`, 20, currentY);
      currentY += 5;
      
      doc.setFont('helvetica', 'normal');
      if (participant.role) {
        doc.text(`Rol: ${participant.role}`, 20, currentY);
        currentY += 5;
      }
      
      // CURP e INE
      if (participant.curp) {
        doc.text(`CURP: ${participant.curp}`, 20, currentY);
        currentY += 5;
      }
      if (participant.ineNumber) {
        doc.text(`INE: ${participant.ineNumber}`, 20, currentY);
        currentY += 5;
      }
      
      // Firma digital
      if (participant.signature) {
        try {
          doc.addImage(participant.signature, 'PNG', 20, currentY, 40, 15);
          currentY += 17;
          
          if (participant.signedAt) {
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(
              `Firmado: ${new Date(participant.signedAt).toLocaleString('es-MX')}`,
              20,
              currentY
            );
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            currentY += 5;
          }
        } catch (error) {
          console.error('Error adding signature image:', error);
          doc.text('[Firma no disponible]', 20, currentY);
          currentY += 5;
        }
      } else {
        doc.text('_________________________', 20, currentY);
        doc.text('Firma', 20, currentY + 5);
        currentY += 10;
      }
      
      currentY += 5;
    }
  }
  
  // Adjuntos
  if (data.attachments.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 50;
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Adjuntos', 20, currentY);
    currentY += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    for (const attachment of data.attachments) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 50;
      }
      
      doc.text(`• ${attachment.fileName} (${attachment.fileType})`, 20, currentY);
      currentY += 5;
    }
    
    currentY += 5;
  }
  
  // Código QR NOM-151
  if (data.qrCode) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 50;
    }
    
    try {
      const qrDataUrl = await generateQRCodeDataURL(data.qrCode);
      doc.addImage(qrDataUrl, 'PNG', 160, currentY, 30, 30);
      
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Código de Validación', 160, currentY + 33, { align: 'left' });
      doc.text('NOM-151-SCFI-2016', 160, currentY + 37, { align: 'left' });
      doc.setTextColor(0, 0, 0);
    } catch (error) {
      console.error('Error adding QR code:', error);
    }
  }
  
  // Pie de página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, data.createdAt);
  }
  
  // Convertir a buffer
  const pdfData = doc.output('arraybuffer');
  return Buffer.from(pdfData);
}
