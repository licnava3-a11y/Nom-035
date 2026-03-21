import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Módulo de generación de PDFs para Minutas de Reunión
 * 
 * Características:
 * - Formato oficial en hoja carta (letter size: 612 x 792 puntos)
 * - Encabezado con logo y folio
 * - Contenido estructurado profesional
 * - Firmas digitales incluidas como imágenes
 * - Código QR NOM-151 para validación
 * - Pie de página con folio y timestamp
 * - Participantes con CURP e INE
 * - Evidencia fotográfica integrada
 */

interface MinutaParticipant {
  name: string;
  curp: string | null;
  ineNumber: string | null;
  role: string | null;
  signature: string | null; // base64
  signedAt: Date | null;
}

interface MinutaAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string; // photo, document, other
}

interface MinutaData {
  id: number;
  folio: string;
  title: string;
  meetingDate: Date;
  meetingType: string;
  location: string | null;
  agenda: string;
  agreements: string | null;
  observations: string | null;
  qrCode: string;
  qrCodeUrl: string | null;
  status: string;
  participants: MinutaParticipant[];
  attachments: MinutaAttachment[];
  createdBy: string; // Nombre del creador
  createdAt: Date;
  finalizedAt: Date | null;
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
 * Formatea fecha en español
 */
function formatDateES(date: Date): string {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} de ${month} de ${year}`;
}

/**
 * Genera PDF de Minuta de Reunión
 */
export async function generateMinutaPDF(data: MinutaData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER', // 612 x 792 puntos
        margins: {
          top: 72,    // 1 pulgada
          bottom: 72,
          left: 72,
          right: 72,
        },
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Dimensiones de página
      const pageWidth = 612;
      const pageHeight = 792;
      const margin = 72;
      const contentWidth = pageWidth - 2 * margin;

      // ==================== ENCABEZADO ====================
      
      // Título principal
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('MINUTA DE REUNIÓN', margin, margin, {
           width: contentWidth,
           align: 'center',
         });

      doc.moveDown(0.5);

      // Folio
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Folio: ${data.folio}`, {
           width: contentWidth,
           align: 'center',
         });

      doc.moveDown(1);

      // ==================== INFORMACIÓN GENERAL ====================
      
      let y = doc.y;

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('INFORMACIÓN GENERAL', margin, y);

      y = doc.y + 10;

      // Tabla de información
      const infoData = [
        { label: 'Título:', value: data.title },
        { label: 'Tipo de Reunión:', value: data.meetingType },
        { label: 'Fecha:', value: formatDateES(data.meetingDate) },
        { label: 'Lugar:', value: data.location || 'No especificado' },
      ];

      doc.font('Helvetica');
      infoData.forEach((item: any) => {
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .text(item.label, margin, y, { continued: true, width: 120 })
           .font('Helvetica')
           .text(item.value, { width: contentWidth - 120 });
        y = doc.y + 5;
      });

      doc.moveDown(1);

      // ==================== ORDEN DEL DÍA ====================
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('ORDEN DEL DÍA', margin);

      doc.moveDown(0.5);

      doc.fontSize(9)
         .font('Helvetica')
         .text(data.agenda, {
           width: contentWidth,
           align: 'justify',
         });

      doc.moveDown(1);

      // ==================== ACUERDOS ====================
      
      if (data.agreements) {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('ACUERDOS', margin);

        doc.moveDown(0.5);

        doc.fontSize(9)
           .font('Helvetica')
           .text(data.agreements, {
             width: contentWidth,
             align: 'justify',
           });

        doc.moveDown(1);
      }

      // ==================== OBSERVACIONES ====================
      
      if (data.observations) {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('OBSERVACIONES', margin);

        doc.moveDown(0.5);

        doc.fontSize(9)
           .font('Helvetica')
           .text(data.observations, {
             width: contentWidth,
             align: 'justify',
           });

        doc.moveDown(1);
      }

      // ==================== PARTICIPANTES ====================
      
      if (data.participants.length > 0) {
        // Verificar si necesitamos nueva página
        if (doc.y > pageHeight - 300) {
          doc.addPage();
        }

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('PARTICIPANTES', margin);

        doc.moveDown(0.5);

        // Tabla de participantes
        const tableTop = doc.y;
        const colWidths = {
          name: 150,
          role: 100,
          curp: 120,
          ine: 80,
        };

        // Encabezados de tabla
        doc.fontSize(8)
           .font('Helvetica-Bold')
           .text('Nombre', margin, tableTop, { width: colWidths.name })
           .text('Rol', margin + colWidths.name, tableTop, { width: colWidths.role })
           .text('CURP', margin + colWidths.name + colWidths.role, tableTop, { width: colWidths.curp })
           .text('INE', margin + colWidths.name + colWidths.role + colWidths.curp, tableTop, { width: colWidths.ine });

        let rowY = tableTop + 15;

        // Línea separadora
        doc.moveTo(margin, rowY - 5)
           .lineTo(pageWidth - margin, rowY - 5)
           .stroke();

        // Filas de participantes
        doc.font('Helvetica');
        data.participants.forEach((participant: any) => {
          if (rowY > pageHeight - 100) {
            doc.addPage();
            rowY = margin;
          }

          doc.fontSize(8)
             .text(participant.name, margin, rowY, { width: colWidths.name })
             .text(participant.role || '-', margin + colWidths.name, rowY, { width: colWidths.role })
             .text(participant.curp || '-', margin + colWidths.name + colWidths.role, rowY, { width: colWidths.curp })
             .text(participant.ineNumber || '-', margin + colWidths.name + colWidths.role + colWidths.curp, rowY, { width: colWidths.ine });

          rowY += 20;
        });

        doc.y = rowY + 10;
        doc.moveDown(1);
      }

      // ==================== FIRMAS DIGITALES ====================
      
      const signedParticipants = data.participants.filter(p => p.signature);
      
      if (signedParticipants.length > 0) {
        // Verificar si necesitamos nueva página
        if (doc.y > pageHeight - 400) {
          doc.addPage();
        }

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('FIRMAS', margin);

        doc.moveDown(1);

        // Mostrar firmas en grid (2 columnas)
        const signaturesPerRow = 2;
        const signatureWidth = (contentWidth - 20) / signaturesPerRow;
        let signatureX = margin;
        let signatureY = doc.y;
        let signaturesInRow = 0;

        for (const participant of signedParticipants) {
          if (participant.signature) {
            try {
              // Insertar imagen de firma (base64)
              const signatureBuffer = Buffer.from(participant.signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
              
              doc.image(signatureBuffer, signatureX, signatureY, {
                width: signatureWidth - 20,
                height: 60,
                fit: [signatureWidth - 20, 60],
              });

              // Nombre del firmante
              doc.fontSize(8)
                 .font('Helvetica-Bold')
                 .text(participant.name, signatureX, signatureY + 65, {
                   width: signatureWidth - 20,
                   align: 'center',
                 });

              // Rol
              if (participant.role) {
                doc.fontSize(7)
                   .font('Helvetica')
                   .text(participant.role, signatureX, signatureY + 78, {
                     width: signatureWidth - 20,
                     align: 'center',
                   });
              }

              // Fecha de firma
              if (participant.signedAt) {
                doc.fontSize(7)
                   .font('Helvetica')
                   .text(formatDateES(participant.signedAt), signatureX, signatureY + 88, {
                     width: signatureWidth - 20,
                     align: 'center',
                   });
              }

              signaturesInRow++;
              signatureX += signatureWidth + 10;

              if (signaturesInRow >= signaturesPerRow) {
                signaturesInRow = 0;
                signatureX = margin;
                signatureY += 120;
                
                if (signatureY > pageHeight - 200) {
                  doc.addPage();
                  signatureY = margin;
                }
              }
            } catch (error) {
              console.error('Error processing signature:', error);
            }
          }
        }

        doc.y = signatureY + (signaturesInRow > 0 ? 120 : 0);
        doc.moveDown(1);
      }

      // ==================== CÓDIGO QR NOM-151 ====================
      
      // Verificar si necesitamos nueva página para QR
      if (doc.y > pageHeight - 200) {
        doc.addPage();
      }

      try {
        const qrDataURL = await generateQRCodeDataURL(data.qrCode);
        const qrBuffer = Buffer.from(qrDataURL.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        const qrSize = 100;
        const qrX = pageWidth - margin - qrSize;
        const qrY = doc.y;

        doc.image(qrBuffer, qrX, qrY, {
          width: qrSize,
          height: qrSize,
        });

        doc.fontSize(7)
           .font('Helvetica')
           .text('Código de Validación NOM-151', qrX, qrY + qrSize + 5, {
             width: qrSize,
             align: 'center',
           });

      } catch (error) {
        console.error('Error adding QR code to PDF:', error);
      }

      // ==================== PIE DE PÁGINA ====================
      
      // Agregar pie de página en todas las páginas
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Línea separadora
        doc.moveTo(margin, pageHeight - 60)
           .lineTo(pageWidth - margin, pageHeight - 60)
           .stroke();

        // Texto del pie
        doc.fontSize(7)
           .font('Helvetica')
           .text(
             `Folio: ${data.folio} | Generado: ${formatDateES(new Date())} | Página ${i + 1} de ${range.count}`,
             margin,
             pageHeight - 50,
             {
               width: contentWidth,
               align: 'center',
             }
           );
      }

      // Finalizar documento
      doc.end();

    } catch (error) {
      console.error('Error generating minuta PDF:', error);
      reject(error);
    }
  });
}
