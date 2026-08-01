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
  notifications,
  companyGeneralData,
} from "../../drizzle/schema";
import { eq, desc, sql, and, gte, lte, ne, asc, inArray } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { sendEmail } from "../_core/email";
import { emitNotificationToUser } from "../_core/websocket";

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

// ── Helper: calcular saldo de un empleado ────────────────────────────────────
async function calcEmployeeBalance(
  db: Awaited<ReturnType<typeof getDb>>,
  employeeId: number,
  table: { yearsMin: number; yearsMax: number | null; vacationDays: number }[],
  hireDate: Date | string | null
) {
  const yearsOfService = hireDate ? calcYearsOfService(hireDate) : 0;
  const earnedDays = getDaysByYears(yearsOfService, table);

  const approved = await db!
    .select({ requestedDays: vacationRequests.requestedDays })
    .from(vacationRequests)
    .where(and(eq(vacationRequests.employeeId, employeeId), eq(vacationRequests.status, "approved")));
  const usedDays = approved.reduce((sum, r) => sum + r.requestedDays, 0);

  const pending = await db!
    .select({ requestedDays: vacationRequests.requestedDays })
    .from(vacationRequests)
    .where(and(eq(vacationRequests.employeeId, employeeId), eq(vacationRequests.status, "pending")));
  const pendingDays = pending.reduce((sum, r) => sum + r.requestedDays, 0);

  return { yearsOfService, earnedDays, usedDays, pendingDays, availableDays: earnedDays - usedDays - pendingDays };
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

      const seniorityRows = await db.select().from(vacationSeniority).orderBy(vacationSeniority.yearsMin);
      const table =
        seniorityRows.length > 0
          ? seniorityRows.map((r) => ({ yearsMin: r.yearsMin, yearsMax: r.yearsMax, vacationDays: r.vacationDays }))
          : DEFAULT_LFT_TABLE;

      const balance = await calcEmployeeBalance(db, input.employeeId, table, emp.hireDate);

      return {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        position: emp.position,
        hireDate: emp.hireDate,
        ...balance,
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

      const rows = await db
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
          rejectionReason: vacationRequests.rejectionReason,
          createdAt: vacationRequests.createdAt,
        })
        .from(vacationRequests)
        .leftJoin(employees, eq(vacationRequests.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .orderBy(desc(vacationRequests.createdAt));

      if (input.status === "all") return rows;
      return rows.filter((r) => r.status === input.status);
    }),

  // ── Listar solicitudes pendientes del equipo de un supervisor ────────────
  listByManager: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().int().positive().optional(),
        status: z.enum(["pending", "approved", "rejected", "cancelled", "all"]).default("pending"),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Obtener el empleado asociado al usuario actual
      const [currentEmployee] = await db
        .select({ id: employees.id, departmentId: employees.departmentId })
        .from(employees)
        .where(eq(employees.userId, ctx.user.id))
        .limit(1);

      // Si es admin o RH, puede ver todos los departamentos
      const isAdminOrRH = ["admin", "rh", "recursos_humanos", "auxiliar_rh"].includes(ctx.user.role);

      // Construir query base
      const rows = await db
        .select({
          id: vacationRequests.id,
          employeeId: vacationRequests.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          employeeEmail: employees.email,
          department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
          departmentId: employees.departmentId,
          position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`,
          startDate: vacationRequests.startDate,
          endDate: vacationRequests.endDate,
          returnDate: vacationRequests.returnDate,
          requestedDays: vacationRequests.requestedDays,
          status: vacationRequests.status,
          notes: vacationRequests.notes,
          rejectionReason: vacationRequests.rejectionReason,
          createdAt: vacationRequests.createdAt,
        })
        .from(vacationRequests)
        .leftJoin(employees, eq(vacationRequests.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .orderBy(desc(vacationRequests.createdAt));

      // Filtrar por departamento si no es admin/RH
      let filtered = rows;
      if (!isAdminOrRH && currentEmployee?.departmentId) {
        filtered = rows.filter((r) => r.departmentId === currentEmployee.departmentId);
      } else if (input.departmentId) {
        filtered = rows.filter((r) => r.departmentId === input.departmentId);
      }

      if (input.status !== "all") {
        filtered = filtered.filter((r) => r.status === input.status);
      }

      return filtered;
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

      await notifyOwner({
        title: `Nueva solicitud de vacaciones — ${emp.firstName} ${emp.lastName}`,
        content: `${emp.firstName} ${emp.lastName} solicita ${input.requestedDays} días de vacaciones del ${input.startDate} al ${input.endDate}. Regreso: ${input.returnDate}. Saldo disponible: ${available} días.`,
      });

      // ── Detección de conflictos de ausencias simultáneas ─────────────────
      try {
        // Obtener umbral configurable desde company_general_data
        const [companyConfig] = await db.select({ conflictThreshold: companyGeneralData.conflictThreshold }).from(companyGeneralData).limit(1);
        const threshold = companyConfig?.conflictThreshold ? parseFloat(String(companyConfig.conflictThreshold)) : 30;

        // Obtener el departamento del empleado
        const [empInfo] = await db
          .select({ departmentId: employees.departmentId })
          .from(employees)
          .where(eq(employees.id, input.employeeId))
          .limit(1);

        if (empInfo?.departmentId) {
          // Contar empleados activos del departamento
          const deptEmployees = await db
            .select({ id: employees.id })
            .from(employees)
            .where(and(eq(employees.departmentId, empInfo.departmentId), eq(employees.isActive, true)));
          const totalInDept = deptEmployees.length || 1;

          // Contar cuántos están de vacaciones en el período solicitado
          const overlapping = await db
            .select({ id: vacationRequests.id })
            .from(vacationRequests)
            .leftJoin(employees, eq(vacationRequests.employeeId, employees.id))
            .where(
              and(
                eq(employees.departmentId, empInfo.departmentId),
                eq(vacationRequests.status, "approved"),
                sql`${vacationRequests.startDate} <= ${input.endDate}`,
                sql`${vacationRequests.endDate} >= ${input.startDate}`
              )
            );

          const conflictPct = ((overlapping.length + 1) / totalInDept) * 100;

          if (conflictPct >= threshold) {
            // Notificar al supervisor del departamento
            const [deptInfo] = await db
              .select({ managerId: departments.managerId, name: departments.name })
              .from(departments)
              .where(eq(departments.id, empInfo.departmentId))
              .limit(1);

            if (deptInfo?.managerId) {
              const [managerUser] = await db
                .select({ userId: employees.userId })
                .from(employees)
                .where(eq(employees.id, deptInfo.managerId))
                .limit(1);

              if (managerUser?.userId) {
                const conflictTitle = `⚠️ Conflicto de ausencias — ${deptInfo.name}`;
                const conflictMsg = `${emp.firstName} ${emp.lastName} solicita vacaciones del ${input.startDate} al ${input.endDate}. El ${conflictPct.toFixed(0)}% del departamento estará ausente (umbral: ${threshold}%). Revisa el calendario antes de aprobar.`;

                await (db.insert(notifications) as any).values({
                  userId: managerUser.userId,
                  type: "warning",
                  title: conflictTitle,
                  message: conflictMsg,
                  relatedEntityType: "vacation_conflict",
                  isRead: false,
                });

                emitNotificationToUser(managerUser.userId, {
                  id: Date.now() + 1,
                  type: "warning",
                  title: conflictTitle,
                  message: conflictMsg,
                  read: false,
                  createdAt: new Date(),
                });
              }
            }
          }
        }
      } catch (conflictError) {
        // No fallar la solicitud si la detección de conflictos falla
      }

      // ── Notificación push al supervisor/jefe del departamento ────────────
      try {
        // Obtener el departamento del empleado y su manager
        const [empDept] = await db
          .select({
            deptManagerId: departments.managerId,
            deptName: departments.name,
          })
          .from(employees)
          .leftJoin(departments, eq(employees.departmentId, departments.id))
          .where(eq(employees.id, input.employeeId))
          .limit(1);

        if (empDept?.deptManagerId) {
          // Obtener el userId del manager (empleado → usuario)
          const [managerEmployee] = await db
            .select({ userId: employees.userId })
            .from(employees)
            .where(eq(employees.id, empDept.deptManagerId))
            .limit(1);

          if (managerEmployee?.userId) {
            const notifTitle = `📋 Nueva solicitud de vacaciones`;
            const notifMsg = `${emp.firstName} ${emp.lastName} solicita ${input.requestedDays} días (${input.startDate} al ${input.endDate}). Requiere tu aprobación.`;

            // Guardar en tabla notifications
            await (db.insert(notifications) as any).values({
              userId: managerEmployee.userId,
              type: "system",
              title: notifTitle,
              message: notifMsg,
              relatedEntityType: "vacation_request",
              isRead: false,
            });

            // Emitir por WebSocket en tiempo real
            emitNotificationToUser(managerEmployee.userId, {
              id: Date.now(),
              type: "system",
              title: notifTitle,
              message: notifMsg,
              read: false,
              createdAt: new Date(),
            });
          }
        }
      } catch (notifError) {
        // No fallar la solicitud si la notificación falla
        console.error("[Vacaciones] Error enviando notificación al supervisor:", notifError);
      }

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
      const allowedRoles = ["admin", "rh", "recursos_humanos", "jefe_area", "gerente", "supervisor", "auxiliar_rh"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin permisos para aprobar/rechazar solicitudes" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Obtener datos de la solicitud y del empleado para el correo
      const [req] = await db
        .select({
          id: vacationRequests.id,
          employeeId: vacationRequests.employeeId,
          startDate: vacationRequests.startDate,
          endDate: vacationRequests.endDate,
          returnDate: vacationRequests.returnDate,
          requestedDays: vacationRequests.requestedDays,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          employeeEmail: employees.email,
        })
        .from(vacationRequests)
        .leftJoin(employees, eq(vacationRequests.employeeId, employees.id))
        .where(eq(vacationRequests.id, input.requestId))
        .limit(1);

      // Actualizar estado
      await db
        .update(vacationRequests)
        .set({
          status: input.status,
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason ?? null,
        } as any)
        .where(eq(vacationRequests.id, input.requestId));

      // Enviar correo al empleado si tiene email registrado
      if (req?.employeeEmail) {
        const isApproved = input.status === "approved";
        const statusLabel = isApproved ? "APROBADA ✅" : "RECHAZADA ❌";
        const approverName = ctx.user.name ?? "RH";

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${isApproved ? "#16a34a" : "#dc2626"};">
              Solicitud de Vacaciones ${statusLabel}
            </h2>
            <p>Estimado/a <strong>${req.employeeName}</strong>,</p>
            <p>Tu solicitud de vacaciones ha sido <strong>${isApproved ? "aprobada" : "rechazada"}</strong> por <strong>${approverName}</strong>.</p>
            <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
              <tr style="background: #f3f4f6;">
                <td style="padding: 8px 12px; font-weight: bold;">Período solicitado</td>
                <td style="padding: 8px 12px;">${req.startDate} al ${req.endDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold;">Días solicitados</td>
                <td style="padding: 8px 12px;">${req.requestedDays} días</td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 8px 12px; font-weight: bold;">Fecha de regreso</td>
                <td style="padding: 8px 12px;">${req.returnDate}</td>
              </tr>
              ${!isApproved && input.rejectionReason ? `
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #dc2626;">Motivo de rechazo</td>
                <td style="padding: 8px 12px; color: #dc2626;">${input.rejectionReason}</td>
              </tr>` : ""}
            </table>
            ${isApproved ? `<p style="color: #16a34a;">¡Disfruta tus vacaciones! 🌴</p>` : `<p>Si tienes dudas, comunícate con el área de Recursos Humanos.</p>`}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="color: #6b7280; font-size: 12px;">Este es un mensaje automático del sistema de gestión de RH. No responder a este correo.</p>
          </div>
        `;

        await sendEmail({
          to: req.employeeEmail,
          subject: `Solicitud de Vacaciones ${statusLabel} — ${req.startDate} al ${req.endDate}`,
          html: emailHtml,
          text: `Tu solicitud de vacaciones del ${req.startDate} al ${req.endDate} (${req.requestedDays} días) ha sido ${isApproved ? "aprobada" : "rechazada"} por ${approverName}.${!isApproved && input.rejectionReason ? ` Motivo: ${input.rejectionReason}` : ""}`,
        });
      }

      // ── Notificación push WebSocket al empleado (simétrica al push al supervisor) ──
      try {
        // Obtener el userId del empleado
        const [empUser] = await db
          .select({ userId: employees.userId })
          .from(employees)
          .where(eq(employees.id, req.employeeId))
          .limit(1);

        if (empUser?.userId) {
          const isApproved = input.status === "approved";
          const notifTitle = isApproved
            ? "✅ Vacaciones aprobadas"
            : "❌ Solicitud de vacaciones rechazada";
          const notifContent = isApproved
            ? `Tu solicitud del ${req.startDate} al ${req.endDate} (${req.requestedDays} días) fue aprobada.`
            : `Tu solicitud del ${req.startDate} al ${req.endDate} fue rechazada.${input.rejectionReason ? ` Motivo: ${input.rejectionReason}` : ""}`;

          // Guardar en tabla notifications
          await (db.insert(notifications) as any).values({
            userId: empUser.userId,
            title: notifTitle,
            message: notifContent,
            type: "vacation",
            isRead: false,
            createdAt: new Date(),
          });

          // Emitir en tiempo real
          emitNotificationToUser(empUser.userId, {
            id: 0,
            title: notifTitle,
            message: notifContent,
            type: "vacation",
            read: false,
            createdAt: new Date(),
          });
        }
      } catch (_e) {
        // No bloquear la respuesta si falla la notificación push
      }

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

  // ── Reporte de saldo de vacaciones por departamento ───────────────────────
  getBalanceReport: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const allowedRoles = ["admin", "rh", "recursos_humanos", "auxiliar_rh", "gerente", "jefe_area", "supervisor"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin permisos para ver el reporte de saldos" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Obtener tabla de antigüedad
      const seniorityRows = await db.select().from(vacationSeniority).orderBy(vacationSeniority.yearsMin);
      const table =
        seniorityRows.length > 0
          ? seniorityRows.map((r) => ({ yearsMin: r.yearsMin, yearsMax: r.yearsMax, vacationDays: r.vacationDays }))
          : DEFAULT_LFT_TABLE;

      // Obtener todos los empleados activos con su departamento
      const empQuery = db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          hireDate: employees.hireDate,
          departmentId: employees.departmentId,
          departmentName: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
          positionTitle: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.isActive, true));

      const allEmployees = await empQuery;

      // Filtrar por departamento si se especifica
      const filtered = input.departmentId
        ? allEmployees.filter((e) => e.departmentId === input.departmentId)
        : allEmployees;

      // Calcular saldo para todos los empleados en 2 queries en lugar de 2N (evita N+1)
      const filteredIds = filtered.map(e => e.id);
      const allVacReqs = filteredIds.length > 0
        ? await db!.select({ employeeId: vacationRequests.employeeId, requestedDays: vacationRequests.requestedDays, status: vacationRequests.status })
            .from(vacationRequests)
            .where(and(inArray(vacationRequests.employeeId, filteredIds), sql`${vacationRequests.status} IN ('approved','pending')`))
        : [];
      const usedMap = new Map<number, number>();
      const pendingMap = new Map<number, number>();
      allVacReqs.forEach(r => {
        if (r.status === 'approved') usedMap.set(r.employeeId, (usedMap.get(r.employeeId) ?? 0) + r.requestedDays);
        if (r.status === 'pending') pendingMap.set(r.employeeId, (pendingMap.get(r.employeeId) ?? 0) + r.requestedDays);
      });
      const report = filtered.map(emp => {
        const yearsOfService = emp.hireDate ? calcYearsOfService(emp.hireDate) : 0;
        const earnedDays = getDaysByYears(yearsOfService, table);
        const usedDays = usedMap.get(emp.id) ?? 0;
        const pendingDays = pendingMap.get(emp.id) ?? 0;
        return {
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          department: emp.departmentName,
          position: emp.positionTitle,
          hireDate: emp.hireDate,
          yearsOfService,
          earnedDays,
          usedDays,
          pendingDays,
          availableDays: earnedDays - usedDays - pendingDays,
        };
      });

      // Ordenar por departamento y nombre
      report.sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));

      return report;
    }),

  // ── Calendario de vacaciones aprobadas por mes/departamento ────────────────
  getCalendar: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2030),
        month: z.number().int().min(1).max(12),
        departmentId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Primer y último día del mes
      const firstDay = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
      const lastDayDate = new Date(input.year, input.month, 0);
      const lastDay = `${input.year}-${String(input.month).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

      // Obtener solicitudes aprobadas y pendientes que se solapan con el mes
      const rows = await db
        .select({
          id: vacationRequests.id,
          employeeId: vacationRequests.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
          departmentId: employees.departmentId,
          startDate: vacationRequests.startDate,
          endDate: vacationRequests.endDate,
          requestedDays: vacationRequests.requestedDays,
          status: vacationRequests.status,
        })
        .from(vacationRequests)
        .leftJoin(employees, eq(vacationRequests.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(
          and(
            // Solicitudes que se solapan con el mes: startDate <= lastDay AND endDate >= firstDay
            sql`${vacationRequests.startDate} <= ${lastDay}`,
            sql`${vacationRequests.endDate} >= ${firstDay}`,
            // Solo aprobadas y pendientes
            sql`${vacationRequests.status} IN ('approved', 'pending')`
          )
        )
        .orderBy(asc(employees.departmentId), asc(vacationRequests.startDate));

      // Filtrar por departamento si se especifica
      const filtered = input.departmentId
        ? rows.filter((r) => r.departmentId === input.departmentId)
        : rows;

      return {
        year: input.year,
        month: input.month,
        daysInMonth: lastDayDate.getDate(),
        entries: filtered,
      };
    }),
});
