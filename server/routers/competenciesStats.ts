import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { employees, employeeCompetencies, jobProfiles, jobPositions, departments, positions } from "../../drizzle/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const competenciesStatsRouter = router({
  /**
   * Get competencies statistics by department
   */
  getByDepartment: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    // Get all active employees with their competencies
    const activeEmployees = (await db
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
      .where(eq(employees.isActive, true))) as unknown as Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      departmentId: number | null;
      positionId: number | null;
      departmentName: string | null;
      positionName: string | null;
    }>;

    // Get all competencies
    const allCompetencies = await db.select().from(employeeCompetencies);

    // Level mapping
    const levelValue: Record<string, number> = {
      ninguno: 0,
      basico: 1,
      intermedio: 2,
      avanzado: 3,
      experto: 4,
    };

    // Group by department
    const departmentStats: Record<
      string,
      {
        department: string;
        employeeCount: number;
        avgCompetencyLevel: number;
        competenciesCount: number;
        criticalGaps: number;
      }
    > = {};

    for (const emp of activeEmployees) {
      const dept = emp.departmentName || "Sin Departamento";

      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          employeeCount: 0,
          avgCompetencyLevel: 0,
          competenciesCount: 0,
          criticalGaps: 0,
        };
      }

      departmentStats[dept].employeeCount++;

      // Get employee competencies
      const empCompetencies = allCompetencies.filter((c: any) => c.employeeId === emp.id);

      if (empCompetencies.length > 0) {
        const totalLevel = empCompetencies.reduce(
          (sum, c) => sum + (levelValue[c.currentLevel] || 0),
          0
        );
        departmentStats[dept].avgCompetencyLevel += totalLevel / empCompetencies.length;
        departmentStats[dept].competenciesCount += empCompetencies.length;
      }

      // Count critical gaps (employees with competencies below required)
      if (emp.positionName) {
        const [positionRecord] = await db
          .select()
          .from(jobPositions)
          .where(eq(jobPositions.positionName, emp.positionName))
          .limit(1);

        if (positionRecord) {
          const requirements = await db
            .select()
            .from(jobProfiles)
            .where(eq(jobProfiles.positionId, positionRecord.id));

          const competencyMap = new Map(
            empCompetencies.map((c: any) => [c.competencyName, c.currentLevel])
          );

          for (const req of requirements) {
            const currentLevel = competencyMap.get(req.competencyName) || "ninguno";
            const gap = levelValue[req.requiredLevel] - levelValue[currentLevel];

            if (gap >= 3) {
              departmentStats[dept].criticalGaps++;
            }
          }
        }
      }
    }

    // Calculate averages
    const result = Object.values(departmentStats).map((dept: any) => ({
      ...dept,
      avgCompetencyLevel:
        dept.employeeCount > 0 ? dept.avgCompetencyLevel / dept.employeeCount : 0,
    }));

    return result.sort((a: any, b: any) => b.criticalGaps - a.criticalGaps);
  }),

  /**
   * Get competencies statistics by type
   */
  getByType: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    // Get all competencies
    const allCompetencies = await db.select().from(employeeCompetencies);

    // Level mapping
    const levelValue: Record<string, number> = {
      ninguno: 0,
      basico: 1,
      intermedio: 2,
      avanzado: 3,
      experto: 4,
    };

    // Group by type
    const typeStats: Record<
      string,
      {
        type: string;
        count: number;
        avgLevel: number;
        totalLevel: number;
      }
    > = {
      tecnica: { type: "Técnica", count: 0, avgLevel: 0, totalLevel: 0 },
      transversal: { type: "Transversal", count: 0, avgLevel: 0, totalLevel: 0 },
      conocimiento: { type: "Conocimiento", count: 0, avgLevel: 0, totalLevel: 0 },
    };

    for (const comp of allCompetencies) {
      const type = comp.competencyType;
      if (typeStats[type]) {
        typeStats[type].count++;
        typeStats[type].totalLevel += levelValue[comp.currentLevel] || 0;
      }
    }

    // Calculate averages
    return Object.values(typeStats).map((stat: any) => ({
      ...stat,
      avgLevel: stat.count > 0 ? stat.totalLevel / stat.count : 0,
    }));
  }),

  /**
   * Get top competencies gaps across organization
   */
  getTopGaps: protectedProcedure
    .input(z.object({ 
      limit: z.number().default(10),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get all active employees
      const activeEmployees = (await db
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
        .where(eq(employees.isActive, true))) as unknown as Array<{
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        departmentId: number | null;
        positionId: number | null;
        departmentName: string | null;
        positionName: string | null;
      }>;

      // Get all competencies
      const allCompetencies = await db.select().from(employeeCompetencies);

      // Level mapping
      const levelValue: Record<string, number> = {
        ninguno: 0,
        basico: 1,
        intermedio: 2,
        avanzado: 3,
        experto: 4,
      };

      // Track gaps by competency
      const gapsByCompetency: Record<
        string,
        {
          competencyName: string;
          competencyType: string;
          totalGap: number;
          employeesAffected: number;
          criticalCount: number;
        }
      > = {};

      for (const emp of activeEmployees) {
        if (!emp.positionName) continue;

        const [positionRecord] = await db
          .select()
          .from(jobPositions)
          .where(eq(jobPositions.positionName, emp.positionName))
          .limit(1);

        if (!positionRecord) continue;

        const requirements = await db
          .select()
          .from(jobProfiles)
          .where(eq(jobProfiles.positionId, positionRecord.id));

        const empCompetencies = allCompetencies.filter((c: any) => c.employeeId === emp.id);
        const competencyMap = new Map(
          empCompetencies.map((c: any) => [c.competencyName, c.currentLevel])
        );

        for (const req of requirements) {
          const currentLevel = competencyMap.get(req.competencyName) || "ninguno";
          const gap = levelValue[req.requiredLevel] - levelValue[currentLevel];

          if (gap > 0) {
            if (!gapsByCompetency[req.competencyName]) {
              gapsByCompetency[req.competencyName] = {
                competencyName: req.competencyName,
                competencyType: req.competencyType,
                totalGap: 0,
                employeesAffected: 0,
                criticalCount: 0,
              };
            }

            gapsByCompetency[req.competencyName].totalGap += gap;
            gapsByCompetency[req.competencyName].employeesAffected++;

            if (gap >= 3) {
              gapsByCompetency[req.competencyName].criticalCount++;
            }
          }
        }
      }

      // Sort by total gap and limit
      const result = Object.values(gapsByCompetency)
        .sort((a: any, b: any) => b.totalGap - a.totalGap)
        .slice(0, input.limit);

      return result;
    }),

  /**
   * Get overall organization statistics
   */
  getOverallStats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    // Get counts
    const [employeesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.isActive, true));

    const [competenciesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeCompetencies);

    const [profilesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobProfiles);

    // Get all competencies for average calculation
    const allCompetencies = await db.select().from(employeeCompetencies);

    const levelValue: Record<string, number> = {
      ninguno: 0,
      basico: 1,
      intermedio: 2,
      avanzado: 3,
      experto: 4,
    };

    const totalLevel = allCompetencies.reduce(
      (sum, c) => sum + (levelValue[c.currentLevel] || 0),
      0
    );

    const avgLevel =
      allCompetencies.length > 0 ? totalLevel / allCompetencies.length : 0;

    return {
      totalEmployees: Number(employeesResult?.count || 0),
      totalCompetencies: Number(competenciesResult?.count || 0),
      totalProfiles: Number(profilesResult?.count || 0),
      avgCompetencyLevel: avgLevel,
    };
  }),
});
