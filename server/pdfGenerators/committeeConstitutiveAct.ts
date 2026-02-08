import PDFDocument from "pdfkit";
import QRCode from "qrcode";

interface CommitteeMember {
  name: string;
  position: string;
  department: string;
}

interface ConstitutiveActData {
  companyName: string;
  companyRFC: string;
  companyAddress: string;
  constitutionDate: string;
  constitutionPlace: string;
  members: CommitteeMember[];
  logoUrl?: string;
  folio: string;
}

export async function generateConstitutiveActPDF(data: ConstitutiveActData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "letter", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header with logo
      if (data.logoUrl) {
        try {
          doc.image(data.logoUrl, 50, 40, { width: 80 });
        } catch (error) {
          console.error("Error loading logo:", error);
        }
      }

      // Title
      doc.fontSize(16).font("Helvetica-Bold").text("ACTA CONSTITUTIVA DEL COMITÉ", 50, 140, { align: "center" });
      doc.fontSize(14).text("DE SEGURIDAD Y SALUD EN EL TRABAJO", { align: "center" });
      doc.moveDown(2);

      // Company data
      doc.fontSize(11).font("Helvetica");
      doc.text(`Razón Social: ${data.companyName}`, { align: "left" });
      doc.text(`RFC: ${data.companyRFC}`);
      doc.text(`Domicilio: ${data.companyAddress}`);
      doc.moveDown();

      // Constitution date and place
      doc.text(`En ${data.constitutionPlace}, siendo las ${new Date(data.constitutionDate).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} horas del día ${new Date(data.constitutionDate).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}, se reunieron los trabajadores y representantes de la empresa ${data.companyName} con el objeto de constituir el Comité de Seguridad y Salud en el Trabajo, en cumplimiento con lo dispuesto en la NOM-035-STPS-2018.`);
      doc.moveDown();

      // Objectives
      doc.fontSize(12).font("Helvetica-Bold").text("OBJETIVOS DEL COMITÉ:");
      doc.fontSize(10).font("Helvetica");
      doc.list([
        "Identificar, analizar y prevenir los factores de riesgo psicosocial en el centro de trabajo.",
        "Promover un entorno organizacional favorable.",
        "Atender las prácticas opuestas al entorno organizacional favorable y los actos de violencia laboral.",
        "Realizar actividades de sensibilización, formación e información.",
        "Proponer medidas preventivas y correctivas.",
      ], { bulletRadius: 2, textIndent: 15 });
      doc.moveDown();

      // Committee members
      doc.fontSize(12).font("Helvetica-Bold").text("INTEGRACIÓN DEL COMITÉ:");
      doc.fontSize(10).font("Helvetica");
      doc.moveDown(0.5);

      data.members.forEach((member, index) => {
        doc.text(`${index + 1}. ${member.name} - ${member.position}`, { continued: false });
        doc.fontSize(9).fillColor("#666").text(`   Departamento: ${member.department}`, { continued: false });
        doc.fontSize(10).fillColor("#000");
        doc.moveDown(0.3);
      });

      doc.moveDown();

      // Closing statement
      doc.fontSize(10).font("Helvetica");
      doc.text("Siendo las __________ horas del mismo día, se da por concluida la presente reunión, firmando de conformidad los que en ella intervinieron.");
      doc.moveDown(2);

      // Signatures section
      doc.fontSize(11).font("Helvetica-Bold").text("FIRMAS DE CONFORMIDAD:");
      doc.moveDown();

      const signatureY = doc.y;
      const pageWidth = doc.page.width - 100;
      const signatureWidth = pageWidth / 2 - 20;

      let currentX = 50;
      let currentY = signatureY;
      let column = 0;

      data.members.forEach((member, index) => {
        if (column === 2) {
          column = 0;
          currentX = 50;
          currentY += 80;
        }

        doc.fontSize(9).font("Helvetica");
        doc.moveTo(currentX, currentY + 40).lineTo(currentX + signatureWidth, currentY + 40).stroke();
        doc.text(member.name, currentX, currentY + 45, { width: signatureWidth, align: "center" });
        doc.text(member.position, currentX, currentY + 58, { width: signatureWidth, align: "center" });

        currentX += signatureWidth + 40;
        column++;
      });

      // QR Code for NOM-151 validation
      const qrData = `ACTA-CONSTITUTIVA-${data.folio}-${data.companyRFC}-${new Date(data.constitutionDate).toISOString()}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 80 });
      const qrBuffer = Buffer.from(qrCodeDataURL.split(",")[1], "base64");

      doc.image(qrBuffer, doc.page.width - 130, doc.page.height - 130, { width: 80 });

      // Footer with folio
      doc.fontSize(8).fillColor("#666");
      doc.text(`Folio: ${data.folio}`, 50, doc.page.height - 50, { align: "left" });
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString("es-MX")}`, { align: "right" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
