import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getResponsibilitiesByPosition } from "../constants/committeeResponsibilities";

interface CommitteeMemberData {
  fullName: string;
  employeeNumber: string;
  position: string;
  department: string;
  inePhotoUrl?: string;
  signatureUrl?: string;
  acceptanceDate: Date;
}

interface CompanyData {
  name: string;
  logoUrl?: string;
  legalRepName?: string;
  legalRepSignatureUrl?: string;
}

/**
 * Genera PDF de documento de aceptación de cargo en el comité
 */
export async function generatePositionAcceptancePDF(
  member: CommitteeMemberData,
  company: CompanyData,
  acceptanceId: number
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header con logo de la empresa
      if (company.logoUrl) {
        try {
          doc.image(company.logoUrl, 50, 40, { width: 80 });
        } catch (err) {
          console.error("Error loading company logo:", err);
        }
      }

      doc.fontSize(10).text(company.name, 140, 50, { width: 400 });
      doc
        .fontSize(8)
        .fillColor("#666666")
        .text("Comité de Seguridad y Salud en el Trabajo", 140, 65);
      doc.fillColor("#000000");

      // Título del documento
      doc.moveDown(3);
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("CARTA DE ACEPTACIÓN DE CARGO", { align: "center" });
      doc
        .fontSize(12)
        .font("Helvetica")
        .text("Comité de Prevención de Riesgos Psicosociales", {
          align: "center",
        });
      doc.moveDown(2);

      // Información del miembro
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("DATOS DEL MIEMBRO DEL COMITÉ", { underline: true });
      doc.moveDown(0.5);

      doc.font("Helvetica");
      doc.fontSize(10);
      doc.text(`Nombre completo: ${member.fullName}`);
      doc.text(`Número de empleado: ${member.employeeNumber}`);
      doc.text(`Departamento: ${member.department}`);
      doc.text(`Cargo en el comité: ${getPositionLabel(member.position)}`);
      doc.text(
        `Fecha de aceptación: ${member.acceptanceDate.toLocaleDateString(
          "es-MX",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        )}`
      );
      doc.moveDown(1.5);

      // Foto de INE
      if (member.inePhotoUrl) {
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("IDENTIFICACIÓN OFICIAL (INE/IFE)", { underline: true });
        doc.moveDown(0.5);
        try {
          doc.image(member.inePhotoUrl, { width: 300, align: "center" });
          doc.moveDown(1);
        } catch (err) {
          console.error("Error loading INE photo:", err);
          doc
            .fontSize(9)
            .fillColor("#999999")
            .text("(Imagen de INE no disponible)", { align: "center" });
          doc.fillColor("#000000");
          doc.moveDown(1);
        }
      }

      // Responsabilidades del cargo
      doc.addPage();
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("RESPONSABILIDADES DEL CARGO", { underline: true });
      doc.moveDown(0.5);

      const responsibilities = getResponsibilitiesByPosition(member.position);
      doc.fontSize(9).font("Helvetica").text(responsibilities, {
        align: "justify",
        lineGap: 2,
      });

      doc.moveDown(2);

      // Declaración de aceptación
      doc.fontSize(10).font("Helvetica");
      doc.text(
        `Yo, ${member.fullName}, manifiesto mi aceptación voluntaria para desempeñar el cargo de ${getPositionLabel(
          member.position
        )} en el Comité de Prevención de Riesgos Psicosociales de ${company.name}, comprometiéndome a cumplir con las responsabilidades inherentes al cargo y a contribuir activamente en la prevención de factores de riesgo psicosocial en el centro de trabajo, en cumplimiento con la NOM-035-STPS-2018.`,
        { align: "justify" }
      );

      doc.moveDown(3);

      // Firma del miembro
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("FIRMA DEL MIEMBRO DEL COMITÉ", { align: "center" });
      doc.moveDown(0.5);

      if (member.signatureUrl) {
        try {
          doc.image(member.signatureUrl, { width: 200, align: "center" });
        } catch (err) {
          console.error("Error loading member signature:", err);
        }
      }

      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .font("Helvetica")
        .text("_".repeat(50), { align: "center" });
      doc.text(member.fullName, { align: "center" });
      doc.text(getPositionLabel(member.position), { align: "center" });

      doc.moveDown(2);

      // Firma del representante legal (opcional)
      if (company.legalRepName && company.legalRepSignatureUrl) {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text("REPRESENTANTE LEGAL DE LA EMPRESA", { align: "center" });
        doc.moveDown(0.5);

        try {
          doc.image(company.legalRepSignatureUrl, {
            width: 200,
            align: "center",
          });
        } catch (err) {
          console.error("Error loading legal rep signature:", err);
        }

        doc.moveDown(0.5);
        doc
          .fontSize(9)
          .font("Helvetica")
          .text("_".repeat(50), { align: "center" });
        doc.text(company.legalRepName, { align: "center" });
        doc.text("Representante Legal", { align: "center" });
      }

      // Código QR NOM-151 (validación)
      const qrData = `ACCEPTANCE-${acceptanceId}-${member.employeeNumber}-${Date.now()}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 100 });

      doc.moveDown(2);
      doc.image(qrCodeDataURL, doc.page.width - 150, doc.page.height - 150, {
        width: 100,
      });
      doc
        .fontSize(7)
        .fillColor("#666666")
        .text(
          "Código de validación NOM-151",
          doc.page.width - 150,
          doc.page.height - 45,
          {
            width: 100,
            align: "center",
          }
        );

      // Footer con folio
      const folio = `AC-${String(acceptanceId).padStart(6, "0")}/${new Date().getFullYear()}`;
      doc
        .fontSize(8)
        .fillColor("#666666")
        .text(folio, 50, doc.page.height - 30, {
          width: doc.page.width - 100,
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Obtener etiqueta legible del cargo
 */
function getPositionLabel(position: string): string {
  const labels: Record<string, string> = {
    president: "Presidente",
    secretary: "Secretario",
    vocal: "Vocal",
    alternate: "Suplente",
    advisor: "Asesor",
  };
  return labels[position] || position;
}
