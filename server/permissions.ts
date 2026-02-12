/**
 * Middleware de validación de permisos para tRPC procedures
 * 
 * Este módulo proporciona funciones para validar permisos en el backend,
 * asegurando que las acciones protegidas se validan en el servidor y no
 * solo en el frontend.
 */

import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import superjson from "superjson";

// Inicializar tRPC con el contexto
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

/**
 * Tipos de permisos disponibles en el sistema
 */
export type Permission = 
  | 'can_view'
  | 'can_create'
  | 'can_edit'
  | 'can_delete'
  | 'can_approve'
  | 'can_export';

/**
 * Matriz de permisos por rol
 * Define qué permisos tiene cada rol en el sistema
 */
export const rolePermissions: Record<string, Permission[]> = {
  gerente: ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_approve', 'can_export'],
  instructor: ['can_view', 'can_create', 'can_edit', 'can_export'],
  administrativo: ['can_view', 'can_create', 'can_edit', 'can_export'],
  committee: ['can_view', 'can_create', 'can_approve'],
  student: ['can_view'],
  // Roles adicionales con permisos limitados
  trabajador: ['can_view'],
  vendedor: ['can_view', 'can_create', 'can_edit'],
  reclutador: ['can_view', 'can_create', 'can_edit'],
  psicologo: ['can_view', 'can_create', 'can_edit'],
  medico: ['can_view', 'can_create', 'can_edit'],
  abogado: ['can_view', 'can_create', 'can_edit'],
  contador: ['can_view', 'can_create', 'can_edit', 'can_export'],
  auditor: ['can_view', 'can_export'],
  consultor: ['can_view', 'can_create', 'can_edit'],
  externo: ['can_view'],
  invitado: ['can_view'],
  superadmin: ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_approve', 'can_export'],
};

/**
 * Verifica si un usuario tiene un permiso específico
 * 
 * @param userRole - Rol del usuario
 * @param requiredPermission - Permiso requerido
 * @returns true si el usuario tiene el permiso, false en caso contrario
 */
export function hasPermission(userRole: string, requiredPermission: Permission): boolean {
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes(requiredPermission);
}

/**
 * Verifica si un usuario tiene al menos uno de los permisos especificados
 * 
 * @param userRole - Rol del usuario
 * @param requiredPermissions - Lista de permisos requeridos (OR lógico)
 * @returns true si el usuario tiene al menos uno de los permisos
 */
export function hasAnyPermission(userRole: string, requiredPermissions: Permission[]): boolean {
  return requiredPermissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Verifica si un usuario tiene todos los permisos especificados
 * 
 * @param userRole - Rol del usuario
 * @param requiredPermissions - Lista de permisos requeridos (AND lógico)
 * @returns true si el usuario tiene todos los permisos
 */
export function hasAllPermissions(userRole: string, requiredPermissions: Permission[]): boolean {
  return requiredPermissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Middleware que valida un permiso específico
 * Lanza un error FORBIDDEN si el usuario no tiene el permiso
 * 
 * @param requiredPermission - Permiso requerido
 * @returns Middleware de tRPC que valida el permiso
 * 
 * @example
 * ```typescript
 * // En routers.ts
 * createWorker: protectedProcedure
 *   .use(requirePermission('can_create'))
 *   .input(z.object({ ... }))
 *   .mutation(async ({ ctx, input }) => {
 *     // El usuario tiene permiso can_create
 *     return await db.insert(...);
 *   })
 * ```
 */
export function requirePermission(requiredPermission: Permission) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Debes iniciar sesión para realizar esta acción',
      });
    }
    
    const userRole = ctx.user.role;
    
    if (!hasPermission(userRole, requiredPermission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `No tienes permisos para realizar esta acción. Se requiere: ${requiredPermission}`,
      });
    }
    
    return next({ ctx });
  });
}

/**
 * Middleware que valida que el usuario tenga al menos uno de los permisos especificados
 * Lanza un error FORBIDDEN si el usuario no tiene ninguno de los permisos
 * 
 * @param requiredPermissions - Lista de permisos requeridos (OR lógico)
 * @returns Middleware de tRPC que valida los permisos
 * 
 * @example
 * ```typescript
 * // En routers.ts
 * saveWorker: protectedProcedure
 *   .use(requireAnyPermission(['can_create', 'can_edit']))
 *   .input(z.object({ ... }))
 *   .mutation(async ({ ctx, input }) => {
 *     // El usuario tiene can_create O can_edit
 *     return await db.insert(...);
 *   })
 * ```
 */
export function requireAnyPermission(requiredPermissions: Permission[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Debes iniciar sesión para realizar esta acción',
      });
    }
    
    const userRole = ctx.user.role;
    
    if (!hasAnyPermission(userRole, requiredPermissions)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `No tienes permisos para realizar esta acción. Se requiere al menos uno de: ${requiredPermissions.join(', ')}`,
      });
    }
    
    return next({ ctx });
  });
}

/**
 * Middleware que valida que el usuario tenga todos los permisos especificados
 * Lanza un error FORBIDDEN si el usuario no tiene todos los permisos
 * 
 * @param requiredPermissions - Lista de permisos requeridos (AND lógico)
 * @returns Middleware de tRPC que valida los permisos
 * 
 * @example
 * ```typescript
 * // En routers.ts
 * approveAndExport: protectedProcedure
 *   .use(requireAllPermissions(['can_approve', 'can_export']))
 *   .input(z.object({ ... }))
 *   .mutation(async ({ ctx, input }) => {
 *     // El usuario tiene can_approve Y can_export
 *     return await db.insert(...);
 *   })
 * ```
 */
export function requireAllPermissions(requiredPermissions: Permission[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Debes iniciar sesión para realizar esta acción',
      });
    }
    
    const userRole = ctx.user.role;
    
    if (!hasAllPermissions(userRole, requiredPermissions)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `No tienes permisos para realizar esta acción. Se requieren todos: ${requiredPermissions.join(', ')}`,
      });
    }
    
    return next({ ctx });
  });
}

/**
 * Middleware especial para operaciones de eliminación
 * Solo el rol 'gerente' y 'superadmin' pueden eliminar registros
 * 
 * @example
 * ```typescript
 * // En routers.ts
 * deleteWorker: protectedProcedure
 *   .use(requireDelete())
 *   .input(z.object({ id: z.number() }))
 *   .mutation(async ({ ctx, input }) => {
 *     // Solo gerente y superadmin pueden ejecutar esto
 *     return await db.delete(...);
 *   })
 * ```
 */
export function requireDelete() {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Debes iniciar sesión para realizar esta acción',
      });
    }
    
    const userRole = ctx.user.role;
    
    if (!hasPermission(userRole, 'can_delete')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Solo los gerentes pueden eliminar registros',
      });
    }
    
    return next({ ctx });
  });
}

/**
 * Middleware especial para operaciones de aprobación
 * Solo los roles 'gerente', 'committee' y 'superadmin' pueden aprobar
 * 
 * @example
 * ```typescript
 * // En routers.ts
 * approveMinute: protectedProcedure
 *   .use(requireApprove())
 *   .input(z.object({ id: z.number() }))
 *   .mutation(async ({ ctx, input }) => {
 *     // Solo gerente, committee y superadmin pueden ejecutar esto
 *     return await db.update(...);
 *   })
 * ```
 */
export function requireApprove() {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Debes iniciar sesión para realizar esta acción',
      });
    }
    
    const userRole = ctx.user.role;
    
    if (!hasPermission(userRole, 'can_approve')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Solo los gerentes y miembros del comité pueden aprobar documentos',
      });
    }
    
    return next({ ctx });
  });
}

/**
 * Middleware especial para operaciones de exportación
 * Valida que el usuario tenga permiso para exportar datos
 * 
 * @example
 * ```typescript
 * // En routers.ts
 * exportToExcel: protectedProcedure
 *   .use(requireExport())
 *   .input(z.object({ ... }))
 *   .mutation(async ({ ctx, input }) => {
 *     // Usuario tiene permiso para exportar
 *     return await generateExcel(...);
 *   })
 * ```
 */
export function requireExport() {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Debes iniciar sesión para realizar esta acción',
      });
    }
    
    const userRole = ctx.user.role;
    
    if (!hasPermission(userRole, 'can_export')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No tienes permisos para exportar datos',
      });
    }
    
    return next({ ctx });
  });
}

/**
 * Obtiene la lista de permisos de un usuario
 * Útil para debugging y auditoría
 * 
 * @param userRole - Rol del usuario
 * @returns Lista de permisos del usuario
 */
export function getUserPermissions(userRole: string): Permission[] {
  return rolePermissions[userRole] || [];
}

/**
 * Valida si un rol existe en el sistema
 * 
 * @param role - Rol a validar
 * @returns true si el rol existe
 */
export function isValidRole(role: string): boolean {
  return role in rolePermissions;
}
