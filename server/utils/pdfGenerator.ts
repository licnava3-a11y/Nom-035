import Handlebars from 'handlebars';
import htmlPdf from 'html-pdf-node';
import QRCode from 'qrcode';

export interface PDFTemplateData {
  logo?: string;
  razonSocial: string;
  rfc: string;
  folio: string;
  fecha: string;
  generadoPor: string;
  numerales: Array<{
    numeral: string;
    descripcion: string;
    estado: string;
    estadoClass: string;
    ultimaVerificacion: string;
  }>;
  hallazgos: Array<{
    numeral: string;
    fecha: string;
    observaciones: string;
  }>;
  firmas: Array<{
    nombre: string;
    cargo: string;
    firmaUrl?: string;
  }>;
  qrCode: string;
}

export async function generatePDFFromTemplate(
  htmlTemplate: string,
  cssStyles: string,
  data: any
): Promise<Buffer> {
  // Compilar plantilla con Handlebars
  const template = Handlebars.compile(htmlTemplate);
  const renderedHtml = template(data);

  // Crear HTML completo con CSS
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        ${cssStyles || ''}
      </style>
    </head>
    <body>
      ${renderedHtml}
    </body>
    </html>
  `;

  // Generar PDF desde HTML
  const options = { 
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  };
  
  const file = { content: fullHtml };
  const pdfBuffer = await htmlPdf.generatePdf(file, options);

  return pdfBuffer;
}

export async function generateQRCode(url: string): Promise<string> {
  return await QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}
