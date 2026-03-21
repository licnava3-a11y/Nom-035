import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { committeeTrainingPrograms, committeeTrainingSessions, committeeTrainingAttendance, committeeMembers, employees } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { generateCommitteeCertificatePDF } from "../services/committeeCertificatePDFService";

export const committeeTrainingRouter = router({
  // Crear programa de capacitación
  createProgram: protectedProcedure
    .input(z.object({
      title: z.string().min(1, "El título es requerido"),
      description: z.string().optional(),
      type: z.enum(["protocolo_violencia", "factores_riesgo", "medidas_prevencion", "otro"]),
      duration: z.number().min(1, "La duración debe ser mayor a 0"),
      instructor: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }: { input: { title: string; description?: string; type: "protocolo_violencia" | "factores_riesgo" | "medidas_prevencion" | "otro"; duration: number; instructor?: string }; ctx: any }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [program] = await (db.insert(committeeTrainingPrograms) as any).values({
        title: input.title,
        description: input.description,
        type: input.type,
        duration: input.duration,
        instructor: input.instructor,
        createdBy: ctx.user.id,
      });

      return { success: true, programId: program.insertId };
    }),

  // Listar programas con filtros
  listPrograms: protectedProcedure
    .input(z.object({
      status: z.enum(["activo", "completado", "cancelado"]).optional(),
      type: z.enum(["protocolo_violencia", "factores_riesgo", "medidas_prevencion", "otro"]).optional(),
    }))
    .query(async ({ input }: { input: { status?: "activo" | "completado" | "cancelado"; type?: "protocolo_violencia" | "factores_riesgo" | "medidas_prevencion" | "otro" } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      let query: any = db.select().from(committeeTrainingPrograms);

      const conditions = [];
      if (input.status) {
        conditions.push(eq(committeeTrainingPrograms.status, input.status));
      }
      if (input.type) {
        conditions.push(eq(committeeTrainingPrograms.type, input.type));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const programs = await query.orderBy(desc(committeeTrainingPrograms.createdAt));
      return programs;
    }),

  // Obtener programa por ID
  getProgramById: protectedProcedure
    .input(z.object({
      programId: z.number(),
    }))
    .query(async ({ input }: { input: { programId: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [program] = await db
        .select()
        .from(committeeTrainingPrograms)
        .where(eq(committeeTrainingPrograms.id, input.programId));

      if (!program) {
        throw new Error("Programa no encontrado");
      }

      return program;
    }),

  // Crear sesión de capacitación
  createSession: protectedProcedure
    .input(z.object({
      programId: z.number(),
      sessionDate: z.string(), // YYYY-MM-DD
      sessionTime: z.string(), // HH:MM
      location: z.string().optional(),
      type: z.enum(["presencial", "en_linea"]),
      meetingLink: z.string().optional(),
    }))
    .mutation(async ({ input }: { input: { programId: number; sessionDate: string; sessionTime: string; location?: string; type: "presencial" | "en_linea"; meetingLink?: string } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [session] = await (db.insert(committeeTrainingSessions) as any).values({
        programId: input.programId,
        sessionDate: new Date(input.sessionDate),
        sessionTime: input.sessionTime,
        location: input.location,
        type: input.type,
        meetingLink: input.meetingLink,
      });

      return { success: true, sessionId: session.insertId };
    }),

  // Listar sesiones con filtros
  listSessions: protectedProcedure
    .input(z.object({
      programId: z.number().optional(),
      startDate: z.string().optional(), // YYYY-MM-DD
      endDate: z.string().optional(), // YYYY-MM-DD
    }))
    .query(async ({ input }: { input: { programId?: number; startDate?: string; endDate?: string } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      let query: any = db.select().from(committeeTrainingSessions);

      const conditions = [];
      if (input.programId) {
        conditions.push(eq(committeeTrainingSessions.programId, input.programId));
      }
      if (input.startDate) {
        conditions.push(gte(committeeTrainingSessions.sessionDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(committeeTrainingSessions.sessionDate, new Date(input.endDate)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const sessions = await query.orderBy(desc(committeeTrainingSessions.sessionDate));
      return sessions;
    }),

  // Registrar asistencia
  recordAttendance: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      committeeMemberId: z.number(),
      attended: z.boolean(),
    }))
    .mutation(async ({ input }: { input: { sessionId: number; committeeMemberId: number; attended: boolean } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      // Verificar si ya existe un registro de asistencia
      const existing = await db
        .select()
        .from(committeeTrainingAttendance)
        .where(
          and(
            eq(committeeTrainingAttendance.sessionId, input.sessionId),
            eq(committeeTrainingAttendance.committeeMemberId, input.committeeMemberId)
          )
        );

      if (existing.length > 0) {
        // Actualizar registro existente
        await db
          .update(committeeTrainingAttendance)
          .set({
            attended: input.attended,
            attendedAt: input.attended ? new Date() : null,
          } as any)
          .where(eq(committeeTrainingAttendance.id, existing[0].id));
      } else {
        // Crear nuevo registro
        await (db.insert(committeeTrainingAttendance) as any).values({
          sessionId: input.sessionId,
          committeeMemberId: input.committeeMemberId,
          attended: input.attended,
          attendedAt: input.attended ? new Date() : null,
        });
      }

      // Actualizar contador de asistencia en la sesión
      const attendanceCount = await db
        .select()
        .from(committeeTrainingAttendance)
        .where(
          and(
            eq(committeeTrainingAttendance.sessionId, input.sessionId),
            eq(committeeTrainingAttendance.attended, true)
          )
        );

      await db
        .update(committeeTrainingSessions)
        .set({ attendanceCount: attendanceCount.length } as any)
        .where(eq(committeeTrainingSessions.id, input.sessionId));

      return { success: true };
    }),

  // Generar certificado (placeholder - implementación completa requiere PDF generation)
  generateCertificate: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      committeeMemberId: z.number(),
    }))
    .mutation(async ({ input }: { input: { sessionId: number; committeeMemberId: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      // Verificar que el miembro asistió
      const [attendance] = await db
        .select()
        .from(committeeTrainingAttendance)
        .where(
          and(
            eq(committeeTrainingAttendance.sessionId, input.sessionId),
            eq(committeeTrainingAttendance.committeeMemberId, input.committeeMemberId),
            eq(committeeTrainingAttendance.attended, true)
          )
        );

      if (!attendance) {
        throw new Error("El miembro no asistió a esta sesión");
      }

      // Obtener datos de la sesión y programa
      const [session] = await db
        .select()
        .from(committeeTrainingSessions)
        .where(eq(committeeTrainingSessions.id, input.sessionId));

      const [program] = await db
        .select()
        .from(committeeTrainingPrograms)
        .where(eq(committeeTrainingPrograms.id, session.programId));

      const [member] = await db
        .select({
          id: committeeMembers.id,
          employeeId: committeeMembers.employeeId,
          position: committeeMembers.position,
        })
        .from(committeeMembers)
        .where(eq(committeeMembers.id, input.committeeMemberId));

      if (!member || !member.employeeId) {
        throw new Error("Miembro del comité no encontrado o sin empleado asociado");
      }

      // Obtener datos del empleado
      const employeeResults = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(eq(employees.id, member.employeeId));

      if (employeeResults.length === 0) {
        throw new Error("Empleado no encontrado");
      }

      const employee = employeeResults[0];

      const memberName = `${employee.firstName} ${employee.lastName}`;

      // Generar certificado PDF
      const certificateUrl = await generateCommitteeCertificatePDF({
        memberName,
        programTitle: program.title,
        sessionDate: new Date(session.sessionDate),
        duration: program.duration,
        instructorName: program.instructor || 'Instructor no especificado',
        companyName: 'Plataforma de Capacitación NOM-035',
      });

      // Actualizar registro de asistencia con URL del certificado
      await db
        .update(committeeTrainingAttendance)
        .set({ certificateUrl } as any)
        .where(eq(committeeTrainingAttendance.id, attendance.id));

      // Enviar email de notificación al empleado
      try {
        // Obtener email del usuario asociado al empleado
        const [user] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.employeeId, employee.id))
          .limit(1);

        if (user && user.email) {
          const { sendEmail, getCertificateGeneratedTemplate } = await import("../services/emailService");
          
          const emailHtml = getCertificateGeneratedTemplate({
            employeeName: memberName,
            trainingTitle: program.title,
            certificateNumber: `CERT-${session.id}-${member.id}`,
            issueDate: new Date(),
            downloadUrl: certificateUrl,
          });

          await sendEmail({
            to: user.email,
            subject: `🎓 Certificado Generado - ${program.title}`,
            html: emailHtml,
            template: "certificate_generated",
          });

          console.log(`[Generate Certificate] Email enviado a ${user.email}`);
        }
      } catch (emailError) {
        console.error("[Generate Certificate] Error al enviar email:", emailError);
        // No fallar la generación del certificado si el email falla
      }

      return { success: true, certificateUrl };
    }),

  // Obtener reporte de asistencia
  getAttendanceReport: protectedProcedure
    .input(z.object({
      programId: z.number().optional(),
      sessionId: z.number().optional(),
    }))
    .query(async ({ input }: { input: { programId?: number; sessionId?: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      if (!input.programId && !input.sessionId) {
        throw new Error("Debe proporcionar programId o sessionId");
      }

      let sessions: any[] = [];
      if (input.sessionId) {
        // Reporte de una sesión específica
        sessions = await db
          .select()
          .from(committeeTrainingSessions)
          .where(eq(committeeTrainingSessions.id, input.sessionId));
      } else if (input.programId) {
        // Reporte de todas las sesiones de un programa
        sessions = await db
          .select()
          .from(committeeTrainingSessions)
          .where(eq(committeeTrainingSessions.programId, input.programId));
      }

      const report = [];
      for (const session of sessions) {
        const attendance = await db
          .select({
            id: committeeTrainingAttendance.id,
            committeeMemberId: committeeTrainingAttendance.committeeMemberId,
            attended: committeeTrainingAttendance.attended,
            attendedAt: committeeTrainingAttendance.attendedAt,
            certificateUrl: committeeTrainingAttendance.certificateUrl,
            memberFirstName: employees.firstName,
            memberLastName: employees.lastName,
            memberPosition: committeeMembers.position,
          })
          .from(committeeTrainingAttendance)
          .leftJoin(committeeMembers, eq(committeeTrainingAttendance.committeeMemberId, committeeMembers.id))
          .leftJoin(employees, eq(committeeMembers.employeeId, employees.id))
          .where(eq(committeeTrainingAttendance.sessionId, session.id));

        report.push({
          session,
          attendance,
          totalAttendees: attendance.filter((a: any) => a.attended).length,
          totalMembers: attendance.length,
        });
      }

      return report;
    }),

  // Actualizar status de programa
  updateProgramStatus: protectedProcedure
    .input(z.object({
      programId: z.number(),
      status: z.enum(["activo", "completado", "cancelado"]),
    }))
    .mutation(async ({ input }: { input: { programId: number; status: "activo" | "completado" | "cancelado" } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      await db
        .update(committeeTrainingPrograms)
        .set({ status: input.status } as any)
        .where(eq(committeeTrainingPrograms.id, input.programId));

      return { success: true };
    }),
});
