/**
 * Router de usuarios con paginación optimizada
 * Reemplaza queries sin límites por versiones paginadas
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { and, eq, or, desc, sql, like } from "drizzle-orm";
import { normalizePaginationParams, calculatePagination } from "../utils/pagination";

export const usersPaginatedRouter = router({
  /**
   * Listar usuarios con paginación y filtros
   */
  listPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(100).optional(),
        role: z.string().optional(),
        departamento: z.string().optional(),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
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

      if (input.role) {
        conditions.push(eq(users.role, input.role as any));
      }

      if (input.departamento) {
        conditions.push(eq(users.departamento, input.departamento));
      }

      if (input.search) {
        conditions.push(
          sql`(${users.name} LIKE ${`%${input.search}%`} OR ${users.email} LIKE ${`%${input.search}%`} OR ${users.curp} LIKE ${`%${input.search}%`})`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Ejecutar queries en paralelo
      const [usersList, totalCount] = await Promise.all([
        db
          .select({
            id: users.id,
            openId: users.openId,
            name: users.name,
            email: users.email,
            role: users.role,
            departamento: users.departamento,
            puesto: users.puesto,
            curp: users.curp,
            rfc: users.rfc,
            telefono: users.telefono,
            fechaNacimiento: users.fechaNacimiento,
            sexo: users.sexo,
            estadoCivil: users.estadoCivil,
            fechaIngreso: users.fechaIngreso,
            tipoContrato: users.tipoContrato,
            jornadaLaboral: users.jornadaLaboral,
            nivelJerarquico: users.nivelJerarquico,
            salario: users.salario,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
            lastSignedIn: users.lastSignedIn,
          })
          .from(users)
          .where(whereClause)
          .orderBy(desc(users.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(whereClause)
          .then((r) => r[0]?.count || 0),
      ]);

      const pagination = calculatePagination(page, pageSize, totalCount);

      return {
        users: usersList,
        pagination,
      };
    }),

  /**
   * Listar usuarios por rol (optimizado para asignaciones)
   */
  listByRole: protectedProcedure
    .input(
      z.object({
        role: z.string(),
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(50).optional().default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, pageSize, offset } = normalizePaginationParams({
        page: input.page,
        pageSize: input.pageSize,
      });

      const conditions = [eq(users.role, input.role as any)];

      if (input.search) {
        conditions.push(
          sql`(${users.name} LIKE ${`%${input.search}%`} OR ${users.email} LIKE ${`%${input.search}%`})`
        );
      }

      const whereClause = and(...conditions);

      const [usersList, totalCount] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            departamento: users.departamento,
            puesto: users.puesto,
          })
          .from(users)
          .where(whereClause)
          .orderBy(users.name)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(whereClause)
          .then((r) => r[0]?.count || 0),
      ]);

      const pagination = calculatePagination(page, pageSize, totalCount);

      return {
        users: usersList,
        pagination,
      };
    }),

  /**
   * Listar usuarios por departamento (optimizado para reportes)
   */
  listByDepartment: protectedProcedure
    .input(
      z.object({
        departamento: z.string(),
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, pageSize, offset } = normalizePaginationParams({
        page: input.page,
        pageSize: input.pageSize,
      });

      const whereClause = eq(users.departamento, input.departamento);

      const [usersList, totalCount] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            puesto: users.puesto,
            fechaIngreso: users.fechaIngreso,
            tipoContrato: users.tipoContrato,
            nivelJerarquico: users.nivelJerarquico,
          })
          .from(users)
          .where(whereClause)
          .orderBy(users.name)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(whereClause)
          .then((r) => r[0]?.count || 0),
      ]);

      const pagination = calculatePagination(page, pageSize, totalCount);

      return {
        users: usersList,
        pagination,
      };
    }),

  /**
   * Estadísticas de usuarios (sin paginación, solo conteos)
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [
      totalUsers,
      adminCount,
      instructorCount,
      studentCount,
      committeeCount,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users).then((r) => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "admin")).then((r) => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "instructor")).then((r) => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "student")).then((r) => r[0]?.count || 0),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "committee")).then((r) => r[0]?.count || 0),
    ]);

    return {
      total: totalUsers,
      admin: adminCount,
      instructor: instructorCount,
      student: studentCount,
      committee: committeeCount,
    };
  }),

  /**
   * Obtener distribución por departamento (para gráficas)
   */
  getDepartmentDistribution: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const distribution = await db
      .select({
        departamento: users.departamento,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.departamento)
      .orderBy(sql`count(*) DESC`)
      .limit(20); // Top 20 departamentos

    return distribution;
  }),
});
