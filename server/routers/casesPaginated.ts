/**
 * Router de casos con paginación optimizada
 * Reemplaza queries sin límites por versiones paginadas
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cases } from "../../drizzle/schema";
import { and, eq, or, desc, sql, gte, lte } from "drizzle-orm";
import { normalizePaginationParams, calculatePagination } from "../utils/pagination";

export const casesPaginatedRouter = router({
  /**
   * Listar casos con paginación y filtros
   */
  listPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(100).optional(),
        status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        caseType: z.enum(["mobbing", "burnout", "violence", "stress", "other"]).optional(),
        departmentId: z.number().optional(),
        assignedTo: z.number().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, pageSize, offset } = normalizePaginationParams({
        page: input.page,
        pageSize: input.pageSize,
      });

      // Construir condiciones WHERE
      const conditions = [];

      if (input.status) {
        conditions.push(sql`${cases.status} = ${input.status}`);
      }

      if (input.priority) {
        conditions.push(sql`${cases.priority} = ${input.priority}`);
      }

      if (input.caseType) {
        conditions.push(sql`${cases.caseType} = ${input.caseType}`);
      }

      if (input.departmentId) {
        conditions.push(eq(cases.departmentId, input.departmentId));
      }

      if (input.assignedTo) {
        conditions.push(eq(cases.assignedTo, input.assignedTo));
      }

      if (input.search) {
        conditions.push(
          sql`(${cases.description} LIKE ${`%${input.search}%`} OR ${cases.description} LIKE ${`%${input.search}%`})`
        );
      }

      if (input.dateFrom) {
        conditions.push(gte(cases.createdAt, new Date(input.dateFrom)));
      }

      if (input.dateTo) {
        conditions.push(lte(cases.createdAt, new Date(input.dateTo)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Ejecutar queries en paralelo
      const [casesList, totalCount] = await Promise.all([
        db
          .select()
          .from(cases)
          .where(whereClause)
          .orderBy(desc(cases.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(cases)
          .where(whereClause)
          .then((r) => r[0]?.count || 0),
      ]);

      const pagination = calculatePagination(page, pageSize, totalCount);

      return {
        cases: casesList,
        pagination,
      };
    }),

  /**
   * Listar casos abiertos (optimizado para dashboard)
   */
  listOpen: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(50).optional().default(10),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, pageSize, offset } = normalizePaginationParams({
        page: input.page,
        pageSize: input.pageSize,
      });

      const conditions = [sql`${cases.status} = 'open'`];

      if (input.priority) {
        conditions.push(sql`${cases.priority} = ${input.priority}`);
      }

      const whereClause = and(...conditions);

      const [casesList, totalCount] = await Promise.all([
        db
          .select()
          .from(cases)
          .where(whereClause)
          .orderBy(desc(cases.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(cases)
          .where(whereClause)
          .then((r) => r[0]?.count || 0),
      ]);

      const pagination = calculatePagination(page, pageSize, totalCount);

      return {
        cases: casesList,
        pagination,
      };
    }),

  /**
   * Listar casos críticos (optimizado para alertas)
   */
  listCritical: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(50).optional().default(20),
        statusFilter: z.enum(["open", "investigating", "all"]).optional().default("open"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, pageSize, offset } = normalizePaginationParams({
        page: input.page,
        pageSize: input.pageSize,
      });

      const conditions = [sql`${cases.priority} = 'critical'`];

      if (input.statusFilter !== "all") {
        conditions.push(sql`${cases.status} = ${input.statusFilter}`);
      }

      const whereClause = and(...conditions);

      const [casesList, totalCount] = await Promise.all([
        db
          .select()
          .from(cases)
          .where(whereClause)
          .orderBy(desc(cases.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(cases)
          .where(whereClause)
          .then((r) => r[0]?.count || 0),
      ]);

      const pagination = calculatePagination(page, pageSize, totalCount);

      return {
        cases: casesList,
        pagination,
      };
    }),

  /**
   * Estadísticas de casos (sin paginación, solo conteos)
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [
      totalCases,
      openCases,
      investigatingCases,
      resolvedCases,
      closedCases,
      criticalCases,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(cases).then((r) => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)` }).from(cases).where(sql`${cases.status} = 'open'`).then((r) => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)` }).from(cases).where(sql`${cases.status} = 'investigating'`).then((r) => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)` }).from(cases).where(sql`${cases.status} = 'resolved'`).then((r) => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)` }).from(cases).where(sql`${cases.status} = 'closed'`).then((r) => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)` }).from(cases).where(sql`${cases.priority} = 'critical'`).then((r) => r[0]?.count || 0),
    ]);

    return {
      total: totalCases,
      open: openCases,
      investigating: investigatingCases,
      resolved: resolvedCases,
      closed: closedCases,
      critical: criticalCases,
    };
  }),
});
