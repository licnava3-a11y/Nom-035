import jsPDF from "jspdf";
import QRCode from "qrcode";

/**
 * Helper para generar PDFs de formatos legales NOM-035
 * Incluye firmas embebidas, código QR único y foliado automático
 */

interface Signature {
  url: string;
  nombre: string;
  cargo: string;
}

interface PDFOptions {
  documentId: string;
  folio: string;
  organizacion: string;
  fecha: string;
  firmas: Signature[];
}

/**
 * Genera código QR único para el documento
 */
async function generateQRCode(documentId: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(documentId, {
      width: 150,
      margin: 1,
      errorCorrectionLevel: "H",
    });
    return qrDataURL;
  } catch (error) {
    console.error("Error generando código QR:", error);
    throw new Error("No se pudo generar el código QR");
  }
}

/**
 * Agrega pie de página con folio a todas las páginas
 */
function addFooter(doc: jsPDF, folio: string) {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(100);
    
    // Folio en la esquina inferior derecha
    doc.text(folio, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10, {
      align: "right",
    });
    
    // Número de página en el centro
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
}

/**
 * Agrega firmas embebidas desde S3
 */
async function addSignatures(doc: jsPDF, firmas: Signature[], yPosition: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const signatureWidth = 50;
  const signatureHeight = 25;
  const spacing = (pageWidth - firmas.length * signatureWidth) / (firmas.length + 1);
  
  let xPosition = spacing;
  
  for (const firma of firmas) {
    try {
      // Agregar imagen de firma desde S3
      doc.addImage(firma.url, "PNG", xPosition, yPosition, signatureWidth, signatureHeight);
      
      // Línea de firma
      doc.setLineWidth(0.5);
      doc.line(xPosition, yPosition + signatureHeight + 2, xPosition + signatureWidth, yPosition + signatureHeight + 2);
      
      // Nombre y cargo
      doc.setFontSize(9);
      doc.text(firma.nombre, xPosition + signatureWidth / 2, yPosition + signatureHeight + 7, { align: "center" });
      doc.setFontSize(8);
      doc.text(firma.cargo, xPosition + signatureWidth / 2, yPosition + signatureHeight + 12, { align: "center" });
      
      xPosition += signatureWidth + spacing;
    } catch (error) {
      console.error(`Error agregando firma de ${firma.nombre}:`, error);
      // Continuar con las demás firmas
    }
  }
}

/**
 * Genera PDF del Acta Constitutiva del Comité
 */
export async function generateActaConstitutivaPDF(data: {
  documentId: string;
  folio: string;
  organizacion: string;
  fecha: string;
  lugar: string;
  objetivo: string;
  miembros: Array<{ nombre: string; cargo: string; area: string }>;
  firmas: Signature[];
}): Promise<Buffer> {
  const doc = new jsPDF();
  let yPos = 20;
  
  // Encabezado
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ACTA CONSTITUTIVA DEL COMITÉ", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
  yPos += 10;
  
  doc.setFontSize(12);
  doc.text("Comité de Atención a Factores de Riesgo Psicosocial", doc.internal.pageSize.getWidth() / 2, yPos, {
    align: "center",
  });
  yPos += 15;
  
  // Código QR
  const qrCode = await generateQRCode(data.documentId);
  doc.addImage(qrCode, "PNG", doc.internal.pageSize.getWidth() - 40, yPos, 30, 30);
  
  // Datos generales
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Organización: ${data.organizacion}`, 20, yPos);
  yPos += 7;
  doc.text(`Fecha: ${data.fecha}`, 20, yPos);
  yPos += 7;
  doc.text(`Lugar: ${data.lugar}`, 20, yPos);
  yPos += 12;
  
  // Objetivo
  doc.setFont("helvetica", "bold");
  doc.text("OBJETIVO:", 20, yPos);
  yPos += 7;
  doc.setFont("helvetica", "normal");
  const objetivoLines = doc.splitTextToSize(data.objetivo, 170);
  doc.text(objetivoLines, 20, yPos);
  yPos += objetivoLines.length * 7 + 10;
  
  // Miembros del comité
  doc.setFont("helvetica", "bold");
  doc.text("MIEMBROS DEL COMITÉ:", 20, yPos);
  yPos += 10;
  
  doc.setFont("helvetica", "normal");
  data.miembros.forEach((miembro, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`${index + 1}. ${miembro.nombre}`, 25, yPos);
    yPos += 6;
    doc.text(`   Cargo: ${miembro.cargo}`, 25, yPos);
    yPos += 6;
    doc.text(`   Área: ${miembro.area}`, 25, yPos);
    yPos += 10;
  });
  
  // Firmas
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.text("FIRMAS DE CONFORMIDAD:", 20, yPos);
  yPos += 15;
  
  await addSignatures(doc, data.firmas, yPos);
  
  // Pie de página con folio
  addFooter(doc, data.folio);
  
  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Genera PDF de Funciones del Comité
 */
export async function generateFuncionesComitePDF(data: {
  documentId: string;
  folio: string;
  organizacion: string;
  fecha: string;
  funciones: Array<{ categoria: string; items: string[] }>;
  firmas: Signature[];
}): Promise<Buffer> {
  const doc = new jsPDF();
  let yPos = 20;
  
  // Encabezado
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FUNCIONES DEL COMITÉ", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
  yPos += 10;
  
  doc.setFontSize(12);
  doc.text("NOM-035-STPS-2018", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
  yPos += 15;
  
  // Código QR
  const qrCode = await generateQRCode(data.documentId);
  doc.addImage(qrCode, "PNG", doc.internal.pageSize.getWidth() - 40, yPos, 30, 30);
  
  // Datos generales
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Organización: ${data.organizacion}`, 20, yPos);
  yPos += 7;
  doc.text(`Fecha: ${data.fecha}`, 20, yPos);
  yPos += 15;
  
  // Funciones por categoría
  data.funciones.forEach((seccion) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(seccion.categoria, 20, yPos);
    yPos += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    seccion.items.forEach((item, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const itemLines = doc.splitTextToSize(`${index + 1}. ${item}`, 165);
      doc.text(itemLines, 25, yPos);
      yPos += itemLines.length * 5 + 3;
    });
    
    yPos += 5;
  });
  
  // Firmas
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.text("FIRMA DEL COORDINADOR:", 20, yPos);
  yPos += 15;
  
  await addSignatures(doc, data.firmas, yPos);
  
  // Pie de página con folio
  addFooter(doc, data.folio);
  
  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Genera PDF de Aceptación de Cargo
 */
export async function generateAceptacionCargoPDF(data: {
  documentId: string;
  folio: string;
  organizacion: string;
  fecha: string;
  nombreCompleto: string;
  cargo: string;
  departamento: string;
  curp: string;
  email: string;
  telefono: string;
  declaracion: string;
  firmas: Signature[];
}): Promise<Buffer> {
  const doc = new jsPDF();
  let yPos = 20;
  
  // Encabezado
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ACEPTACIÓN DE CARGO", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
  yPos += 10;
  
  doc.setFontSize(12);
  doc.text("Comité de Atención NOM-035", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
  yPos += 15;
  
  // Código QR
  const qrCode = await generateQRCode(data.documentId);
  doc.addImage(qrCode, "PNG", doc.internal.pageSize.getWidth() - 40, yPos, 30, 30);
  
  // Datos de la organización
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Organización: ${data.organizacion}`, 20, yPos);
  yPos += 7;
  doc.text(`Fecha: ${data.fecha}`, 20, yPos);
  yPos += 15;
  
  // Datos del aceptante
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL ACEPTANTE:", 20, yPos);
  yPos += 8;
  
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre: ${data.nombreCompleto}`, 20, yPos);
  yPos += 7;
  doc.text(`Cargo: ${data.cargo}`, 20, yPos);
  yPos += 7;
  doc.text(`Departamento: ${data.departamento}`, 20, yPos);
  yPos += 7;
  doc.text(`CURP: ${data.curp}`, 20, yPos);
  yPos += 7;
  doc.text(`Email: ${data.email}`, 20, yPos);
  yPos += 7;
  doc.text(`Teléfono: ${data.telefono}`, 20, yPos);
  yPos += 15;
  
  // Declaración de aceptación
  doc.setFont("helvetica", "bold");
  doc.text("DECLARACIÓN DE ACEPTACIÓN:", 20, yPos);
  yPos += 8;
  
  doc.setFont("helvetica", "normal");
  const declaracionText = `Por medio de la presente, manifiesto que acepto de manera voluntaria el cargo de ${data.cargo} en el Comité de Atención a Factores de Riesgo Psicosocial. Conozco y acepto las funciones y responsabilidades inherentes al cargo conforme a lo establecido en la NOM-035-STPS-2018.`;
  
  const declaracionLines = doc.splitTextToSize(declaracionText, 170);
  doc.text(declaracionLines, 20, yPos);
  yPos += declaracionLines.length * 7 + 10;
  
  if (data.declaracion) {
    const comentariosLines = doc.splitTextToSize(data.declaracion, 170);
    doc.text(comentariosLines, 20, yPos);
    yPos += comentariosLines.length * 7 + 10;
  }
  
  // Firmas
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.text("FIRMA DEL ACEPTANTE:", 20, yPos);
  yPos += 15;
  
  await addSignatures(doc, data.firmas, yPos);
  
  // Pie de página con folio
  addFooter(doc, data.folio);
  
  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Genera folio automático según el tipo de documento
 * Formato: CÓDIGO-CONSECUTIVO/AÑO
 */
export function generateFolio(tipoDocumento: string, consecutivo: number): string {
  const year = new Date().getFullYear();
  const codigo = {
    acta_constitutiva: "AC",
    funciones_comite: "FC",
    aceptacion_cargo: "ACC",
    acta_recorrido: "AR",
    acta_final_resultados: "AFR",
  }[tipoDocumento] || "DOC";
  
  return `${codigo}-${String(consecutivo).padStart(3, "0")}/${year}`;
}
