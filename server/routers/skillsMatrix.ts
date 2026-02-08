import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { competencies, skillsMatrix, skillsMatrixImports, employees } from "../../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const skillsMatrixRouter = router({
  // ============ Competencies Management ============
  
  createCompetency: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["Técnica", "Blanda", "Específica"]),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [competency] = await db.insert(competencies).values({
        ...input,
        createdBy: ctx.user.id,
      });
      
      return { success: true, competencyId: competency.insertId };
    }),

  listCompetencies: protectedProcedure
    .input(z.object({
      type: z.enum(["Técnica", "Blanda", "Específica", "Todas"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      if (!input.type || input.type === "Todas") {
        return await db.select().from(competencies).orderBy(competencies.name);
      }
      
      return await db.select()
        .from(competencies)
        .where(eq(competencies.type, input.type))
        .orderBy(competencies.name);
    }),

  // ============ Skills Matrix Management ============
  
  setEmployeeSkillLevel: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      competencyId: z.number(),
      level: z.enum(["Sin evaluar", "Básico", "Intermedio", "Avanzado", "Experto"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Check if entry exists
      const existing = await db.select()
        .from(skillsMatrix)
        .where(and(
          eq(skillsMatrix.employeeId, input.employeeId),
          eq(skillsMatrix.competencyId, input.competencyId)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db.update(skillsMatrix)
          .set({
            level: input.level,
            notes: input.notes,
            evaluatedBy: ctx.user.id,
            evaluationDate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(skillsMatrix.id, existing[0].id));
      } else {
        // Insert new
        await db.insert(skillsMatrix).values({
          employeeId: input.employeeId,
          competencyId: input.competencyId,
          level: input.level,
          notes: input.notes,
          evaluatedBy: ctx.user.id,
          evaluationDate: new Date(),
        });
      }

      return { success: true };
    }),

  getMatrix: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      position: z.string().optional(),
      employeeName: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get all employees with optional filters
      const filters = [];
      if (input.department) {
        filters.push(eq(employees.department, input.department));
      }
      if (input.position) {
        filters.push(eq(employees.position, input.position));
      }
      if (input.employeeName) {
        filters.push(sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName}) LIKE ${`%${input.employeeName}%`}`);
      }

      const employeesList = filters.length > 0
        ? await db.select().from(employees).where(and(...filters))
        : await db.select().from(employees);

      // Get all competencies
      const competenciesList = await db.select().from(competencies).orderBy(competencies.type, competencies.name);

      // Get all skills matrix entries for these employees
      const employeeIds = employeesList.map((e: typeof employees.$inferSelect) => e.id);
      let matrixEntries: (typeof skillsMatrix.$inferSelect)[] = [];
      
      if (employeeIds.length > 0) {
        matrixEntries = await db.select()
          .from(skillsMatrix)
          .where(inArray(skillsMatrix.employeeId, employeeIds));
      }

      // Calculate averages
      const levelValues = {
        "Sin evaluar": 0,
        "Básico": 1,
        "Intermedio": 2,
        "Avanzado": 3,
        "Experto": 4,
      };

      // Calculate department average
      const departmentScores = matrixEntries
        .filter((e: typeof skillsMatrix.$inferSelect) => e.level in levelValues)
        .map((e: typeof skillsMatrix.$inferSelect) => levelValues[e.level as keyof typeof levelValues]);
      const departmentAverage = departmentScores.length > 0
        ? departmentScores.reduce((a: number, b: number) => a + b, 0) / departmentScores.length
        : 0;

      // Calculate per-competency averages
      const competencyAverages = competenciesList.map((comp: typeof competencies.$inferSelect) => {
        const compEntries = matrixEntries.filter((e: typeof skillsMatrix.$inferSelect) => e.competencyId === comp.id);
        const scores = compEntries
          .filter((e: typeof skillsMatrix.$inferSelect) => e.level in levelValues)
          .map((e: typeof skillsMatrix.$inferSelect) => levelValues[e.level as keyof typeof levelValues]);
        const avg = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        return { competencyId: comp.id, average: avg };
      });

      return {
        employees: employeesList,
        competencies: competenciesList,
        matrixEntries,
        departmentAverage,
        competencyAverages,
      };
    }),

  // ============ Excel Import/Export ============
  
  importFromExcel: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      data: z.array(z.object({
        employeeEmail: z.string(),
        competencyName: z.string(),
        level: z.enum(["Sin evaluar", "Básico", "Intermedio", "Avanzado", "Experto"]),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      let recordsImported = 0;
      let recordsFailed = 0;
      const errors: string[] = [];

      for (const row of input.data) {
        try {
          // Find employee by email
          const [employee] = await db.select()
            .from(employees)
            .where(eq(employees.email, row.employeeEmail))
            .limit(1);

          if (!employee) {
            errors.push(`Employee not found: ${row.employeeEmail}`);
            recordsFailed++;
            continue;
          }

          // Find competency by name
          const [competency] = await db.select()
            .from(competencies)
            .where(eq(competencies.name, row.competencyName))
            .limit(1);

          if (!competency) {
            errors.push(`Competency not found: ${row.competencyName}`);
            recordsFailed++;
            continue;
          }

          // Check if entry exists
          const existing = await db.select()
            .from(skillsMatrix)
            .where(and(
              eq(skillsMatrix.employeeId, employee.id),
              eq(skillsMatrix.competencyId, competency.id)
            ))
            .limit(1);

          if (existing.length > 0) {
            // Update
            await db.update(skillsMatrix)
              .set({
                level: row.level,
                notes: row.notes,
                evaluatedBy: ctx.user.id,
                evaluationDate: new Date(),
              })
              .where(eq(skillsMatrix.id, existing[0].id));
          } else {
            // Insert
            await db.insert(skillsMatrix).values({
              employeeId: employee.id,
              competencyId: competency.id,
              level: row.level,
              notes: row.notes,
              evaluatedBy: ctx.user.id,
              evaluationDate: new Date(),
            });
          }

          recordsImported++;
        } catch (error) {
          errors.push(`Error processing row: ${JSON.stringify(row)}`);
          recordsFailed++;
        }
      }

      // Log import
      await db.insert(skillsMatrixImports).values({
        fileName: input.fileName,
        importedBy: ctx.user.id,
        recordsImported,
        recordsFailed,
        status: recordsFailed === 0 ? "success" : recordsImported > 0 ? "partial" : "failed",
        errorLog: errors.length > 0 ? errors.join("\n") : null,
      });

      return {
        success: true,
        recordsImported,
        recordsFailed,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  exportToExcel: protectedProcedure
    .input(z.object({
      departmentId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get matrix data with filters
      const employeesList = input.departmentId
        ? await db.select().from(employees).where(eq(employees.department, input.departmentId.toString()))
        : await db.select().from(employees);
      const competenciesList = await db.select().from(competencies).orderBy(competencies.type, competencies.name);

      const employeeIds = employeesList.map((e: typeof employees.$inferSelect) => e.id);
      let matrixEntries: (typeof skillsMatrix.$inferSelect)[] = [];
      
      if (employeeIds.length > 0) {
        matrixEntries = await db.select()
          .from(skillsMatrix)
          .where(inArray(skillsMatrix.employeeId, employeeIds));
      }

      // Format data for Excel export
      const exportData = employeesList.map((emp: typeof employees.$inferSelect) => {
        const row: any = {
          email: emp.email,
          nombre: `${emp.firstName} ${emp.lastName}`,
          departamento: emp.department,
          puesto: emp.position,
        };

        competenciesList.forEach((comp: typeof competencies.$inferSelect) => {
          const entry = matrixEntries.find(
            (e: typeof skillsMatrix.$inferSelect) => e.employeeId === emp.id && e.competencyId === comp.id
          );
          row[comp.name] = entry ? entry.level : "Sin evaluar";
        });

        return row;
      });

      return {
        data: exportData,
        competencies: competenciesList,
        employees: employeesList,
      };
    }),

  getImportHistory: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      return await db.select()
        .from(skillsMatrixImports)
        .orderBy(sql`${skillsMatrixImports.createdAt} DESC`)
        .limit(20);
    }),
});
