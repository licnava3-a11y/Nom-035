import PDFDocument from "pdfkit";
import { storagePut } from "../storage";

interface CertificateData {
  memberName: string;
  programTitle: string;
  sessionDate: Date;
  duration: number; // horas
  instructorName: string;
  companyName?: string;
}

/**
 * Genera un certificado PDF de capacitación para un miembro del comité
 * @param data Datos del certificado
 * @returns URL del PDF generado en S3
 */
export async function generateCommitteeCertificatePDF(
  data: CertificateData
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const fileName = `certificate-${data.memberName.replace(/\s+/g, "-")}-${Date.now()}.pdf`;
          const { url } = await storagePut(
            `committee-certificates/${fileName}`,
            pdfBuffer,
            "application/pdf"
          );
          resolve(url);
        } catch (error) {
          reject(error);
        }
      });

      // Encabezado
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("CONSTANCIA DE CAPACITACIÓN", { align: "center" })
        .moveDown(2);

      // Cuerpo del certificado
      doc
        .fontSize(14)
        .font("Helvetica")
        .text("Se otorga la presente constancia a:", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(data.memberName.toUpperCase(), { align: "center" })
        .moveDown(1);

      doc
        .fontSize(14)
        .font("Helvetica")
        .text(
          "Por haber asistido y completado satisfactoriamente el programa de capacitación:",
          { align: "center" }
        )
        .moveDown(0.5);

      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(data.programTitle, { align: "center" })
        .moveDown(1);

      // Detalles
      const formattedDate = data.sessionDate.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Fecha: ${formattedDate}`, { align: "center" })
        .text(`Duración: ${data.duration} horas`, { align: "center" })
        .text(`Instructor: ${data.instructorName}`, { align: "center" })
        .moveDown(3);

      // Firma
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("_______________________________", { align: "center" })
        .text("Firma del Responsable", { align: "center" })
        .moveDown(0.5);

      if (data.companyName) {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(data.companyName, { align: "center" });
      }

      // Pie de página
      doc
        .fontSize(8)
        .font("Helvetica")
        .text(
          `Certificado generado el ${new Date().toLocaleDateString("es-MX")} - Sistema de Gestión NOM-035`,
          50,
          doc.page.height - 30,
          { align: "center" }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
