import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  clinicalRecords,
  clinicalEvaluations,
  clinicalSessionNotes,
} from "../../drizzle/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      requireClinicalAccess(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [];
      if (input.isActive !== undefined) {
        conditions.push(eq(clinicalRecords.isActive, input.isActive));
      }
      if (input.search) {
        conditions.push(like(clinicalRecords.patientName, `%${input.search}%`));
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
});
