import PDFDocument from "pdfkit";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface ClinicalEvaluation {
  testName: string;
  evaluationDate: string | Date;
  result?: string | null;
  interpretation?: string | null;
}

interface ClinicalSessionNote {
  sessionDate: string | Date;
  sessionType?: string | null;
  observations: string;
  nextAppointment?: string | Date | null;
  authorName?: string | null;
}

interface ClinicalRecordPDFData {
  record: {
    patientName: string;
    patientAge?: number | null;
    patientContact?: string | null;
    professionalName: string;
    professionalLicense?: string | null;
    professionalSpecialty?: string | null;
    consultationReason?: string | null;
    medicalHistory?: string | null;
    personalHistory?: string | null;
    familyHistory?: string | null;
    treatmentObjectives?: string | null;
    treatmentActivities?: string | null;
    consentSigned: boolean;
    consentSignedAt?: Date | null;
    professionalSignature?: string | null;
    createdAt: Date;
  };
  evaluations: ClinicalEvaluation[];
  sessionNotes: ClinicalSessionNote[];
  companyName: string;
  logoUrl?: string;
  folio: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function sectionTitle(doc: InstanceType<typeof PDFDocument>, title: string) {
  doc.moveDown(0.8);
  doc
    .rect(
      doc.page.margins.left,
      doc.y,
      doc.page.width - doc.page.margins.left - doc.page.margins.right,
      18
    )
    .fill("#1e3a5f");
  doc
    .fillColor("#ffffff")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(title, doc.page.margins.left + 6, doc.y - 14);
  doc.fillColor("#1a1a2e").font("Helvetica").fontSize(10);
  doc.moveDown(0.6);
}

function fieldRow(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  value: string | null | undefined
) {
  if (!value) return;
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value);
}

// ─── Función principal ────────────────────────────────────────────────────────
export async function generateClinicalRecordPDF(
  data: ClinicalRecordPDFData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "letter",
        margins: { top: 60, bottom: 60, left: 50, right: 50 },
        info: {
          Title: `Expediente Clínico — ${data.record.patientName}`,
          Author: data.record.professionalName,
          Subject: "Expediente Clínico Psicométrico NOM-035",
        },
      });
      const buffers: Buffer[] = [];
      doc.on("data", (b: Buffer) => buffers.push(b));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const pageW =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ─── ENCABEZADO / MEMBRETE ────────────────────────────────────────────
      // Franja superior azul
      doc.rect(0, 0, doc.page.width, 55).fill("#1e3a5f");

      // Logo (si existe)
      if (data.logoUrl) {
        try {
          doc.image(data.logoUrl, 50, 8, { height: 38 });
        } catch {
          // Logo no disponible, continuar sin él
        }
      }

      // Nombre de la empresa
      doc
        .fillColor("#ffffff")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(data.companyName, 0, 12, { align: "center" });
      doc
        .fillColor("#b0c4de")
        .fontSize(9)
        .font("Helvetica")
        .text("Sistema de Gestión NOM-035 STPS 2018", 0, 30, {
          align: "center",
        });

      doc.fillColor("#1a1a2e").moveDown(0.5);

      // Título del documento
      doc.y = 70;
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#1e3a5f")
        .text("EXPEDIENTE CLÍNICO PSICOMÉTRICO", { align: "center" });
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#555")
        .text(
          `Folio: ${data.folio}   |   Fecha de emisión: ${formatDate(new Date())}`,
          { align: "center" }
        );

      doc.moveDown(1);

      // Línea divisoria
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor("#1e3a5f")
        .lineWidth(1.5)
        .stroke();
      doc.moveDown(0.5);

      // ─── SECCIÓN 1: DATOS DE IDENTIFICACIÓN ──────────────────────────────
      sectionTitle(doc, "1. DATOS DE IDENTIFICACIÓN");
      fieldRow(doc, "Paciente / Empleado", data.record.patientName);
      if (data.record.patientAge)
        fieldRow(doc, "Edad", `${data.record.patientAge} años`);
      if (data.record.patientContact)
        fieldRow(doc, "Contacto", data.record.patientContact);
      doc.moveDown(0.3);
      fieldRow(doc, "Profesional tratante", data.record.professionalName);
      if (data.record.professionalLicense)
        fieldRow(doc, "Cédula profesional", data.record.professionalLicense);
      if (data.record.professionalSpecialty)
        fieldRow(doc, "Especialidad", data.record.professionalSpecialty);
      fieldRow(doc, "Fecha de apertura", formatDate(data.record.createdAt));
      fieldRow(
        doc,
        "Consentimiento informado",
        data.record.consentSigned
          ? `Firmado el ${formatDate(data.record.consentSignedAt)}`
          : "Pendiente"
      );

      // ─── SECCIÓN 2: HISTORIA CLÍNICA ─────────────────────────────────────
      sectionTitle(doc, "2. HISTORIA CLÍNICA");
      if (data.record.consultationReason) {
        doc.fontSize(10).font("Helvetica-Bold").text("Motivo de consulta:");
        doc
          .font("Helvetica")
          .text(data.record.consultationReason, { width: pageW });
        doc.moveDown(0.4);
      }
      if (data.record.medicalHistory) {
        doc.font("Helvetica-Bold").text("Antecedentes médicos:");
        doc
          .font("Helvetica")
          .text(data.record.medicalHistory, { width: pageW });
        doc.moveDown(0.4);
      }
      if (data.record.personalHistory) {
        doc.font("Helvetica-Bold").text("Antecedentes personales:");
        doc
          .font("Helvetica")
          .text(data.record.personalHistory, { width: pageW });
        doc.moveDown(0.4);
      }
      if (data.record.familyHistory) {
        doc.font("Helvetica-Bold").text("Antecedentes familiares:");
        doc.font("Helvetica").text(data.record.familyHistory, { width: pageW });
      }

      // ─── SECCIÓN 3: PLAN DE TRATAMIENTO ──────────────────────────────────
      if (data.record.treatmentObjectives || data.record.treatmentActivities) {
        sectionTitle(doc, "3. PLAN DE TRATAMIENTO");
        if (data.record.treatmentObjectives) {
          doc.font("Helvetica-Bold").text("Objetivos:");
          doc
            .font("Helvetica")
            .text(data.record.treatmentObjectives, { width: pageW });
          doc.moveDown(0.4);
        }
        if (data.record.treatmentActivities) {
          doc.font("Helvetica-Bold").text("Actividades / Intervenciones:");
          doc
            .font("Helvetica")
            .text(data.record.treatmentActivities, { width: pageW });
        }
      }

      // ─── SECCIÓN 4: EVALUACIONES PSICOLÓGICAS ────────────────────────────
      if (data.evaluations.length > 0) {
        sectionTitle(doc, "4. EVALUACIONES PSICOLÓGICAS");
        data.evaluations.forEach((ev, idx) => {
          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(
              `${idx + 1}. ${ev.testName}  (${formatDate(ev.evaluationDate)})`
            );
          if (ev.result) {
            doc
              .font("Helvetica")
              .text(`Resultado: ${ev.result}`, { width: pageW });
          }
          if (ev.interpretation) {
            doc
              .font("Helvetica")
              .text(`Interpretación: ${ev.interpretation}`, { width: pageW });
          }
          doc.moveDown(0.4);
        });
      }

      // ─── SECCIÓN 5: NOTAS DE SESIÓN ──────────────────────────────────────
      if (data.sessionNotes.length > 0) {
        sectionTitle(doc, "5. NOTAS DE SESIÓN");
        data.sessionNotes.forEach((note, idx) => {
          // Verificar si necesita nueva página
          if (doc.y > doc.page.height - 150) {
            doc.addPage();
          }
          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(
              `Sesión ${idx + 1} — ${formatDate(note.sessionDate)}  |  Tipo: ${note.sessionType ?? "Individual"}${note.authorName ? `  |  Profesional: ${note.authorName}` : ""}`
            );
          doc.font("Helvetica").text(note.observations, { width: pageW });
          if (note.nextAppointment) {
            doc
              .fillColor("#1e3a5f")
              .text(`Próxima cita: ${formatDate(note.nextAppointment)}`)
              .fillColor("#1a1a2e");
          }
          doc.moveDown(0.5);
        });
      }

      // ─── PIE DE PÁGINA / FIRMA ────────────────────────────────────────────
      // Agregar nueva página para firma si hay poco espacio
      if (doc.y > doc.page.height - 180) {
        doc.addPage();
      }

      doc.moveDown(2);
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor("#1e3a5f")
        .lineWidth(1)
        .stroke();
      doc.moveDown(1);

      // Bloque de firma
      const sigX = doc.page.width / 2 - 80;
      if (
        data.record.professionalSignature &&
        data.record.professionalSignature.startsWith("data:image")
      ) {
        // Incrustar imagen de firma electrónica capturada en canvas
        try {
          const sigImgBuffer = Buffer.from(
            data.record.professionalSignature.split(",")[1],
            "base64"
          );
          const sigY = doc.y;
          doc.image(sigImgBuffer, sigX, sigY, { width: 160, height: 60 });
          doc.y = sigY + 62;
        } catch {
          // Si la imagen falla, continuar con línea en blanco
        }
      }
      doc
        .moveTo(sigX, doc.y + 2)
        .lineTo(sigX + 160, doc.y + 2)
        .strokeColor("#333")
        .lineWidth(0.8)
        .stroke();
      doc.moveDown(1.2);
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#1a1a2e")
        .text(data.record.professionalName, { align: "center" });
      if (data.record.professionalLicense) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(`Cédula Profesional: ${data.record.professionalLicense}`, {
            align: "center",
          });
      }
      if (data.record.professionalSpecialty) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(data.record.professionalSpecialty, { align: "center" });
      }

      // Folio y fecha en pie
      doc.moveDown(1.5);
      doc
        .fontSize(8)
        .fillColor("#888")
        .text(
          `Folio: ${data.folio}  ·  Generado el ${new Date().toLocaleString("es-MX")}  ·  Documento confidencial — NOM-035 STPS 2018`,
          { align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
