/**
 * Router para gestión y visualización de violaciones CSRF
 * Solo accesible para administradores
 */

import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { csrfViolations } from "../../drizzle/schema";
import { desc, eq, gte, lte, and, sql } from "drizzle-orm";

export const csrfViolationsRouter = router({
  /**
   * Obtener lista de violaciones CSRF con paginación y filtros
   */
  getViolations: adminProcedure
    .input(
      z.object({
        // Paginación
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),

        // Filtros opcionales
        ipAddress: z.string().optional(),
        userId: z.string().optional(),
        reason: z
          .enum([
            "missing_token",
            "invalid_token",
            "expired_token",
            "user_mismatch",
            "malformed_token",
          ])
          .optional(),

        // Rango de fechas
        startDate: z.string().datetime().optional(), // ISO 8601
        endDate: z.string().datetime().optional(), // ISO 8601
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const { page, pageSize, ipAddress, userId, reason, startDate, endDate } =
        input;
      const offset = (page - 1) * pageSize;

      // Construir filtros dinámicamente
      const filters = [];

      if (ipAddress) {
        filters.push(eq(csrfViolations.ipAddress, ipAddress));
      }

      if (userId) {
        filters.push(eq(csrfViolations.userId, userId));
      }

      if (reason) {
        filters.push(eq(csrfViolations.reason, reason));
      }

      if (startDate) {
        filters.push(gte(csrfViolations.attemptedAt, new Date(startDate)));
      }

      if (endDate) {
        filters.push(lte(csrfViolations.attemptedAt, new Date(endDate)));
      }

      // Obtener violaciones con filtros
      const violations = await db
        .select()
        .from(csrfViolations)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(csrfViolations.attemptedAt))
        .limit(pageSize)
        .offset(offset);

      // Contar total de registros
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(csrfViolations)
        .where(filters.length > 0 ? and(...filters) : undefined);

      return {
        violations,
        pagination: {
          page,
          pageSize,
          totalCount: Number(count),
          totalPages: Math.ceil(Number(count) / pageSize),
        },
      };
    }),

  /**
   * Obtener estadísticas de violaciones CSRF
   */
  getStatistics: adminProcedure
    .input(
      z.object({
        // Rango de fechas para estadísticas
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const { startDate, endDate } = input;

      // Construir filtros de fecha
      const dateFilters = [];
      if (startDate) {
        dateFilters.push(gte(csrfViolations.attemptedAt, new Date(startDate)));
      }
      if (endDate) {
        dateFilters.push(lte(csrfViolations.attemptedAt, new Date(endDate)));
      }

      // Total de violaciones
      const [{ totalViolations }] = await db
        .select({ totalViolations: sql<number>`count(*)` })
        .from(csrfViolations)
        .where(dateFilters.length > 0 ? and(...dateFilters) : undefined);

      // Violaciones por razón
      const violationsByReason = await db
        .select({
          reason: csrfViolations.reason,
          count: sql<number>`count(*)`,
        })
        .from(csrfViolations)
        .where(dateFilters.length > 0 ? and(...dateFilters) : undefined)
        .groupBy(csrfViolations.reason);

      // Top 10 IPs con más intentos fallidos
      const topAttackerIPs = await db
        .select({
          ipAddress: csrfViolations.ipAddress,
          count: sql<number>`count(*)`,
          lastAttempt: sql<Date>`MAX(${csrfViolations.attemptedAt})`,
        })
        .from(csrfViolations)
        .where(dateFilters.length > 0 ? and(...dateFilters) : undefined)
        .groupBy(csrfViolations.ipAddress)
        .orderBy(sql`count(*) DESC`)
        .limit(10);

      // Endpoints más atacados
      const topTargetedEndpoints = await db
        .select({
          endpoint: csrfViolations.endpoint,
          count: sql<number>`count(*)`,
        })
        .from(csrfViolations)
        .where(dateFilters.length > 0 ? and(...dateFilters) : undefined)
        .groupBy(csrfViolations.endpoint)
        .orderBy(sql`count(*) DESC`)
        .limit(10);

      return {
        totalViolations: Number(totalViolations),
        violationsByReason: violationsByReason.map(v => ({
          reason: v.reason,
          count: Number(v.count),
        })),
        topAttackerIPs: topAttackerIPs.map(ip => ({
          ipAddress: ip.ipAddress,
          count: Number(ip.count),
          lastAttempt: ip.lastAttempt,
        })),
        topTargetedEndpoints: topTargetedEndpoints.map(e => ({
          endpoint: e.endpoint || "unknown",
          count: Number(e.count),
        })),
      };
    }),

  /**
   * Obtener violaciones recientes (últimas 24 horas)
   */
  getRecentViolations: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentViolations = await db
        .select()
        .from(csrfViolations)
        .where(gte(csrfViolations.attemptedAt, twentyFourHoursAgo))
        .orderBy(desc(csrfViolations.attemptedAt))
        .limit(input.limit);

      return {
        violations: recentViolations,
        count: recentViolations.length,
      };
    }),
});
