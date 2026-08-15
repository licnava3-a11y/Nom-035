import Handlebars from 'handlebars';
// Import dinámico: evita cargar Chromium durante el arranque del servidor.
// Se usa Puppeteer actualizado directamente para no depender de html-pdf-node.
let _puppeteer: typeof import("puppeteer").default | null = null;
async function getPuppeteer(): Promise<typeof import("puppeteer").default> {
  if (!_puppeteer) {
    try {
      _puppeteer = (await import("puppeteer")).default;
    } catch {
      throw new Error("Puppeteer no está disponible. Requiere Chromium instalado.");
    }
  }
  return _puppeteer;
}
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
  const options: import("puppeteer").PDFOptions = {
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  };
  
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "load" });
    return Buffer.from(await page.pdf(options));
  } finally {
    await browser.close();
  }
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
