import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requirePermission } from "../permissions";
import { getDb } from "../db";
import { permissionChangeHistory, users } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Router for permission audit history
 * Allows administrators to view history of permission changes
 */
export const permissionAuditRouter = router({
  /**
   * Get permission change history with filters and pagination
   */
  getHistory: protectedProcedure
    .use(requirePermission("can_view"))
    .input(
      z.object({
        userId: z.number().optional(),
        changeType: z.enum(["role_change", "custom_permission_update", "custom_permission_reset"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const { userId, changeType, startDate, endDate, page, limit } = input;

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Build filters
      const filters = [];
      if (userId) filters.push(eq(permissionChangeHistory.userId, userId));
      if (changeType) filters.push(eq(permissionChangeHistory.changeType, changeType));
      if (startDate) filters.push(gte(permissionChangeHistory.createdAt, new Date(startDate)));
      if (endDate) filters.push(lte(permissionChangeHistory.createdAt, new Date(endDate)));

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(permissionChangeHistory)
        .where(whereClause);

      // Get paginated history
      const history = await db
        .select({
          id: permissionChangeHistory.id,
          userId: permissionChangeHistory.userId,
          userName: users.name,
          userEmail: users.email,
          changedBy: permissionChangeHistory.changedBy,
          changedByName: sql<string>`changed_by_user.name`,
          changedByEmail: sql<string>`changed_by_user.email`,
          changeType: permissionChangeHistory.changeType,
          oldValue: permissionChangeHistory.oldValue,
          newValue: permissionChangeHistory.newValue,
          reason: permissionChangeHistory.reason,
          createdAt: permissionChangeHistory.createdAt,
        })
        .from(permissionChangeHistory)
        .leftJoin(users, eq(permissionChangeHistory.userId, users.id))
        .leftJoin(
          sql`users AS changed_by_user`,
          sql`${permissionChangeHistory.changedBy} = changed_by_user.id`
        )
        .where(whereClause)
        .orderBy(desc(permissionChangeHistory.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return {
        history,
        pagination: {
          page,
          limit,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / limit),
        },
      };
    }),

  /**
   * Get change statistics by type
   */
  getStatistics: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const stats = await db
        .select({
          changeType: permissionChangeHistory.changeType,
          count: sql<number>`count(*)`,
        })
        .from(permissionChangeHistory)
        .groupBy(permissionChangeHistory.changeType);

      return stats;
    }),

  /**
   * Get recent changes (last 10)
   */
  getRecentChanges: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const recentChanges = await db
        .select({
          id: permissionChangeHistory.id,
          userId: permissionChangeHistory.userId,
          userName: users.name,
          userEmail: users.email,
          changedBy: permissionChangeHistory.changedBy,
          changedByName: sql<string>`changed_by_user.name`,
          changeType: permissionChangeHistory.changeType,
          oldValue: permissionChangeHistory.oldValue,
          newValue: permissionChangeHistory.newValue,
          createdAt: permissionChangeHistory.createdAt,
        })
        .from(permissionChangeHistory)
        .leftJoin(users, eq(permissionChangeHistory.userId, users.id))
        .leftJoin(
          sql`users AS changed_by_user`,
          sql`${permissionChangeHistory.changedBy} = changed_by_user.id`
        )
        .orderBy(desc(permissionChangeHistory.createdAt))
        .limit(10);

      return recentChanges;
    }),
});
