/**
 * Router de encuestas con paginación optimizada
 * Reemplaza queries sin límites por versiones paginadas
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { surveys, surveyResponses } from "../../drizzle/schema";
import { and, eq, desc, sql, gte, lte } from "drizzle-orm";
import {
  normalizePaginationParams,
  calculatePagination,
} from "../utils/pagination";

export const surveysPaginatedRouter = router({
  /**
   * Listar encuestas con paginación y filtros
   */
  listPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(100).optional(),
        status: z.enum(["draft", "active", "closed", "archived"]).optional(),
        type: z.enum(["guia_i", "guia_ii", "guia_iii"]).optional(),
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
        conditions.push(sql`${surveys.status} = ${input.status}`);
      }

      if (input.type) {
        conditions.push(sql`${surveys.type} = ${input.type}`);
      }

      if (input.search) {
        conditions.push(
          sql`(${surveys.title} LIKE ${`%${input.search}%`} OR ${surveys.description} LIKE ${`%${input.search}%`})`
        );
      }

      if (input.dateFrom) {
        conditions.push(gte(surveys.createdAt, new Date(input.dateFrom)));
      }

      if (input.dateTo) {
        conditions.push(lte(surveys.createdAt, new Date(input.dateTo)));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Ejecutar queries en paralelo
      const [surveysList, totalCount] = await Promise.all([
        db
          .select()
          .from(surveys)
          .where(whereClause)
          .orderBy(desc(surveys.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(surveys)
          .where(whereClause)
          .then(r => r[0]?.count || 0),
      ]);

      const pagination = calculatePagination(page, pageSize, totalCount);

      return {
        surveys: surveysList,
        pagination,
      };
    }),

  /**
   * Listar encuestas activas (optimizado para dashboard)
   */
  listActive: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(50).optional().default(10),
        type: z.enum(["guia_i", "guia_ii", "guia_iii"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, pageSize, offset } = normalizePaginationParams({
        page: input.page,
        pageSize: input.pageSize,
      });

      const conditions = [sql`${surveys.status} = 'active'`];

      if (input.type) {
        conditions.push(sql`${surveys.type} = ${input.type}`);
      }

      const whereClause = and(...conditions);

      const [surveysList, totalCount] = await Promise.all([
        db
          .select()
          .from(surveys)
          .where(whereClause)
          .orderBy(desc(surveys.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(surveys)
          .where(whereClause)
          .then(r => r[0]?.count || 0),
      ]);

      const pagination = calculatePagination(page, pageSize, totalCount);

      return {
        surveys: surveysList,
        pagination,
      };
    }),

  /**
   * Listar encuestas con estadísticas de respuestas
   */
  listWithStats: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(50).optional().default(20),
        status: z.enum(["draft", "active", "closed", "archived"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, pageSize, offset } = normalizePaginationParams({
        page: input.page,
        pageSize: input.pageSize,
      });

      const conditions = [];

      if (input.status) {
        conditions.push(sql`${surveys.status} = ${input.status}`);
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Obtener encuestas con conteo de respuestas
      const [surveysList, totalCount] = await Promise.all([
        db
          .select({
            id: surveys.id,
            title: surveys.title,
            description: surveys.description,
            type: surveys.type,
            status: surveys.status,
            createdAt: surveys.createdAt,
            updatedAt: surveys.updatedAt,
            responseCount: sql<number>`(SELECT COUNT(*) FROM ${surveyResponses} WHERE ${surveyResponses.surveyId} = ${surveys.id})`,
          })
          .from(surveys)
          .where(whereClause)
          .orderBy(desc(surveys.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(surveys)
          .where(whereClause)
          .then(r => r[0]?.count || 0),
      ]);

      const pagination = calculatePagination(page, pageSize, totalCount);

      return {
        surveys: surveysList,
        pagination,
      };
    }),

  /**
   * Estadísticas de encuestas (sin paginación, solo conteos)
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [
      totalSurveys,
      activeSurveys,
      closedSurveys,
      guiaISurveys,
      guiaIISurveys,
      guiaIIISurveys,
      totalResponses,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(surveys)
        .then(r => r[0]?.count || 0),
      db
        .select({ count: sql<number>`count(*)` })
        .from(surveys)
        .where(sql`${surveys.status} = 'active'`)
        .then(r => r[0]?.count || 0),
      db
        .select({ count: sql<number>`count(*)` })
        .from(surveys)
        .where(sql`${surveys.status} = 'closed'`)
        .then(r => r[0]?.count || 0),
      db
        .select({ count: sql<number>`count(*)` })
        .from(surveys)
        .where(sql`${surveys.type} = 'guia_i'`)
        .then(r => r[0]?.count || 0),
      db
        .select({ count: sql<number>`count(*)` })
        .from(surveys)
        .where(sql`${surveys.type} = 'guia_ii'`)
        .then(r => r[0]?.count || 0),
      db
        .select({ count: sql<number>`count(*)` })
        .from(surveys)
        .where(sql`${surveys.type} = 'guia_iii'`)
        .then(r => r[0]?.count || 0),
      db
        .select({ count: sql<number>`count(*)` })
        .from(surveyResponses)
        .then(r => r[0]?.count || 0),
    ]);

    return {
      total: totalSurveys,
      active: activeSurveys,
      closed: closedSurveys,
      guiaI: guiaISurveys,
      guiaII: guiaIISurveys,
      guiaIII: guiaIIISurveys,
      totalResponses,
    };
  }),

  /**
   * Obtener distribución de encuestas por tipo (para gráficas)
   */
  getTypeDistribution: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const distribution = await db
      .select({
        type: surveys.type,
        count: sql<number>`count(*)`,
      })
      .from(surveys)
      .groupBy(surveys.type)
      .orderBy(sql`count(*) DESC`);

    return distribution;
  }),
});
