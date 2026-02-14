/**
 * Survey Anonymous Tokens Router
 * Manages anonymous access tokens for NOM-035 surveys
 */

import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { surveyAnonymousTokens } from "../../drizzle/schema";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 64 caracteres hexadecimales
}

export const surveyAnonymousTokensRouter = router({
  /**
   * Generate multiple anonymous tokens
   * Admin only - creates batch of tokens for distribution
   */
  generateBatch: protectedProcedure
    .input(
      z.object({
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
        count: z.number().min(1).max(1000), // Max 1000 tokens per batch
        expiresInDays: z.number().min(1).max(365).default(30),
        department: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check admin permission
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden generar tokens",
        });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      const tokens: Array<{
        token: string;
        surveyType: string;
        department?: string;
        expiresAt: Date;
        generatedBy: number;
        notes?: string;
      }> = [];

      // Generate unique tokens
      for (let i = 0; i < input.count; i++) {
        tokens.push({
          token: generateSecureToken(),
          surveyType: input.surveyType,
          department: input.department,
          expiresAt,
          generatedBy: ctx.user.id,
          notes: input.notes,
        });
      }

      // Insert all tokens in a single transaction
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db.insert(surveyAnonymousTokens).values(tokens);

      return {
        success: true,
        count: input.count,
        expiresAt,
        message: `${input.count} tokens generados exitosamente`,
      };
    }),

  /**
   * Get all tokens with filters and pagination
   * Admin only
   */
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(10).max(100).default(50),
        surveyType: z.enum(["all", "guia_i", "guia_ii", "guia_iii"]).default("all"),
        status: z.enum(["all", "active", "used", "expired", "revoked"]).default("all"),
        department: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden ver tokens",
        });
      }

      const offset = (input.page - 1) * input.pageSize;

      // Build where conditions
      const conditions = [];

      if (input.surveyType !== "all") {
        conditions.push(eq(surveyAnonymousTokens.surveyType, input.surveyType));
      }

      if (input.department) {
        conditions.push(eq(surveyAnonymousTokens.department, input.department));
      }

      // Status filters
      const now = new Date();
      if (input.status === "active") {
        conditions.push(
          isNull(surveyAnonymousTokens.usedAt),
          eq(surveyAnonymousTokens.isRevoked, false),
          gt(surveyAnonymousTokens.expiresAt, now)
        );
      } else if (input.status === "used") {
        conditions.push(sql`${surveyAnonymousTokens.usedAt} IS NOT NULL`);
      } else if (input.status === "expired") {
        conditions.push(
          isNull(surveyAnonymousTokens.usedAt),
          eq(surveyAnonymousTokens.isRevoked, false),
          sql`${surveyAnonymousTokens.expiresAt} <= ${now}`
        );
      } else if (input.status === "revoked") {
        conditions.push(eq(surveyAnonymousTokens.isRevoked, true));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(surveyAnonymousTokens)
        .where(whereClause);

      // Get tokens
      const tokens = await db
        .select()
        .from(surveyAnonymousTokens)
        .where(whereClause)
        .orderBy(sql`${surveyAnonymousTokens.createdAt} DESC`)
        .limit(input.pageSize)
        .offset(offset);

      return {
        tokens,
        total: Number(count),
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(Number(count) / input.pageSize),
      };
    }),

  /**
   * Validate and use a token (public endpoint)
   * Returns survey info if token is valid
   */
  validateToken: publicProcedure
    .input(
      z.object({
        token: z.string().length(64),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [tokenRecord] = await db
        .select()
        .from(surveyAnonymousTokens)
        .where(eq(surveyAnonymousTokens.token, input.token))
        .limit(1);

      if (!tokenRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Token no encontrado",
        });
      }

      // Check if already used
      if (tokenRecord.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este token ya ha sido utilizado",
        });
      }

      // Check if revoked
      if (tokenRecord.isRevoked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este token ha sido revocado",
        });
      }

      // Check if expired
      if (new Date() > new Date(tokenRecord.expiresAt)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este token ha expirado",
        });
      }

      // Mark token as used
      await db
        .update(surveyAnonymousTokens)
        .set({ usedAt: new Date() })
        .where(eq(surveyAnonymousTokens.id, tokenRecord.id));

      return {
        success: true,
        surveyType: tokenRecord.surveyType,
        department: tokenRecord.department,
        message: "Token válido - acceso concedido",
      };
    }),

  /**
   * Revoke a token
   * Admin only
   */
  revokeToken: protectedProcedure
    .input(
      z.object({
        tokenId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden revocar tokens",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(surveyAnonymousTokens)
        .set({ isRevoked: true })
        .where(eq(surveyAnonymousTokens.id, input.tokenId));

      return {
        success: true,
        message: "Token revocado exitosamente",
      };
    }),

  /**
   * Get token statistics
   * Admin only
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Solo administradores pueden ver estadísticas",
      });
    }

    const now = new Date();

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Total tokens
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(surveyAnonymousTokens);

    // Active tokens (not used, not revoked, not expired)
    const [{ active }] = await db
      .select({ active: sql<number>`count(*)` })
      .from(surveyAnonymousTokens)
      .where(
        and(
          isNull(surveyAnonymousTokens.usedAt),
          eq(surveyAnonymousTokens.isRevoked, false),
          gt(surveyAnonymousTokens.expiresAt, now)
        )
      );

    // Used tokens
    const [{ used }] = await db
      .select({ used: sql<number>`count(*)` })
      .from(surveyAnonymousTokens)
      .where(sql`${surveyAnonymousTokens.usedAt} IS NOT NULL`);

    // Expired tokens
    const [{ expired }] = await db
      .select({ expired: sql<number>`count(*)` })
      .from(surveyAnonymousTokens)
      .where(
        and(
          isNull(surveyAnonymousTokens.usedAt),
          eq(surveyAnonymousTokens.isRevoked, false),
          sql`${surveyAnonymousTokens.expiresAt} <= ${now}`
        )
      );

    // Revoked tokens
    const [{ revoked }] = await db
      .select({ revoked: sql<number>`count(*)` })
      .from(surveyAnonymousTokens)
      .where(eq(surveyAnonymousTokens.isRevoked, true));

    // Distribution by survey type
    const distribution = await db
      .select({
        surveyType: surveyAnonymousTokens.surveyType,
        count: sql<number>`count(*)`,
      })
      .from(surveyAnonymousTokens)
      .groupBy(surveyAnonymousTokens.surveyType);

    return {
      total: Number(total),
      active: Number(active),
      used: Number(used),
      expired: Number(expired),
      revoked: Number(revoked),
      distribution,
      usageRate: Number(total) > 0 ? (Number(used) / Number(total)) * 100 : 0,
    };
  }),

  /**
   * Export tokens to CSV format
   * Admin only - returns array of tokens for download
   */
  exportTokens: protectedProcedure
    .input(
      z.object({
        surveyType: z.enum(["all", "guia_i", "guia_ii", "guia_iii"]).default("all"),
        status: z.enum(["all", "active", "used", "expired", "revoked"]).default("active"),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden exportar tokens",
        });
      }

      // Build where conditions (same logic as getAll)
      const conditions = [];

      if (input.surveyType !== "all") {
        conditions.push(eq(surveyAnonymousTokens.surveyType, input.surveyType));
      }

      const now = new Date();
      if (input.status === "active") {
        conditions.push(
          isNull(surveyAnonymousTokens.usedAt),
          eq(surveyAnonymousTokens.isRevoked, false),
          gt(surveyAnonymousTokens.expiresAt, now)
        );
      } else if (input.status === "used") {
        conditions.push(sql`${surveyAnonymousTokens.usedAt} IS NOT NULL`);
      } else if (input.status === "expired") {
        conditions.push(
          isNull(surveyAnonymousTokens.usedAt),
          eq(surveyAnonymousTokens.isRevoked, false),
          sql`${surveyAnonymousTokens.expiresAt} <= ${now}`
        );
      } else if (input.status === "revoked") {
        conditions.push(eq(surveyAnonymousTokens.isRevoked, true));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const tokens = await db
        .select()
        .from(surveyAnonymousTokens)
        .where(whereClause)
        .orderBy(sql`${surveyAnonymousTokens.createdAt} DESC`);

      return tokens;
    }),
});
