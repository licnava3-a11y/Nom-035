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
      // @ts-ignore - getDb() siempre retorna instancia válida
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
          // @ts-ignore - getDb() siempre retorna instancia válida
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
          // @ts-ignore - getDb() siempre retorna instancia válida
          const [result] = await db
            .select({ count: count() })
            .from(employees)
            .where(
              and(
                eq(employees.departmentId, dept.id),
                eq(employees.isActive, false),
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
      // @ts-ignore - getDb() siempre retorna instancia válida
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
              // @ts-ignore - getDb() siempre retorna instancia válida
              const [result] = await db
                .select({ count: count() })
                .from(employees)
                .where(
                  and(
                    eq(employees.departmentId, dept.id),
                    lte(employees.createdAt, monthEnd),
                    eq(employees.isActive, true)
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
    // @ts-ignore - getDb() siempre retorna instancia válida
    const distribution = await db
      .select({
        departmentId: employees.departmentId,
        departmentName: departments.name,
        employeeCount: count(),
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(employees.isActive, true))
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

  /**
   * Obtener comparativa año contra año de métricas
   * Compara métricas del año actual vs año anterior
   */
  getYearOverYearComparison: protectedProcedure
    .input(
      z.object({
        metric: z.enum(["rotation", "growth", "distribution"]).default("growth"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { metric } = input;

      // Calcular fechas
      const now = new Date();
      const currentYearStart = new Date(now.getFullYear(), 0, 1);
      const currentYearEnd = now;
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

      // Obtener departamentos activos
      // @ts-ignore - getDb() siempre retorna instancia válida
      const allDepartments = await db
        .select({
          id: departments.id,
          name: departments.name,
        })
        .from(departments)
        .where(eq(departments.isActive, true))
        .execute();

      if (metric === "rotation") {
        // Comparativa de rotación (altas y bajas)
        const currentYearData = await Promise.all(
          allDepartments.map(async (dept) => {
            // @ts-ignore - getDb() siempre retorna instancia válida
            const [hires] = await db
              .select({ count: count() })
              .from(employees)
              .where(
                and(
                  eq(employees.departmentId, dept.id),
                  gte(employees.createdAt, currentYearStart),
                  lte(employees.createdAt, currentYearEnd)
                )
              )
              .execute();

            // @ts-ignore - getDb() siempre retorna instancia válida
            const [terminations] = await db
              .select({ count: count() })
              .from(employees)
              .where(
                and(
                  eq(employees.departmentId, dept.id),
                  eq(employees.isActive, false),
                  gte(employees.updatedAt, currentYearStart),
                  lte(employees.updatedAt, currentYearEnd)
                )
              )
              .execute();

            return {
              departmentId: dept.id,
              departmentName: dept.name,
              hires: hires.count,
              terminations: terminations.count,
              netChange: hires.count - terminations.count,
            };
          })
        );

        const lastYearData = await Promise.all(
          allDepartments.map(async (dept) => {
            // @ts-ignore - getDb() siempre retorna instancia válida
            const [hires] = await db
              .select({ count: count() })
              .from(employees)
              .where(
                and(
                  eq(employees.departmentId, dept.id),
                  gte(employees.createdAt, lastYearStart),
                  lte(employees.createdAt, lastYearEnd)
                )
              )
              .execute();

            // @ts-ignore - getDb() siempre retorna instancia válida
            const [terminations] = await db
              .select({ count: count() })
              .from(employees)
              .where(
                and(
                  eq(employees.departmentId, dept.id),
                  eq(employees.isActive, false),
                  gte(employees.updatedAt, lastYearStart),
                  lte(employees.updatedAt, lastYearEnd)
                )
              )
              .execute();

            return {
              departmentId: dept.id,
              departmentName: dept.name,
              hires: hires.count,
              terminations: terminations.count,
              netChange: hires.count - terminations.count,
            };
          })
        );

        // Calcular cambios porcentuales
        const comparison = allDepartments.map((dept) => {
          const current = currentYearData.find((d) => d.departmentId === dept.id);
          const last = lastYearData.find((d) => d.departmentId === dept.id);

          const hiresChange =
            last && last.hires > 0
              ? ((current!.hires - last.hires) / last.hires) * 100
              : current!.hires > 0
              ? 100
              : 0;

          const terminationsChange =
            last && last.terminations > 0
              ? ((current!.terminations - last.terminations) / last.terminations) * 100
              : current!.terminations > 0
              ? 100
              : 0;

          return {
            departmentId: dept.id,
            departmentName: dept.name,
            currentYear: current,
            lastYear: last,
            hiresChange: hiresChange.toFixed(2),
            terminationsChange: terminationsChange.toFixed(2),
          };
        });

        return {
          metric: "rotation",
          currentYear: now.getFullYear(),
          lastYear: now.getFullYear() - 1,
          comparison,
        };
      } else if (metric === "growth") {
        // Comparativa de crecimiento (número de empleados)
        const currentYearData = await Promise.all(
          allDepartments.map(async (dept) => {
            // @ts-ignore - getDb() siempre retorna instancia válida
            const [result] = await db
              .select({ count: count() })
              .from(employees)
              .where(
                and(
                  eq(employees.departmentId, dept.id),
                  lte(employees.createdAt, currentYearEnd),
                  eq(employees.isActive, true)
                )
              )
              .execute();

            return {
              departmentId: dept.id,
              departmentName: dept.name,
              employeeCount: result.count,
            };
          })
        );

        const lastYearData = await Promise.all(
          allDepartments.map(async (dept) => {
            // @ts-ignore - getDb() siempre retorna instancia válida
            const [result] = await db
              .select({ count: count() })
              .from(employees)
              .where(
                and(
                  eq(employees.departmentId, dept.id),
                  lte(employees.createdAt, lastYearEnd),
                  eq(employees.isActive, true)
                )
              )
              .execute();

            return {
              departmentId: dept.id,
              departmentName: dept.name,
              employeeCount: result.count,
            };
          })
        );

        // Calcular cambios porcentuales
        const comparison = allDepartments.map((dept) => {
          const current = currentYearData.find((d) => d.departmentId === dept.id);
          const last = lastYearData.find((d) => d.departmentId === dept.id);

          const growthChange =
            last && last.employeeCount > 0
              ? ((current!.employeeCount - last.employeeCount) / last.employeeCount) * 100
              : current!.employeeCount > 0
              ? 100
              : 0;

          return {
            departmentId: dept.id,
            departmentName: dept.name,
            currentYear: current,
            lastYear: last,
            growthChange: growthChange.toFixed(2),
          };
        });

        return {
          metric: "growth",
          currentYear: now.getFullYear(),
          lastYear: now.getFullYear() - 1,
          comparison,
        };
      } else {
        // Comparativa de distribución (porcentaje por departamento)
        const currentYearTotal = await Promise.all(
          allDepartments.map(async (dept) => {
            // @ts-ignore - getDb() siempre retorna instancia válida
            const [result] = await db
              .select({ count: count() })
              .from(employees)
              .where(
                and(
                  eq(employees.departmentId, dept.id),
                  eq(employees.isActive, true)
                )
              )
              .execute();

            return {
              departmentId: dept.id,
              departmentName: dept.name,
              employeeCount: result.count,
            };
          })
        );

        const totalCurrent = currentYearTotal.reduce((sum, d) => sum + d.employeeCount, 0);

        const comparison = currentYearTotal.map((dept) => ({
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          employeeCount: dept.employeeCount,
          percentage:
            totalCurrent > 0 ? ((dept.employeeCount / totalCurrent) * 100).toFixed(2) : "0",
        }));

        return {
          metric: "distribution",
          currentYear: now.getFullYear(),
          comparison,
          totalEmployees: totalCurrent,
        };
      }
    }),

  /**
   * Obtener detalles de empleados por departamento con métricas individuales
   */
  getEmployeeDetails: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { departmentId, search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      // Construir condiciones de filtro
      const conditions = [];
      if (departmentId) {
        conditions.push(eq(employees.departmentId, departmentId));
      }
      conditions.push(eq(employees.isActive, true));

      if (search) {
        conditions.push(
          or(
            sql`${employees.firstName} LIKE ${`%${search}%`}`,
            sql`${employees.lastName} LIKE ${`%${search}%`}`,
            sql`${sql`''`} LIKE ${`%${search}%`}`,
            sql`${employees.email} LIKE ${`%${search}%`}`
          )!
        );
      }

      // Obtener empleados con información de departamento
      // @ts-ignore - getDb() siempre retorna instancia válida
      const employeesList = await db
        .select({
          id: employees.id,
          nombre: employees.firstName,
          apellidoPaterno: employees.lastName,
          apellidoMaterno: sql`''`,
          email: employees.email,
          puesto: employees.positionId,
          departmentId: employees.departmentId,
          departmentName: departments.name,
          createdAt: employees.createdAt,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(and(...conditions))
        .limit(pageSize)
        .offset(offset)
        .execute();

      // Obtener total de empleados para paginación
      // @ts-ignore - getDb() siempre retorna instancia válida
      const [totalResult] = await db
        .select({ count: count() })
        .from(employees)
        .where(and(...conditions))
        .execute();

      // Obtener métricas individuales para cada empleado
      const employeesWithMetrics = await Promise.all(
        employeesList.map(async (emp) => {
          // Calcular antigüedad en meses
          const createdDate = new Date(emp.createdAt);
          const now = new Date();
          const tenureMonths =
            (now.getFullYear() - createdDate.getFullYear()) * 12 +
            (now.getMonth() - createdDate.getMonth());

          // Obtener número de evaluaciones completadas
          // @ts-ignore - getDb() siempre retorna instancia válida
          const [evaluationsResult] = await db
            .select({ count: count() })
            .from(sql`survey_responses`)
            .where(
              and(
                sql`employee_id = ${emp.id}`,
                sql`completed_at IS NOT NULL`
              )
            )
            .execute();

          // Obtener número de capacitaciones completadas
          // @ts-ignore - getDb() siempre retorna instancia válida
          const [trainingsResult] = await db
            .select({ count: count() })
            .from(sql`training_enrollments`)
            .where(
              and(
                sql`employee_id = ${emp.id}`,
                sql`status = 'completed'`
              )
            )
            .execute();

          // Obtener número de casos asociados (como reportante)
          // @ts-ignore - getDb() siempre retorna instancia válida
          const [casesResult] = await db
            .select({ count: count() })
            .from(sql`cases`)
            .where(sql`reported_by_employee_id = ${emp.id}`)
            .execute();

          return {
            ...emp,
            nombreCompleto: `${emp.nombre} ${emp.apellidoPaterno} ${emp.apellidoMaterno || ""}`.trim(),
            metrics: {
              tenureMonths,
              tenureYears: (tenureMonths / 12).toFixed(1),
              evaluationsCompleted: evaluationsResult.count,
              trainingsCompleted: trainingsResult.count,
              casesReported: casesResult.count,
            },
          };
        })
      );

      return {
        employees: employeesWithMetrics,
        total: totalResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(totalResult.count / pageSize),
      };
    }),
});
