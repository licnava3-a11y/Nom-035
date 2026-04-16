import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  vacationRequests,
  vacationSeniority,
  employees,
  departments,
  positions,
  users,
} from "../../drizzle/schema";
import { eq, desc, sql, and, gte, lte, ne } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ── Tabla LFT por defecto ────────────────────────────────────────────────────
const DEFAULT_LFT_TABLE = [
  { yearsMin: 1, yearsMax: 1, vacationDays: 12 },
  { yearsMin: 2, yearsMax: 2, vacationDays: 14 },
  { yearsMin: 3, yearsMax: 3, vacationDays: 16 },
  { yearsMin: 4, yearsMax: 4, vacationDays: 18 },
  { yearsMin: 5, yearsMax: 9, vacationDays: 20 },
  { yearsMin: 10, yearsMax: 14, vacationDays: 22 },
  { yearsMin: 15, yearsMax: 19, vacationDays: 24 },
  { yearsMin: 20, yearsMax: 24, vacationDays: 26 },
  { yearsMin: 25, yearsMax: null, vacationDays: 28 },
];

// ── Calcular días disponibles por LFT ────────────────────────────────────────
function getDaysByYears(years: number, table: { yearsMin: number; yearsMax: number | null; vacationDays: number }[]): number {
  for (const row of table) {
    if (years >= row.yearsMin && (row.yearsMax === null || years <= row.yearsMax)) {
      return row.vacationDays;
    }
  }
  return 0;
}

function calcYearsOfService(hireDate: Date | string): number {
  const hire = new Date(hireDate);
  const now = new Date();
  let years = now.getFullYear() - hire.getFullYear();
  const monthDiff = now.getMonth() - hire.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < hire.getDate())) {
    years--;
  }
  return Math.max(0, years);
}

export const vacationsRouter = router({
  // ── Obtener tabla de antigüedad (LFT o personalizada) ────────────────────
  getSeniorityTable: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return DEFAULT_LFT_TABLE;
    const rows = await db.select().from(vacationSeniority).orderBy(vacationSeniority.yearsMin);
    if (rows.length === 0) return DEFAULT_LFT_TABLE;
    return rows.map((r) => ({ yearsMin: r.yearsMin, yearsMax: r.yearsMax, vacationDays: r.vacationDays }));
  }),

  // ── Actualizar tabla de antigüedad ────────────────────────────────────────
  updateSeniorityTable: protectedProcedure
    .input(
      z.array(
        z.object({
          yearsMin: z.number().int().nonnegative(),
          yearsMax: z.number().int().positive().nullable(),
          vacationDays: z.number().int().positive(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden modificar la tabla de antigüedad" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db.delete(vacationSeniority);
      for (const row of input) {
        await (db.insert(vacationSeniority) as any).values(row);
      }
      return { success: true };
    }),

  // ── Calcular saldo de vacaciones de un empleado ───────────────────────────
  getBalance: protectedProcedure
    .input(z.object({ employeeId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [emp] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          hireDate: employees.hireDate,
          department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
          position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!emp) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });

      // Calcular antigüedad
      const yearsOfService = emp.hireDate ? calcYearsOfService(emp.hireDate) : 0;

      // Obtener tabla de antigüedad
      const seniorityRows = await db.select().from(vacationSeniority).orderBy(vacationSeniority.yearsMin);
      const table =
        seniorityRows.length > 0
          ? seniorityRows.map((r) => ({ yearsMin: r.yearsMin, yearsMax: r.yearsMax, vacationDays: r.vacationDays }))
          : DEFAULT_LFT_TABLE;

      const earnedDays = getDaysByYears(yearsOfService, table);

      // Días usados (solicitudes aprobadas)
      const approved = await db
        .select({ requestedDays: vacationRequests.requestedDays })
        .from(vacationRequests)
        .where(
          and(
            eq(vacationRequests.employeeId, input.employeeId),
            eq(vacationRequests.status, "approved")
          )
        );
      const usedDays = approved.reduce((sum, r) => sum + r.requestedDays, 0);

      // Días pendientes (solicitudes en espera)
      const pending = await db
        .select({ requestedDays: vacationRequests.requestedDays })
        .from(vacationRequests)
        .where(
          and(
            eq(vacationRequests.employeeId, input.employeeId),
            eq(vacationRequests.status, "pending")
          )
        );
      const pendingDays = pending.reduce((sum, r) => sum + r.requestedDays, 0);

      return {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        position: emp.position,
        hireDate: emp.hireDate,
        yearsOfService,
        earnedDays,
        usedDays,
        pendingDays,
        availableDays: earnedDays - usedDays - pendingDays,
      };
    }),

  // ── Listar solicitudes de vacaciones de un empleado ───────────────────────
  list: protectedProcedure
    .input(z.object({ employeeId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const rows = await db
        .select()
        .from(vacationRequests)
        .where(eq(vacationRequests.employeeId, input.employeeId))
        .orderBy(desc(vacationRequests.createdAt));
      return rows;
    }),

  // ── Listar todas las solicitudes (para RH/Admin) ──────────────────────────
  listAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "cancelled", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const query = db
        .select({
          id: vacationRequests.id,
          employeeId: vacationRequests.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
          startDate: vacationRequests.startDate,
          endDate: vacationRequests.endDate,
          returnDate: vacationRequests.returnDate,
          requestedDays: vacationRequests.requestedDays,
          status: vacationRequests.status,
          notes: vacationRequests.notes,
          createdAt: vacationRequests.createdAt,
        })
        .from(vacationRequests)
        .leftJoin(employees, eq(vacationRequests.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .orderBy(desc(vacationRequests.createdAt));

      const rows = await query;
      if (input.status === "all") return rows;
      return rows.filter((r) => r.status === input.status);
    }),

  // ── Crear solicitud de vacaciones ─────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        employeeId: z.number().int().positive(),
        startDate: z.string(),
        endDate: z.string(),
        returnDate: z.string(),
        requestedDays: z.number().int().positive(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Verificar saldo disponible
      const [emp] = await db
        .select({ hireDate: employees.hireDate, firstName: employees.firstName, lastName: employees.lastName })
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);
      if (!emp) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });

      const yearsOfService = emp.hireDate ? calcYearsOfService(emp.hireDate) : 0;
      const seniorityRows = await db.select().from(vacationSeniority).orderBy(vacationSeniority.yearsMin);
      const table =
        seniorityRows.length > 0
          ? seniorityRows.map((r) => ({ yearsMin: r.yearsMin, yearsMax: r.yearsMax, vacationDays: r.vacationDays }))
          : DEFAULT_LFT_TABLE;
      const earnedDays = getDaysByYears(yearsOfService, table);

      const approved = await db
        .select({ requestedDays: vacationRequests.requestedDays })
        .from(vacationRequests)
        .where(and(eq(vacationRequests.employeeId, input.employeeId), eq(vacationRequests.status, "approved")));
      const usedDays = approved.reduce((sum, r) => sum + r.requestedDays, 0);

      const pending = await db
        .select({ requestedDays: vacationRequests.requestedDays })
        .from(vacationRequests)
        .where(and(eq(vacationRequests.employeeId, input.employeeId), eq(vacationRequests.status, "pending")));
      const pendingDays = pending.reduce((sum, r) => sum + r.requestedDays, 0);

      const available = earnedDays - usedDays - pendingDays;
      if (input.requestedDays > available) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Saldo insuficiente. Días disponibles: ${available}, solicitados: ${input.requestedDays}`,
        });
      }

      await (db.insert(vacationRequests) as any).values({
        employeeId: input.employeeId,
        startDate: input.startDate,
        endDate: input.endDate,
        returnDate: input.returnDate,
        requestedDays: input.requestedDays,
        notes: input.notes ?? null,
        availableDaysAtRequest: available,
        status: "pending",
      });

      // Notificar al owner (RH)
      await notifyOwner({
        title: `Nueva solicitud de vacaciones — ${emp.firstName} ${emp.lastName}`,
        content: `${emp.firstName} ${emp.lastName} solicita ${input.requestedDays} días de vacaciones del ${input.startDate} al ${input.endDate}. Regreso: ${input.returnDate}. Saldo disponible: ${available} días.`,
      });

      return { success: true };
    }),

  // ── Aprobar / Rechazar solicitud ──────────────────────────────────────────
  updateStatus: protectedProcedure
    .input(
      z.object({
        requestId: z.number().int().positive(),
        status: z.enum(["approved", "rejected", "cancelled"]),
        rejectionReason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "rh" && ctx.user.role !== "recursos_humanos" && ctx.user.role !== "jefe_area") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin permisos para aprobar/rechazar solicitudes" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      await db
        .update(vacationRequests)
        .set({
          status: input.status,
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason ?? null,
        } as any)
        .where(eq(vacationRequests.id, input.requestId));

      return { success: true };
    }),

  // ── Cancelar solicitud propia ─────────────────────────────────────────────
  cancel: protectedProcedure
    .input(z.object({ requestId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db
        .update(vacationRequests)
        .set({ status: "cancelled" } as any)
        .where(and(eq(vacationRequests.id, input.requestId), eq(vacationRequests.status, "pending")));
      return { success: true };
    }),
});
