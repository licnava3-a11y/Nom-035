import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { salaryHistory, employees, departments, positions, users } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export const salaryHistoryRouter = router({
  // ── Listar historial de un empleado ──────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ employeeId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const rows = await db
        .select()
        .from(salaryHistory)
        .where(eq(salaryHistory.employeeId, input.employeeId))
        .orderBy(desc(salaryHistory.effectiveDate));
      return rows;
    }),

  // ── Obtener salario actual del empleado (desde users si tiene userId) ────
  getCurrentSalary: protectedProcedure
    .input(z.object({ employeeId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Obtener el empleado con su userId
      const [emp] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          userId: employees.userId,
          department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
          position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!emp) return null;

      // Si tiene userId, obtener salario del usuario
      let currentSalary: string | null = null;
      if (emp.userId) {
        const [usr] = await db
          .select({ salario: users.salario })
          .from(users)
          .where(eq(users.id, emp.userId))
          .limit(1);
        currentSalary = usr?.salario ?? null;
      }

      return {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        position: emp.position,
        currentSalary,
      };
    }),

  // ── Agregar registro de cambio salarial ──────────────────────────────────
  add: protectedProcedure
    .input(
      z.object({
        employeeId: z.number().int().positive(),
        previousSalary: z.number().nonnegative().optional(),
        newSalary: z.number().positive(),
        adjustmentType: z
          .enum(["annual_review", "promotion", "market_adjustment", "retention", "correction", "other"])
          .optional(),
        effectiveDate: z.string(), // ISO date string YYYY-MM-DD
        reason: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "rh" && ctx.user.role !== "recursos_humanos") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo RH/Administradores pueden registrar cambios salariales" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Obtener nombre del empleado
      const [emp] = await db
        .select({
          firstName: employees.firstName,
          lastName: employees.lastName,
          userId: employees.userId,
          department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
          position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!emp) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });

      // Calcular porcentaje de ajuste
      let adjustmentPercentage: string | null = null;
      if (input.previousSalary && input.previousSalary > 0) {
        const pct = ((input.newSalary - input.previousSalary) / input.previousSalary) * 100;
        adjustmentPercentage = pct.toFixed(2);
      }

      await (db.insert(salaryHistory) as any).values({
        employeeId: input.employeeId,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department ?? null,
        position: emp.position ?? null,
        previousSalary: input.previousSalary?.toString() ?? null,
        newSalary: input.newSalary.toString(),
        adjustmentPercentage,
        adjustmentType: input.adjustmentType ?? null,
        effectiveDate: input.effectiveDate,
        reason: input.reason ?? null,
        approvedBy: ctx.user.id,
      });

      // Si el empleado tiene userId, actualizar el salario en users
      if (emp.userId) {
        await db
          .update(users)
          .set({ salario: input.newSalary.toString() } as any)
          .where(eq(users.id, emp.userId));
      }

      return { success: true };
    }),

  // ── Eliminar registro ─────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden eliminar registros" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db.delete(salaryHistory).where(eq(salaryHistory.id, input.id));
      return { success: true };
    }),

  // ── Estadísticas de equidad salarial (NMX-025) ───────────────────────────
  equityStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

    // Obtener empleados activos con salario (via users join)
    const emps = await db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        gender: employees.gender,
        department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
        position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`,
        salario: users.salario,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .where(eq(employees.isActive, true));

    // Agrupar por puesto y calcular promedios
    const byPosition: Record<
      string,
      { puesto: string; total: number; totalSalary: number; avgSalary: number }
    > = {};

    for (const e of emps) {
      if (!e.position || !e.salario) continue;
      const sal = parseFloat(e.salario);
      if (!byPosition[e.position]) {
        byPosition[e.position] = { puesto: e.position, total: 0, totalSalary: 0, avgSalary: 0 };
      }
      byPosition[e.position].total++;
      byPosition[e.position].totalSalary += sal;
    }

    for (const key of Object.keys(byPosition)) {
      const g = byPosition[key];
      if (g.total > 0) g.avgSalary = g.totalSalary / g.total;
    }

    return {
      totalEmployees: emps.length,
      employeesWithSalary: emps.filter((e) => e.salario).length,
      byPosition: Object.values(byPosition).sort((a, b) => b.avgSalary - a.avgSalary),
    };
  }),
});
