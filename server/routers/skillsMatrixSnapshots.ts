import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  skillsMatrixSnapshots, 
  employees, 
  skillsMatrix, 
  organizationalCompetencies,
  departments,
  positions
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const skillsMatrixSnapshotsRouter = router({
  /**
   * Save a new snapshot of the skills matrix
   */
  saveSnapshot: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "El nombre es requerido"),
      description: z.string().optional(),
      departmentId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get current skills matrix data
      const matrixData = await db
        .select({
          employeeId: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          departmentId: employees.departmentId,
          departmentName: departments.name,
          positionId: employees.positionId,
          positionName: positions.name,
          competencyId: skillsMatrix.competencyId,
          competencyName: organizationalCompetencies.name,
          currentLevel: skillsMatrix.currentLevel,
          requiredLevel: skillsMatrix.requiredLevel,
        })
        .from(skillsMatrix)
        .innerJoin(employees, eq(skillsMatrix.employeeId, employees.id))
        .innerJoin(organizationalCompetencies, eq(skillsMatrix.competencyId, organizationalCompetencies.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(
          input.departmentId 
            ? eq(employees.departmentId, input.departmentId)
            : sql`1=1`
        );

      // Group by employee
      const employeeMap = new Map<number, any>();
      
      for (const row of matrixData) {
        if (!employeeMap.has(row.employeeId)) {
          employeeMap.set(row.employeeId, {
            id: row.employeeId,
            firstName: row.firstName || "",
            lastName: row.lastName || "",
            departmentName: row.departmentName || "Sin departamento",
            positionName: row.positionName || "Sin puesto",
            competencies: [],
            averageLevel: 0,
            totalGap: 0,
          });
        }

        const employee = employeeMap.get(row.employeeId);
        const gap = (row.requiredLevel || 0) - (row.currentLevel || 0);
        
        employee.competencies.push({
          competencyId: row.competencyId,
          competencyName: row.competencyName || "",
          currentLevel: row.currentLevel || 0,
          requiredLevel: row.requiredLevel || 0,
          gap: gap > 0 ? gap : 0,
        });
      }

      // Calculate averages and totals
      const employeesArray = Array.from(employeeMap.values());
      
      for (const employee of employeesArray) {
        const totalLevel = employee.competencies.reduce((sum: number, c: any) => sum + c.currentLevel, 0);
        employee.averageLevel = employee.competencies.length > 0 
          ? Number((totalLevel / employee.competencies.length).toFixed(2))
          : 0;
        
        employee.totalGap = employee.competencies.reduce((sum: number, c: any) => sum + c.gap, 0);
      }

      // Calculate summary statistics
      const totalEmployees = employeesArray.length;
      const totalCompetencies = employeesArray.reduce((sum, e) => sum + e.competencies.length, 0);
      const totalLevels = employeesArray.reduce((sum, e) => sum + (e.averageLevel * e.competencies.length), 0);
      const averageCompetencyLevel = totalCompetencies > 0 
        ? Number((totalLevels / totalCompetencies).toFixed(2))
        : 0;
      const totalGaps = employeesArray.reduce((sum, e) => sum + e.totalGap, 0);
      const criticalGaps = employeesArray.reduce((sum, e) => {
        return sum + e.competencies.filter((c: any) => c.gap >= 2).length;
      }, 0);

      const snapshotData = {
        employees: employeesArray,
        summary: {
          totalEmployees,
          totalCompetencies,
          averageCompetencyLevel,
          totalGaps,
          criticalGaps,
        },
      };

      // Insert snapshot
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const result = await db.insert(skillsMatrixSnapshots).values({
        name: input.name,
        description: input.description || null,
        snapshotDate: dateStr as any,
        departmentId: input.departmentId || null,
        data: snapshotData as any,
        createdBy: ctx.user.id,
      });

      return {
        success: true,
        snapshotId: result[0].insertId,
        message: "Snapshot guardado exitosamente",
      };
    }),

  /**
   * Get all snapshots
   */
  getAll: protectedProcedure
    .input(z.object({
      departmentId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const conditions = input.departmentId 
        ? eq(skillsMatrixSnapshots.departmentId, input.departmentId)
        : sql`1=1`;

      const snapshots = await db
        .select()
        .from(skillsMatrixSnapshots)
        .where(conditions)
        .orderBy(desc(skillsMatrixSnapshots.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(skillsMatrixSnapshots)
        .where(conditions);

      return {
        snapshots,
        total: Number(total[0]?.count || 0),
      };
    }),

  /**
   * Get a single snapshot by ID
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const snapshot = await db
        .select()
        .from(skillsMatrixSnapshots)
        .where(eq(skillsMatrixSnapshots.id, input.id))
        .limit(1);

      if (!snapshot || snapshot.length === 0) {
        throw new Error("Snapshot no encontrado");
      }

      return snapshot[0];
    }),

  /**
   * Compare two snapshots
   */
  compareSnapshots: protectedProcedure
    .input(z.object({
      snapshot1Id: z.number(),
      snapshot2Id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [snapshot1, snapshot2] = await Promise.all([
        db.select().from(skillsMatrixSnapshots).where(eq(skillsMatrixSnapshots.id, input.snapshot1Id)).limit(1),
        db.select().from(skillsMatrixSnapshots).where(eq(skillsMatrixSnapshots.id, input.snapshot2Id)).limit(1),
      ]);

      if (!snapshot1[0] || !snapshot2[0]) {
        throw new Error("Uno o ambos snapshots no encontrados");
      }

      const data1 = snapshot1[0].data as any;
      const data2 = snapshot2[0].data as any;

      // Calculate differences
      const summaryComparison = {
        totalEmployees: {
          before: data1.summary.totalEmployees,
          after: data2.summary.totalEmployees,
          change: data2.summary.totalEmployees - data1.summary.totalEmployees,
          percentChange: data1.summary.totalEmployees > 0 
            ? Number((((data2.summary.totalEmployees - data1.summary.totalEmployees) / data1.summary.totalEmployees) * 100).toFixed(2))
            : 0,
        },
        averageCompetencyLevel: {
          before: data1.summary.averageCompetencyLevel,
          after: data2.summary.averageCompetencyLevel,
          change: Number((data2.summary.averageCompetencyLevel - data1.summary.averageCompetencyLevel).toFixed(2)),
          percentChange: data1.summary.averageCompetencyLevel > 0 
            ? Number((((data2.summary.averageCompetencyLevel - data1.summary.averageCompetencyLevel) / data1.summary.averageCompetencyLevel) * 100).toFixed(2))
            : 0,
        },
        totalGaps: {
          before: data1.summary.totalGaps,
          after: data2.summary.totalGaps,
          change: data2.summary.totalGaps - data1.summary.totalGaps,
          percentChange: data1.summary.totalGaps > 0 
            ? Number((((data2.summary.totalGaps - data1.summary.totalGaps) / data1.summary.totalGaps) * 100).toFixed(2))
            : 0,
        },
        criticalGaps: {
          before: data1.summary.criticalGaps,
          after: data2.summary.criticalGaps,
          change: data2.summary.criticalGaps - data1.summary.criticalGaps,
          percentChange: data1.summary.criticalGaps > 0 
            ? Number((((data2.summary.criticalGaps - data1.summary.criticalGaps) / data1.summary.criticalGaps) * 100).toFixed(2))
            : 0,
        },
      };

      // Employee-level comparison
      const employeeComparisons = [];
      const employeeMap1 = new Map(data1.employees.map((e: any) => [e.id, e]));
      const employeeMap2 = new Map(data2.employees.map((e: any) => [e.id, e]));

      for (const [empId, emp2] of Array.from(employeeMap2.entries())) {
        const emp1 = employeeMap1.get(empId);
        
        if (emp1) {
          const emp1Data = emp1 as any;
          const emp2Data = emp2 as any;
          const avgLevelChange = Number((emp2Data.averageLevel - emp1Data.averageLevel).toFixed(2));
          const gapChange = emp2Data.totalGap - emp1Data.totalGap;
          
          employeeComparisons.push({
            employeeId: empId,
            employeeName: `${emp2Data.firstName} ${emp2Data.lastName}`,
            departmentName: emp2Data.departmentName,
            averageLevel: {
              before: emp1Data.averageLevel,
              after: emp2Data.averageLevel,
              change: avgLevelChange,
            },
            totalGap: {
              before: emp1Data.totalGap,
              after: emp2Data.totalGap,
              change: gapChange,
            },
            improvement: avgLevelChange > 0 || gapChange < 0,
          });
        }
      }

      // Sort by improvement (best first)
      employeeComparisons.sort((a, b) => {
        const scoreA = a.averageLevel.change - (a.totalGap.change * 0.5);
        const scoreB = b.averageLevel.change - (b.totalGap.change * 0.5);
        return scoreB - scoreA;
      });

      return {
        snapshot1: {
          id: snapshot1[0].id,
          name: snapshot1[0].name,
          date: snapshot1[0].snapshotDate,
        },
        snapshot2: {
          id: snapshot2[0].id,
          name: snapshot2[0].name,
          date: snapshot2[0].snapshotDate,
        },
        summaryComparison,
        employeeComparisons,
        topImprovers: employeeComparisons.filter(e => e.improvement).slice(0, 10),
        needsAttention: employeeComparisons.filter(e => !e.improvement).slice(0, 10),
      };
    }),

  /**
   * Delete a snapshot
   */
  deleteSnapshot: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Check if user is admin or creator
      const snapshot = await db
        .select()
        .from(skillsMatrixSnapshots)
        .where(eq(skillsMatrixSnapshots.id, input.id))
        .limit(1);

      if (!snapshot || snapshot.length === 0) {
        throw new Error("Snapshot no encontrado");
      }

      if (snapshot[0].createdBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para eliminar este snapshot");
      }

      await db.delete(skillsMatrixSnapshots).where(eq(skillsMatrixSnapshots.id, input.id));

      return {
        success: true,
        message: "Snapshot eliminado exitosamente",
      };
    }),

  /**
   * Get trend data for all snapshots
   */
  getTrendData: protectedProcedure
    .input(z.object({
      departmentId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get all snapshots ordered by date
      let query = db
        .select()
        .from(skillsMatrixSnapshots)
        .orderBy(skillsMatrixSnapshots.snapshotDate);

      if (input.departmentId) {
        query = query.where(eq(skillsMatrixSnapshots.departmentId, input.departmentId)) as any;
      }

      const snapshots = await query;

      // Extract trend data
      const labels = snapshots.map(s => {
        const date = new Date(s.snapshotDate);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      });

      const data = snapshots.map(s => {
        const snapshotData = s.data as any;
        return {
          name: s.name,
          date: s.snapshotDate,
          totalEmployees: snapshotData.summary.totalEmployees,
          averageLevel: snapshotData.summary.averageCompetencyLevel,
          totalGaps: snapshotData.summary.totalGaps,
          criticalGaps: snapshotData.summary.criticalGaps,
        };
      });

      return {
        labels,
        datasets: {
          totalEmployees: data.map(d => d.totalEmployees),
          averageLevel: data.map(d => d.averageLevel),
          totalGaps: data.map(d => d.totalGaps),
          criticalGaps: data.map(d => d.criticalGaps),
        },
        snapshots: data,
      };
    }),
});
