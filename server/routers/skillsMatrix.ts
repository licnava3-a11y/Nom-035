import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { competencies, skillsMatrix, skillsMatrixImports, employees, departments, positions, trainingNeeds, employeeCompetencies } from "../../drizzle/schema";
import { eq, and, inArray, sql, or } from "drizzle-orm";
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

  // ============ Bulk Export for Heatmaps ============
  
  getActiveDepartments: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get departments that have at least one employee
      const depts = await db.select({
        id: departments.id,
        name: departments.name,
      })
        .from(departments)
        .innerJoin(employees, eq(employees.departmentId, departments.id))
        .groupBy(departments.id, departments.name)
        .orderBy(departments.name);
      
      return depts;
    }),

  getMatrixByDepartment: protectedProcedure
    .input(z.object({
      departmentId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get employees in this department
      const employeesList = await db.select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        position: positions.title,
      })
        .from(employees)
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.departmentId, input.departmentId))
        .orderBy(employees.firstName);
      
      // Combine firstName and lastName into name
      const employeesWithName = employeesList.map(emp => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        position: emp.position,
      }));
      
      if (employeesList.length === 0) {
        return {
          employees: [],
          competencies: [],
          matrix: [],
          departmentName: "",
        };
      }
      
      // Get all competencies
      const competenciesList = await db.select()
        .from(competencies)
        .orderBy(competencies.name);
      
      // Get skills matrix data for these employees
      const matrixData = await db.select()
        .from(skillsMatrix)
        .where(inArray(skillsMatrix.employeeId, employeesList.map(e => e.id)));
      
      // Get department name
      const [dept] = await db.select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, input.departmentId));
      
      return {
        employees: employeesWithName,
        competencies: competenciesList,
        matrix: matrixData,
        departmentName: dept?.name || "Departamento Desconocido",
      };
    }),

  // Generar programa de capacitación automáticamente desde análisis de desarrollo
  generateTrainingProgram: protectedProcedure
    .input(z.object({
      departmentId: z.number().optional(),
      employeeIds: z.array(z.number()).optional(), // Si se especifica, solo para estos empleados
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener análisis de desarrollo
      const matrixData = await db
        .select({
          employeeId: employeeCompetencies.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          competencyName: employeeCompetencies.competencyName,
          competencyType: employeeCompetencies.competencyType,
          currentLevel: employeeCompetencies.currentLevel,
        })
        .from(employeeCompetencies)
        .innerJoin(employees, eq(employeeCompetencies.employeeId, employees.id))
        .where(
          and(
            input.departmentId ? eq(employees.departmentId, input.departmentId) : undefined,
            input.employeeIds ? sql`${employeeCompetencies.employeeId} IN (${sql.join(input.employeeIds.map(id => sql`${id}`), sql`, `)})` : undefined
          )
        );

      // Agrupar por empleado y calcular brechas
      const employeeGaps: Record<number, { name: string; gaps: Array<{ competencyName: string; competencyType: string; currentLevel: string; gap: number; priority: string }> }> = {};
      
      matrixData.forEach((row) => {
        if (!employeeGaps[row.employeeId]) {
          employeeGaps[row.employeeId] = { name: row.employeeName, gaps: [] };
        }

        // Calcular brecha (nivel requerido: Avanzado = 3, nivel actual en escala 0-4)
        const levelMap: Record<string, number> = { "ninguno": 0, "basico": 1, "intermedio": 2, "avanzado": 3, "experto": 4 };
        const currentLevelNum = levelMap[row.currentLevel] || 0;
        const requiredLevelNum = 3; // Avanzado
        const gap = Math.max(0, requiredLevelNum - currentLevelNum);

        if (gap > 0) {
          // Determinar prioridad basada en brecha
          let priority: "baja" | "media" | "alta" | "critica" = "baja";
          if (gap >= 3) priority = "critica";
          else if (gap >= 2) priority = "alta";
          else if (gap >= 1) priority = "media";

          employeeGaps[row.employeeId].gaps.push({
            competencyName: row.competencyName,
            competencyType: row.competencyType as "tecnica" | "transversal" | "conocimiento",
            currentLevel: row.currentLevel,
            gap,
            priority,
          });
        }
      });

      // Insertar necesidades de capacitación (evitando duplicados)
      let totalAdded = 0;
      const results: Array<{ employeeId: number; employeeName: string; competenciesAdded: number }> = [];

      for (const [employeeIdStr, data] of Object.entries(employeeGaps)) {
        const employeeId = parseInt(employeeIdStr);
        let competenciesAdded = 0;

        for (const gap of data.gaps) {
          // Verificar si ya existe esta necesidad
          const existing = await db
            .select()
            .from(trainingNeeds)
            .where(
              and(
                eq(trainingNeeds.employeeId, employeeId),
                eq(trainingNeeds.competencyName, gap.competencyName),
                or(
                  eq(trainingNeeds.status, "pendiente"),
                  eq(trainingNeeds.status, "en_proceso")
                )
              )
            )
            .limit(1);

          if (existing.length === 0) {
            // Insertar nueva necesidad de capacitación
            await db.insert(trainingNeeds).values({
              employeeId,
              competencyName: gap.competencyName,
              competencyType: gap.competencyType as "tecnica" | "transversal" | "conocimiento",
              currentLevel: gap.currentLevel as "ninguno" | "basico" | "intermedio" | "avanzado" | "experto",
              requiredLevel: "avanzado",
              gap: gap.gap,
              priority: gap.priority as "baja" | "media" | "alta" | "critica",
              status: "pendiente",
              dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días desde hoy
              notes: "Generado automáticamente desde Análisis de Desarrollo de Matriz de Habilidades",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            competenciesAdded++;
            totalAdded++;
          }
        }

        results.push({
          employeeId,
          employeeName: data.name,
          competenciesAdded,
        });

        // Enviar notificación por correo si se agregaron competencias
        if (competenciesAdded > 0) {
          try {
            // Obtener email del empleado
            const employee = await db
              .select({ email: employees.email, firstName: employees.firstName })
              .from(employees)
              .where(eq(employees.id, employeeId))
              .limit(1);

            if (employee.length > 0 && employee[0].email) {
              const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .competency-item { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 5px; }
    .priority-badge { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .priority-critica { background: #ef4444; color: white; }
    .priority-alta { background: #f97316; color: white; }
    .priority-media { background: #eab308; color: white; }
    .priority-baja { background: #22c55e; color: white; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Nuevas Competencias en tu Programa de Capacitación</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${employee[0].firstName}</strong>,</p>
      <p>Se han agregado <strong>${competenciesAdded} nuevas competencias</strong> a tu programa personal de capacitación basadas en el análisis de desarrollo de la Matriz de Habilidades.</p>
      
      <h3>📚 Competencias Agregadas:</h3>
      ${data.gaps.map(gap => `
        <div class="competency-item">
          <strong>${gap.competencyName}</strong>
          <span class="priority-badge priority-${gap.priority}">${gap.priority.toUpperCase()}</span>
          <br>
          <small>Tipo: ${gap.competencyType} | Nivel actual: ${gap.currentLevel} | Brecha: ${gap.gap} niveles</small>
        </div>
      `).join('')}
      
      <p><strong>Fecha límite:</strong> 90 días desde hoy</p>
      <p>Te recomendamos revisar tu programa de capacitación y comenzar a trabajar en estas competencias prioritarias para alcanzar el nivel avanzado requerido.</p>
      
      <a href="${process.env.VITE_OAUTH_PORTAL_URL || 'https://app.manus.im'}/training/my-program" class="btn">
        Ver Mi Programa de Capacitación
      </a>
    </div>
    <div class="footer">
      <p>Este correo fue generado automáticamente por el sistema de Gestión de Talento.</p>
      <p>Si tienes alguna pregunta, contacta a tu coordinador de capacitación.</p>
    </div>
  </div>
</body>
</html>
              `;

              // Importar sendEmail dinámicamente para evitar errores de importación
              const { sendEmail } = await import("../_core/email-sender");
              await sendEmail({
                to: employee[0].email,
                subject: `🎯 ${competenciesAdded} Nuevas Competencias en tu Programa de Capacitación`,
                html: emailHtml,
              });
            }
          } catch (emailError) {
            console.error(`Error al enviar notificación a empleado ${employeeId}:`, emailError);
            // No fallar la operación completa si falla el envío de correo
          }
        }
      }

      return {
        success: true,
        totalEmployees: Object.keys(employeeGaps).length,
        totalCompetenciesAdded: totalAdded,
        details: results,
      };
    }),
});

