import puppeteer from "puppeteer";
import { storagePut } from "../storage";

/**
 * Genera un PDF a partir de contenido HTML usando Puppeteer
 * @param html - Contenido HTML completo para convertir a PDF
 * @param fileName - Nombre del archivo PDF (sin extensión)
 * @param options - Opciones adicionales de configuración
 * @returns URL pública del PDF generado en S3
 */
export async function generatePDFFromHTML(
  html: string,
  fileName: string,
  options?: {
    format?: "A4" | "Letter" | "Legal";
    orientation?: "portrait" | "landscape";
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  }
): Promise<string> {
  let browser;

  try {
    // Lanzar navegador headless
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium-browser",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Configurar contenido HTML
    await page.setContent(html, {
      waitUntil: ["networkidle0", "domcontentloaded"],
    });

    // Generar PDF con opciones
    const pdfBuffer = await page.pdf({
      format: options?.format || "Letter",
      landscape: options?.orientation === "landscape",
      margin: options?.margin || {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
      printBackground: true,
      preferCSSPageSize: false,
    });

    // Cerrar navegador
    await browser.close();

    // Subir PDF a S3
    const fileKey = `stps-reports/${fileName}-${Date.now()}.pdf`;
    const { url } = await storagePut(fileKey, Buffer.from(pdfBuffer), "application/pdf");

    return url;
  } catch (error) {
    // Asegurar cierre del navegador en caso de error
    if (browser) {
      await browser.close();
    }
    throw new Error(`Error al generar PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Genera un PDF con plantilla Handlebars compilada
 * @param template - Función de plantilla Handlebars compilada
 * @param data - Datos para la plantilla
 * @param fileName - Nombre del archivo PDF
 * @param options - Opciones de PDF
 * @returns URL pública del PDF generado
 */
export async function generatePDFFromTemplate(
  template: (data: any) => string,
  data: any,
  fileName: string,
  options?: {
    format?: "A4" | "Letter" | "Legal";
    orientation?: "portrait" | "landscape";
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  }
): Promise<string> {
  const html = template(data);
  return generatePDFFromHTML(html, fileName, options);
}
