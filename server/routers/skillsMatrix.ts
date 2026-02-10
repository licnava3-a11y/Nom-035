import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { competencies, skillsMatrix, skillsMatrixImports, employees, departments, positions } from "../../drizzle/schema";
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
      departmentId: z.number().optional(),
      positionId: z.number().optional(),
      employeeName: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get all employees with optional filters
      const filters = [];
      if (input.departmentId) {
        filters.push(eq(employees.departmentId, input.departmentId));
      }
      if (input.positionId) {
        filters.push(eq(employees.positionId, input.positionId));
      }
      if (input.employeeName) {
        filters.push(sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName}) LIKE ${`%${input.employeeName}%`}`);
      }

      const employeesList = (filters.length > 0
        ? await db.select({
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            departmentId: employees.departmentId,
            positionId: employees.positionId,
            department: departments.name,
            position: positions.title,
          })
          .from(employees)
          .leftJoin(departments, eq(employees.departmentId, departments.id))
          .leftJoin(positions, eq(employees.positionId, positions.id))
          .where(and(...filters))
        : await db.select({
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            departmentId: employees.departmentId,
            positionId: employees.positionId,
            department: departments.name,
            position: positions.title,
          })
          .from(employees)
          .leftJoin(departments, eq(employees.departmentId, departments.id))
          .leftJoin(positions, eq(employees.positionId, positions.id))) as unknown as Array<{
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        departmentId: number | null;
        positionId: number | null;
        department: string | null;
        position: string | null;
      }>;

      // Get all competencies
      const competenciesList = await db.select().from(competencies).orderBy(competencies.type, competencies.name);

      // Get all skills matrix entries for these employees
      const employeeIds = employeesList.map((e) => e.id);
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
      
      // Get matrix data with filters using JOINs
      const employeesListQuery = db
        .select({
          id: employees.id,
          email: employees.email,
          firstName: employees.firstName,
          lastName: employees.lastName,
          departmentName: departments.name,
          positionName: positions.title,
          departmentId: employees.departmentId,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id));
      
      const employeesList = input.departmentId
        ? await employeesListQuery.where(eq(employees.departmentId, input.departmentId))
        : await employeesListQuery;
      
      const competenciesList = await db.select().from(competencies).orderBy(competencies.type, competencies.name);

      const employeeIds = employeesList.map((e) => e.id);
      let matrixEntries: (typeof skillsMatrix.$inferSelect)[] = [];
      
      if (employeeIds.length > 0) {
        matrixEntries = await db.select()
          .from(skillsMatrix)
          .where(inArray(skillsMatrix.employeeId, employeeIds));
      }

      // Helper: Convert level to numeric value
      const levelToValue = (level: string): number => {
        const levels: Record<string, number> = {
          "Sin evaluar": 0,
          "Básico": 1,
          "Intermedio": 2,
          "Avanzado": 3,
          "Experto": 4,
        };
        return levels[level] || 0;
      };

      // Format data for Excel export
      const exportData = employeesList.map((emp) => {
        const row: any = {
          email: emp.email,
          nombre: `${emp.firstName} ${emp.lastName}`,
          departamento: emp.departmentName || 'Sin departamento',
          puesto: emp.positionName || 'Sin puesto',
        };

        competenciesList.forEach((comp: typeof competencies.$inferSelect) => {
          const entry = matrixEntries.find(
            (e: typeof skillsMatrix.$inferSelect) => e.employeeId === emp.id && e.competencyId === comp.id
          );
          row[comp.name] = entry ? entry.level : "Sin evaluar";
        });

        return row;
      });

      // ===== ANÁLISIS DE DESARROLLO Y SUCESIÓN =====
      
      // 1. Calcular brechas de habilidades por empleado
      const developmentAnalysis = employeesList.map((emp) => {
        const empEntries = matrixEntries.filter((e) => e.employeeId === emp.id);
        const totalCompetencies = competenciesList.length;
        const evaluatedCount = empEntries.filter((e) => e.level !== "Sin evaluar").length;
        const avgLevel = empEntries.reduce((sum, e) => sum + levelToValue(e.level), 0) / totalCompetencies;
        
        // Identificar competencias con brecha (nivel < Avanzado)
        const gaps = competenciesList
          .map((comp) => {
            const entry = empEntries.find((e) => e.competencyId === comp.id);
            const currentLevel = entry ? entry.level : "Sin evaluar";
            const currentValue = levelToValue(currentLevel);
            return {
              competencia: comp.name,
              nivelActual: currentLevel,
              brecha: currentValue < 3 ? `Mejorar a Avanzado/Experto` : "Ninguna",
            };
          })
          .filter((g) => g.brecha !== "Ninguna");

        return {
          nombre: `${emp.firstName} ${emp.lastName}`,
          departamento: emp.departmentName || 'Sin departamento',
          puesto: emp.positionName || 'Sin puesto',
          competenciasEvaluadas: `${evaluatedCount}/${totalCompetencies}`,
          nivelPromedio: avgLevel.toFixed(2),
          brechasIdentificadas: gaps.length,
          sugerenciaCapacitacion: gaps.length > 0 
            ? gaps.slice(0, 3).map((g) => g.competencia).join(", ") 
            : "Ninguna - Nivel óptimo",
        };
      });

      // 2. Identificar candidatos para sucesión por departamento
      const successionAnalysis: Record<string, any[]> = {};
      employeesList.forEach((emp) => {
        const deptName = emp.departmentName || 'Sin departamento';
        if (!successionAnalysis[deptName]) {
          successionAnalysis[deptName] = [];
        }
        
        const empEntries = matrixEntries.filter((e) => e.employeeId === emp.id);
        const avgLevel = empEntries.reduce((sum, e) => sum + levelToValue(e.level), 0) / competenciesList.length;
        
        successionAnalysis[deptName].push({
          nombre: `${emp.firstName} ${emp.lastName}`,
          puesto: emp.positionName || 'Sin puesto',
          nivelPromedio: avgLevel.toFixed(2),
          potencial: avgLevel >= 3 ? "Alto" : avgLevel >= 2 ? "Medio" : "En desarrollo",
        });
      });

      // Ordenar candidatos por nivel promedio (descendente)
      Object.keys(successionAnalysis).forEach((dept) => {
        successionAnalysis[dept].sort((a, b) => parseFloat(b.nivelPromedio) - parseFloat(a.nivelPromedio));
      });

      // 3. Sugerencias de capacitación crítica por departamento
      const trainingRecommendations: Record<string, any> = {};
      Object.keys(successionAnalysis).forEach((dept) => {
        const deptEmployees = employeesList.filter((e) => (e.departmentName || 'Sin departamento') === dept);
        const deptEntries = matrixEntries.filter((e) => deptEmployees.some((emp) => emp.id === e.employeeId));
        
        // Identificar competencias con mayor brecha en el departamento
        const competencyGaps = competenciesList.map((comp) => {
          const compEntries = deptEntries.filter((e) => e.competencyId === comp.id);
          const avgLevel = compEntries.reduce((sum, e) => sum + levelToValue(e.level), 0) / deptEmployees.length;
          return {
            competencia: comp.name,
            nivelPromedio: avgLevel.toFixed(2),
            prioridad: avgLevel < 2 ? "Alta" : avgLevel < 3 ? "Media" : "Baja",
          };
        });

        // Top 5 competencias críticas
        const topGaps = competencyGaps
          .sort((a, b) => parseFloat(a.nivelPromedio) - parseFloat(b.nivelPromedio))
          .slice(0, 5);

        trainingRecommendations[dept] = topGaps;
      });

      return {
        data: exportData,
        competencies: competenciesList,
        employees: employeesList,
        developmentAnalysis,
        successionAnalysis,
        trainingRecommendations,
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
