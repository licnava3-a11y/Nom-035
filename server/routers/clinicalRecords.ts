import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  clinicalRecords,
  clinicalEvaluations,
  clinicalSessionNotes,
  companyGeneralData,
  companyLogo,
  clinicalExportedPdfs,
  employees,
  departments,
} from "../../drizzle/schema";
import { eq, desc, and, like, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import JSZip from "jszip";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";

// Roles autorizados para ver expedientes clínicos
const AUTHORIZED_ROLES = ["admin", "super_admin", "psychologist", "clinical_professional"];

function requireClinicalAccess(role: string) {
  if (!AUTHORIZED_ROLES.includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo el personal clínico autorizado y administradores pueden acceder a los expedientes clínicos.",
    });
  }
}

export const clinicalRecordsRouter = router({
    // ─── Listar expedientes ─────────────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        departmentId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      // Si se filtra por departamento, obtener los IDs de empleados de ese departamento
      let employeeIdsInDept: number[] | undefined;
      if (input.departmentId) {
        const empRows = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.departmentId, input.departmentId));
        employeeIdsInDept = empRows.map(e => e.id);
      }
      const conditions = [];
      if (input.isActive !== undefined) {
        conditions.push(eq(clinicalRecords.isActive, input.isActive));
      }
      if (input.search) {
        conditions.push(like(clinicalRecords.patientName, `%${input.search}%`));
      }
      if (employeeIdsInDept !== undefined) {
        if (employeeIdsInDept.length === 0) {
          return { records: [], total: 0 };
        }
        conditions.push(inArray(clinicalRecords.employeeId, employeeIdsInDept));
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;
      const [records, countResult] = await Promise.all([
        db
          .select()
          .from(clinicalRecords)
          .where(whereClause)
          .orderBy(desc(clinicalRecords.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(clinicalRecords)
          .where(whereClause),
      ]);
      return { records, total: countResult[0]?.count ?? 0 };
    }),

  // ─── Detalle de expediente ──────────────────────────────────────────────────
  getDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [record] = await db
        .select()
        .from(clinicalRecords)
        .where(eq(clinicalRecords.id, input.id))
        .limit(1);

      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado" });

      const [evaluations, sessionNotes] = await Promise.all([
        db
          .select()
          .from(clinicalEvaluations)
          .where(eq(clinicalEvaluations.recordId, input.id))
          .orderBy(desc(clinicalEvaluations.evaluationDate)),
        db
          .select()
          .from(clinicalSessionNotes)
          .where(eq(clinicalSessionNotes.recordId, input.id))
          .orderBy(desc(clinicalSessionNotes.sessionDate)),
      ]);

      return { record, evaluations, sessionNotes };
    }),

  // ─── Crear expediente ───────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        employeeId: z.number().optional(),
        patientName: z.string().min(1, "Nombre del paciente requerido"),
        patientAge: z.number().min(0).max(120).optional(),
        patientContact: z.string().optional(),
        professionalName: z.string().min(1, "Nombre del profesional requerido"),
        professionalLicense: z.string().optional(),
        professionalSpecialty: z.string().optional(),
        consultationReason: z.string().optional(),
        medicalHistory: z.string().optional(),
        personalHistory: z.string().optional(),
        familyHistory: z.string().optional(),
        treatmentObjectives: z.string().optional(),
        treatmentActivities: z.string().optional(),
        consentSigned: z.boolean().default(false),
        consentDocUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [inserted] = await db.insert(clinicalRecords).values({
        ...input,
        consentSignedAt: input.consentSigned ? new Date() : null,
        createdByUserId: ctx.user.id,
        isActive: true,
      });

      return { success: true, id: (inserted as { insertId: number }).insertId };
    }),

  // ─── Actualizar expediente ──────────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        patientName: z.string().min(1).optional(),
        patientAge: z.number().min(0).max(120).optional(),
        patientContact: z.string().optional(),
        professionalName: z.string().min(1).optional(),
        professionalLicense: z.string().optional(),
        professionalSpecialty: z.string().optional(),
        consultationReason: z.string().optional(),
        medicalHistory: z.string().optional(),
        personalHistory: z.string().optional(),
        familyHistory: z.string().optional(),
        treatmentObjectives: z.string().optional(),
        treatmentActivities: z.string().optional(),
        consentSigned: z.boolean().optional(),
        consentDocUrl: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...updateData } = input;
      const updatePayload: Record<string, unknown> = { ...updateData, updatedAt: new Date() };
      if (input.consentSigned === true) {
        updatePayload.consentSignedAt = new Date();
      }

      await db
        .update(clinicalRecords)
        .set(updatePayload as Parameters<ReturnType<typeof db.update>["set"]>[0])
        .where(eq(clinicalRecords.id, id));

      return { success: true };
    }),

  // ─── Agregar evaluación psicométrica ───────────────────────────────────────
  addEvaluation: protectedProcedure
    .input(
      z.object({
        recordId: z.number(),
        testName: z.string().min(1, "Nombre del test requerido"),
        evaluationDate: z.string().min(1, "Fecha de evaluación requerida"),
        result: z.string().optional(),
        interpretation: z.string().optional(),
        fileUrl: z.string().optional(),
        fileKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [record] = await db
        .select({ id: clinicalRecords.id })
        .from(clinicalRecords)
        .where(eq(clinicalRecords.id, input.recordId))
        .limit(1);

      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado" });

      const [inserted] = await db.insert(clinicalEvaluations).values({
        ...input,
        evaluationDate: new Date(input.evaluationDate),
        appliedByUserId: ctx.user.id,
      });

      return { success: true, id: (inserted as { insertId: number }).insertId };
    }),

  // ─── Actualizar evaluación ──────────────────────────────────────────────────
  updateEvaluation: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        testName: z.string().min(1).optional(),
        evaluationDate: z.string().optional(),
        result: z.string().optional(),
        interpretation: z.string().optional(),
        fileUrl: z.string().optional(),
        fileKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, evaluationDate, ...rest } = input;
      const updatePayload: Record<string, unknown> = { ...rest };
      if (evaluationDate) {
        updatePayload.evaluationDate = new Date(evaluationDate);
      }

      await db
        .update(clinicalEvaluations)
        .set(updatePayload as Parameters<ReturnType<typeof db.update>["set"]>[0])
        .where(eq(clinicalEvaluations.id, id));

      return { success: true };
    }),

  // ─── Eliminar evaluación ────────────────────────────────────────────────────
  deleteEvaluation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db.delete(clinicalEvaluations).where(eq(clinicalEvaluations.id, input.id));
      return { success: true };
    }),

  // ─── Agregar nota de sesión ─────────────────────────────────────────────────
  addSessionNote: protectedProcedure
    .input(
      z.object({
        recordId: z.number(),
        sessionDate: z.string().min(1, "Fecha de sesión requerida"),
        observations: z.string().min(1, "Las observaciones son obligatorias"),
        nextAppointment: z.string().optional(),
        sessionType: z.enum(["individual", "grupal", "familiar", "seguimiento"]).default("individual"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [record] = await db
        .select({ id: clinicalRecords.id })
        .from(clinicalRecords)
        .where(eq(clinicalRecords.id, input.recordId))
        .limit(1);

      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado" });

      const [inserted] = await db.insert(clinicalSessionNotes).values({
        ...input,
        sessionDate: new Date(input.sessionDate),
        nextAppointment: input.nextAppointment ? new Date(input.nextAppointment) : null,
        authorUserId: ctx.user.id,
        authorName: ctx.user.name ?? "Profesional",
      });

      return { success: true, id: (inserted as { insertId: number }).insertId };
    }),

  // ─── Actualizar nota de sesión ──────────────────────────────────────────────
  updateSessionNote: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        sessionDate: z.string().optional(),
        observations: z.string().min(1).optional(),
        nextAppointment: z.string().optional(),
        sessionType: z.enum(["individual", "grupal", "familiar", "seguimiento"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, sessionDate, nextAppointment, ...rest } = input;
      const updatePayload: Record<string, unknown> = { ...rest };
      if (sessionDate) updatePayload.sessionDate = new Date(sessionDate);
      if (nextAppointment) updatePayload.nextAppointment = new Date(nextAppointment);

      await db
        .update(clinicalSessionNotes)
        .set(updatePayload as Parameters<ReturnType<typeof db.update>["set"]>[0])
        .where(eq(clinicalSessionNotes.id, id));

      return { success: true };
    }),

  // ─── Eliminar nota de sesión ────────────────────────────────────────────────
  deleteSessionNote: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db.delete(clinicalSessionNotes).where(eq(clinicalSessionNotes.id, input.id));
      return { success: true };
    }),

  // ─── Cerrar expediente ──────────────────────────────────────────────────────
  closeRecord: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db
        .update(clinicalRecords)
        .set({ isActive: false, updatedAt: new Date() } as Parameters<ReturnType<typeof db.update>["set"]>[0])
        .where(eq(clinicalRecords.id, input.id));
      return { success: true };
    }),

  // ─── Exportar expediente a PDF ─────────────────────────────────────────────
  exportPdf: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [record] = await db
        .select()
        .from(clinicalRecords)
        .where(eq(clinicalRecords.id, input.id))
        .limit(1);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado" });

      const [evaluations, sessionNotes] = await Promise.all([
        db.select().from(clinicalEvaluations).where(eq(clinicalEvaluations.recordId, input.id)).orderBy(desc(clinicalEvaluations.evaluationDate)),
        db.select().from(clinicalSessionNotes).where(eq(clinicalSessionNotes.recordId, input.id)).orderBy(desc(clinicalSessionNotes.sessionDate)),
      ]);

      const companyRows = await db.select().from(companyGeneralData).limit(1);
      const company = companyRows[0];
      const logoRows = await db.select().from(companyLogo).limit(1);
      const logoUrl = logoRows[0]?.logoUrl ?? undefined;

      const folio = `EXP-CLIN-${record.id}-${Date.now()}`;

      const { generateClinicalRecordPDF } = await import("../pdfGenerators/clinicalRecordPDF");
      const pdfBuffer = await generateClinicalRecordPDF({
        record,
        evaluations,
        sessionNotes,
        companyName: company?.razonSocial ?? "Empresa",
        logoUrl,
        folio,
      });

      const { storagePut } = await import("../storage");
      const fileName = `clinical-records/expediente-${record.id}-${Date.now()}.pdf`;
      const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");

      // Guardar en historial
      await db.insert(clinicalExportedPdfs).values({
        recordId: input.id,
        folio,
        fileKey: fileName,
        fileUrl: url,
        generatedByUserId: ctx.user.id,
        generatedByName: ctx.user.name ?? "Usuario",
      });

      // Notificación interna al profesional responsable del expediente
      try {
        const { notifyOwner } = await import("../_core/notification");
        await notifyOwner({
          title: `📄 PDF exportado — Expediente ${folio}`,
          content: `El usuario ${ctx.user.name ?? ctx.user.email ?? 'desconocido'} exportó el expediente clínico de **${record.patientName}** (folio: ${folio}) el ${new Date().toLocaleString('es-MX')}. El documento está disponible en el sistema.`,
        });
      } catch {
        // La notificación es no-bloqueante
      }

      return { url, folio, fileName };
    }),

  // ─── Historial de PDFs exportados ──────────────────────────────────────────────
  getExportedPdfs: protectedProcedure
    .input(z.object({ recordId: z.number() }))
    .query(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db
        .select()
        .from(clinicalExportedPdfs)
        .where(eq(clinicalExportedPdfs.recordId, input.recordId))
        .orderBy(desc(clinicalExportedPdfs.createdAt));
    }),

  // ─── Guardar firma electrónica del profesional ────────────────────────────────
  saveProfessionalSignature: protectedProcedure
    .input(z.object({
      id: z.number(),
      signatureBase64: z.string().min(10, "La firma no puede estar vacía"),
    }))
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db
        .update(clinicalRecords)
        .set({ professionalSignature: input.signatureBase64 } as Parameters<ReturnType<typeof db.update>["set"]>[0])
        .where(eq(clinicalRecords.id, input.id));
      return { success: true };
    }),

  // ─── Descarga masiva de PDFs en ZIP ─────────────────────────────────────────
  downloadAllPdfsZip: protectedProcedure
    .input(z.object({ recordId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const pdfs = await db
        .select()
        .from(clinicalExportedPdfs)
        .where(eq(clinicalExportedPdfs.recordId, input.recordId))
        .orderBy(desc(clinicalExportedPdfs.createdAt));
      if (pdfs.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No hay PDFs exportados para este expediente" });
      }
      const zip = new JSZip();
      for (const pdf of pdfs) {
        try {
          const response = await fetch(pdf.fileUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const safeName = `expediente_${pdf.folio}_${new Date(pdf.createdAt).toISOString().split('T')[0]}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
            zip.file(safeName, buffer);
          }
        } catch {
          // Si un PDF falla, continúa con los demás
        }
      }
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      const zipKey = `clinical-records/${input.recordId}/exports/expediente_completo_${Date.now()}.zip`;
      const { url } = await storagePut(zipKey, zipBuffer, "application/zip");
      return { url, count: pdfs.length };
    }),


  // ─── Asistente IA para campos de texto libre ─────────────────────────────
  suggestFieldContent: protectedProcedure
    .input(z.object({
      fieldType: z.enum([
        "chiefComplaint",
        "medicalHistory",
        "personalHistory",
        "familyHistory",
        "treatmentPlan",
        "sessionNote",
        "therapeuticObjectives",
        "psychometricInterpretation",
      ]),
      context: z.string().optional(),
      patientAge: z.number().optional(),
      patientGender: z.string().optional(),
      diagnosisContext: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireClinicalAccess(ctx.user.role);
      const fieldLabels: Record<string, string> = {
        chiefComplaint: "motivo de consulta",
        medicalHistory: "antecedentes médicos",
        personalHistory: "antecedentes personales",
        familyHistory: "antecedentes familiares",
        treatmentPlan: "plan de tratamiento",
        sessionNote: "nota de sesión clínica",
        therapeuticObjectives: "objetivos terapéuticos",
        psychometricInterpretation: "interpretación de evaluación psicométrica",
      };
      const fieldInstructions: Record<string, string> = {
        chiefComplaint: "Redacta un motivo de consulta clínico conciso y profesional (2-4 oraciones) que describa la problemática principal del paciente en términos psicológicos/ocupacionales.",
        medicalHistory: "Lista los antecedentes médicos más relevantes para un expediente de salud ocupacional y riesgos psicosociales (NOM-035). Incluye condiciones crónicas, medicación actual y cirugías relevantes.",
        personalHistory: "Describe los antecedentes personales relevantes: historia laboral, eventos de vida significativos, hábitos de salud y factores protectores.",
        familyHistory: "Describe los antecedentes familiares relevantes: enfermedades hereditarias, dinámica familiar y factores de riesgo psicosocial familiar.",
        treatmentPlan: "Elabora un plan de tratamiento estructurado con objetivos a corto y largo plazo, técnicas terapéuticas recomendadas y frecuencia de sesiones.",
        sessionNote: "Redacta una nota de sesión clínica profesional con: estado actual del paciente, temas abordados, intervenciones realizadas y plan para próxima sesión.",
        therapeuticObjectives: "Define objetivos terapéuticos SMART (específicos, medibles, alcanzables, relevantes y con tiempo definido) para el plan de intervención.",
        psychometricInterpretation: "Redacta una interpretación clínica profesional de los resultados de la evaluación psicométrica, incluyendo implicaciones para el tratamiento.",
      };
      const patientInfo = [
        input.patientAge ? `Edad del paciente: ${input.patientAge} años` : "",
        input.patientGender ? `Género: ${input.patientGender}` : "",
        input.diagnosisContext ? `Contexto diagnóstico: ${input.diagnosisContext}` : "",
        input.context ? `Texto actual del profesional: "${input.context}"` : "",
      ].filter(Boolean).join("\n");
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Eres un psicólogo clínico y especialista en salud ocupacional con experiencia en la NOM-035 STPS 2018. Tu tarea es asistir a profesionales de la salud redactando contenido clínico preciso, ético y profesional para expedientes psicológicos. Responde SIEMPRE en español. Sé conciso, clínico y profesional. No incluyas disclaimers ni explicaciones meta.`,
          },
          {
            role: "user",
            content: `Necesito sugerencias para el campo de "${fieldLabels[input.fieldType]}" en un expediente clínico.\n${patientInfo ? `Información del paciente:\n${patientInfo}\n` : ""}Instrucción: ${fieldInstructions[input.fieldType]}\n\nProporciona 3 variantes de texto sugerido, numeradas del 1 al 3, cada una en un párrafo separado. Que sean diferentes en enfoque pero igualmente profesionales.`,
          },
        ],
      });
      const rawContent: string = typeof response.choices?.[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "";
      const variants = rawContent
        .split(/\n(?=\d+\.)/)
        .map((v: string) => v.replace(/^\d+\.\s*/, "").trim())
        .filter((v: string) => v.length > 20)
        .slice(0, 3);
      return {
        suggestions: variants.length > 0 ? variants : [rawContent.trim()],
        fieldType: input.fieldType,
      };
    }),

  // ─── Estadísticas ───────────────────────────────────────────────────────────
  getStats: protectedProcedure.query(async ({ ctx }) => {
    requireClinicalAccess(ctx.user.role);
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const [totalRecords, activeRecords, totalEvaluations, totalSessions] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(clinicalRecords),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(clinicalRecords)
        .where(eq(clinicalRecords.isActive, true)),
      db.select({ count: sql<number>`COUNT(*)` }).from(clinicalEvaluations),
      db.select({ count: sql<number>`COUNT(*)` }).from(clinicalSessionNotes),
    ]);

    return {
      totalRecords: totalRecords[0]?.count ?? 0,
      activeRecords: activeRecords[0]?.count ?? 0,
      totalEvaluations: totalEvaluations[0]?.count ?? 0,
      totalSessions: totalSessions[0]?.count ?? 0,
    };
  }),

  // ── Exportación masiva ZIP de expedientes filtrados ───────────────────────
  bulkExportZip: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      isActive: z.boolean().optional(),
      departmentId: z.number().optional(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .mutation(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Filtro por departamento: obtener IDs de empleados del departamento
      let employeeIdsInDept: number[] | undefined;
      if (input.departmentId) {
        const empRows = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.departmentId, input.departmentId));
        employeeIdsInDept = empRows.map(e => e.id);
        if (employeeIdsInDept.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No hay empleados en el departamento seleccionado' });
        }
      }

      // Construir condiciones de filtro (igual que list)
      const conditions = [];
      if (input.isActive !== undefined) conditions.push(eq(clinicalRecords.isActive, input.isActive));
      if (input.search) conditions.push(like(clinicalRecords.patientName, `%${input.search}%`));
      if (employeeIdsInDept !== undefined) conditions.push(inArray(clinicalRecords.employeeId, employeeIdsInDept));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const records = await db
        .select()
        .from(clinicalRecords)
        .where(whereClause)
        .orderBy(desc(clinicalRecords.createdAt))
        .limit(input.limit);

      if (!records.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No se encontraron expedientes con los filtros aplicados' });
      }

      // Cargar datos compartidos una sola vez
      const companyRows = await db.select().from(companyGeneralData).limit(1);
      const company = companyRows[0];
      const logoRows = await db.select().from(companyLogo).limit(1);
      const logoUrl = logoRows[0]?.logoUrl ?? undefined;
      const { generateClinicalRecordPDF } = await import('../pdfGenerators/clinicalRecordPDF');

      const zip = new JSZip();
      const folderName = `expedientes-clinicos-${new Date().toISOString().slice(0, 10)}`;
      const folder = zip.folder(folderName)!;

      // Generar PDF para cada expediente y agregarlo al ZIP
      for (const record of records) {
        const [evaluations, sessionNotes] = await Promise.all([
          db.select().from(clinicalEvaluations).where(eq(clinicalEvaluations.recordId, record.id)).orderBy(desc(clinicalEvaluations.evaluationDate)),
          db.select().from(clinicalSessionNotes).where(eq(clinicalSessionNotes.recordId, record.id)).orderBy(desc(clinicalSessionNotes.sessionDate)),
        ]);
        const folio = `EXP-CLIN-${record.id}-${Date.now()}`;
        const pdfBuffer = await generateClinicalRecordPDF({
          record,
          evaluations,
          sessionNotes,
          companyName: company?.razonSocial ?? 'Empresa',
          logoUrl,
          folio,
        });
        const safeName = record.patientName.replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '').replace(/\s+/g, '_').slice(0, 60);
        folder.file(`${safeName}_${record.id}.pdf`, pdfBuffer);
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const zipKey = `clinical-records/bulk-export-${ctx.user.id}-${Date.now()}.zip`;
      const { url: zipUrl } = await storagePut(zipKey, zipBuffer, 'application/zip');

      // Notificar al propietario
      try {
        const { notifyOwner } = await import('../_core/notification');
        await notifyOwner({
          title: `📦 Exportación masiva ZIP — ${records.length} expedientes`,
          content: `El usuario ${ctx.user.name ?? ctx.user.email ?? 'desconocido'} exportó ${records.length} expediente${records.length !== 1 ? 's' : ''} clínico${records.length !== 1 ? 's' : ''} en formato ZIP el ${new Date().toLocaleString('es-MX')}.`,
        });
      } catch { /* no bloqueante */ }

      return { url: zipUrl, count: records.length, zipKey };
    }),
});
