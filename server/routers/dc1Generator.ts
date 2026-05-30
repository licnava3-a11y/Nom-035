/**
 * Sprint 82 — Generadores DC-1 y SIRCE XML
 * Procedures para generar DC-1 PDF y SIRCE XML
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { employees, courses, studentProgress } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const dc1GeneratorRouter = router({
  generateDC1: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      courseId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const employee = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          curp: employees.curp,
        })
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      const course = await db
        .select({
          id: courses.id,
          name: courses.name,
          description: courses.description,
          hours: courses.hours,
          instructorId: courses.instructorId,
        })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);

      if (!course.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Curso no encontrado",
        });
      }

      let instructorName = "N/A";
      // Nota: No hay tabla de instructores en el schema, usar campo instructor del curso

      const progress = await db
        .select({
          completedAt: studentProgress.completedAt,
          progressPercentage: studentProgress.progressPercentage,
        })
        .from(studentProgress)
        .where(and(
          eq(studentProgress.studentId, input.employeeId),
          eq(studentProgress.courseId, input.courseId)
        ))
        .limit(1);

      if (!progress.length || !progress[0].completedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El empleado no ha completado este curso",
        });
      }

      const completedDate = new Date(progress[0].completedAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const dc1Html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>DC-1</title></head><body><h1>CONSTANCIA DE HABILIDADES LABORALES (DC-1)</h1><p><strong>Empleado:</strong> ${employee[0].firstName} ${employee[0].lastName}</p><p><strong>CURP:</strong> ${employee[0].curp || "N/A"}</p><p><strong>Curso:</strong> ${course[0].name}</p><p><strong>Horas:</strong> ${course[0].hours || "N/A"}</p><p><strong>Instructor:</strong> ${instructorName}</p><p><strong>Fecha de Conclusión:</strong> ${completedDate}</p><p><strong>Porcentaje:</strong> ${progress[0].progressPercentage}%</p></body></html>`;

      return {
        ok: true,
        html: dc1Html,
        filename: `DC-1_${employee[0].firstName}_${employee[0].lastName}.html`,
      };
    }),

  generateSIRCEXml: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      courseId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const employee = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          curp: employees.curp,
        })
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      const course = await db
        .select({
          id: courses.id,
          name: courses.name,
          description: courses.description,
          hours: courses.hours,
        })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);

      if (!course.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Curso no encontrado",
        });
      }

      const progress = await db
        .select({
          completedAt: studentProgress.completedAt,
          progressPercentage: studentProgress.progressPercentage,
        })
        .from(studentProgress)
        .where(and(
          eq(studentProgress.studentId, input.employeeId),
          eq(studentProgress.courseId, input.courseId)
        ))
        .limit(1);

      if (!progress.length || !progress[0].completedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El empleado no ha completado este curso",
        });
      }

      const completedDate = new Date(progress[0].completedAt).toISOString().split('T')[0];
      const sirceXml = `<?xml version="1.0" encoding="UTF-8"?><RegistroCapacitacion><Trabajador><CURP>${employee[0].curp || ""}</CURP><Nombre>${employee[0].firstName}</Nombre><ApellidoPaterno>${employee[0].lastName.split(' ')[0] || ""}</ApellidoPaterno><Correo>${employee[0].email}</Correo></Trabajador><Capacitacion><NombreCurso>${course[0].name}</NombreCurso><Horas>${course[0].hours || 0}</Horas><FechaConclusion>${completedDate}</FechaConclusion><Resultado>APROBADO</Resultado><Porcentaje>${progress[0].progressPercentage}</Porcentaje></Capacitacion></RegistroCapacitacion>`;

      return {
        ok: true,
        xml: sirceXml,
        filename: `SIRCE_${employee[0].curp || employee[0].id}_${completedDate}.xml`,
      };
    }),

  exportSIRCEByPeriod: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const records = await db
        .select({
          employeeId: studentProgress.studentId,
          courseId: studentProgress.courseId,
          completedAt: studentProgress.completedAt,
        })
        .from(studentProgress)
        .where(and(
          studentProgress.completedAt !== null,
          studentProgress.completedAt >= new Date(input.startDate),
          studentProgress.completedAt <= new Date(input.endDate)
        ));

      const sirceXmlBatch = `<?xml version="1.0" encoding="UTF-8"?><RegistrosCapacitacion><Periodo><FechaInicio>${input.startDate}</FechaInicio><FechaFin>${input.endDate}</FechaFin><TotalRegistros>${records.length}</TotalRegistros></Periodo></RegistrosCapacitacion>`;

      return {
        ok: true,
        xml: sirceXmlBatch,
        filename: `SIRCE_Batch_${input.startDate}_to_${input.endDate}.xml`,
        totalRecords: records.length,
      };
    }),
});
