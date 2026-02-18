import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requirePermission } from "../permissions";
import { commonValidators } from "../validators/common";
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
    .input(z.object({}).optional()) // Validación vacía para consistencia
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
    .input(z.object({}).optional())
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

  /**
   * Get changes trends by month (for Chart.js)
   */
  getChangesTrends: protectedProcedure
    .use(requirePermission("can_view"))
    .input(
      z.object({
        months: z.number().default(6), // Últimos 6 meses por defecto
      })
    )
    .query(async ({ input }) => {
      const { months } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Calcular fecha de inicio (hace N meses)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Obtener datos agrupados por mes y tipo de cambio
      const trends = await db
        .select({
          month: sql<string>`DATE_FORMAT(${permissionChangeHistory.createdAt}, '%Y-%m')`,
          changeType: permissionChangeHistory.changeType,
          count: sql<number>`count(*)`,
        })
        .from(permissionChangeHistory)
        .where(gte(permissionChangeHistory.createdAt, startDate))
        .groupBy(sql`DATE_FORMAT(${permissionChangeHistory.createdAt}, '%Y-%m')`, permissionChangeHistory.changeType)
        .orderBy(sql`DATE_FORMAT(${permissionChangeHistory.createdAt}, '%Y-%m')`);

      return trends;
    }),

  /**
   * Get monthly changes count (KPI)
   */
  getMonthlyChangesCount: protectedProcedure
    .use(requirePermission("can_view"))
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Cambios del mes actual
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      // Cambios del mes anterior
      const previousMonth = new Date(currentMonth);
      previousMonth.setMonth(previousMonth.getMonth() - 1);

      const [currentMonthData] = await db
        .select({ count: sql<number>`count(*)` })
        .from(permissionChangeHistory)
        .where(and(
          gte(permissionChangeHistory.createdAt, currentMonth),
          eq(permissionChangeHistory.changeType, "role_change")
        ));

      const [previousMonthData] = await db
        .select({ count: sql<number>`count(*)` })
        .from(permissionChangeHistory)
        .where(and(
          gte(permissionChangeHistory.createdAt, previousMonth),
          lte(permissionChangeHistory.createdAt, currentMonth),
          eq(permissionChangeHistory.changeType, "role_change")
        ));

      const currentCount = Number(currentMonthData?.count || 0);
      const previousCount = Number(previousMonthData?.count || 0);
      const trend = currentCount > previousCount ? "up" : currentCount < previousCount ? "down" : "stable";

      return { currentCount, previousCount, trend };
    }),

  /**
   * Get users with custom permissions count (KPI)
   */
  getUsersWithCustomPermissionsCount: protectedProcedure
    .use(requirePermission("can_view"))
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.customPermissions} IS NOT NULL`);

      return Number(count);
    }),

  /**
   * Get top administrators (most active)
   */
  getTopAdministrators: protectedProcedure
    .use(requirePermission("can_view"))
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const topAdmins = await db
        .select({
          adminId: permissionChangeHistory.changedBy,
          adminName: sql<string>`admin_user.name`,
          adminEmail: sql<string>`admin_user.email`,
          changeCount: sql<number>`count(*)`,
        })
        .from(permissionChangeHistory)
        .leftJoin(
          sql`users AS admin_user`,
          sql`${permissionChangeHistory.changedBy} = admin_user.id`
        )
        .where(gte(permissionChangeHistory.createdAt, thirtyDaysAgo))
        .groupBy(permissionChangeHistory.changedBy, sql`admin_user.name`, sql`admin_user.email`)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      return topAdmins;
    }),

  /**
   * Get recent critical changes (last 24 hours)
   */
  getRecentCriticalChanges: protectedProcedure
    .use(requirePermission("can_view"))
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Últimas 24 horas
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(permissionChangeHistory)
        .where(gte(permissionChangeHistory.createdAt, twentyFourHoursAgo));

      const recentChanges = await db
        .select({
          id: permissionChangeHistory.id,
          userId: permissionChangeHistory.userId,
          userName: users.name,
          changeType: permissionChangeHistory.changeType,
          createdAt: permissionChangeHistory.createdAt,
        })
        .from(permissionChangeHistory)
        .leftJoin(users, eq(permissionChangeHistory.userId, users.id))
        .where(gte(permissionChangeHistory.createdAt, twentyFourHoursAgo))
        .orderBy(desc(permissionChangeHistory.createdAt))
        .limit(5);

      return { count: Number(count), recentChanges };
    }),
});
