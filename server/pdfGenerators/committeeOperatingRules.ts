import PDFDocument from "pdfkit";
import QRCode from "qrcode";

interface OperatingRulesData {
  companyName: string;
  companyRFC: string;
  companyAddress: string;
  approvalDate: string;
  approvalPlace: string;
  members: Array<{
    name: string;
    position: string;
    department: string;
  }>;
  logoUrl?: string;
  folio: string;
}

export async function generateOperatingRulesPDF(data: OperatingRulesData): Promise<Buffer> {
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

      // Header with logo
      if (data.logoUrl) {
        try {
          doc.image(data.logoUrl, 50, 40, { width: 80 });
        } catch (error) {
          console.error("Error loading logo:", error);
        }
      }

      // Title
      doc.fontSize(16).font("Helvetica-Bold").text("BASES DE FUNCIONAMIENTO", 50, 80, {
        align: "center",
      });
      doc.fontSize(14).text("COMITÉ DE SEGURIDAD Y SALUD EN EL TRABAJO", 50, 100, {
        align: "center",
      });
      doc.fontSize(10).font("Helvetica").text(`NOM-035-STPS-2018`, 50, 120, {
        align: "center",
      });

      doc.moveDown(2);

      // Company data
      doc.fontSize(10).font("Helvetica-Bold").text("Datos de la Empresa:", 50, doc.y);
      doc.font("Helvetica");
      doc.text(`Razón Social: ${data.companyName}`, 50, doc.y + 5);
      doc.text(`RFC: ${data.companyRFC}`, 50, doc.y + 5);
      doc.text(`Domicilio: ${data.companyAddress}`, 50, doc.y + 5);
      doc.text(`Fecha de Aprobación: ${new Date(data.approvalDate).toLocaleDateString("es-MX")}`, 50, doc.y + 5);
      doc.text(`Lugar: ${data.approvalPlace}`, 50, doc.y + 5);

      doc.moveDown(1.5);

      // CAPÍTULO I: DISPOSICIONES GENERALES
      doc.addPage();
      doc.fontSize(12).font("Helvetica-Bold").text("CAPÍTULO I", 50, 50);
      doc.text("DISPOSICIONES GENERALES", 50, doc.y + 5);
      doc.moveDown(1);

      doc.fontSize(10).font("Helvetica-Bold").text("Artículo 1. Objeto", 50, doc.y);
      doc.font("Helvetica").text(
        "Las presentes Bases de Funcionamiento tienen por objeto establecer las normas y procedimientos que regirán el funcionamiento del Comité de Seguridad y Salud en el Trabajo, en cumplimiento con la NOM-035-STPS-2018.",
        50,
        doc.y + 5,
        { align: "justify" }
      );
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Artículo 2. Fundamento Legal", 50, doc.y);
      doc.font("Helvetica").text(
        "El Comité se constituye en cumplimiento con lo establecido en la NOM-035-STPS-2018 'Factores de riesgo psicosocial en el trabajo-Identificación, análisis y prevención', publicada en el Diario Oficial de la Federación.",
        50,
        doc.y + 5,
        { align: "justify" }
      );
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Artículo 3. Ámbito de Aplicación", 50, doc.y);
      doc.font("Helvetica").text(
        "Las presentes bases son de observancia obligatoria para todos los miembros del Comité y aplicables en todos los centros de trabajo de la organización.",
        50,
        doc.y + 5,
        { align: "justify" }
      );

      // CAPÍTULO II: INTEGRACIÓN
      doc.addPage();
      doc.fontSize(12).font("Helvetica-Bold").text("CAPÍTULO II", 50, 50);
      doc.text("INTEGRACIÓN DEL COMITÉ", 50, doc.y + 5);
      doc.moveDown(1);

      doc.fontSize(10).font("Helvetica-Bold").text("Artículo 4. Composición", 50, doc.y);
      doc.font("Helvetica").text(
        "El Comité estará integrado por representantes del patrón y de los trabajadores, en igual proporción, conforme a lo siguiente:",
        50,
        doc.y + 5,
        { align: "justify" }
      );
      doc.moveDown(0.5);

      // List members
      data.members.forEach((member: any, index: number) => {
        doc.text(`${index + 1}. ${member.name} - ${member.position} (${member.department})`, 70, doc.y + 5);
      });

      doc.moveDown(1);
      doc.font("Helvetica-Bold").text("Artículo 5. Duración del Cargo", 50, doc.y);
      doc.font("Helvetica").text(
        "Los miembros del Comité durarán en su cargo un período de dos años, pudiendo ser reelectos por períodos iguales.",
        50,
        doc.y + 5,
        { align: "justify" }
      );

      // CAPÍTULO III: FUNCIONES
      doc.addPage();
      doc.fontSize(12).font("Helvetica-Bold").text("CAPÍTULO III", 50, 50);
      doc.text("FUNCIONES DEL COMITÉ", 50, doc.y + 5);
      doc.moveDown(1);

      doc.fontSize(10).font("Helvetica-Bold").text("Artículo 6. Funciones Generales", 50, doc.y);
      doc.font("Helvetica").text("El Comité tendrá las siguientes funciones:", 50, doc.y + 5, { align: "justify" });
      doc.moveDown(0.5);

      const functions = [
        "Establecer, implementar, mantener y difundir en el centro de trabajo una política de prevención de riesgos psicosociales",
        "Identificar y analizar los factores de riesgo psicosocial y evaluar el entorno organizacional favorable",
        "Adoptar las medidas para prevenir y controlar los factores de riesgo psicosocial",
        "Promover el entorno organizacional favorable y la prevención de la violencia laboral",
        "Practicar exámenes médicos y evaluaciones psicológicas a los trabajadores expuestos a violencia laboral",
        "Difundir y proporcionar información a los trabajadores sobre la política de prevención de riesgos psicosociales",
        "Llevar los registros sobre los resultados de la identificación y análisis de los factores de riesgo psicosocial",
        "Informar a la autoridad del trabajo los resultados de las evaluaciones",
      ];

      functions.forEach((func: any, index: number) => {
        doc.text(`${index + 1}. ${func}`, 70, doc.y + 5, { align: "justify" });
        doc.moveDown(0.5);
      });

      // CAPÍTULO IV: REUNIONES
      doc.addPage();
      doc.fontSize(12).font("Helvetica-Bold").text("CAPÍTULO IV", 50, 50);
      doc.text("REUNIONES DEL COMITÉ", 50, doc.y + 5);
      doc.moveDown(1);

      doc.fontSize(10).font("Helvetica-Bold").text("Artículo 7. Periodicidad", 50, doc.y);
      doc.font("Helvetica").text(
        "El Comité se reunirá de manera ordinaria al menos una vez cada tres meses, y de manera extraordinaria cuando sea necesario.",
        50,
        doc.y + 5,
        { align: "justify" }
      );
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Artículo 8. Convocatoria", 50, doc.y);
      doc.font("Helvetica").text(
        "Las reuniones serán convocadas por el Presidente del Comité con al menos cinco días hábiles de anticipación, salvo casos de urgencia.",
        50,
        doc.y + 5,
        { align: "justify" }
      );
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Artículo 9. Quórum", 50, doc.y);
      doc.font("Helvetica").text(
        "Para que las reuniones del Comité sean válidas, deberá estar presente al menos el 50% más uno de sus integrantes.",
        50,
        doc.y + 5,
        { align: "justify" }
      );
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Artículo 10. Actas", 50, doc.y);
      doc.font("Helvetica").text(
        "De cada reunión se levantará un acta que contendrá los acuerdos tomados y será firmada por todos los asistentes.",
        50,
        doc.y + 5,
        { align: "justify" }
      );

      // CAPÍTULO V: ATRIBUCIONES
      doc.addPage();
      doc.fontSize(12).font("Helvetica-Bold").text("CAPÍTULO V", 50, 50);
      doc.text("ATRIBUCIONES DE LOS MIEMBROS", 50, doc.y + 5);
      doc.moveDown(1);

      doc.fontSize(10).font("Helvetica-Bold").text("Artículo 11. Del Presidente", 50, doc.y);
      doc.font("Helvetica");
      doc.text("1. Convocar y presidir las reuniones del Comité", 70, doc.y + 5);
      doc.text("2. Vigilar el cumplimiento de los acuerdos tomados", 70, doc.y + 5);
      doc.text("3. Representar al Comité ante las autoridades competentes", 70, doc.y + 5);
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Artículo 12. Del Secretario", 50, doc.y);
      doc.font("Helvetica");
      doc.text("1. Elaborar y distribuir las convocatorias", 70, doc.y + 5);
      doc.text("2. Levantar las actas de las reuniones", 70, doc.y + 5);
      doc.text("3. Mantener el archivo documental del Comité", 70, doc.y + 5);
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Artículo 13. De los Vocales", 50, doc.y);
      doc.font("Helvetica");
      doc.text("1. Asistir puntualmente a las reuniones", 70, doc.y + 5);
      doc.text("2. Participar activamente en las deliberaciones", 70, doc.y + 5);
      doc.text("3. Ejecutar las comisiones que les sean encomendadas", 70, doc.y + 5);

      // Signatures section
      doc.addPage();
      doc.fontSize(12).font("Helvetica-Bold").text("FIRMAS DE CONFORMIDAD", 50, 50, { align: "center" });
      doc.moveDown(2);

      doc.fontSize(10).font("Helvetica").text(
        "Los abajo firmantes, en nuestra calidad de miembros del Comité de Seguridad y Salud en el Trabajo, manifestamos nuestra conformidad con las presentes Bases de Funcionamiento.",
        50,
        doc.y,
        { align: "justify" }
      );
      doc.moveDown(2);

      // Signature spaces for all members
      let yPosition = doc.y;
      const signatureHeight = 80;
      const signaturesPerPage = 3;

      data.members.forEach((member: any, index: number) => {
        if (index > 0 && index % signaturesPerPage === 0) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(10).font("Helvetica");
        doc.text("_".repeat(40), 50, yPosition + signatureHeight);
        doc.text(member.name, 50, yPosition + signatureHeight + 15, { align: "center", width: 200 });
        doc.text(member.position, 50, yPosition + signatureHeight + 30, { align: "center", width: 200 });

        yPosition += signatureHeight + 60;
      });

      // QR Code for NOM-151 validation
      const qrData = JSON.stringify({
        tipo: "BASES_FUNCIONAMIENTO_COMITE",
        folio: data.folio,
        empresa: data.companyRFC,
        fecha: data.approvalDate,
        norma: "NOM-151-SCFI-2016",
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 100 });
      doc.image(qrCodeDataUrl, 450, 700, { width: 80 });
      doc.fontSize(8).text("Código QR NOM-151", 445, 785, { width: 90, align: "center" });

      // Footer with folio
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Folio: ${data.folio} | Página ${i + 1} de ${pageCount}`,
          50,
          doc.page.height - 30,
          {
            align: "center",
            width: doc.page.width - 100,
          }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
