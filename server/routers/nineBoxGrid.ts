import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import {
  nineBoxAssessments,
  employees,
  employeeCompetencies,
  trainingNeeds,
} from "../../drizzle/schema";

export const nineBoxGridRouter = router({
  // Calcular desempeño y potencial automáticamente para un empleado
  calculateAutomatic: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // 1. Calcular desempeño: nivel promedio de competencias (1-4)
      const competenciesData = await db
        .select({
          currentLevel: employeeCompetencies.currentLevel,
        })
        .from(employeeCompetencies)
        .where(eq(employeeCompetencies.employeeId, input.employeeId));

      if (competenciesData.length === 0) {
        throw new Error("No se encontraron competencias para este empleado");
      }

      // Mapear niveles string a números
      const levelMap: Record<string, number> = {
        basico: 1,
        intermedio: 2,
        avanzado: 3,
        experto: 4,
      };

      const avgLevel =
        competenciesData.reduce(
          (sum, c) => sum + (levelMap[c.currentLevel] || 0),
          0
        ) / competenciesData.length;

      // Mapear nivel promedio a performanceScore (1-3)
      // 0-1.5: bajo (1), 1.5-2.5: medio (2), 2.5-4: alto (3)
      let performanceScore: number;
      if (avgLevel < 1.5) {
        performanceScore = 1;
      } else if (avgLevel < 2.5) {
        performanceScore = 2;
      } else {
        performanceScore = 3;
      }

      // 2. Calcular potencial: tendencia de crecimiento basada en capacitaciones completadas
      const trainingData = await db
        .select({
          status: trainingNeeds.status,
        })
        .from(trainingNeeds)
        .where(eq(trainingNeeds.employeeId, input.employeeId));

      const totalTrainings = trainingData.length;
      const completedTrainings = trainingData.filter(
        (t) => t.status === "completada"
      ).length;

      // Calcular tasa de completitud
      const completionRate =
        totalTrainings > 0 ? completedTrainings / totalTrainings : 0;

      // Mapear tasa de completitud a potentialScore (1-3)
      // 0-0.3: bajo (1), 0.3-0.7: medio (2), 0.7-1: alto (3)
      let potentialScore: number;
      if (completionRate < 0.3) {
        potentialScore = 1;
      } else if (completionRate < 0.7) {
        potentialScore = 2;
      } else {
        potentialScore = 3;
      }

      // 3. Determinar cuadrante (9 categorías)
      const quadrantMap: Record<number, Record<number, string>> = {
        1: { 1: "Bajo Desempeño / Bajo Potencial", 2: "Bajo Desempeño / Medio Potencial", 3: "Bajo Desempeño / Alto Potencial" },
        2: { 1: "Medio Desempeño / Bajo Potencial", 2: "Medio Desempeño / Medio Potencial", 3: "Medio Desempeño / Alto Potencial" },
        3: { 1: "Alto Desempeño / Bajo Potencial", 2: "Alto Desempeño / Medio Potencial", 3: "Alto Desempeño / Alto Potencial" },
      };

      const quadrant = quadrantMap[performanceScore]?.[potentialScore] || "Sin clasificar";

      // 4. Guardar o actualizar evaluación
      const existing = await db
        .select()
        .from(nineBoxAssessments)
        .where(eq(nineBoxAssessments.employeeId, input.employeeId))
        .limit(1);

      if (existing.length > 0) {
        // Actualizar existente
        await db
          .update(nineBoxAssessments)
          .set({
            performanceScore,
            potentialScore,
            quadrant,
            assessmentDate: new Date(),
            assessedBy: ctx.user.id,
            notes: `Evaluación automática: Nivel promedio ${avgLevel.toFixed(2)}, Tasa completitud ${(completionRate * 100).toFixed(0)}%`,
          })
          .where(eq(nineBoxAssessments.id, existing[0].id));

        return {
          success: true,
          assessment: {
            id: existing[0].id,
            employeeId: input.employeeId,
            performanceScore,
            potentialScore,
            quadrant,
            avgLevel: avgLevel.toFixed(2),
            completionRate: (completionRate * 100).toFixed(0) + "%",
          },
        };
      } else {
        // Crear nuevo
        const result = await (db.insert(nineBoxAssessments) as any).values({
          employeeId: input.employeeId,
          performanceScore,
          potentialScore,
          quadrant,
          assessmentDate: new Date(),
          assessedBy: ctx.user.id,
          notes: `Evaluación automática: Nivel promedio ${avgLevel.toFixed(2)}, Tasa completitud ${(completionRate * 100).toFixed(0)}%`,
        });

        const insertedId = (result as any).insertId || 0;
        return {
          success: true,
          assessment: {
            id: Number(insertedId),
            employeeId: input.employeeId,
            performanceScore,
            potentialScore,
            quadrant,
            avgLevel: avgLevel.toFixed(2),
            completionRate: (completionRate * 100).toFixed(0) + "%",
          },
        };
      }
    }),

  // Calcular automáticamente para todos los empleados
  calculateAll: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const allEmployees = await db.select({ id: employees.id }).from(employees);

    let successCount = 0;
    let errorCount = 0;

    for (const employee of allEmployees) {
      try {
        // Reutilizar lógica de calculateAutomatic
        const competenciesData = await db
          .select({ currentLevel: employeeCompetencies.currentLevel })
          .from(employeeCompetencies)
          .where(eq(employeeCompetencies.employeeId, employee.id));

        if (competenciesData.length === 0) {
          errorCount++;
          continue;
        }

        const levelMap: Record<string, number> = {
          basico: 1,
          intermedio: 2,
          avanzado: 3,
          experto: 4,
        };

        const avgLevel =
          competenciesData.reduce(
            (sum, c) => sum + (levelMap[c.currentLevel] || 0),
            0
          ) / competenciesData.length;

        let performanceScore: number;
        if (avgLevel < 1.5) performanceScore = 1;
        else if (avgLevel < 2.5) performanceScore = 2;
        else performanceScore = 3;

        const trainingData = await db
          .select({ status: trainingNeeds.status })
          .from(trainingNeeds)
          .where(eq(trainingNeeds.employeeId, employee.id));

        const totalTrainings = trainingData.length;
        const completedTrainings = trainingData.filter(
          (t) => t.status === "completada"
        ).length;
        const completionRate =
          totalTrainings > 0 ? completedTrainings / totalTrainings : 0;

        let potentialScore: number;
        if (completionRate < 0.3) potentialScore = 1;
        else if (completionRate < 0.7) potentialScore = 2;
        else potentialScore = 3;

        const quadrantMap: Record<number, Record<number, string>> = {
          1: { 1: "Bajo Desempeño / Bajo Potencial", 2: "Bajo Desempeño / Medio Potencial", 3: "Bajo Desempeño / Alto Potencial" },
          2: { 1: "Medio Desempeño / Bajo Potencial", 2: "Medio Desempeño / Medio Potencial", 3: "Medio Desempeño / Alto Potencial" },
          3: { 1: "Alto Desempeño / Bajo Potencial", 2: "Alto Desempeño / Medio Potencial", 3: "Alto Desempeño / Alto Potencial" },
        };

        const quadrant = quadrantMap[performanceScore]?.[potentialScore] || "Sin clasificar";

        const existing = await db
          .select()
          .from(nineBoxAssessments)
          .where(eq(nineBoxAssessments.employeeId, employee.id))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(nineBoxAssessments)
            .set({
              performanceScore,
              potentialScore,
              quadrant,
              assessmentDate: new Date(),
              assessedBy: ctx.user.id,
              notes: `Evaluación automática masiva: Nivel ${avgLevel.toFixed(2)}, Completitud ${(completionRate * 100).toFixed(0)}%`,
            })
            .where(eq(nineBoxAssessments.id, existing[0].id));
        } else {
          await (db.insert(nineBoxAssessments) as any).values({
            employeeId: employee.id,
            performanceScore,
            potentialScore,
            quadrant,
            assessmentDate: new Date(),
            assessedBy: ctx.user.id,
            notes: `Evaluación automática masiva: Nivel ${avgLevel.toFixed(2)}, Completitud ${(completionRate * 100).toFixed(0)}%`,
          });
        }

        successCount++;
      } catch (error) {
        console.error(`Error evaluando empleado ${employee.id}:`, error);
        errorCount++;
      }
    }

    return {
      success: true,
      total: allEmployees.length,
      successCount,
      errorCount,
    };
  }),

  // Obtener todas las evaluaciones con filtros
  getAll: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        quadrant: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      let query = db
        .select({
          id: nineBoxAssessments.id,
          employeeId: nineBoxAssessments.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          departmentId: employees.departmentId,
          performanceScore: nineBoxAssessments.performanceScore,
          potentialScore: nineBoxAssessments.potentialScore,
          quadrant: nineBoxAssessments.quadrant,
          assessmentDate: nineBoxAssessments.assessmentDate,
          notes: nineBoxAssessments.notes,
        })
        .from(nineBoxAssessments)
        .innerJoin(employees, eq(nineBoxAssessments.employeeId, employees.id))
        .$dynamic();

      // Aplicar filtros
      const conditions = [];
      if (input.departmentId) {
        conditions.push(eq(employees.departmentId, input.departmentId));
      }
      if (input.quadrant) {
        conditions.push(eq(nineBoxAssessments.quadrant, input.quadrant));
      }
      if (input.search) {
        conditions.push(
          sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName}) LIKE ${`%${input.search}%`}`
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const offset = (input.page - 1) * input.pageSize;
      const results = await query
        .orderBy(desc(nineBoxAssessments.assessmentDate))
        .limit(input.pageSize)
        .offset(offset);

      // Contar total
      const countQuery = db
        .select({ count: sql<number>`COUNT(*)` })
        .from(nineBoxAssessments)
        .innerJoin(employees, eq(nineBoxAssessments.employeeId, employees.id))
        .$dynamic();

      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }

      const countResult = await countQuery;
      const total = countResult[0]?.count || 0;

      return {
        data: results,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  // Obtener estadísticas por cuadrante
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const stats = await db
      .select({
        quadrant: nineBoxAssessments.quadrant,
        count: sql<number>`COUNT(*)`,
      })
      .from(nineBoxAssessments)
      .groupBy(nineBoxAssessments.quadrant);

    const total = stats.reduce((sum: any, s: any) => sum + s.count, 0);

    return {
      total,
      byQuadrant: stats,
    };
  }),
});
