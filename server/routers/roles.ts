/**
 * Router tRPC para Sistema de Roles y Permisos NOM-035
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { 
  rolePermissions, 
  userPermissions, 
  roleAuditLog,
  users 
} from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  getUserPermissions,
  checkPermission,
  hasRole,
  isAdmin,
  getRoleDisplayName,
  getModuleDisplayName,
  getActionDisplayName,
  MODULES,
  ACTIONS,
  ROLES,
  type Module,
  type Action,
  type Role,
} from '../lib/permissions';

export const rolesRouter = router({
  /**
   * Obtiene los permisos del usuario actual
   */
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const permissions = await getUserPermissions(ctx.user.id);
    return {
      userId: ctx.user.id,
      role: ctx.user.role,
      roleDisplayName: getRoleDisplayName(ctx.user.role as Role),
      permissions,
    };
  }),

  /**
   * Obtiene los permisos de un usuario específico (solo admin/director)
   */
  getUserPermissions: protectedProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Verificar que el usuario actual es admin o director
      const canManageRoles = await isAdmin(ctx.user.id);
      if (!canManageRoles) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tienes permisos para ver permisos de otros usuarios',
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Obtener usuario
      const targetUsers = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      
      const targetUser = targetUsers[0];

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }

      const permissions = await getUserPermissions(input.userId);

      return {
        userId: targetUser.id,
        userName: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        roleDisplayName: getRoleDisplayName(targetUser.role as Role),
        permissions,
      };
    }),

  /**
   * Obtiene la matriz completa de permisos por rol
   */
  getRoleMatrix: protectedProcedure.query(async ({ ctx }) => {
    // Verificar que el usuario actual es admin o director
    const canManageRoles = await isAdmin(ctx.user.id);
    if (!canManageRoles) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No tienes permisos para ver la matriz de roles',
      });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    // Obtener todos los permisos de roles
    const allPermissions = await db
      .select()
      .from(rolePermissions);

    // Organizar en estructura de matriz
    const matrix: Record<string, Record<string, any>> = {};

    for (const role of ROLES) {
      matrix[role] = {};
      for (const module of MODULES) {
        const perm = allPermissions.find(p => p.role === role && p.module === module);
        matrix[role][module] = perm ? {
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
        } : {
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        };
      }
    }

    return {
      roles: ROLES.map(r => ({ value: r, label: getRoleDisplayName(r) })),
      modules: MODULES.map(m => ({ value: m, label: getModuleDisplayName(m) })),
      actions: ACTIONS.map(a => ({ value: a, label: getActionDisplayName(a) })),
      matrix,
    };
  }),

  /**
   * Actualiza el rol de un usuario (solo admin/director)
   */
  updateUserRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      newRole: z.enum(ROLES),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verificar que el usuario actual es admin o director
      const canManageRoles = await isAdmin(ctx.user.id);
      if (!canManageRoles) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tienes permisos para cambiar roles',
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Obtener usuario actual
      const targetUsers = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      
      const targetUser = targetUsers[0];

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }

      const oldRole = targetUser.role;

      // Actualizar rol
      await db
        .update(users)
        .set({ role: input.newRole })
        .where(eq(users.id, input.userId));

      // Registrar en audit log
      await db.insert(roleAuditLog).values({
        userId: input.userId,
        oldRole,
        newRole: input.newRole,
        changedBy: ctx.user.id,
        reason: input.reason || 'Sin razón especificada',
      });

      return {
        success: true,
        userId: input.userId,
        oldRole,
        newRole: input.newRole,
        message: `Rol actualizado de ${getRoleDisplayName(oldRole as Role)} a ${getRoleDisplayName(input.newRole)}`,
      };
    }),

  /**
   * Establece permisos personalizados para un usuario (solo admin)
   */
  setUserPermission: protectedProcedure
    .input(z.object({
      userId: z.number(),
      module: z.enum(MODULES),
      canView: z.boolean(),
      canCreate: z.boolean(),
      canEdit: z.boolean(),
      canDelete: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Solo admin puede establecer permisos personalizados
      const userIsAdmin = await hasRole(ctx.user.id, ['admin']);
      if (!userIsAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo administradores pueden establecer permisos personalizados',
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Verificar si ya existe un permiso personalizado
      const existing = await db
        .select()
        .from(userPermissions)
        .where(
          and(
            eq(userPermissions.userId, input.userId),
            eq(userPermissions.module, input.module)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Actualizar existente
        await db
          .update(userPermissions)
          .set({
            canView: input.canView,
            canCreate: input.canCreate,
            canEdit: input.canEdit,
            canDelete: input.canDelete,
            grantedBy: ctx.user.id,
            reason: input.reason,
          })
          .where(eq(userPermissions.id, existing[0].id));
      } else {
        // Crear nuevo
        await db.insert(userPermissions).values({
          userId: input.userId,
          module: input.module,
          canView: input.canView,
          canCreate: input.canCreate,
          canEdit: input.canEdit,
          canDelete: input.canDelete,
          grantedBy: ctx.user.id,
          reason: input.reason,
        });
      }

      return {
        success: true,
        message: `Permisos personalizados establecidos para ${getModuleDisplayName(input.module)}`,
      };
    }),

  /**
   * Obtiene usuarios por rol
   */
  getUsersByRole: protectedProcedure
    .input(z.object({
      role: z.enum(ROLES).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verificar que el usuario actual es admin o director
      const canManageRoles = await isAdmin(ctx.user.id);
      if (!canManageRoles) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tienes permisos para listar usuarios por rol',
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      let query = db.select().from(users);

      if (input.role) {
        query = query.where(eq(users.role, input.role)) as any;
      }

      const userList = await query;

      return userList.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        roleDisplayName: getRoleDisplayName(u.role as Role),
        createdAt: u.createdAt,
        lastSignedIn: u.lastSignedIn,
      }));
    }),

  /**
   * Obtiene el historial de cambios de roles (audit log)
   */
  getAuditLog: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      // Verificar que el usuario actual es admin o director
      const canManageRoles = await isAdmin(ctx.user.id);
      if (!canManageRoles) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tienes permisos para ver el historial de cambios',
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      let query = db
        .select()
        .from(roleAuditLog)
        .orderBy(desc(roleAuditLog.createdAt))
        .limit(input.limit);

      if (input.userId) {
        query = query.where(eq(roleAuditLog.userId, input.userId)) as any;
      }

      const logs = await query;

      // Enriquecer con nombres de usuarios
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          const targetUsers = await db
            .select()
            .from(users)
            .where(eq(users.id, log.userId))
            .limit(1);
          
          const changedByUsers = await db
            .select()
            .from(users)
            .where(eq(users.id, log.changedBy))
            .limit(1);

          return {
            ...log,
            userName: targetUsers[0]?.name || 'Usuario desconocido',
            changedByName: changedByUsers[0]?.name || 'Usuario desconocido',
            oldRoleDisplay: log.oldRole ? getRoleDisplayName(log.oldRole as Role) : 'N/A',
            newRoleDisplay: getRoleDisplayName(log.newRole as Role),
          };
        })
      );

      return enrichedLogs;
    }),
});
