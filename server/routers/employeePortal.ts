import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  employeePortalTokens,
  employees,
  departments,
  positions,
  trainingAssignments,
  committeeTrainings,
  vacationRequests,
} from "../../drizzle/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { sendEmail } from "../_core/email";
import { TRPCError } from "@trpc/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePortalToken(): string {
  return randomBytes(48).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 64);
}

const APP_BASE_URL =
  process.env.VITE_APP_URL ||
  process.env.APP_BASE_URL ||
  "https://3000-irhc8l8rzz9yghoyml0s2-7e84b2a0.us2.manus.computer";

// ─── Router ───────────────────────────────────────────────────────────────────

export const employeePortalRouter = router({
  /**
   * Genera un token de acceso al portal para un empleado y envía el enlace por correo.
   * Solo administradores pueden generar tokens.
   */
  generateAccessToken: protectedProcedure
    .input(
      z.object({
        employeeId: z.number().int().positive(),
        sendEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden generar tokens de acceso." });
      }
      const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Obtener datos del empleado
      const [emp] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!emp) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado." });
      if (!emp.email) throw new TRPCError({ code: "BAD_REQUEST", message: "El empleado no tiene correo registrado." });

      // Invalidar tokens anteriores activos
      await db
        .update(employeePortalTokens)
        .set({ isActive: false })
        .where(
          and(
            eq(employeePortalTokens.employeeId, input.employeeId),
            eq(employeePortalTokens.isActive, true)
          )
        );

      // Crear nuevo token (expira en 7 días)
      const token = generatePortalToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.insert(employeePortalTokens).values({
        token,
        employeeId: emp.id,
        employeeEmail: emp.email,
        expiresAt,
        isActive: true,
      });

      const portalUrl = `${APP_BASE_URL}/employee-portal/${token}`;

      // Enviar correo si se solicita
      if (input.sendEmail) {
        await sendEmail({
          to: emp.email,
          subject: "Acceso a tu Portal del Empleado — NOM-035",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:8px;">
              <div style="background:#1e3a5f;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
                <h2 style="margin:0;">Portal del Empleado</h2>
                <p style="margin:4px 0;opacity:0.8;font-size:13px;">Plataforma NOM-035 STPS</p>
              </div>
              <div style="background:white;padding:24px;border-radius:0 0 8px 8px;">
                <p>Hola <strong>${emp.firstName} ${emp.lastName}</strong>,</p>
                <p>Se ha generado un enlace de acceso personalizado a tu <strong>Portal del Empleado</strong>. Desde ahí podrás consultar:</p>
                <ul style="color:#374151;line-height:1.8;">
                  <li>📋 Tus encuestas NOM-035 pendientes</li>
                  <li>📚 Cursos asignados y progreso de capacitación</li>
                  <li>🏖️ Saldo y solicitudes de vacaciones</li>
                  <li>📄 Documentos firmados y recibidos</li>
                </ul>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${portalUrl}" style="background:#1e3a5f;color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
                    Acceder a mi Portal
                  </a>
                </div>
                <p style="font-size:12px;color:#6b7280;">
                  Este enlace es personal e intransferible. Expira el <strong>${expiresAt.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</strong>.<br/>
                  Si no solicitaste este acceso, ignora este correo.
                </p>
              </div>
            </div>
          `,
        });
      }

      return { token, portalUrl, expiresAt: expiresAt.toISOString(), employeeName: `${emp.firstName} ${emp.lastName}` };
    }),

  /**
   * Valida un token de acceso y retorna los datos del empleado para el portal.
   * Endpoint público (sin autenticación Manus).
   */
  validateToken: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const now = new Date();

      const [tokenRow] = await db
        .select()
        .from(employeePortalTokens)
        .where(
          and(
            eq(employeePortalTokens.token, input.token),
            eq(employeePortalTokens.isActive, true),
            gt(employeePortalTokens.expiresAt, now)
          )
        )
        .limit(1);

      if (!tokenRow) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Enlace inválido o expirado." });
      }

      // Obtener datos completos del empleado
      const [emp] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          employeeNumber: employees.employeeNumber,
          hireDate: employees.hireDate,
          departmentName: departments.name,
          positionName: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.id, tokenRow.employeeId))
        .limit(1);

      if (!emp) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado." });

      return {
        valid: true,
        employee: emp,
        expiresAt: tokenRow.expiresAt.toISOString(),
      };
    }),

  /**
   * Retorna los cursos asignados al empleado con su progreso.
   */
  getEmployeeCourses: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const now = new Date();

      const [tokenRow] = await db
        .select({ employeeId: employeePortalTokens.employeeId })
        .from(employeePortalTokens)
        .where(
          and(
            eq(employeePortalTokens.token, input.token),
            eq(employeePortalTokens.isActive, true),
            gt(employeePortalTokens.expiresAt, now)
          )
        )
        .limit(1);

      if (!tokenRow) throw new TRPCError({ code: "UNAUTHORIZED", message: "Token inválido." });

      // Obtener userId del empleado
      const [emp] = await db
        .select({ userId: employees.userId })
        .from(employees)
        .where(eq(employees.id, tokenRow.employeeId))
        .limit(1);

      if (!emp?.userId) return { courses: [] };

      // Usar trainingAssignments para obtener cursos asignados al empleado
      const assignedCourses = await db
        .select({
          assignmentId: trainingAssignments.id,
          trainingId: trainingAssignments.trainingId,
          trainingTitle: committeeTrainings.title,
          status: trainingAssignments.status,
          score: trainingAssignments.score,
          completionDate: trainingAssignments.completionDate,
          assignedDate: trainingAssignments.assignedDate,
        })
        .from(trainingAssignments)
        .innerJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .where(eq(trainingAssignments.committeeMemberId, emp.userId))
        .orderBy(desc(trainingAssignments.assignedDate))
        .limit(20);

      return { courses: assignedCourses };
    }),

  /**
   * Retorna las solicitudes de vacaciones del empleado.
   */
  getEmployeeVacations: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const now = new Date();

      const [tokenRow] = await db
        .select({ employeeId: employeePortalTokens.employeeId })
        .from(employeePortalTokens)
        .where(
          and(
            eq(employeePortalTokens.token, input.token),
            eq(employeePortalTokens.isActive, true),
            gt(employeePortalTokens.expiresAt, now)
          )
        )
        .limit(1);

      if (!tokenRow) throw new TRPCError({ code: "UNAUTHORIZED", message: "Token inválido." });

      const vacations = await db
        .select()
        .from(vacationRequests)
        .where(eq(vacationRequests.employeeId, tokenRow.employeeId))
        .orderBy(desc(vacationRequests.startDate))
        .limit(20);

      return { vacations };
    }),

  /**
   * Lista los tokens activos generados para un empleado (solo admin).
   */
  listTokens: protectedProcedure
    .input(z.object({ employeeId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const tokens = await db
        .select({
          id: employeePortalTokens.id,
          token: employeePortalTokens.token,
          expiresAt: employeePortalTokens.expiresAt,
          usedAt: employeePortalTokens.usedAt,
          isActive: employeePortalTokens.isActive,
          createdAt: employeePortalTokens.createdAt,
        })
        .from(employeePortalTokens)
        .where(eq(employeePortalTokens.employeeId, input.employeeId))
        .orderBy(desc(employeePortalTokens.createdAt))
        .limit(10);
      return { tokens };
    }),

  /**
   * Revoca todos los tokens activos de un empleado (solo admin).
   */
  revokeTokens: protectedProcedure
    .input(z.object({ employeeId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db
        .update(employeePortalTokens)
        .set({ isActive: false })
        .where(
          and(
            eq(employeePortalTokens.employeeId, input.employeeId),
            eq(employeePortalTokens.isActive, true)
          )
        );
      return { success: true };
    }),
});
