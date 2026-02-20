/**
 * Utilidades de paginación server-side para optimizar queries de tablas grandes
 */

import { SQL, sql } from "drizzle-orm";
import type { MySqlSelect } from "drizzle-orm/mysql-core";

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Resultado de paginación
 */
export interface PaginationResult {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Constantes de paginación
 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Normalizar parámetros de paginación
 */
export function normalizePaginationParams(params?: PaginationParams): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, params?.page || PAGINATION_DEFAULTS.PAGE);
  const pageSize = Math.min(
    Math.max(1, params?.pageSize || PAGINATION_DEFAULTS.PAGE_SIZE),
    PAGINATION_DEFAULTS.MAX_PAGE_SIZE
  );
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

/**
 * Calcular metadata de paginación
 */
export function calculatePagination(
  page: number,
  pageSize: number,
  totalCount: number
): PaginationResult {
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Aplicar paginación a una query de Drizzle ORM
 * 
 * @example
 * ```ts
 * const query = db.select().from(users).where(eq(users.active, true));
 * const result = await paginateQuery(query, { page: 2, pageSize: 10 });
 * ```
 */
export async function paginateQuery<T extends MySqlSelect>(
  query: T,
  params?: PaginationParams
): Promise<{
  data: Awaited<T>[];
  pagination: PaginationResult;
}> {
  const { page, pageSize, offset } = normalizePaginationParams(params);

  // Ejecutar query con paginación y contar total en paralelo
  const [data, countResult] = await Promise.all([
    query.limit(pageSize).offset(offset),
    // @ts-ignore - Drizzle typing issue
    query.$dynamic().select({ count: sql<number>`count(*)` }),
  ]);

  const totalCount = (countResult as any)[0]?.count || 0;
  const pagination = calculatePagination(page, pageSize, totalCount);

  return {
    data: data as Awaited<T>[],
    pagination,
  };
}

/**
 * Helper para crear respuesta paginada estándar
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationResult
) {
  return {
    data,
    pagination,
  };
}
