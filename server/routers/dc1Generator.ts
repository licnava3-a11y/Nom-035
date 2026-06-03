/**
 * Sprint 82 — Generadores DC-1 y SIRCE XML
 * Procedures para generar DC-1 PDF y SIRCE XML
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { employees, courses, studentProgress, dc1SirceHistory } from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

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
          title: courses.title,
          description: courses.description,
          duration: courses.duration,
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

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>DC-1</title></head><body><h1>Constancia de Habilidades Laborales (DC-1)</h1><p>Empleado: ${employee[0].firstName} ${employee[0].lastName}</p><p>Curso: ${course[0].title}</p></body></html>`;
      const filename = `DC1_${employee[0].curp}_${new Date().toISOString().split('T')[0]}.html`;

      return {
        ok: true,
        html,
        filename,
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
        .select()
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
        .select()
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);

      if (!course.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Curso no encontrado",
        });
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?><RegistroCapacitacion><Trabajador><CURP>${employee[0].curp}</CURP><Nombre>${employee[0].firstName}</Nombre></Trabajador><Capacitacion><NombreCurso>${course[0].title}</NombreCurso><Horas>${course[0].duration ?? 0}</Horas></Capacitacion></RegistroCapacitacion>`;
      const filename = `SIRCE_${employee[0].curp}_${new Date().toISOString().split('T')[0]}.xml`;

      return {
        ok: true,
        xml,
        filename,
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
        .select()
        .from(studentProgress)
        .where(and(
          gte(studentProgress.completedAt, new Date(input.startDate)),
          lte(studentProgress.completedAt, new Date(input.endDate))
        ));

      const sirceXmlBatch = `<?xml version="1.0" encoding="UTF-8"?><RegistrosCapacitacion><Periodo><FechaInicio>${input.startDate}</FechaInicio><FechaFin>${input.endDate}</FechaFin><TotalRegistros>${records.length}</TotalRegistros></Periodo></RegistrosCapacitacion>`;

      return {
        ok: true,
        xml: sirceXmlBatch,
        filename: `SIRCE_Batch_${input.startDate}_to_${input.endDate}.xml`,
        totalRecords: records.length,
      };
    }),

  // Guardar en historial después de generar
  saveToHistory: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      courseId: z.number(),
      fileType: z.enum(["dc1", "sirce"]),
      filename: z.string(),
      fileContent: z.string(),
      mimeType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(dc1SirceHistory).values({
        employeeId: input.employeeId,
        courseId: input.courseId,
        fileType: input.fileType,
        filename: input.filename,
        fileContent: input.fileContent,
        fileSize: input.fileContent.length,
        mimeType: input.mimeType || (input.fileType === "dc1" ? "text/html" : "application/xml"),
        generatedBy: ctx.user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      });

      return { ok: true, id: (result as any)[0]?.insertId ?? 0 };
    }),

  // Listar historial de archivos generados
  listHistory: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      fileType: z.enum(["dc1", "sirce"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input.employeeId) conditions.push(eq(dc1SirceHistory.employeeId, input.employeeId));
      if (input.fileType) conditions.push(eq(dc1SirceHistory.fileType, input.fileType));

      const records = await db.select({
        id: dc1SirceHistory.id,
        employeeId: dc1SirceHistory.employeeId,
        courseId: dc1SirceHistory.courseId,
        fileType: dc1SirceHistory.fileType,
        filename: dc1SirceHistory.filename,
        fileSize: dc1SirceHistory.fileSize,
        downloadCount: dc1SirceHistory.downloadCount,
        createdAt: dc1SirceHistory.createdAt,
        lastDownloadedAt: dc1SirceHistory.lastDownloadedAt,
      })
        .from(dc1SirceHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(dc1SirceHistory.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return records;
    }),

  // Obtener contenido de archivo del historial
  getHistoryFile: protectedProcedure
    .input(z.object({
      historyId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const record = await db
        .select()
        .from(dc1SirceHistory)
        .where(eq(dc1SirceHistory.id, input.historyId))
        .limit(1);

      if (!record.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Archivo no encontrado en historial",
        });
      }

      // Actualizar contador de descargas y timestamp
      await db
        .update(dc1SirceHistory)
        .set({
          downloadCount: (record[0].downloadCount || 0) + 1,
          lastDownloadedAt: new Date(),
        })
        .where(eq(dc1SirceHistory.id, input.historyId));

      return {
        filename: record[0].filename,
        content: record[0].fileContent,
        mimeType: record[0].mimeType,
        fileType: record[0].fileType,
      };
    }),

  // Eliminar archivo del historial
  deleteHistory: protectedProcedure
    .input(z.object({
      historyId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(dc1SirceHistory)
        .where(eq(dc1SirceHistory.id, input.historyId));

      return { ok: true };
    }),
});
