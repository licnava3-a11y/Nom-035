/**
 * Committee Documents PDF Generation Service
 * Servicio para generar PDFs profesionales de documentos del comité NOM-035
 * - Actas de reunión
 * - Reportes anuales
 * - Bases de funcionamiento
 */

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PDFOptions {
  title: string;
  subtitle?: string;
  folio: string;
  date: Date;
  version?: string;
}

interface SignatureData {
  name: string;
  position: string;
  signatureImage?: string; // Base64 encoded image
  signedAt?: Date;
}

/**
 * Clase base para generación de PDFs del comité
 */
export class CommitteePDFGenerator {
  private doc: PDFKit.PDFDocument;
  private pageMargin = 50;
  private pageWidth = 612; // Letter size
  private pageHeight = 792;
  private currentY = 0;

  constructor() {
    this.doc = new PDFDocument({
      size: "LETTER",
      margins: {
        top: this.pageMargin,
        bottom: this.pageMargin,
        left: this.pageMargin,
        right: this.pageMargin,
      },
    });
    this.currentY = this.pageMargin;
  }

  /**
   * Obtener el documento PDF
   */
  getDocument(): PDFKit.PDFDocument {
    return this.doc;
  }

  /**
   * Agregar encabezado del documento
   */
  async addHeader(options: PDFOptions, logoPath?: string) {
    const { title, subtitle, folio, date, version } = options;

    // Logo (si existe)
    if (logoPath) {
      try {
        this.doc.image(logoPath, this.pageMargin, this.currentY, {
          width: 80,
          height: 80,
        });
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    }

    // Título del documento
    this.doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(title, this.pageMargin + 100, this.currentY, {
        width: this.pageWidth - this.pageMargin * 2 - 100,
        align: "center",
      });

    this.currentY += 30;

    // Subtítulo (si existe)
    if (subtitle) {
      this.doc
        .fontSize(12)
        .font("Helvetica")
        .text(subtitle, this.pageMargin, this.currentY, {
          width: this.pageWidth - this.pageMargin * 2,
          align: "center",
        });
      this.currentY += 25;
    }

    // Información del documento (folio, fecha, versión)
    const infoY = this.currentY;
    this.doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Folio:", this.pageMargin, infoY)
      .font("Helvetica")
      .text(folio, this.pageMargin + 50, infoY);

    this.doc
      .font("Helvetica-Bold")
      .text("Fecha:", this.pageWidth - 200, infoY)
      .font("Helvetica")
      .text(
        format(date, "dd/MM/yyyy", { locale: es }),
        this.pageWidth - 150,
        infoY
      );

    if (version) {
      this.currentY += 15;
      this.doc
        .font("Helvetica-Bold")
        .text("Versión:", this.pageMargin, this.currentY)
        .font("Helvetica")
        .text(version, this.pageMargin + 50, this.currentY);
    }

    this.currentY += 30;

    // Línea separadora
    this.doc
      .moveTo(this.pageMargin, this.currentY)
      .lineTo(this.pageWidth - this.pageMargin, this.currentY)
      .stroke();

    this.currentY += 20;
  }

  /**
   * Agregar sección con título
   */
  addSection(title: string, content: string) {
    // Verificar si necesitamos nueva página
    if (this.currentY > this.pageHeight - 150) {
      this.doc.addPage();
      this.currentY = this.pageMargin;
    }

    // Título de la sección
    this.doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(title, this.pageMargin, this.currentY);

    this.currentY += 20;

    // Contenido de la sección
    this.doc
      .fontSize(10)
      .font("Helvetica")
      .text(content, this.pageMargin, this.currentY, {
        width: this.pageWidth - this.pageMargin * 2,
        align: "justify",
      });

    this.currentY = this.doc.y + 15;
  }

  /**
   * Agregar lista con viñetas
   */
  addBulletList(title: string, items: string[]) {
    // Verificar si necesitamos nueva página
    if (this.currentY > this.pageHeight - 150) {
      this.doc.addPage();
      this.currentY = this.pageMargin;
    }

    // Título de la lista
    this.doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(title, this.pageMargin, this.currentY);

    this.currentY += 20;

    // Items de la lista
    items.forEach((item: any) => {
      this.doc
        .fontSize(10)
        .font("Helvetica")
        .text("•", this.pageMargin, this.currentY)
        .text(item, this.pageMargin + 15, this.currentY, {
          width: this.pageWidth - this.pageMargin * 2 - 15,
          align: "justify",
        });

      this.currentY = this.doc.y + 5;
    });

    this.currentY += 10;
  }

  /**
   * Agregar tabla simple
   */
  addTable(headers: string[], rows: string[][]) {
    // Verificar si necesitamos nueva página
    if (this.currentY > this.pageHeight - 200) {
      this.doc.addPage();
      this.currentY = this.pageMargin;
    }

    const tableWidth = this.pageWidth - this.pageMargin * 2;
    const colWidth = tableWidth / headers.length;
    const rowHeight = 25;

    // Encabezados
    this.doc.fontSize(10).font("Helvetica-Bold");
    headers.forEach((header: any, i: number) => {
      this.doc
        .rect(
          this.pageMargin + i * colWidth,
          this.currentY,
          colWidth,
          rowHeight
        )
        .stroke();
      this.doc.text(
        header,
        this.pageMargin + i * colWidth + 5,
        this.currentY + 8,
        {
          width: colWidth - 10,
          align: "center",
        }
      );
    });

    this.currentY += rowHeight;

    // Filas
    this.doc.font("Helvetica");
    rows.forEach((row: any) => {
      row.forEach((cell: any, i: number) => {
        this.doc
          .rect(
            this.pageMargin + i * colWidth,
            this.currentY,
            colWidth,
            rowHeight
          )
          .stroke();
        this.doc.text(
          cell,
          this.pageMargin + i * colWidth + 5,
          this.currentY + 8,
          {
            width: colWidth - 10,
            align: "center",
          }
        );
      });
      this.currentY += rowHeight;
    });

    this.currentY += 15;
  }

  /**
   * Agregar firmas digitales
   */
  async addSignatures(signatures: SignatureData[]) {
    // Nueva página para firmas
    this.doc.addPage();
    this.currentY = this.pageMargin;

    this.doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Firmas de Aprobación", this.pageMargin, this.currentY, {
        width: this.pageWidth - this.pageMargin * 2,
        align: "center",
      });

    this.currentY += 30;

    const signaturesPerRow = 2;
    const signatureWidth =
      (this.pageWidth - this.pageMargin * 2 - 40) / signaturesPerRow;
    const signatureHeight = 100;

    for (let i = 0; i < signatures.length; i++) {
      const signature = signatures[i];
      const col = i % signaturesPerRow;
      const row = Math.floor(i / signaturesPerRow);

      const x = this.pageMargin + col * (signatureWidth + 20);
      const y = this.currentY + row * (signatureHeight + 60);

      // Verificar si necesitamos nueva página
      if (y > this.pageHeight - 200) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
        continue;
      }

      // Imagen de firma (si existe)
      if (signature.signatureImage) {
        try {
          const signatureBuffer = Buffer.from(
            signature.signatureImage.replace(/^data:image\/\w+;base64,/, ""),
            "base64"
          );
          this.doc.image(signatureBuffer, x, y, {
            width: signatureWidth,
            height: 60,
            fit: [signatureWidth, 60],
          });
        } catch (error) {
          console.error("Error loading signature image:", error);
        }
      }

      // Línea de firma
      this.doc
        .moveTo(x, y + 70)
        .lineTo(x + signatureWidth, y + 70)
        .stroke();

      // Nombre y cargo
      this.doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(signature.name, x, y + 75, {
          width: signatureWidth,
          align: "center",
        });

      this.doc
        .fontSize(9)
        .font("Helvetica")
        .text(signature.position, x, y + 90, {
          width: signatureWidth,
          align: "center",
        });

      // Fecha de firma (si existe)
      if (signature.signedAt) {
        this.doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            format(signature.signedAt, "dd/MM/yyyy HH:mm", { locale: es }),
            x,
            y + 105,
            {
              width: signatureWidth,
              align: "center",
            }
          );
      }
    }

    this.currentY +=
      Math.ceil(signatures.length / signaturesPerRow) * (signatureHeight + 60);
  }

  /**
   * Agregar pie de página con QR y numeración
   */
  async addFooter(folio: string, qrData: string) {
    const pages = this.doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      this.doc.switchToPage(i);

      // Generar QR code
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 80,
          margin: 1,
        });
        const qrBuffer = Buffer.from(
          qrCodeDataURL.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        );

        this.doc.image(qrBuffer, this.pageMargin, this.pageHeight - 100, {
          width: 60,
          height: 60,
        });
      } catch (error) {
        console.error("Error generating QR code:", error);
      }

      // Folio y numeración de página
      this.doc
        .fontSize(8)
        .font("Helvetica")
        .text(
          `${folio} | Página ${i + 1} de ${pages.count}`,
          this.pageMargin + 80,
          this.pageHeight - 70,
          {
            width: this.pageWidth - this.pageMargin * 2 - 80,
            align: "center",
          }
        );

      // Nota de validez
      this.doc
        .fontSize(7)
        .font("Helvetica")
        .text(
          "Este documento es válido únicamente con el código QR de verificación",
          this.pageMargin,
          this.pageHeight - 50,
          {
            width: this.pageWidth - this.pageMargin * 2,
            align: "center",
          }
        );
    }
  }

  /**
   * Finalizar documento
   */
  finalize() {
    this.doc.end();
  }
}

/**
 * Generar PDF de Acta de Comité
 */
export async function generateCommitteeMinutePDF(data: {
  folio: string;
  meetingDate: Date;
  meetingType: string;
  location: string;
  agenda: string[];
  discussions: string;
  agreements: string[];
  attendance: Array<{ name: string; position: string; attended: boolean }>;
  signatures: SignatureData[];
  nextMeetingDate?: Date;
}): Promise<PDFKit.PDFDocument> {
  const generator = new CommitteePDFGenerator();

  // Encabezado
  await generator.addHeader({
    title: "ACTA DE REUNIÓN DEL COMITÉ NOM-035",
    subtitle: `Reunión ${data.meetingType}`,
    folio: data.folio,
    date: data.meetingDate,
    version: "1.0",
  });

  // Información de la reunión
  generator.addSection(
    "Datos de la Reunión",
    `Fecha: ${format(data.meetingDate, "dd/MM/yyyy HH:mm", { locale: es })}\n` +
      `Tipo: ${data.meetingType}\n` +
      `Lugar: ${data.location}`
  );

  // Orden del día
  generator.addBulletList("Orden del Día", data.agenda);

  // Desarrollo de la reunión
  generator.addSection("Desarrollo de la Reunión", data.discussions);

  // Acuerdos
  generator.addBulletList("Acuerdos Tomados", data.agreements);

  // Asistencia
  const attendanceHeaders = ["Nombre", "Cargo", "Asistencia"];
  const attendanceRows = data.attendance.map((a: any) => [
    a.name,
    a.position,
    a.attended ? "✓" : "✗",
  ]);
  generator.addTable(attendanceHeaders, attendanceRows);

  // Próxima reunión
  if (data.nextMeetingDate) {
    generator.addSection(
      "Próxima Reunión",
      `Fecha programada: ${format(data.nextMeetingDate, "dd/MM/yyyy HH:mm", { locale: es })}`
    );
  }

  // Firmas
  await generator.addSignatures(data.signatures);

  // Pie de página con QR
  const qrData = `https://nom035.manus.space/committee/minutes/${data.folio}`;
  await generator.addFooter(data.folio, qrData);

  generator.finalize();

  return generator.getDocument();
}

/**
 * Generar PDF de Reporte Anual
 */
export async function generateAnnualReportPDF(data: {
  folio: string;
  reportYear: number;
  executiveSummary: string;
  metrics: {
    totalMeetings: number;
    averageAttendance: number;
    trainingsCompleted: number;
    casesHandled: number;
  };
  activities: string[];
  recommendations: string;
  actionPlan: string;
  signatures: SignatureData[];
}): Promise<PDFKit.PDFDocument> {
  const generator = new CommitteePDFGenerator();

  // Encabezado
  await generator.addHeader({
    title: "REPORTE ANUAL DEL COMITÉ NOM-035",
    subtitle: `Año ${data.reportYear}`,
    folio: data.folio,
    date: new Date(),
    version: "1.0",
  });

  // Resumen ejecutivo
  generator.addSection("Resumen Ejecutivo", data.executiveSummary);

  // Métricas clave
  generator.addSection(
    "Métricas Clave",
    `Total de reuniones realizadas: ${data.metrics.totalMeetings}\n` +
      `Asistencia promedio: ${data.metrics.averageAttendance}%\n` +
      `Capacitaciones completadas: ${data.metrics.trainingsCompleted}\n` +
      `Casos atendidos: ${data.metrics.casesHandled}`
  );

  // Actividades realizadas
  generator.addBulletList("Actividades Realizadas", data.activities);

  // Recomendaciones
  generator.addSection("Recomendaciones", data.recommendations);

  // Plan de acción
  generator.addSection(
    "Plan de Acción para el Siguiente Periodo",
    data.actionPlan
  );

  // Firmas
  await generator.addSignatures(data.signatures);

  // Pie de página con QR
  const qrData = `https://nom035.manus.space/committee/annual-report/${data.folio}`;
  await generator.addFooter(data.folio, qrData);

  generator.finalize();

  return generator.getDocument();
}

/**
 * Generar PDF de Bases de Funcionamiento
 */
export async function generateOperatingRulesPDF(data: {
  version: string;
  effectiveDate: Date;
  objectives: string;
  structure: string;
  roles: Array<{ role: string; responsibilities: string[] }>;
  meetingFrequency: string;
  quorum: string;
  decisionMaking: string;
  signatures: SignatureData[];
}): Promise<PDFKit.PDFDocument> {
  const generator = new CommitteePDFGenerator();

  // Encabezado
  await generator.addHeader({
    title: "BASES DE FUNCIONAMIENTO DEL COMITÉ NOM-035",
    subtitle: "Reglamento Interno",
    folio: `BFC-${data.version}`,
    date: data.effectiveDate,
    version: data.version,
  });

  // Objetivos
  generator.addSection("Objetivos del Comité", data.objectives);

  // Estructura
  generator.addSection(
    "Integración y Estructura Organizacional",
    data.structure
  );

  // Roles y responsabilidades
  data.roles.forEach((role: any) => {
    generator.addBulletList(
      `Funciones y Responsabilidades - ${role.role}`,
      role.responsibilities
    );
  });

  // Periodicidad de reuniones
  generator.addSection("Periodicidad de Reuniones", data.meetingFrequency);

  // Quórum
  generator.addSection("Quórum Mínimo", data.quorum);

  // Toma de decisiones
  generator.addSection(
    "Procedimiento de Toma de Decisiones",
    data.decisionMaking
  );

  // Firmas
  await generator.addSignatures(data.signatures);

  // Pie de página con QR
  const qrData = `https://nom035.manus.space/committee/operating-rules/${data.version}`;
  await generator.addFooter(`BFC-${data.version}`, qrData);

  generator.finalize();

  return generator.getDocument();
}
