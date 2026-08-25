import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  departments,
  employeeCompetencies,
  employees,
  jobPositions,
  jobProfiles,
  positions,
} from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Nivel → valor numérico (compartido en todo el router)
const LEVEL_VALUE: Record<string, number> = {
  ninguno: 0,
  basico: 1,
  intermedio: 2,
  avanzado: 3,
  experto: 4,
};

/**
 * Carga masiva de datos para evitar N+1:
 * Ejecuta 4 queries en paralelo y construye mapas en memoria.
 */
async function loadBulkData(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const [activeEmployees, allCompetencies, allJobPositions, allJobProfiles] =
    await Promise.all([
      db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          departmentId: employees.departmentId,
          positionId: employees.positionId,
          departmentName: departments.name,
          positionTitle: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.isActive, true)),
      db.select().from(employeeCompetencies),
      db.select().from(jobPositions),
      db.select().from(jobProfiles),
    ]);

  // Mapa: positionTitle → jobPositionId
  const positionNameToId = new Map<string, number>(
    allJobPositions.map(p => [p.positionName, p.id])
  );

  // Mapa: jobPositionId → requerimientos[]
  const profilesByPositionId = new Map<number, typeof allJobProfiles>();
  for (const profile of allJobProfiles) {
    const list = profilesByPositionId.get(profile.positionId) ?? [];
    list.push(profile);
    profilesByPositionId.set(profile.positionId, list);
  }

  // Mapa: employeeId → competencias[]
  const competenciesByEmployee = new Map<number, typeof allCompetencies>();
  for (const comp of allCompetencies) {
    const list = competenciesByEmployee.get(comp.employeeId) ?? [];
    list.push(comp);
    competenciesByEmployee.set(comp.employeeId, list);
  }

  return {
    activeEmployees: activeEmployees as Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      departmentId: number | null;
      positionId: number | null;
      departmentName: string | null;
      positionTitle: string | null;
    }>,
    allCompetencies,
    positionNameToId,
    profilesByPositionId,
    competenciesByEmployee,
  };
}

export const competenciesStatsRouter = router({
  /**
   * Estadísticas de competencias por departamento — sin N+1
   */
  getByDepartment: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });

      const {
        activeEmployees,
        positionNameToId,
        profilesByPositionId,
        competenciesByEmployee,
      } = await loadBulkData(db);

      const departmentStats: Record<
        string,
        {
          department: string;
          employeeCount: number;
          totalLevel: number;
          competenciesCount: number;
          criticalGaps: number;
        }
      > = {};

      for (const emp of activeEmployees) {
        const dept = emp.departmentName ?? "Sin Departamento";
        if (!departmentStats[dept]) {
          departmentStats[dept] = {
            department: dept,
            employeeCount: 0,
            totalLevel: 0,
            competenciesCount: 0,
            criticalGaps: 0,
          };
        }
        departmentStats[dept].employeeCount++;

        const empComps = competenciesByEmployee.get(emp.id) ?? [];
        if (empComps.length > 0) {
          const levelSum = empComps.reduce(
            (sum, c) => sum + (LEVEL_VALUE[c.currentLevel] ?? 0),
            0
          );
          departmentStats[dept].totalLevel += levelSum / empComps.length;
          departmentStats[dept].competenciesCount += empComps.length;
        }

        if (emp.positionTitle) {
          const posId = positionNameToId.get(emp.positionTitle);
          if (posId !== undefined) {
            const requirements = profilesByPositionId.get(posId) ?? [];
            const compMap = new Map(
              empComps.map(c => [c.competencyName, c.currentLevel])
            );
            for (const req of requirements) {
              const current = compMap.get(req.competencyName) ?? "ninguno";
              const gap =
                (LEVEL_VALUE[req.requiredLevel] ?? 0) -
                (LEVEL_VALUE[current] ?? 0);
              if (gap >= 3) departmentStats[dept].criticalGaps++;
            }
          }
        }
      }

      const result = Object.values(departmentStats).map(d => ({
        department: d.department,
        employeeCount: d.employeeCount,
        avgCompetencyLevel:
          d.employeeCount > 0 ? d.totalLevel / d.employeeCount : 0,
        competenciesCount: d.competenciesCount,
        criticalGaps: d.criticalGaps,
      }));

      return result.sort((a, b) => b.criticalGaps - a.criticalGaps);
    }),

  /**
   * Estadísticas de competencias por tipo
   */
  getByType: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });

      const allCompetencies = await db.select().from(employeeCompetencies);

      const typeStats: Record<
        string,
        { type: string; count: number; totalLevel: number }
      > = {
        tecnica: { type: "Técnica", count: 0, totalLevel: 0 },
        transversal: { type: "Transversal", count: 0, totalLevel: 0 },
        conocimiento: { type: "Conocimiento", count: 0, totalLevel: 0 },
      };

      for (const comp of allCompetencies) {
        const type = comp.competencyType;
        if (typeStats[type]) {
          typeStats[type].count++;
          typeStats[type].totalLevel += LEVEL_VALUE[comp.currentLevel] ?? 0;
        }
      }

      return Object.values(typeStats).map(stat => ({
        type: stat.type,
        count: stat.count,
        avgLevel: stat.count > 0 ? stat.totalLevel / stat.count : 0,
      }));
    }),

  /**
   * Top brechas de competencias en la organización — sin N+1
   */
  getTopGaps: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });

      const {
        activeEmployees,
        positionNameToId,
        profilesByPositionId,
        competenciesByEmployee,
      } = await loadBulkData(db);

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
        if (!emp.positionTitle) continue;
        const posId = positionNameToId.get(emp.positionTitle);
        if (posId === undefined) continue;

        const requirements = profilesByPositionId.get(posId) ?? [];
        const empComps = competenciesByEmployee.get(emp.id) ?? [];
        const compMap = new Map(
          empComps.map(c => [c.competencyName, c.currentLevel])
        );

        for (const req of requirements) {
          const current = compMap.get(req.competencyName) ?? "ninguno";
          const gap =
            (LEVEL_VALUE[req.requiredLevel] ?? 0) - (LEVEL_VALUE[current] ?? 0);
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
            if (gap >= 3) gapsByCompetency[req.competencyName].criticalCount++;
          }
        }
      }

      return Object.values(gapsByCompetency)
        .sort((a, b) => b.totalGap - a.totalGap)
        .slice(0, input.limit);
    }),

  /**
   * Estadísticas globales de la organización
   */
  getOverallStats: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });

      const [
        [employeesResult],
        [competenciesResult],
        [profilesResult],
        allCompetencies,
      ] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(employees)
          .where(eq(employees.isActive, true)),
        db.select({ count: sql<number>`count(*)` }).from(employeeCompetencies),
        db.select({ count: sql<number>`count(*)` }).from(jobProfiles),
        db.select().from(employeeCompetencies),
      ]);

      const totalLevel = allCompetencies.reduce(
        (sum, c) => sum + (LEVEL_VALUE[c.currentLevel] ?? 0),
        0
      );
      const avgLevel =
        allCompetencies.length > 0 ? totalLevel / allCompetencies.length : 0;

      return {
        totalEmployees: Number(employeesResult?.count ?? 0),
        totalCompetencies: Number(competenciesResult?.count ?? 0),
        totalProfiles: Number(profilesResult?.count ?? 0),
        avgCompetencyLevel: avgLevel,
      };
    }),
});
