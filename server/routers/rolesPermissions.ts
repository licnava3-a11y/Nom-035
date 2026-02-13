import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requirePermission } from "../permissions";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Router for managing roles and permissions
 * Allows administrators to view role-permission matrix and change user roles
 */
export const rolesPermissionsRouter = router({
  /**
   * Get all available roles with their permission mappings
   * Returns the complete role-permission matrix
   */
  getAllRoles: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      // Define the complete role-permission matrix
      // This matches the permissions defined in server/permissions.ts
      const rolePermissions = {
        admin: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_approve: true,
          can_export: true,
        },
        gerente: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_approve: true,
          can_export: true,
        },
        director: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_approve: true,
          can_export: true,
        },
        instructor: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
          can_approve: false,
          can_export: true,
        },
        administrativo: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
          can_approve: false,
          can_export: true,
        },
        recursos_humanos: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
          can_approve: false,
          can_export: true,
        },
        rh: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
          can_approve: false,
          can_export: true,
        },
        auxiliar_rh: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
          can_approve: false,
          can_export: true,
        },
        committee: {
          can_view: true,
          can_create: true,
          can_edit: false,
          can_delete: false,
          can_approve: true,
          can_export: false,
        },
        committee_coordinator: {
          can_view: true,
          can_create: true,
          can_edit: false,
          can_delete: false,
          can_approve: true,
          can_export: false,
        },
        committee_member: {
          can_view: true,
          can_create: true,
          can_edit: false,
          can_delete: false,
          can_approve: true,
          can_export: false,
        },
        responsable_nom035: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
          can_approve: true,
          can_export: true,
        },
        supervisor: {
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          can_export: false,
        },
        jefe_area: {
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          can_export: false,
        },
        empleado: {
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          can_export: false,
        },
        student: {
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          can_export: false,
        },
        demo: {
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          can_export: false,
        },
      };

      // Get user count for each role
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const roleCounts = await db
        .select({
          role: users.role,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(users)
        .groupBy(users.role);

      // Transform to object for easy lookup
      const countsByRole = Object.fromEntries(
        roleCounts.map((r: any) => [r.role, Number(r.count)])
      );

      // Combine permissions with counts
      const roles = Object.entries(rolePermissions).map(([role, permissions]) => ({
        role,
        permissions,
        userCount: countsByRole[role] || 0,
      }));

      return roles;
    }),

  /**
   * Get all users with their current roles
   * Allows filtering and pagination
   */
  getUsersByRole: protectedProcedure
    .use(requirePermission("can_view"))
    .input(
      z.object({
        role: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { role, search, page, limit } = input;
      const offset = (page - 1) * limit;

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Build where conditions
      const conditions = [];
      if (role) {
        conditions.push(eq(users.role, role as any));
      }
      if (search) {
        conditions.push(
          sql`(${users.name} LIKE ${`%${search}%`} OR ${users.email} LIKE ${`%${search}%`})`
        );
      }

      // Get total count
      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined);

      // Get users
      const userList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          departamento: users.departamento,
          puesto: users.puesto,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined)
        .limit(limit)
        .offset(offset)
        .orderBy(users.name);

      return {
        users: userList,
        totalCount: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
        currentPage: page,
      };
    }),

  /**
   * Update a user's role
   * Requires admin permissions
   */
  updateUserRole: protectedProcedure
    .use(requirePermission("can_edit"))
    .input(
      z.object({
        userId: z.number(),
        newRole: z.enum([
          "admin",
          "instructor",
          "student",
          "committee",
          "committee_member",
          "committee_coordinator",
          "administrativo",
          "director",
          "responsable_nom035",
          "gerente",
          "rh",
          "supervisor",
          "jefe_area",
          "empleado",
          "auxiliar_rh",
          "recursos_humanos",
          "demo",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userId, newRole } = input;

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Prevent users from changing their own role
      if (ctx.user!.id === userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No puedes cambiar tu propio rol",
        });
      }

      // Get user before update
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      // Update user role
      await db.update(users).set({ role: newRole }).where(eq(users.id, userId));

      return {
        success: true,
        message: `Rol de ${user.name} cambiado de ${user.role} a ${newRole}`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          oldRole: user.role,
          newRole,
        },
      };
    }),

  /**
   * Get role distribution statistics
   * Returns count of users per role for visualization
   */
  getRoleDistribution: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const distribution = await db
        .select({
          role: users.role,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(users)
        .groupBy(users.role)
        .orderBy(sql`count(*) DESC`);

      return distribution.map((d: any) => ({
        role: d.role,
        count: Number(d.count),
      }));
    }),
});
