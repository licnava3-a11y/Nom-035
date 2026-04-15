import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { competencies, departments, employeeCompetencies, employees, jobPositions, jobProfiles, organizationalCompetencies, positions, trainingNeeds } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const jobProfilesRouter = router({
  /**
   * Create a competency requirement for a position
   */
  create: protectedProcedure
    .input(
      z.object({
        positionId: z.number(),
        competencyName: z.string(),
        competencyType: z.enum(["tecnica", "transversal", "conocimiento"]),
        requiredLevel: z.enum(["basico", "intermedio", "avanzado", "experto"]),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const [profile] = await (db.insert(jobProfiles) as any).values(input);

      return { success: true, profileId: profile.insertId };
    }),

  /**
   * Get all competency requirements for a position
   */
  getByPosition: protectedProcedure
    .input(z.object({ positionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const profiles = await db
        .select()
        .from(jobProfiles)
        .where(eq(jobProfiles.positionId, input.positionId))
        .orderBy(jobProfiles.competencyType, jobProfiles.competencyName);

      return profiles;
    }),

  /**
   * Update a competency requirement
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        competencyName: z.string().optional(),
        competencyType: z.enum(["tecnica", "transversal", "conocimiento"]).optional(),
        requiredLevel: z.enum(["basico", "intermedio", "avanzado", "experto"]).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const { id, ...updateData } = input;

      await db.update(jobProfiles).set(updateData).where(eq(jobProfiles.id, id));

      return { success: true };
    }),

  /**
   * Delete a competency requirement
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      await db.delete(jobProfiles).where(eq(jobProfiles.id, input.id));

      return { success: true };
    }),

  /**
   * Add employee competency
   */
  addEmployeeCompetency: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        competencyName: z.string(),
        competencyType: z.enum(["tecnica", "transversal", "conocimiento"]),
        currentLevel: z.enum(["basico", "intermedio", "avanzado", "experto"]),
        certificationDate: z.string().optional(),
        expirationDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const [competency] = await (db.insert(employeeCompetencies) as any).values({
        ...input,
        certificationDate: input.certificationDate ? new Date(input.certificationDate) : undefined,
        expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
      });

      return { success: true, competencyId: competency.insertId };
    }),

  /**
   * Get employee competencies
   */
  getEmployeeCompetencies: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const competencies = await db
        .select()
        .from(employeeCompetencies)
        .where(eq(employeeCompetencies.employeeId, input.employeeId))
        .orderBy(employeeCompetencies.competencyType, employeeCompetencies.competencyName);

      return competencies;
    }),

  /**
   * Generate DNC (Training Needs Determination) for an employee
   * Compares employee competencies with position requirements
   */
  generateDNC: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get employee and position
      const [employee] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          departmentId: employees.departmentId,
          positionId: employees.positionId,
          departmentName: departments.name,
          positionName: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee || !employee.positionName) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado o puesto no encontrado",
        });
      }

      // Get position by name to find positionId
      const [positionRecord] = await db
        .select()
        .from(jobPositions)
        .where(eq(jobPositions.positionName, employee.positionName))
        .limit(1);

      if (!positionRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Perfil de puesto no encontrado",
        });
      }

      // Get position requirements
      const requirements = await db
        .select()
        .from(jobProfiles)
        .where(eq(jobProfiles.positionId, positionRecord.id));

      // Get employee competencies
      const competencies = await db
        .select()
        .from(employeeCompetencies)
        .where(eq(employeeCompetencies.employeeId, input.employeeId));

      // Create a map of employee competencies
      const competencyMap = new Map(
        competencies.map((c: any) => [c.competencyName, c.currentLevel])
      );

      // Level mapping for gap calculation
      const levelValue: Record<string, number> = {
        ninguno: 0,
        basico: 1,
        intermedio: 2,
        avanzado: 3,
        experto: 4,
      };

      // Calculate gaps and create training needs
      const needs: any[] = [];
      
      // 1. Process position-specific competencies
      for (const req of requirements) {
        const currentLevel = competencyMap.get(req.competencyName) || "ninguno";
        const gap = levelValue[req.requiredLevel] - levelValue[currentLevel];

        if (gap > 0) {
          // Determine priority based on gap
          let priority: "baja" | "media" | "alta" | "critica";
          if (gap >= 3) priority = "critica";
          else if (gap === 2) priority = "alta";
          else if (gap === 1) priority = "media";
          else priority = "baja";

          needs.push({
            employeeId: input.employeeId,
            competencyName: req.competencyName,
            competencyType: req.competencyType,
            requiredLevel: req.requiredLevel,
            currentLevel: currentLevel as "ninguno" | "basico" | "intermedio" | "avanzado" | "experto",
            gap,
            priority,
            status: "pendiente" as const,
            dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          });
        }
      }

      // 2. Process organizational competencies (soft skills & transversal)
      const orgCompetencies = await db
        .select()
        .from(organizationalCompetencies)
        .where(eq(organizationalCompetencies.isActive, true));

      // Filter applicable organizational competencies
      const applicableOrgCompetencies = orgCompetencies.filter((c: any) => {
        const departments = c.appliesToDepartments ? JSON.parse(c.appliesToDepartments) : null;
        // If no department restriction or employee's department is in the list
        return !departments || departments.includes(employee.departmentName);
      });

      // Check gaps for organizational competencies
      for (const orgComp of applicableOrgCompetencies) {
        const currentLevel = competencyMap.get(orgComp.competencyName) || "ninguno";
        const gap = levelValue[orgComp.requiredLevel] - levelValue[currentLevel];

        if (gap > 0) {
          // Soft skills and transversal competencies have slightly different priority logic
          let priority: "baja" | "media" | "alta" | "critica";
          if (orgComp.competencyCategory === "leadership") {
            // Leadership competencies are high priority
            if (gap >= 3) priority = "critica";
            else if (gap >= 2) priority = "alta";
            else priority = "media";
          } else if (orgComp.competencyCategory === "soft_skill") {
            // Soft skills are medium-high priority
            if (gap >= 3) priority = "alta";
            else if (gap === 2) priority = "media";
            else priority = "baja";
          } else {
            // Organizational and technical_transversal
            if (gap >= 3) priority = "critica";
            else if (gap === 2) priority = "alta";
            else if (gap === 1) priority = "media";
            else priority = "baja";
          }

          needs.push({
            employeeId: input.employeeId,
            competencyName: orgComp.competencyName,
            competencyType: "transversal" as const, // Mark as transversal
            requiredLevel: orgComp.requiredLevel,
            currentLevel: currentLevel as "ninguno" | "basico" | "intermedio" | "avanzado" | "experto",
            gap,
            priority,
            status: "pendiente" as const,
            dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          });
        }
      }

      // Delete existing pending needs for this employee
      await db
        .delete(trainingNeeds)
        .where(
          and(
            eq(trainingNeeds.employeeId, input.employeeId),
            eq(trainingNeeds.status, "pendiente")
          )
        );

      // Insert new training needs
      if (needs.length > 0) {
        await (db.insert(trainingNeeds) as any).values(needs);
      }

      return {
        success: true,
        needsCount: needs.length,
        needs,
      };
    }),

  /**
   * Get training needs for an employee
   */
  getTrainingNeeds: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const needs = await db
        .select()
        .from(trainingNeeds)
        .where(eq(trainingNeeds.employeeId, input.employeeId))
        .orderBy(desc(trainingNeeds.priority), trainingNeeds.competencyName);

      return needs;
    }),

  /**
   * Get ALL training needs (for DNC dashboard)
   */
  getAllTrainingNeeds: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    const needs = await db
      .select()
      .from(trainingNeeds)
      .orderBy(desc(trainingNeeds.priority), trainingNeeds.competencyName);

    return needs;
  }),

  /**
   * Update training need status
   */
  updateTrainingNeedStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pendiente", "en_proceso", "completada", "cancelada"]),
        completedDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const { id, ...updateData } = input;

      await db
        .update(trainingNeeds)
        .set({
          ...updateData,
          completedDate: updateData.completedDate ? new Date(updateData.completedDate) : undefined,
        } as any)
        .where(eq(trainingNeeds.id, id));

      return { success: true };
    }),

  /**
   * Prefill employee competencies from position requirements
   * Creates employee competency records with "ninguno" level for all required competencies
   */
  prefillCompetenciesFromPosition: protectedProcedure
    .input(z.object({ employeeId: z.number(), positionName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get position by name
      const [positionRecord] = await db
        .select()
        .from(jobPositions)
        .where(eq(jobPositions.positionName, input.positionName))
        .limit(1);

      if (!positionRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Perfil de puesto no encontrado",
        });
      }

      // Get position requirements
      const requirements = await db
        .select()
        .from(jobProfiles)
        .where(eq(jobProfiles.positionId, positionRecord.id));

      if (requirements.length === 0) {
        return {
          success: true,
          message: "No hay competencias definidas para este puesto",
          prefilledCount: 0,
        };
      }

      // Get existing employee competencies
      const existingCompetencies = await db
        .select()
        .from(employeeCompetencies)
        .where(eq(employeeCompetencies.employeeId, input.employeeId));

      const existingCompetencyNames = new Set(
        existingCompetencies.map((c: any) => c.competencyName)
      );

      // Prefill only competencies that don't exist yet
      const competenciesToAdd = requirements
        .filter((req: any) => !existingCompetencyNames.has(req.competencyName))
        .map((req: any) => ({
          employeeId: input.employeeId,
          competencyName: req.competencyName,
          competencyType: req.competencyType,
          currentLevel: "basico" as const,
          notes: `Competencia requerida para el puesto: ${input.positionName}`,
        }));

      if (competenciesToAdd.length > 0) {
        await (db.insert(employeeCompetencies) as any).values(competenciesToAdd);
      }

      return {
        success: true,
        prefilledCount: competenciesToAdd.length,
        totalRequirements: requirements.length,
      };
    }),

  /**
   * Get profile comparison: position requirements vs employee's actual competencies
   * Used to generate the DNC visual panel in EmployeeProfile
   */
  getProfileComparison: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [employee] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          positionId: employees.positionId,
          positionTitle: positions.title,
          educationLevel: employees.educationLevel,
          minimumEducation: positions.minimumEducation,
        })
        .from(employees)
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });

      // Find matching jobPosition by position title
      let positionRequirements: any[] = [];
      if (employee.positionTitle) {
        const [jobPos] = await db
          .select()
          .from(jobPositions)
          .where(eq(jobPositions.positionName, employee.positionTitle))
          .limit(1);
        if (jobPos) {
          positionRequirements = await db
            .select()
            .from(jobProfiles)
            .where(eq(jobProfiles.positionId, jobPos.id));
        }
      }

      // Get employee's actual competencies
      const empCompetencies = await db
        .select()
        .from(employeeCompetencies)
        .where(eq(employeeCompetencies.employeeId, input.employeeId));

      // Get existing training needs for this employee
      const existingNeeds = await db
        .select()
        .from(trainingNeeds)
        .where(eq(trainingNeeds.employeeId, input.employeeId));

      const competencyMap = new Map(empCompetencies.map((c: any) => [c.competencyName, c]));
      const levelValue: Record<string, number> = { ninguno: 0, basico: 1, intermedio: 2, avanzado: 3, experto: 4 };

      // Education level comparison
      const educationOrder = ["primaria", "secundaria", "preparatoria", "tecnico", "licenciatura", "especialidad", "maestria", "doctorado", "otro"];
      const empEduIdx = employee.educationLevel ? educationOrder.indexOf(employee.educationLevel) : -1;
      const reqEduIdx = employee.minimumEducation ? educationOrder.indexOf(employee.minimumEducation) : -1;
      const educationCompliant = reqEduIdx < 0 || empEduIdx >= reqEduIdx;

      // Build comparison items
      const comparisonItems = positionRequirements.map((req: any) => {
        const empComp = competencyMap.get(req.competencyName);
        const currentLevel = empComp?.currentLevel || "ninguno";
        const gap = levelValue[req.requiredLevel] - levelValue[currentLevel];
        const hasNeed = existingNeeds.some((n: any) => n.competencyName === req.competencyName && n.status === "pendiente");
        let priority: string | null = null;
        if (gap >= 3) priority = "critica";
        else if (gap === 2) priority = "alta";
        else if (gap === 1) priority = "media";
        else if (gap > 0) priority = "baja";
        return { competencyName: req.competencyName, competencyType: req.competencyType, requiredLevel: req.requiredLevel, currentLevel, gap, compliant: gap <= 0, priority, hasTrainingNeed: hasNeed };
      });

      const totalCompetencies = comparisonItems.length;
      const compliantCount = comparisonItems.filter((c: any) => c.compliant).length;
      const gapCount = totalCompetencies - compliantCount;
      const compliancePercentage = totalCompetencies > 0 ? Math.round((compliantCount / totalCompetencies) * 100) : 100;

      return {
        employee: { id: employee.id, name: `${employee.firstName} ${employee.lastName}`, positionTitle: employee.positionTitle, educationLevel: employee.educationLevel, minimumEducation: employee.minimumEducation, educationCompliant },
        comparison: comparisonItems,
        summary: { totalCompetencies, compliantCount, gapCount, compliancePercentage, hasPositionProfile: positionRequirements.length > 0 },
      };
    }),

  /**
   * Get all positions with their competency requirements
   */
  getAllPositionsWithProfiles: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    const positions = await db.select().from(jobPositions);

    const positionsWithProfiles = await Promise.all(
      positions.map(async (position) => {
        const profiles = await db
          .select()
          .from(jobProfiles)
          .where(eq(jobProfiles.positionId, position.id));

        return {
          ...position,
          competencies: profiles,
        };
      })
    );

    return positionsWithProfiles;
  }),
});
