import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { employees, departments } from "../../drizzle/schema";
import { sql, eq, and, gte, lte, count, desc } from "drizzle-orm";

export const departmentMetricsRouter = router({
  /**
   * Obtener métricas de rotación de empleados por departamento
   * Calcula altas y bajas en un período específico
   */
  getRotationMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        period: z.enum(["month", "quarter", "year"]).default("month"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate, endDate, period } = input;

      // Calcular fechas según período
      const now = new Date();
      let start: Date;
      let end: Date = now;

      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        switch (period) {
          case "month":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "quarter":
            const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
            start = new Date(now.getFullYear(), quarterMonth, 1);
            break;
          case "year":
            start = new Date(now.getFullYear(), 0, 1);
            break;
        }
      }

      // Obtener todos los departamentos activos
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const allDepartments = await db
        .select({
          id: departments.id,
          name: departments.name,
        })
        .from(departments)
        .where(eq(departments.isActive, true))
        .execute();

      // Calcular altas (empleados creados en el período)
      const hires = await Promise.all(
        allDepartments.map(async (dept) => {
          // @ts-expect-error - getDb() siempre retorna instancia válida
          const [result] = await db
            .select({ count: count() })
            .from(employees)
            .where(
              and(
                eq(employees.departmentId, dept.id),
                gte(employees.createdAt, start),
                lte(employees.createdAt, end)
              )
            )
            .execute();

          return {
            departmentId: dept.id,
            departmentName: dept.name,
            hires: result.count,
          };
        })
      );

      // Calcular bajas (empleados con status 'inactivo' en el período)
      const terminations = await Promise.all(
        allDepartments.map(async (dept) => {
          // @ts-expect-error - getDb() siempre retorna instancia válida
          const [result] = await db
            .select({ count: count() })
            .from(employees)
            .where(
              and(
                eq(employees.departmentId, dept.id),
                sql`${employees.status} = 'inactivo'`,
                gte(employees.updatedAt, start),
                lte(employees.updatedAt, end)
              )
            )
            .execute();

          return {
            departmentId: dept.id,
            departmentName: dept.name,
            terminations: result.count,
          };
        })
      );

      // Combinar resultados
      const rotationMetrics = allDepartments.map((dept) => {
        const hire = hires.find((h) => h.departmentId === dept.id);
        const termination = terminations.find((t) => t.departmentId === dept.id);

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          hires: hire?.hires || 0,
          terminations: termination?.terminations || 0,
          netChange: (hire?.hires || 0) - (termination?.terminations || 0),
        };
      });

      return {
        period: { start, end },
        metrics: rotationMetrics,
        totalHires: hires.reduce((sum, h) => sum + h.hires, 0),
        totalTerminations: terminations.reduce((sum, t) => sum + t.terminations, 0),
      };
    }),

  /**
   * Obtener métricas de crecimiento de empleados por departamento
   * Compara el número de empleados en diferentes períodos
   */
  getGrowthMetrics: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(12).default(6),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { months } = input;

      // Obtener departamentos activos
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const allDepartments = await db
        .select({
          id: departments.id,
          name: departments.name,
        })
        .from(departments)
        .where(eq(departments.isActive, true))
        .execute();

      // Generar datos de crecimiento por mes
      const growthData = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const monthData = {
          month: monthDate.toLocaleDateString("es-MX", { year: "numeric", month: "short" }),
          departments: await Promise.all(
            allDepartments.map(async (dept) => {
              // @ts-expect-error - getDb() siempre retorna instancia válida
              const [result] = await db
                .select({ count: count() })
                .from(employees)
                .where(
                  and(
                    eq(employees.departmentId, dept.id),
                    lte(employees.createdAt, monthEnd),
                    sql`(${employees.status} = 'activo' OR ${employees.updatedAt} > ${monthEnd})`
                  )
                )
                .execute();

              return {
                departmentId: dept.id,
                departmentName: dept.name,
                employeeCount: result.count,
              };
            })
          ),
        };

        growthData.push(monthData);
      }

      return {
        months: growthData.map((d) => d.month),
        departments: allDepartments.map((dept) => ({
          id: dept.id,
          name: dept.name,
          data: growthData.map(
            (month) =>
              month.departments.find((d) => d.departmentId === dept.id)?.employeeCount || 0
          ),
        })),
      };
    }),

  /**
   * Obtener métricas de distribución de empleados por departamento
   */
  getDistributionMetrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Obtener distribución actual de empleados
    // @ts-expect-error - getDb() siempre retorna instancia válida
    const distribution = await db
      .select({
        departmentId: employees.departmentId,
        departmentName: departments.name,
        employeeCount: count(),
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(sql`${employees.status} = 'activo'`)
      .groupBy(employees.departmentId, departments.name)
      .orderBy(desc(count()))
      .execute();

    // Calcular total de empleados
    const totalEmployees = distribution.reduce((sum, d) => sum + d.employeeCount, 0);

    // Calcular porcentajes
    const distributionWithPercentage = distribution.map((d) => ({
      ...d,
      percentage: totalEmployees > 0 ? ((d.employeeCount / totalEmployees) * 100).toFixed(2) : "0",
    }));

    return {
      distribution: distributionWithPercentage,
      totalEmployees,
      departmentCount: distribution.length,
    };
  }),
});
