/**
 * Router para gestión de permisos personalizados por usuario
 * 
 * Permite a los administradores asignar permisos específicos a usuarios individuales
 * que sobrescriben los permisos del rol base.
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "../permissions";

export const customPermissionsRouter = router({
  /**
   * Obtener permisos personalizados de un usuario específico
   */
  getUserCustomPermissions: protectedProcedure
    .use(requirePermission('can_view'))
    .input(z.object({
      userId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      const results = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        customPermissions: users.customPermissions,
      }).from(users).where(eq(users.id, input.userId)).limit(1);
      
      const user = results[0];
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        customPermissions: user.customPermissions || null,
      };
    }),

  /**
   * Actualizar permisos personalizados de un usuario
   */
  updateUserCustomPermissions: protectedProcedure
    .use(requirePermission('can_edit'))
    .input(z.object({
      userId: z.number(),
      customPermissions: z.object({
        can_view: z.boolean().optional(),
        can_create: z.boolean().optional(),
        can_edit: z.boolean().optional(),
        can_delete: z.boolean().optional(),
        can_approve: z.boolean().optional(),
        can_export: z.boolean().optional(),
      }).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      // Validación: no permitir cambiar permisos propios
      if (ctx.user!.id === input.userId) {
        throw new Error('No puedes modificar tus propios permisos');
      }
      
      // Actualizar permisos personalizados
      await db.update(users)
        .set({
          customPermissions: input.customPermissions,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));
      
      return {
        success: true,
        message: 'Permisos personalizados actualizados correctamente',
      };
    }),

  /**
   * Resetear permisos personalizados de un usuario (volver a permisos del rol)
   */
  resetUserCustomPermissions: protectedProcedure
    .use(requirePermission('can_edit'))
    .input(z.object({
      userId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      // Validación: no permitir resetear permisos propios
      if (ctx.user!.id === input.userId) {
        throw new Error('No puedes resetear tus propios permisos');
      }
      
      // Resetear permisos personalizados (establecer a null)
      await db.update(users)
        .set({
          customPermissions: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));
      
      return {
        success: true,
        message: 'Permisos personalizados reseteados. El usuario ahora usa los permisos de su rol.',
      };
    }),

  /**
   * Listar usuarios con permisos personalizados
   */
  getUsersWithCustomPermissions: protectedProcedure
    .use(requirePermission('can_view'))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      // Obtener todos los usuarios que tienen customPermissions no nulo
      const usersWithCustomPerms = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        customPermissions: users.customPermissions,
        updatedAt: users.updatedAt,
      }).from(users);
      
      // Filtrar solo usuarios con customPermissions definidos
      const filtered = usersWithCustomPerms.filter((u: any) => u.customPermissions !== null);
      
      return {
        users: filtered,
        total: filtered.length,
      };
    }),
});
