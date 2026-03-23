import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, createNotification } from "../db";
import { recognitions, recognitionCategories, recognitionReactions, users } from "../../drizzle/schema";
import { eq, and, or, desc, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const recognitionsRouter = router({
  /**
   * Obtener todas las categorías activas
   */
  getCategories: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    return await db
      .select()
      .from(recognitionCategories)
      .where(eq(recognitionCategories.isActive, true))
      .orderBy(recognitionCategories.name);
  }),

  /**
   * Crear un nuevo reconocimiento
   */
  create: protectedProcedure
    .input(
      z.object({
        toUserId: z.number(),
        categoryId: z.number(),
        type: z.enum(["reconocimiento", "felicitacion"]),
        message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
        isPublic: z.boolean().default(false),      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Validar que no se reconozca a sí mismo
      if (ctx.user.id === input.toUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes enviarte un reconocimiento a ti mismo",
        });
      }

      // Validar que el usuario destino existe
      const toUser = await db.select().from(users).where(eq(users.id, input.toUserId)).limit(1);
      if (toUser.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "El usuario destino no existe",
        });
      }

      // Validar que la categoría existe
      const category = await db
        .select()
        .from(recognitionCategories)
        .where(and(eq(recognitionCategories.id, input.categoryId), eq(recognitionCategories.isActive, true)))
        .limit(1);

      if (category.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "La categoría seleccionada no existe o está inactiva",
        });
      }

      // Crear reconocimiento
      const result = await (db.insert(recognitions) as any).values({
        fromUserId: ctx.user.id,
        toUserId: input.toUserId,
        categoryId: input.categoryId,
        type: input.type,
        message: input.message,
        isPublic: input.isPublic,
        status: "approved", // Por defecto aprobado, se puede cambiar a "pending" si se requiere moderación
      });

      // Enviar notificación al usuario destino (no bloqueante)
      createNotification({
        userId: input.toUserId,
        type: "system",
        title: "¡Has recibido un reconocimiento!",
        message: `${ctx.user.name} te ha enviado un reconocimiento en la categoría "${category[0].name}": ${input.message.substring(0, 100)}${input.message.length > 100 ? '...' : ''}`,
        relatedEntityType: "recognition",
        relatedEntityId: Number((result as any)[0]?.insertId || 0),
      }).catch(error => {
        console.error("[Recognitions] Error al enviar notificación:", error);
      });

      return { success: true };
      } catch (error) {
        console.error('[Recognitions] Error creating recognition:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al crear reconocimiento",
        });
      }
    }),

  /**
   * Listar reconocimientos (con filtros)
   */
  list: protectedProcedure
    .input(
      z.object({
        filter: z.enum(["received", "sent", "public", "all"]).default("received"),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      let whereCondition: any;

      switch (input.filter) {
        case "received":
          whereCondition = eq(recognitions.toUserId, ctx.user.id);
          break;
        case "sent":
          whereCondition = eq(recognitions.fromUserId, ctx.user.id);
          break;
        case "public":
          whereCondition = and(eq(recognitions.isPublic, true), eq(recognitions.status, "approved"));
          break;
        case "all":
          whereCondition = or(eq(recognitions.toUserId, ctx.user.id), eq(recognitions.fromUserId, ctx.user.id));
          break;
      }

      // Obtener total count
      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(recognitions)
        .where(whereCondition);

      // Obtener resultados paginados
      const results = await db
        .select({
          id: recognitions.id,
          fromUserId: recognitions.fromUserId,
          fromUserName: sql<string>`(SELECT name FROM users WHERE id = ${recognitions.fromUserId})`,
          toUserId: recognitions.toUserId,
          toUserName: sql<string>`(SELECT name FROM users WHERE id = ${recognitions.toUserId})`,
          categoryId: recognitions.categoryId,
          categoryName: recognitionCategories.name,
          categoryIcon: recognitionCategories.icon,
          type: recognitions.type,
          message: recognitions.message,
          isPublic: recognitions.isPublic,
          status: recognitions.status,
          readAt: recognitions.readAt,
          createdAt: recognitions.createdAt,
        })
        .from(recognitions)
        .leftJoin(recognitionCategories, eq(recognitions.categoryId, recognitionCategories.id))
        .where(whereCondition)
        .orderBy(desc(recognitions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const page = Math.floor(input.offset / input.limit) + 1;
      const totalPages = Math.ceil(totalCount / input.limit);

      return {
        recognitions: results,
        pagination: {
          page,
          pageSize: input.limit,
          totalCount,
          totalPages,
        },
      };
    }),

  /**
   * Obtener reconocimiento por ID
   */
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const result = await db
      .select({
        id: recognitions.id,
        fromUserId: recognitions.fromUserId,
        fromUserName: sql<string>`(SELECT name FROM users WHERE id = ${recognitions.fromUserId})`,
        toUserId: recognitions.toUserId,
        toUserName: sql<string>`(SELECT name FROM users WHERE id = ${recognitions.toUserId})`,
        categoryId: recognitions.categoryId,
        categoryName: recognitionCategories.name,
        categoryIcon: recognitionCategories.icon,
        type: recognitions.type,
        message: recognitions.message,
        isPublic: recognitions.isPublic,
        status: recognitions.status,
        createdAt: recognitions.createdAt,
      })
      .from(recognitions)
      .leftJoin(recognitionCategories, eq(recognitions.categoryId, recognitionCategories.id))
      .where(eq(recognitions.id, input.id))
      .limit(1);

    if (result.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Reconocimiento no encontrado",
      });
    }

    // Validar que el usuario tenga permiso para ver este reconocimiento
    const recognition = result[0];
    if (
      !recognition.isPublic &&
      recognition.fromUserId !== ctx.user.id &&
      recognition.toUserId !== ctx.user.id &&
      ctx.user.role !== "admin"
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tienes permiso para ver este reconocimiento",
      });
    }

    return recognition;
  }),

  /**
   * Reporte mensual de reconocimientos
   */
  getMonthlyReport: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

      // Total de reconocimientos del mes
      const totalRecognitions = await db
        .select({ count: sql<number>`count(*)` })
        .from(recognitions)
        .where(and(gte(recognitions.createdAt, startDate), lte(recognitions.createdAt, endDate)));

      // Reconocimientos por categoría
      const byCategory = await db
        .select({
          categoryId: recognitions.categoryId,
          categoryName: recognitionCategories.name,
          count: sql<number>`count(*)`,
        })
        .from(recognitions)
        .leftJoin(recognitionCategories, eq(recognitions.categoryId, recognitionCategories.id))
        .where(and(gte(recognitions.createdAt, startDate), lte(recognitions.createdAt, endDate)))
        .groupBy(recognitions.categoryId, recognitionCategories.name);

      // Top 10 empleados más reconocidos
      const topRecognized = await db
        .select({
          userId: recognitions.toUserId,
          userName: users.name,
          count: sql<number>`count(*)`,
        })
        .from(recognitions)
        .leftJoin(users, eq(recognitions.toUserId, users.id))
        .where(and(gte(recognitions.createdAt, startDate), lte(recognitions.createdAt, endDate)))
        .groupBy(recognitions.toUserId, users.name)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      // Top 10 empleados que más reconocen
      const topRecognizers = await db
        .select({
          userId: recognitions.fromUserId,
          userName: users.name,
          count: sql<number>`count(*)`,
        })
        .from(recognitions)
        .leftJoin(users, eq(recognitions.fromUserId, users.id))
        .where(and(gte(recognitions.createdAt, startDate), lte(recognitions.createdAt, endDate)))
        .groupBy(recognitions.fromUserId, users.name)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      return {
        total: totalRecognitions[0]?.count || 0,
        byCategory,
        topRecognized,
        topRecognizers,
        period: {
          year: input.year,
          month: input.month,
          startDate,
          endDate,
        },
      };
    }),

  /**
   * Agregar reacción a un reconocimiento
   */
  addReaction: protectedProcedure
    .input(
      z.object({
        recognitionId: z.number(),
        reactionType: z.enum(["like", "applause", "heart", "star"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Verificar que el reconocimiento existe
      const recognition = await db
        .select()
        .from(recognitions)
        .where(eq(recognitions.id, input.recognitionId))
        .limit(1);

      if (recognition.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reconocimiento no encontrado",
        });
      }

      // Verificar si ya reaccionó
      const existingReaction = await db
        .select()
        .from(recognitionReactions)
        .where(
          and(eq(recognitionReactions.recognitionId, input.recognitionId), eq(recognitionReactions.userId, ctx.user.id))
        )
        .limit(1);

      if (existingReaction.length > 0) {
        // Actualizar reacción existente
        await db
          .update(recognitionReactions)
          .set({ reactionType: input.reactionType } as any)
          .where(eq(recognitionReactions.id, existingReaction[0].id));

        return { success: true, updated: true };
      } else {
        // Crear nueva reacción
        await (db.insert(recognitionReactions) as any).values({
          recognitionId: input.recognitionId,
          userId: ctx.user.id,
          reactionType: input.reactionType,
        });

        return { success: true, updated: false };
      }
    }),

  /**
   * Eliminar reacción
   */
  removeReaction: protectedProcedure
    .input(
      z.object({
        recognitionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db
        .delete(recognitionReactions)
        .where(
          and(eq(recognitionReactions.recognitionId, input.recognitionId), eq(recognitionReactions.userId, ctx.user.id))
        );

      return { success: true };
    }),

  /**
   * Obtener reacciones de un reconocimiento
   */
  getReactions: protectedProcedure
    .input(
      z.object({
        recognitionId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const reactions = await db
        .select({
          id: recognitionReactions.id,
          userId: recognitionReactions.userId,
          userName: users.name,
          reactionType: recognitionReactions.reactionType,
          createdAt: recognitionReactions.createdAt,
        })
        .from(recognitionReactions)
        .leftJoin(users, eq(recognitionReactions.userId, users.id))
        .where(eq(recognitionReactions.recognitionId, input.recognitionId))
        .orderBy(desc(recognitionReactions.createdAt));

      // Contar por tipo
      const counts = {
        like: 0,
        applause: 0,
        heart: 0,
        star: 0,
      };

      reactions.forEach((r: { reactionType: "like" | "applause" | "heart" | "star" | null }) => {
        if (r.reactionType) {
          counts[r.reactionType]++;
        }
      });

      return {
        reactions,
        counts,
        total: reactions.length,
      };
    }),

  /**
   * Obtener contador de reconocimientos no leídos
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    // Contar reconocimientos recibidos que no han sido leídos (readAt IS NULL)
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(recognitions)
      .where(
        and(
          eq(recognitions.toUserId, ctx.user.id),
          sql`${recognitions.readAt} IS NULL`
        )
      );

    return {
      count: Number(result[0]?.count || 0),
    };
  }),

  /**
   * Marcar reconocimiento como leído
   */
  markAsRead: protectedProcedure
    .input(z.object({ recognitionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Verificar que el reconocimiento existe y pertenece al usuario actual
      const recognition = await db
        .select()
        .from(recognitions)
        .where(eq(recognitions.id, input.recognitionId))
        .limit(1);

      if (recognition.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reconocimiento no encontrado",
        });
      }

      if (recognition[0].toUserId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permiso para marcar este reconocimiento como leído",
        });
      }

      // Marcar como leído si aún no lo está
      if (!recognition[0].readAt) {
        await db
          .update(recognitions)
          .set({ readAt: new Date() } as any)
          .where(eq(recognitions.id, input.recognitionId));
      }

      return { success: true };
    }),
});
