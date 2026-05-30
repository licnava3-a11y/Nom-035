/**
 * Sprint 82 — Formatos STPS/IMSS
 * DC-1: Constancia de Habilidades Laborales (PDF)
 * SIRCE: Registro de Capacitación en formato XML para carga al sistema SIRCE-STPS
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  employees,
  departments,
  positions,
  trainingAssignments,
  committeeTrainings,
  trainingCertificates,
  users,
} from "../../drizzle/schema";
import { eq, and, inArray, gte, lte, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generatePDFFromHTML } from "../_core/pdfGenerator";
import { storagePut } from "../storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined, sep = "/") {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}${sep}${mm}${sep}${yyyy}`;
}

function xmlEscape(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── DC-1 HTML Generator ──────────────────────────────────────────────────────

function buildDC1Html(data: {
  certificateNumber: string;
  issueDate: string;
  employeeName: string;
  employeeRfc: string;
  employeeCurp: string;
  employeeNumber: string;
  departmentName: string;
  positionName: string;
  trainingTitle: string;
  trainingDuration: number;
  trainingType: string;
  completionDate: string;
  score: number | null;
  instructorName: string;
  companyName: string;
  companyRfc: string;
  signedBy: string;
  signerTitle: string;
  verificationCode: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; background: white; padding: 20px; }
  .header { text-align: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 13pt; color: #1e3a5f; font-weight: bold; letter-spacing: 1px; }
  .header h2 { font-size: 10pt; color: #444; margin-top: 4px; }
  .folio { text-align: right; font-size: 9pt; color: #666; margin-bottom: 12px; }
  .section { margin-bottom: 14px; }
  .section-title { background: #1e3a5f; color: white; padding: 4px 10px; font-size: 9.5pt; font-weight: bold; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .field { display: flex; flex-direction: column; }
  .label { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { font-size: 10pt; font-weight: 500; border-bottom: 1px solid #ddd; padding-bottom: 2px; min-height: 18px; }
  .full { grid-column: 1 / -1; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 9pt; }
  .footer { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 8pt; color: #888; text-align: center; }
  .badge { display: inline-block; background: #e8f0fe; color: #1e3a5f; padding: 2px 8px; border-radius: 12px; font-size: 8.5pt; font-weight: bold; }
  .stps-logo { font-size: 8pt; color: #666; margin-top: 4px; }
</style>
</head>
<body>
  <div class="header">
    <h1>CONSTANCIA DE HABILIDADES LABORALES</h1>
    <h2>Formato DC-1 — Secretaría del Trabajo y Previsión Social</h2>
    <p class="stps-logo">Plataforma NOM-035 STPS 2018</p>
  </div>

  <div class="folio">
    <strong>Folio:</strong> ${xmlEscape(data.certificateNumber)} &nbsp;|&nbsp;
    <strong>Fecha de expedición:</strong> ${data.issueDate}
  </div>

  <div class="section">
    <div class="section-title">I. DATOS DEL TRABAJADOR</div>
    <div class="grid">
      <div class="field full"><span class="label">Nombre completo</span><span class="value">${xmlEscape(data.employeeName)}</span></div>
      <div class="field"><span class="label">RFC</span><span class="value">${xmlEscape(data.employeeRfc) || "—"}</span></div>
      <div class="field"><span class="label">CURP</span><span class="value">${xmlEscape(data.employeeCurp) || "—"}</span></div>
      <div class="field"><span class="label">No. de empleado</span><span class="value">${xmlEscape(data.employeeNumber) || "—"}</span></div>
      <div class="field"><span class="label">Área / Departamento</span><span class="value">${xmlEscape(data.departmentName) || "—"}</span></div>
      <div class="field"><span class="label">Puesto</span><span class="value">${xmlEscape(data.positionName) || "—"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">II. DATOS DEL CENTRO DE TRABAJO</div>
    <div class="grid">
      <div class="field full"><span class="label">Razón Social</span><span class="value">${xmlEscape(data.companyName)}</span></div>
      <div class="field"><span class="label">RFC del centro de trabajo</span><span class="value">${xmlEscape(data.companyRfc) || "—"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">III. DATOS DE LA CAPACITACIÓN</div>
    <div class="grid">
      <div class="field full"><span class="label">Nombre del curso / capacitación</span><span class="value">${xmlEscape(data.trainingTitle)}</span></div>
      <div class="field"><span class="label">Tipo de capacitación</span><span class="value">${xmlEscape(data.trainingType)}</span></div>
      <div class="field"><span class="label">Duración (horas)</span><span class="value">${data.trainingDuration} hrs.</span></div>
      <div class="field"><span class="label">Fecha de terminación</span><span class="value">${data.completionDate}</span></div>
      <div class="field"><span class="label">Calificación obtenida</span><span class="value">${data.score != null ? `${data.score}/100` : "Aprobado"}</span></div>
      <div class="field"><span class="label">Instructor / Responsable</span><span class="value">${xmlEscape(data.instructorName) || "—"}</span></div>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line">
        <strong>${xmlEscape(data.employeeName)}</strong><br/>
        Trabajador
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-line">
        <strong>${xmlEscape(data.signedBy)}</strong><br/>
        ${xmlEscape(data.signerTitle)}
      </div>
    </div>
  </div>

  <div class="footer">
    Código de verificación: <strong>${xmlEscape(data.verificationCode)}</strong> &nbsp;·&nbsp;
    Documento generado por Plataforma NOM-035 STPS 2018 &nbsp;·&nbsp;
    Este documento tiene validez conforme al Art. 153-A de la LFT
  </div>
</body>
</html>`;
}

// ─── SIRCE XML Generator ──────────────────────────────────────────────────────

function buildSirceXml(data: {
  rfcEmpresa: string;
  razonSocial: string;
  registros: Array<{
    rfc: string;
    curp: string;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    puesto: string;
    curso: string;
    duracion: number;
    fechaInicio: string;
    fechaFin: string;
    calificacion: number | null;
    folio: string;
  }>;
}): string {
  const rows = data.registros.map((r, i) => `
    <Registro NumRegistro="${i + 1}">
      <RFC>${xmlEscape(r.rfc)}</RFC>
      <CURP>${xmlEscape(r.curp)}</CURP>
      <Nombre>${xmlEscape(r.nombre)}</Nombre>
      <ApellidoPaterno>${xmlEscape(r.apellidoPaterno)}</ApellidoPaterno>
      <ApellidoMaterno>${xmlEscape(r.apellidoMaterno)}</ApellidoMaterno>
      <Puesto>${xmlEscape(r.puesto)}</Puesto>
      <NombreCurso>${xmlEscape(r.curso)}</NombreCurso>
      <DuracionHoras>${r.duracion}</DuracionHoras>
      <FechaInicio>${r.fechaInicio}</FechaInicio>
      <FechaTerminacion>${r.fechaFin}</FechaTerminacion>
      <Calificacion>${r.calificacion ?? 100}</Calificacion>
      <FolioConstancia>${xmlEscape(r.folio)}</FolioConstancia>
    </Registro>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<SIRCE xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="2.0">
  <Empresa>
    <RFC>${xmlEscape(data.rfcEmpresa)}</RFC>
    <RazonSocial>${xmlEscape(data.razonSocial)}</RazonSocial>
    <TotalRegistros>${data.registros.length}</TotalRegistros>
  </Empresa>
  <Capacitaciones>${rows}
  </Capacitaciones>
</SIRCE>`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const stpsFormatsRouter = router({
  /**
   * Genera el formato DC-1 (Constancia de Habilidades) en PDF para un certificado.
   */
  generateDC1: protectedProcedure
    .input(
      z.object({
        certificateId: z.number().int().positive().optional(),
        assignmentId: z.number().int().positive().optional(),
        companyName: z.string().default("Empresa NOM-035"),
        companyRfc: z.string().default(""),
        instructorName: z.string().default(""),
        signedBy: z.string().default("Responsable NOM-035"),
        signerTitle: z.string().default("Responsable del Sistema de Gestión NOM-035"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      let certRow: typeof trainingCertificates.$inferSelect | undefined;
      let assignRow: typeof trainingAssignments.$inferSelect | undefined;

      if (input.certificateId) {
        [certRow] = await db
          .select()
          .from(trainingCertificates)
          .where(eq(trainingCertificates.id, input.certificateId))
          .limit(1);
        if (!certRow) throw new TRPCError({ code: "NOT_FOUND", message: "Certificado no encontrado." });

        [assignRow] = await db
          .select()
          .from(trainingAssignments)
          .where(eq(trainingAssignments.id, certRow.assignmentId))
          .limit(1);
      } else if (input.assignmentId) {
        [assignRow] = await db
          .select()
          .from(trainingAssignments)
          .where(eq(trainingAssignments.id, input.assignmentId))
          .limit(1);
      }

      if (!assignRow) throw new TRPCError({ code: "NOT_FOUND", message: "Asignación de capacitación no encontrada." });

      // Obtener datos del empleado (via userId en trainingAssignments)
      const [empData] = await db
        .select({
          firstName: employees.firstName,
          lastName: employees.lastName,
          empRfc: employees.rfc,
          curp: employees.curp,
          employeeNumber: employees.employeeNumber,
          departmentName: departments.name,
          positionName: positions.title,
        })
        .from(users)
        .leftJoin(employees, eq(employees.userId, users.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(users.id, assignRow.committeeMemberId))
        .limit(1);

      // Obtener datos de la capacitación
      const [training] = await db
        .select()
        .from(committeeTrainings)
        .where(eq(committeeTrainings.id, assignRow.trainingId))
        .limit(1);

      if (!training) throw new TRPCError({ code: "NOT_FOUND", message: "Capacitación no encontrada." });

      const certNumber = certRow?.certificateNumber ?? `DC1-${assignRow.id}-${Date.now()}`;
      const verificationCode = certRow?.verificationCode ?? `VER-${Date.now()}`;
      const issueDate = fmtDate(certRow?.issueDate ?? new Date());
      const completionDate = fmtDate(assignRow.completionDate ?? assignRow.startDate ?? new Date());

      const html = buildDC1Html({
        certificateNumber: certNumber,
        issueDate,
        employeeName: empData ? `${empData.firstName} ${empData.lastName}` : "—",
        employeeRfc: empData?.empRfc ?? "",
        employeeCurp: empData?.curp ?? "",
        employeeNumber: empData?.employeeNumber ?? "",
        departmentName: empData?.departmentName ?? "",
        positionName: empData?.positionName ?? "",
        trainingTitle: training.title,
        trainingDuration: training.duration,
        trainingType: training.type,
        completionDate,
        score: assignRow.score,
        instructorName: input.instructorName,
        companyName: input.companyName,
        companyRfc: input.companyRfc,
        signedBy: certRow?.signedBy ?? input.signedBy,
        signerTitle: certRow?.signerTitle ?? input.signerTitle,
        verificationCode,
      });

      const pdfBuffer = await generatePDFFromHTML(html, `DC1-${certNumber}.pdf`);
      const fileKey = `stps-formats/dc1-${certNumber}-${Date.now()}.pdf`;
      const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

      return { url, fileName: `DC1-${certNumber}.pdf`, certNumber };
    }),

  /**
   * Genera el archivo XML SIRCE con los registros de capacitación del período.
   */
  generateSirceXml: protectedProcedure
    .input(
      z.object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        companyName: z.string().default("Empresa NOM-035"),
        companyRfc: z.string().default(""),
        trainingIds: z.array(z.number().int().positive()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Construir condiciones de filtro
      const conditions: any[] = [isNotNull(trainingAssignments.completionDate)];
      if (input.fromDate) {
        conditions.push(gte(trainingAssignments.completionDate, new Date(input.fromDate)));
      }
      if (input.toDate) {
        conditions.push(lte(trainingAssignments.completionDate, new Date(input.toDate)));
      }
      if (input.trainingIds?.length) {
        conditions.push(inArray(trainingAssignments.trainingId, input.trainingIds));
      }

      const rows = await db
        .select({
          assignmentId: trainingAssignments.id,
          score: trainingAssignments.score,
          startDate: trainingAssignments.startDate,
          completionDate: trainingAssignments.completionDate,
          trainingTitle: committeeTrainings.title,
          trainingDuration: committeeTrainings.duration,
          firstName: employees.firstName,
          lastName: employees.lastName,
          rfc: employees.rfc,
          curp: employees.curp,
          positionName: positions.title,
          certNumber: trainingCertificates.certificateNumber,
        })
        .from(trainingAssignments)
        .innerJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
        .leftJoin(employees, eq(employees.userId, users.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .leftJoin(trainingCertificates, eq(trainingCertificates.assignmentId, trainingAssignments.id))
        .where(and(...conditions))
        .limit(500);

      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontraron registros de capacitación completados en el período indicado." });
      }

      const registros = rows.map((r) => {
        const fullName = r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : "Sin nombre";
        const nameParts = fullName.trim().split(" ");
        const nombre = nameParts[0] ?? "";
        const apellidoPaterno = nameParts[1] ?? "";
        const apellidoMaterno = nameParts[2] ?? "";

        return {
          rfc: (r as any).rfc ?? "",
          curp: r.curp ?? "",
          nombre,
          apellidoPaterno,
          apellidoMaterno,
          puesto: r.positionName ?? "",
          curso: r.trainingTitle,
          duracion: r.trainingDuration,
          fechaInicio: r.startDate ? fmtDate(r.startDate, "-") : fmtDate(r.completionDate, "-"),
          fechaFin: fmtDate(r.completionDate, "-"),
          calificacion: r.score,
          folio: r.certNumber ?? `DC1-${r.assignmentId}`,
        };
      });

      const xml = buildSirceXml({
        rfcEmpresa: input.companyRfc,
        razonSocial: input.companyName,
        registros,
      });

      const xmlBuffer = Buffer.from(xml, "utf-8");
      const fileName = `SIRCE-${Date.now()}.xml`;
      const fileKey = `stps-formats/${fileName}`;
      const { url } = await storagePut(fileKey, xmlBuffer, "application/xml");

      return { url, fileName, totalRegistros: registros.length };
    }),

  /**
   * Lista las capacitaciones completadas disponibles para exportar.
   */
  listCompletedTrainings: protectedProcedure
    .input(
      z.object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: any[] = [isNotNull(trainingAssignments.completionDate)];
      if (input.fromDate) conditions.push(gte(trainingAssignments.completionDate, new Date(input.fromDate)));
      if (input.toDate) conditions.push(lte(trainingAssignments.completionDate, new Date(input.toDate)));

      const rows = await db
        .select({
          id: trainingAssignments.id,
          trainingTitle: committeeTrainings.title,
          trainingType: committeeTrainings.type,
          trainingDuration: committeeTrainings.duration,
          completionDate: trainingAssignments.completionDate,
          score: trainingAssignments.score,
          employeeName: employees.firstName,
          employeeLastName: employees.lastName,
          hasCertificate: trainingCertificates.id,
        })
        .from(trainingAssignments)
        .innerJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
        .leftJoin(employees, eq(employees.userId, users.id))
        .leftJoin(trainingCertificates, eq(trainingCertificates.assignmentId, trainingAssignments.id))
        .where(and(...conditions))
        .limit(200);

      return { assignments: rows };
    }),
});
