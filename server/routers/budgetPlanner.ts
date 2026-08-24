/**
 * Router de Planificador Presupuestario
 * Simulación y optimización de ajustes salariales múltiples
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { budgetAdjustmentScenarios, employees } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export const budgetPlannerRouter = router({
  createScenario: protectedProcedure
    .input(
      z.object({
        scenarioName: z.string(),
        description: z.string().optional(),
        totalBudget: z.number(),
        employeeAdjustments: z.array(
          z.object({
            employeeId: z.number(),
            employeeName: z.string(),
            currentSalary: z.number(),
            newSalary: z.number(),
            turnoverProbability: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not initialized");
      }

      // Calcular métricas del escenario
      const adjustments = input.employeeAdjustments.map((emp: any) => ({
        ...emp,
        increase: emp.newSalary - emp.currentSalary,
        increasePercentage:
          ((emp.newSalary - emp.currentSalary) / emp.currentSalary) * 100,
        priority: emp.turnoverProbability || 0,
      }));

      // Ordenar por prioridad (turnover probability) descendente
      const sortedAdjustments = [...adjustments].sort(
        (a: any, b: any) => b.priority - a.priority
      );
      const implementationSequence = sortedAdjustments.map(
        (adj: any) => adj.employeeId
      );

      const budgetUsed = adjustments.reduce(
        (sum: any, adj: any) => sum + adj.increase * 12,
        0
      ); // Costo anual
      const budgetRemaining = input.totalBudget - budgetUsed;

      const averageIncreasePercentage =
        adjustments.reduce(
          (sum: any, adj: any) => sum + adj.increasePercentage,
          0
        ) / adjustments.length;

      const highRiskEmployeesCovered = adjustments.filter(
        (adj: any) => adj.priority >= 70
      ).length;

      // Estimar tasa de retención (simplificado)
      const estimatedRetentionRate = Math.min(
        95,
        60 + highRiskEmployeesCovered * 5
      );

      // Estimar ahorro en costos de rotación
      // Asumiendo costo de rotación = 1.5x salario anual por empleado
      const avgSalary =
        adjustments.reduce((sum: any, adj: any) => sum + adj.currentSalary, 0) /
        adjustments.length;
      const estimatedTurnoverCostSavings =
        highRiskEmployeesCovered * avgSalary * 1.5 * 12;

      // Calcular ROI
      const roi =
        ((estimatedTurnoverCostSavings - budgetUsed) / budgetUsed) * 100;

      // Crear escenario
      const [scenario] = await (
        db.insert(budgetAdjustmentScenarios) as any
      ).values({
        scenarioName: input.scenarioName,
        description: input.description || "",
        createdBy: ctx.user!.id,
        totalBudget: input.totalBudget.toString(),
        budgetUsed: budgetUsed.toString(),
        budgetRemaining: budgetRemaining.toString(),
        adjustments: JSON.stringify(adjustments),
        implementationSequence: JSON.stringify(implementationSequence),
        totalEmployeesAffected: adjustments.length,
        averageIncreasePercentage: averageIncreasePercentage.toString(),
        highRiskEmployeesCovered,
        estimatedRetentionRate: estimatedRetentionRate.toString(),
        estimatedTurnoverCostSavings: estimatedTurnoverCostSavings.toString(),
        roi: roi.toString(),
      });

      return {
        scenarioId: scenario.insertId,
        budgetUsed,
        budgetRemaining,
        roi,
      };
    }),

  getScenarios: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const scenarios = await db
      .select()
      .from(budgetAdjustmentScenarios)
      .orderBy(desc(budgetAdjustmentScenarios.createdAt));

    return scenarios;
  }),

  getScenarioDetails: protectedProcedure
    .input(z.object({ scenarioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const [scenario] = await db
        .select()
        .from(budgetAdjustmentScenarios)
        .where(eq(budgetAdjustmentScenarios.id, input.scenarioId));

      if (!scenario) {
        throw new Error("Scenario not found");
      }

      return {
        ...scenario,
        adjustments: JSON.parse((scenario.adjustments as string) || "[]"),
        implementationSequence: JSON.parse(
          (scenario.implementationSequence as string) || "[]"
        ),
      };
    }),

  simulateMultipleAdjustments: protectedProcedure
    .input(
      z.object({
        totalBudget: z.number(),
        employeeIds: z.array(z.number()),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Obtener datos de empleados
      const employees = await db.execute(sql`
        SELECT 
          p.employee_id,
          p.employee_name,
          p.salary as current_salary,
          p.market_rate,
          p.salary_gap_percentage,
          ptr.turnover_probability
        FROM payroll_data p
        LEFT JOIN predictive_turnover_results ptr ON p.employee_id = ptr.employee_id
        WHERE p.employee_id IN (${sql.join(input.employeeIds, sql`, `)})
      `);

      const adjustments = ((employees as any)[0] as any[]).map((emp: any) => {
        const currentSalary = parseFloat(emp.current_salary);
        const marketRate = parseFloat(emp.market_rate || emp.current_salary);
        const increase = marketRate - currentSalary;
        const increasePercentage = (increase / currentSalary) * 100;
        const turnoverProb = parseFloat(emp.turnover_probability || "0");

        return {
          employeeId: emp.employee_id,
          employeeName: emp.employee_name,
          currentSalary,
          marketRate,
          recommendedNewSalary: marketRate,
          increase,
          increasePercentage,
          annualCost: increase * 12,
          turnoverProbability: turnoverProb,
          priority: turnoverProb,
        };
      });

      // Ordenar por prioridad
      const sortedAdjustments = [...adjustments].sort(
        (a: any, b: any) => b.priority - a.priority
      );

      const totalCost = adjustments.reduce(
        (sum: any, adj: any) => sum + adj.annualCost,
        0
      );
      const budgetRemaining = input.totalBudget - totalCost;
      const feasible = budgetRemaining >= 0;

      return {
        adjustments: sortedAdjustments,
        totalCost,
        budgetRemaining,
        feasible,
        employeesAffected: adjustments.length,
      };
    }),

  optimizeSequence: protectedProcedure
    .input(
      z.object({
        scenarioId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const [scenario] = await db
        .select()
        .from(budgetAdjustmentScenarios)
        .where(eq(budgetAdjustmentScenarios.id, input.scenarioId));

      if (!scenario) {
        throw new Error("Scenario not found");
      }

      const adjustments = JSON.parse((scenario.adjustments as string) || "[]");

      // Algoritmo de optimización: priorizar por ROI individual
      const optimized = adjustments.map((adj: any) => {
        const annualCost = adj.increase * 12;
        const estimatedSavings =
          adj.priority >= 70 ? adj.currentSalary * 1.5 * 12 : 0;
        const individualROI =
          estimatedSavings > 0
            ? ((estimatedSavings - annualCost) / annualCost) * 100
            : -100;

        return {
          ...adj,
          annualCost,
          estimatedSavings,
          individualROI,
        };
      });

      // Ordenar por ROI individual descendente
      const sortedByROI = optimized.sort(
        (a: any, b: any) => b.individualROI - a.individualROI
      );

      return {
        optimizedSequence: sortedByROI,
        recommendation:
          "Implementar ajustes en el orden mostrado para maximizar ROI",
      };
    }),

  approveScenario: protectedProcedure
    .input(z.object({ scenarioId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      await db
        .update(budgetAdjustmentScenarios)
        .set({
          status: "approved",
          approvedBy: ctx.user!.id,
          approvedAt: new Date(),
        } as any)
        .where(eq(budgetAdjustmentScenarios.id, input.scenarioId));

      return { success: true };
    }),

  deleteScenario: protectedProcedure
    .input(z.object({ scenarioId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      await db
        .delete(budgetAdjustmentScenarios)
        .where(eq(budgetAdjustmentScenarios.id, input.scenarioId));

      return { success: true };
    }),
});
