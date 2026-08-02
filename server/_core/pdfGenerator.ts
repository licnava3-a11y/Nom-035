import { storagePut } from "../storage";

/**
 * Genera un PDF a partir de contenido HTML usando Puppeteer (import dinámico)
 * El import dinámico evita que el módulo se cargue al arrancar el servidor,
 * previniendo el segfault en Cloud Run cuando Chromium no está disponible.
 *
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
  let browser: any;

  // Import dinámico — puppeteer solo se carga cuando se necesita, no al arrancar
  let puppeteer: any;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch (importErr) {
    throw new Error(
      "Puppeteer no está disponible en este entorno. La generación de PDF requiere Chromium instalado."
    );
  }

  try {
    // Detectar el ejecutable de Chromium disponible
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      process.env.CHROMIUM_PATH ||
      (await findChromiumExecutable());

    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--single-process",
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ["networkidle0", "domcontentloaded"],
    });

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

    await browser.close();

    const fileKey = `compliance-reports/${fileName}-${Date.now()}.pdf`;
    const { url } = await storagePut(fileKey, Buffer.from(pdfBuffer), "application/pdf");

    return url;
  } catch (error) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    throw new Error(`Error al generar PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Detecta el ejecutable de Chromium disponible en el sistema
 */
async function findChromiumExecutable(): Promise<string> {
  const { existsSync } = await import("fs");
  const candidates = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  // Fallback: dejar que puppeteer use su propio Chromium descargado
  return "";
}

/**
 * Genera un PDF con plantilla Handlebars compilada
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
