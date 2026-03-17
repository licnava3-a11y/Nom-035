import { z } from "zod";
import { emailValidator, emailValidatorOptional, phoneValidatorMXOptional } from "../validators/contact";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  jobOpenings, 
  candidates, 
  candidateWorkHistory, 
  candidateReferences 
} from "../../drizzle/schema";

export const recruitmentRouter = router({
  // Crear vacante
  createJobOpening: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string(),
      requirements: z.string().optional(),
      responsibilities: z.string().optional(),
      departmentId: z.number().optional(),
      positionId: z.number().optional(),
      salaryRange: z.string().optional(),
      location: z.string().optional(),
      employmentType: z.enum(["permanent", "temporary", "contract", "internship"]).default("permanent"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [result] = await db.insert(jobOpenings).values({
        title: input.title,
        description: input.description,
        requirements: input.requirements || null,
        responsibilities: input.responsibilities || null,
        departmentId: input.departmentId || null,
        positionId: input.positionId || null,
        salaryRange: input.salaryRange || null,
        location: input.location || null,
        employmentType: input.employmentType,
        status: "open",
        createdBy: 1, // TODO: usar ctx.user.id cuando esté disponible
      });

      return { success: true, id: result.insertId };
    }),

  // Obtener todas las vacantes
  getJobOpenings: publicProcedure
    .input(z.object({
      status: z.enum(["open", "closed", "all"]).default("open"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      let query = db.select().from(jobOpenings);
      
      if (input.status !== "all") {
        query = query.where(eq(jobOpenings.status, input.status)) as any;
      }
      
      const results = await query.orderBy(desc(jobOpenings.createdAt));
      return results;
    }),

  // Crear candidato (postulación pública)
  createCandidate: publicProcedure
    .input(z.object({
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
      workHistory: z.array(z.object({
        companyName: z.string(),
        position: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        isCurrent: z.boolean(),
        responsibilities: z.string().optional(),
        reasonForLeaving: z.string().optional(),
      })).optional(),
      references: z.array(z.object({
        name: z.string(),
        position: z.string(),
        company: z.string(),
        phone: z.string(),
        email: emailValidatorOptional,
        relationship: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
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
        verificationAuthorizedAt: input.verificationAuthorized ? new Date() : null,
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
        await db.insert(candidateWorkHistory).values(workHistoryValues);
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
        await db.insert(candidateReferences).values(referencesValues);
      }

      return { success: true, candidateId };
    }),

  // Obtener candidatos por vacante
  getCandidatesByJob: protectedProcedure
    .input(z.object({
      jobOpeningId: z.number(),
      status: z.enum(["new", "reviewing", "interview", "offer", "hired", "rejected", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const whereConditions = [eq(candidates.jobOpeningId, input.jobOpeningId)];
      
      if (input.status !== "all") {
        whereConditions.push(eq(candidates.status, input.status));
      }
      
      const query = db.select().from(candidates).where(and(...whereConditions));
      
      const results = await query.orderBy(desc(candidates.appliedAt));
      return results;
    }),

  // Obtener detalle de candidato
  getCandidateDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [candidate] = await db.select().from(candidates)
        .where(eq(candidates.id, input.id));

      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidato no encontrado",
        });
      }

      // Obtener historial laboral
      const workHistory = await db.select().from(candidateWorkHistory)
        .where(eq(candidateWorkHistory.candidateId, input.id))
        .orderBy(desc(candidateWorkHistory.startDate));

      // Obtener referencias
      const references = await db.select().from(candidateReferences)
        .where(eq(candidateReferences.candidateId, input.id));

      return {
        ...candidate,
        workHistory,
        references,
      };
    }),

  // Actualizar estado de candidato
  updateCandidateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "reviewing", "interview", "offer", "hired", "rejected"]),
      recruiterNotes: z.string().optional(),
      hiringScore: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const updateData: any = {
        status: input.status,
        recruiterNotes: input.recruiterNotes,
        hiringScore: input.hiringScore,
      };

      if (input.status === "reviewing") updateData.reviewedAt = new Date();
      if (input.status === "interview") updateData.interviewedAt = new Date();
      if (input.status === "hired") updateData.hiredAt = new Date();
      if (input.status === "rejected") updateData.rejectedAt = new Date();

      await db.update(candidates)
        .set(updateData)
        .where(eq(candidates.id, input.id));

      return { success: true };
    }),
});
