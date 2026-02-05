import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { jobProfiles, employeeCompetencies, trainingNeeds, employees, jobPositions } from "../../drizzle/schema";
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

      const [profile] = await db.insert(jobProfiles).values(input);

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

      const [competency] = await db.insert(employeeCompetencies).values({
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
        .select()
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee || !employee.position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado o puesto no encontrado",
        });
      }

      // Get position by name to find positionId
      const [positionRecord] = await db
        .select()
        .from(jobPositions)
        .where(eq(jobPositions.positionName, employee.position))
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
        competencies.map((c) => [c.competencyName, c.currentLevel])
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
        await db.insert(trainingNeeds).values(needs);
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
        })
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
        existingCompetencies.map((c) => c.competencyName)
      );

      // Prefill only competencies that don't exist yet
      const competenciesToAdd = requirements
        .filter((req) => !existingCompetencyNames.has(req.competencyName))
        .map((req) => ({
          employeeId: input.employeeId,
          competencyName: req.competencyName,
          competencyType: req.competencyType,
          currentLevel: "basico" as const,
          notes: `Competencia requerida para el puesto: ${input.positionName}`,
        }));

      if (competenciesToAdd.length > 0) {
        await db.insert(employeeCompetencies).values(competenciesToAdd);
      }

      return {
        success: true,
        prefilledCount: competenciesToAdd.length,
        totalRequirements: requirements.length,
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
