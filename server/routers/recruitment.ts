import { z } from "zod";
import {
  emailValidator,
  emailValidatorOptional,
  phoneValidatorMXOptional,
} from "../validators/contact";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  jobOpenings,
  candidates,
  candidateWorkHistory,
  candidateReferences,
} from "../../drizzle/schema";

// Education level order for comparison
const EDUCATION_ORDER: Record<string, number> = {
  primaria: 1,
  secundaria: 2,
  preparatoria: 3,
  tecnico: 4,
  licenciatura: 5,
  especialidad: 6,
  maestria: 7,
  doctorado: 8,
};

const EDUCATION_LABELS: Record<string, string> = {
  primaria: "Primaria",
  secundaria: "Secundaria",
  preparatoria: "Preparatoria / Bachillerato",
  tecnico: "Técnico Superior",
  licenciatura: "Licenciatura",
  especialidad: "Especialidad",
  maestria: "Maestría",
  doctorado: "Doctorado",
};

export const recruitmentRouter = router({
  // Crear vacante
  createJobOpening: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        requirements: z.string().optional(),
        responsibilities: z.string().optional(),
        departmentId: z.number().optional(),
        positionId: z.number().optional(),
        salaryRange: z.string().optional(),
        location: z.string().optional(),
        employmentType: z
          .enum(["permanent", "temporary", "contract", "internship"])
          .default("permanent"),
        minimumEducation: z
          .enum([
            "primaria",
            "secundaria",
            "preparatoria",
            "tecnico",
            "licenciatura",
            "especialidad",
            "maestria",
            "doctorado",
          ])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [result] = await (db.insert(jobOpenings) as any).values({
        title: input.title,
        description: input.description,
        requirements: input.requirements || null,
        responsibilities: input.responsibilities || null,
        departmentId: input.departmentId || null,
        positionId: input.positionId || null,
        salaryRange: input.salaryRange || null,
        location: input.location || null,
        employmentType: input.employmentType,
        minimumEducation: input.minimumEducation || null,
        status: "open",
        createdBy: ctx.user.id,
      });

      return { success: true, id: result.insertId };
    }),

  // Actualizar vacante
  updateJobOpening: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        requirements: z.string().optional(),
        responsibilities: z.string().optional(),
        departmentId: z.number().optional(),
        positionId: z.number().optional(),
        salaryRange: z.string().optional(),
        location: z.string().optional(),
        employmentType: z
          .enum(["permanent", "temporary", "contract", "internship"])
          .optional(),
        minimumEducation: z
          .enum([
            "primaria",
            "secundaria",
            "preparatoria",
            "tecnico",
            "licenciatura",
            "especialidad",
            "maestria",
            "doctorado",
          ])
          .nullable()
          .optional(),
        status: z.enum(["draft", "open", "closed", "filled"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      const { id, ...updateData } = input;
      await db
        .update(jobOpenings)
        .set(updateData as any)
        .where(eq(jobOpenings.id, id));
      return { success: true };
    }),

  // Obtener todas las vacantes
  getJobOpenings: publicProcedure
    .input(
      z.object({
        status: z.enum(["open", "closed", "all"]).default("open"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      let query: any = db.select().from(jobOpenings);

      if (input.status !== "all") {
        query = query.where(eq(jobOpenings.status, input.status)) as any;
      }

      const results = await query.orderBy(desc(jobOpenings.createdAt));
      return results;
    }),

  // Crear candidato (postulación pública)
  createCandidate: publicProcedure
    .input(
      z.object({
        jobOpeningId: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        email: emailValidator,
        phone: phoneValidatorMXOptional,
        curp: z.string().length(18),
        birthDate: z.string().optional(),
        gender: z.enum(["Masculino", "Femenino"]).optional(),
        birthState: z.string().optional(),
        age: z.number().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        education: z.string().optional(),
        fieldOfStudy: z.string().optional(),
        arcoAccepted: z.boolean(),
        verificationAuthorized: z.boolean(),
        resumeUrl: z.string().optional(),
        workHistory: z
          .array(
            z.object({
              companyName: z.string(),
              position: z.string(),
              startDate: z.string(),
              endDate: z.string().optional(),
              isCurrent: z.boolean(),
              responsibilities: z.string().optional(),
              reasonForLeaving: z.string().optional(),
            })
          )
          .optional(),
        references: z
          .array(
            z.object({
              name: z.string(),
              position: z.string(),
              company: z.string(),
              phone: z.string(),
              email: emailValidatorOptional,
              relationship: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Insertar candidato
      const [result] = await (db.insert(candidates) as any).values({
        jobOpeningId: input.jobOpeningId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        curp: input.curp,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        gender: input.gender || null,
        birthState: input.birthState || null,
        age: input.age || null,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        postalCode: input.postalCode || null,
        education: input.education || null,
        fieldOfStudy: input.fieldOfStudy || null,
        arcoAccepted: input.arcoAccepted,
        arcoAcceptedAt: input.arcoAccepted ? new Date() : null,
        verificationAuthorized: input.verificationAuthorized,
        verificationAuthorizedAt: input.verificationAuthorized
          ? new Date()
          : null,
        resumeUrl: input.resumeUrl || null,
        status: "new",
      });

      const candidateId = result.insertId;

      // Insertar historial laboral
      if (input.workHistory && input.workHistory.length > 0) {
        const workHistoryValues = input.workHistory.map(wh => ({
          candidateId,
          companyName: wh.companyName,
          position: wh.position,
          startDate: new Date(wh.startDate),
          endDate: wh.endDate ? new Date(wh.endDate) : null,
          isCurrent: wh.isCurrent,
          responsibilities: wh.responsibilities || null,
          reasonForLeaving: wh.reasonForLeaving || null,
        }));
        await (db.insert(candidateWorkHistory) as any).values(
          workHistoryValues
        );
      }

      // Insertar referencias
      if (input.references && input.references.length > 0) {
        const referencesValues = input.references.map(ref => ({
          candidateId,
          name: ref.name,
          position: ref.position,
          company: ref.company,
          phone: ref.phone,
          email: ref.email || null,
          relationship: ref.relationship,
        }));
        await (db.insert(candidateReferences) as any).values(referencesValues);
      }

      return { success: true, candidateId };
    }),

  // Obtener candidatos por vacante — con indicador de cumplimiento de escolaridad
  getCandidatesByJob: protectedProcedure
    .input(
      z.object({
        jobOpeningId: z.number(),
        status: z
          .enum([
            "new",
            "reviewing",
            "interview",
            "offer",
            "hired",
            "rejected",
            "all",
          ])
          .default("all"),
        educationFilter: z
          .enum(["all", "meets", "does_not_meet"])
          .default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get the job opening to know the minimum education requirement
      const [jobOpening] = await db
        .select({ minimumEducation: jobOpenings.minimumEducation })
        .from(jobOpenings)
        .where(eq(jobOpenings.id, input.jobOpeningId));

      const whereConditions = [eq(candidates.jobOpeningId, input.jobOpeningId)];

      if (input.status !== "all") {
        whereConditions.push(eq(candidates.status, input.status));
      }

      const results = await db
        .select()
        .from(candidates)
        .where(and(...whereConditions))
        .orderBy(desc(candidates.appliedAt));

      // Annotate each candidate with education compliance
      const minEduLevel = jobOpening?.minimumEducation
        ? (EDUCATION_ORDER[jobOpening.minimumEducation] ?? 0)
        : 0;

      const annotated = results.map((c: any) => {
        const candidateEduLevel = c.education
          ? (EDUCATION_ORDER[c.education] ?? 0)
          : 0;
        const meetsEducation =
          minEduLevel === 0 ? null : candidateEduLevel >= minEduLevel;
        return {
          ...c,
          meetsEducation,
          educationLabel: c.education
            ? (EDUCATION_LABELS[c.education] ?? c.education)
            : null,
          minimumEducationRequired: jobOpening?.minimumEducation ?? null,
          minimumEducationLabel: jobOpening?.minimumEducation
            ? (EDUCATION_LABELS[jobOpening.minimumEducation] ??
              jobOpening.minimumEducation)
            : null,
        };
      });

      // Apply education filter
      if (input.educationFilter === "meets") {
        return annotated.filter((c: any) => c.meetsEducation === true);
      } else if (input.educationFilter === "does_not_meet") {
        return annotated.filter((c: any) => c.meetsEducation === false);
      }

      return annotated;
    }),

  // Obtener detalle de candidato
  getCandidateDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [candidate] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, input.id));

      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidato no encontrado",
        });
      }

      // Obtener historial laboral
      const workHistory = await db
        .select()
        .from(candidateWorkHistory)
        .where(eq(candidateWorkHistory.candidateId, input.id))
        .orderBy(desc(candidateWorkHistory.startDate));

      // Obtener referencias
      const references = await db
        .select()
        .from(candidateReferences)
        .where(eq(candidateReferences.candidateId, input.id));

      return {
        ...candidate,
        workHistory,
        references,
      };
    }),

  // Actualizar estado de candidato
  updateCandidateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "new",
          "reviewing",
          "interview",
          "offer",
          "hired",
          "rejected",
        ]),
        recruiterNotes: z.string().optional(),
        hiringScore: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const updateData: any = {
        status: input.status,
        recruiterNotes: input.recruiterNotes,
        hiringScore: input.hiringScore,
      };

      if (input.status === "reviewing") updateData.reviewedAt = new Date();
      if (input.status === "interview") updateData.interviewedAt = new Date();
      if (input.status === "hired") updateData.hiredAt = new Date();
      if (input.status === "rejected") updateData.rejectedAt = new Date();

      await db
        .update(candidates)
        .set(updateData)
        .where(eq(candidates.id, input.id));

      return { success: true };
    }),
});
