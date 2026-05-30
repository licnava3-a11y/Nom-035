/**
 * Sprint 80 — Módulo de Comité NOM-035
 * Router tRPC para gestión de integrantes, convocatorias, actas, acuerdos y firmas digitales.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  nom035CommitteeMembers,
  nom035CommitteeMeetings,
  nom035CommitteeAgreements,
  nom035MeetingSignatures,
} from "../../drizzle/schema";
import { eq, and, desc, asc, like, or, sql } from "drizzle-orm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateMeetingFolio(type: string, id: number): string {
  const year = new Date().getFullYear();
  const typeCode = type === "ordinaria" ? "ORD" : type === "extraordinaria" ? "EXT" : "URG";
  return `NOM035-COM-${typeCode}-${String(id).padStart(4, "0")}/${year}`;
}

function generateAgreementFolio(meetingId: number, seq: number): string {
  const year = new Date().getFullYear();
  return `ACU-${String(meetingId).padStart(4, "0")}-${String(seq).padStart(3, "0")}/${year}`;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const committeeModuleRouter = router({

  // ── Integrantes ──────────────────────────────────────────────────────────

  listMembers: protectedProcedure
    .input(z.object({
      companyId: z.number().optional(),
      activeOnly: z.boolean().default(true),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(nom035CommitteeMembers).$dynamic();
      const conditions = [];
      if (input.activeOnly) conditions.push(eq(nom035CommitteeMembers.isActive, true));
      if (input.companyId) conditions.push(eq(nom035CommitteeMembers.companyId, input.companyId));
      if (input.search) {
        conditions.push(or(
          like(nom035CommitteeMembers.employeeName, `%${input.search}%`),
          like(nom035CommitteeMembers.department, `%${input.search}%`),
          like(nom035CommitteeMembers.position, `%${input.search}%`),
        ));
      }
      if (conditions.length > 0) query = query.where(and(...conditions));
      return query.orderBy(asc(nom035CommitteeMembers.role), asc(nom035CommitteeMembers.employeeName));
    }),

  addMember: protectedProcedure
    .input(z.object({
      companyId: z.number().optional(),
      employeeId: z.number().optional(),
      employeeName: z.string().min(2),
      employeeEmail: z.string().email().optional(),
      position: z.string().optional(),
      department: z.string().optional(),
      role: z.enum(["presidente", "secretario", "vocal", "suplente", "asesor_externo"]).default("vocal"),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [result] = await db.insert(nom035CommitteeMembers).values({
        employeeName: input.employeeName,
        employeeEmail: input.employeeEmail,
        position: input.position,
        department: input.department,
        role: input.role,
        notes: input.notes,
        companyId: input.companyId,
        employeeId: input.employeeId,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        createdBy: ctx.user.id,
        isActive: true,
      });
      return { id: result.insertId, success: true };
    }),

  updateMember: protectedProcedure
    .input(z.object({
      id: z.number(),
      employeeName: z.string().min(2).optional(),
      employeeEmail: z.string().email().optional(),
      position: z.string().optional(),
      department: z.string().optional(),
      role: z.enum(["presidente", "secretario", "vocal", "suplente", "asesor_externo"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isActive: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, startDate, endDate, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      await db.update(nom035CommitteeMembers).set(updateData).where(eq(nom035CommitteeMembers.id, id));
      return { success: true };
    }),

  deleteMember: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(nom035CommitteeMembers)
        .set({ isActive: false })
        .where(eq(nom035CommitteeMembers.id, input.id));
      return { success: true };
    }),

  // ── Reuniones / Convocatorias ─────────────────────────────────────────────

  listMeetings: protectedProcedure
    .input(z.object({
      companyId: z.number().optional(),
      status: z.enum(["convocada", "en_curso", "celebrada", "cancelada", "reprogramada"]).optional(),
      meetingType: z.enum(["ordinaria", "extraordinaria", "urgente"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(nom035CommitteeMeetings).$dynamic();
      const conditions = [];
      if (input.companyId) conditions.push(eq(nom035CommitteeMeetings.companyId, input.companyId));
      if (input.status) conditions.push(eq(nom035CommitteeMeetings.status, input.status));
      if (input.meetingType) conditions.push(eq(nom035CommitteeMeetings.meetingType, input.meetingType));
      if (conditions.length > 0) query = query.where(and(...conditions));
      const meetings = await query
        .orderBy(desc(nom035CommitteeMeetings.scheduledAt))
        .limit(input.limit)
        .offset(input.offset);
      // Count total
      const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(nom035CommitteeMeetings);
      return { meetings, total: Number(countRow?.count ?? 0) };
    }),

  getMeeting: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [meeting] = await db.select().from(nom035CommitteeMeetings)
        .where(eq(nom035CommitteeMeetings.id, input.id));
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "Reunión no encontrada" });
      const agreements = await db.select().from(nom035CommitteeAgreements)
        .where(eq(nom035CommitteeAgreements.meetingId, input.id))
        .orderBy(asc(nom035CommitteeAgreements.id));
      const signatures = await db.select().from(nom035MeetingSignatures)
        .where(eq(nom035MeetingSignatures.meetingId, input.id))
        .orderBy(asc(nom035MeetingSignatures.signedAt));
      return { meeting, agreements, signatures };
    }),

  createMeeting: protectedProcedure
    .input(z.object({
      companyId: z.number().optional(),
      title: z.string().min(3),
      meetingType: z.enum(["ordinaria", "extraordinaria", "urgente"]).default("ordinaria"),
      scheduledAt: z.string(),
      location: z.string().optional(),
      agenda: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Generar folio temporal
      const tempFolio = `NOM035-COM-DRAFT-${Date.now()}`;
      const [result] = await db.insert(nom035CommitteeMeetings).values({
        ...input,
        folio: tempFolio,
        status: "convocada",
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        scheduledAt: new Date(input.scheduledAt),
      });
      const newId = result.insertId;
      // Actualizar folio con ID real
      const folio = generateMeetingFolio(input.meetingType, newId);
      await db.update(nom035CommitteeMeetings)
        .set({ folio })
        .where(eq(nom035CommitteeMeetings.id, newId));
      return { id: newId, folio, success: true };
    }),

  updateMeeting: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(3).optional(),
      status: z.enum(["convocada", "en_curso", "celebrada", "cancelada", "reprogramada"]).optional(),
      scheduledAt: z.string().optional(),
      location: z.string().optional(),
      agenda: z.string().optional(),
      minutesContent: z.string().optional(),
      attendeesJson: z.string().optional(),
      quorumReached: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, scheduledAt, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (scheduledAt) data.scheduledAt = new Date(scheduledAt);
      if (rest.status === "celebrada" && rest.minutesContent) {
        data.minutesApprovedAt = new Date();
      }
      await db.update(nom035CommitteeMeetings).set(data).where(eq(nom035CommitteeMeetings.id, id));
      return { success: true };
    }),

  // ── Acuerdos ─────────────────────────────────────────────────────────────

  addAgreement: protectedProcedure
    .input(z.object({
      meetingId: z.number(),
      companyId: z.number().optional(),
      description: z.string().min(5),
      responsible: z.string().optional(),
      responsibleEmployeeId: z.number().optional(),
      dueDate: z.string().optional(),
      priority: z.enum(["alta", "media", "baja"]).default("media"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Contar acuerdos existentes para el folio
      const [countRow] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(nom035CommitteeAgreements)
        .where(eq(nom035CommitteeAgreements.meetingId, input.meetingId));
      const seq = Number(countRow?.count ?? 0) + 1;
      const folio = generateAgreementFolio(input.meetingId, seq);
      const [result] = await db.insert(nom035CommitteeAgreements).values({
        meetingId: input.meetingId,
        companyId: input.companyId,
        description: input.description,
        responsible: input.responsible,
        responsibleEmployeeId: input.responsibleEmployeeId,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        priority: input.priority,
        folio,
        status: "pendiente",
        createdBy: ctx.user.id,
      });
      return { id: result.insertId, folio, success: true };
    }),

  updateAgreement: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pendiente", "en_proceso", "cumplido", "cancelado", "vencido"]).optional(),
      responsible: z.string().optional(),
      dueDate: z.string().optional(),
      priority: z.enum(["alta", "media", "baja"]).optional(),
      completionNotes: z.string().optional(),
      evidenceUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, dueDate, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (dueDate) updateData.dueDate = new Date(dueDate);
      if (data.status === "cumplido") updateData.completedAt = new Date();
      await db.update(nom035CommitteeAgreements).set(updateData).where(eq(nom035CommitteeAgreements.id, id));
      return { success: true };
    }),

  listAgreements: protectedProcedure
    .input(z.object({
      meetingId: z.number().optional(),
      companyId: z.number().optional(),
      status: z.enum(["pendiente", "en_proceso", "cumplido", "cancelado", "vencido"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(nom035CommitteeAgreements).$dynamic();
      const conditions = [];
      if (input.meetingId) conditions.push(eq(nom035CommitteeAgreements.meetingId, input.meetingId));
      if (input.companyId) conditions.push(eq(nom035CommitteeAgreements.companyId, input.companyId));
      if (input.status) conditions.push(eq(nom035CommitteeAgreements.status, input.status));
      if (conditions.length > 0) query = query.where(and(...conditions));
      return query.orderBy(desc(nom035CommitteeAgreements.createdAt));
    }),

  // ── Firmas Digitales ──────────────────────────────────────────────────────

  saveSignature: protectedProcedure
    .input(z.object({
      meetingId: z.number(),
      signerName: z.string().min(2),
      signerRole: z.string().optional(),
      signerEmail: z.string().email().optional(),
      employeeId: z.number().optional(),
      signatureDataUrl: z.string(), // base64 PNG del canvas
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      // Subir firma a S3
      const base64Data = input.signatureDataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileKey = `committee-signatures/meeting-${input.meetingId}-${Date.now()}.png`;
      const { url } = await storagePut(fileKey, buffer, "image/png");
      // Hash SHA-256 de la imagen
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");
      const [result] = await db.insert(nom035MeetingSignatures).values({
        meetingId: input.meetingId,
        signerName: input.signerName,
        signerRole: input.signerRole,
        signerEmail: input.signerEmail,
        employeeId: input.employeeId,
        signatureImageUrl: url,
        signatureHash: hash,
      });
      return { id: result.insertId, url, hash, success: true };
    }),

  getSignatures: protectedProcedure
    .input(z.object({ meetingId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db.select().from(nom035MeetingSignatures)
        .where(eq(nom035MeetingSignatures.meetingId, input.meetingId))
        .orderBy(asc(nom035MeetingSignatures.signedAt));
    }),

  // ── Estadísticas ─────────────────────────────────────────────────────────

  getStats: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = input.companyId
        ? [eq(nom035CommitteeMembers.companyId, input.companyId)]
        : [];
      const [membersRow] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(nom035CommitteeMembers)
        .where(and(eq(nom035CommitteeMembers.isActive, true), ...conditions));
      const [meetingsRow] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(nom035CommitteeMeetings);
      const [pendingAgreementsRow] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(nom035CommitteeAgreements)
        .where(eq(nom035CommitteeAgreements.status, "pendiente"));
      const [completedAgreementsRow] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(nom035CommitteeAgreements)
        .where(eq(nom035CommitteeAgreements.status, "cumplido"));
      const recentMeetings = await db.select({
        id: nom035CommitteeMeetings.id,
        folio: nom035CommitteeMeetings.folio,
        title: nom035CommitteeMeetings.title,
        status: nom035CommitteeMeetings.status,
        meetingType: nom035CommitteeMeetings.meetingType,
        scheduledAt: nom035CommitteeMeetings.scheduledAt,
      }).from(nom035CommitteeMeetings)
        .orderBy(desc(nom035CommitteeMeetings.scheduledAt))
        .limit(5);
      return {
        activeMembers: Number(membersRow?.count ?? 0),
        totalMeetings: Number(meetingsRow?.count ?? 0),
        pendingAgreements: Number(pendingAgreementsRow?.count ?? 0),
        completedAgreements: Number(completedAgreementsRow?.count ?? 0),
        recentMeetings,
      };
    }),

  // ── PDF de Acta ───────────────────────────────────────────────────────────

  generateActaPdf: protectedProcedure
    .input(z.object({ meetingId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [meeting] = await db.select().from(nom035CommitteeMeetings)
        .where(eq(nom035CommitteeMeetings.id, input.meetingId));
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "Reunión no encontrada" });
      const agreements = await db.select().from(nom035CommitteeAgreements)
        .where(eq(nom035CommitteeAgreements.meetingId, input.meetingId))
        .orderBy(asc(nom035CommitteeAgreements.id));
      const signatures = await db.select().from(nom035MeetingSignatures)
        .where(eq(nom035MeetingSignatures.meetingId, input.meetingId))
        .orderBy(asc(nom035MeetingSignatures.signedAt));
      const attendees: string[] = meeting.attendeesJson
        ? JSON.parse(meeting.attendeesJson)
        : [];
      const statusLabel: Record<string, string> = {
        pendiente: "Pendiente", en_proceso: "En Proceso", cumplido: "Cumplido",
        cancelado: "Cancelado", vencido: "Vencido",
      };
      const priorityColor: Record<string, string> = {
        alta: "#dc2626", media: "#d97706", baja: "#16a34a",
      };
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; color: #1a1a1a; }
  .header { text-align: center; border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 16px; color: #1e40af; margin: 0 0 4px; }
  .header h2 { font-size: 13px; margin: 0 0 4px; }
  .header .folio { font-size: 11px; color: #6b7280; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 12px; font-weight: bold; color: #1e40af; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #1e40af; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
  .badge-pendiente { background: #fef3c7; color: #92400e; }
  .badge-cumplido { background: #d1fae5; color: #065f46; }
  .badge-en_proceso { background: #dbeafe; color: #1e40af; }
  .badge-cancelado { background: #fee2e2; color: #991b1b; }
  .badge-vencido { background: #fce7f3; color: #9d174d; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
  .info-item label { font-weight: bold; color: #374151; font-size: 10px; }
  .info-item span { display: block; font-size: 10px; color: #6b7280; }
  .signatures-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; }
  .sig-box { border: 1px solid #d1d5db; border-radius: 4px; padding: 10px; text-align: center; }
  .sig-box img { max-width: 120px; max-height: 60px; object-fit: contain; }
  .sig-box .sig-name { font-weight: bold; font-size: 10px; margin-top: 6px; }
  .sig-box .sig-role { font-size: 9px; color: #6b7280; }
  .sig-box .sig-hash { font-size: 8px; color: #9ca3af; word-break: break-all; }
  .empty-sig { border: 1px dashed #d1d5db; border-radius: 4px; padding: 20px 10px; text-align: center; }
  .empty-sig .sig-line { border-top: 1px solid #374151; margin: 30px 10px 6px; }
  .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  .agenda-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px; white-space: pre-wrap; font-size: 10px; }
  .minutes-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 10px; white-space: pre-wrap; font-size: 10px; }
</style>
</head>
<body>
<div class="header">
  <h1>ACTA DE REUNIÓN — COMITÉ NOM-035 STPS</h1>
  <h2>${meeting.title}</h2>
  <div class="folio">Folio: ${meeting.folio} | Tipo: ${meeting.meetingType.toUpperCase()} | Estado: ${meeting.status.toUpperCase()}</div>
</div>

<div class="section">
  <div class="section-title">Datos de la Reunión</div>
  <div class="info-grid">
    <div class="info-item"><label>Fecha y Hora:</label><span>${new Date(meeting.scheduledAt).toLocaleString("es-MX")}</span></div>
    <div class="info-item"><label>Lugar:</label><span>${meeting.location ?? "No especificado"}</span></div>
    <div class="info-item"><label>Quórum:</label><span>${meeting.quorumReached ? "✅ Alcanzado" : "❌ No alcanzado"}</span></div>
    <div class="info-item"><label>Asistentes:</label><span>${attendees.length > 0 ? attendees.join(", ") : "No registrados"}</span></div>
  </div>
</div>

${meeting.agenda ? `
<div class="section">
  <div class="section-title">Orden del Día</div>
  <div class="agenda-box">${meeting.agenda}</div>
</div>` : ""}

${meeting.minutesContent ? `
<div class="section">
  <div class="section-title">Desarrollo de la Sesión</div>
  <div class="minutes-box">${meeting.minutesContent}</div>
</div>` : ""}

<div class="section">
  <div class="section-title">Acuerdos (${agreements.length})</div>
  ${agreements.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Folio</th>
        <th>Descripción</th>
        <th>Responsable</th>
        <th>Fecha Límite</th>
        <th>Prioridad</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${agreements.map(a => `
      <tr>
        <td>${a.folio ?? "-"}</td>
        <td>${a.description}</td>
        <td>${a.responsible ?? "-"}</td>
        <td>${a.dueDate ? new Date(a.dueDate).toLocaleDateString("es-MX") : "-"}</td>
        <td style="color:${priorityColor[a.priority] ?? "#374151"};font-weight:bold">${a.priority.toUpperCase()}</td>
        <td><span class="badge badge-${a.status}">${statusLabel[a.status] ?? a.status}</span></td>
      </tr>`).join("")}
    </tbody>
  </table>` : "<p style='color:#6b7280'>Sin acuerdos registrados.</p>"}
</div>

<div class="section">
  <div class="section-title">Firmas de Asistentes (${signatures.length})</div>
  ${signatures.length > 0 ? `
  <div class="signatures-grid">
    ${signatures.map(s => `
    <div class="sig-box">
      ${s.signatureImageUrl ? `<img src="${s.signatureImageUrl}" alt="Firma"/>` : "<div style='height:60px;border-bottom:1px solid #374151;'></div>"}
      <div class="sig-name">${s.signerName}</div>
      <div class="sig-role">${s.signerRole ?? ""}</div>
      <div class="sig-hash">${s.signatureHash ? `SHA-256: ${s.signatureHash.substring(0, 16)}...` : ""}</div>
    </div>`).join("")}
  </div>` : `
  <div class="signatures-grid">
    ${["Presidente", "Secretario", "Vocal 1"].map(role => `
    <div class="empty-sig">
      <div class="sig-line"></div>
      <div style="font-size:10px;font-weight:bold">${role}</div>
      <div style="font-size:9px;color:#6b7280">Nombre y Firma</div>
    </div>`).join("")}
  </div>`}
</div>

<div class="footer">
  Folio: ${meeting.folio} | Generado: ${new Date().toLocaleString("es-MX")} | Plataforma NOM-035 STPS 2018
</div>
</body>
</html>`;

      // Convertir HTML a PDF con puppeteer
      const { generatePDFFromHTML } = await import("../_core/pdfGenerator");
      const fileName = `acta-${input.meetingId}-${Date.now()}`;
      const pdfUrl = await generatePDFFromHTML(html, fileName, { format: "A4", orientation: "portrait" });
      // generatePDFFromHTML ya sube a S3 y retorna la URL directamente
      const url = pdfUrl;
      // Guardar URL en la reunión
      await db.update(nom035CommitteeMeetings)
        .set({ actaPdfUrl: url })
        .where(eq(nom035CommitteeMeetings.id, input.meetingId));
      return { url, success: true };
    }),
});
