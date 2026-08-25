import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  committeeTrainings,
  trainingAssignments,
  trainingCertificates,
  users,
} from "../../drizzle/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

export const committeeTrainingsRouter = router({
  /**
   * Listar todas las capacitaciones con filtros
   */
  list: protectedProcedure
    .input(
      z
        .object({
          type: z
            .enum([
              "mobbing",
              "burnout",
              "primeros_auxilios_psicologicos",
              "nom035",
              "investigacion",
              "otro",
            ])
            .optional(),
          isRequired: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      let query: any = db.select().from(committeeTrainings);

      const conditions = [];
      if (input?.type) {
        conditions.push(eq(committeeTrainings.type, input.type));
      }
      if (input?.isRequired !== undefined) {
        conditions.push(eq(committeeTrainings.isRequired, input.isRequired));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const trainings = await query.orderBy(desc(committeeTrainings.createdAt));

      return trainings;
    }),

  /**
   * Obtener una capacitación por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [training] = await db
        .select()
        .from(committeeTrainings)
        .where(eq(committeeTrainings.id, input.id))
        .limit(1);

      if (!training) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Capacitación no encontrada",
        });
      }

      return training;
    }),

  /**
   * Crear nueva capacitación
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "El título es requerido"),
        description: z.string().optional(),
        type: z.enum([
          "mobbing",
          "burnout",
          "primeros_auxilios_psicologicos",
          "nom035",
          "investigacion",
          "otro",
        ]),
        duration: z.number().min(1, "La duración debe ser mayor a 0"),
        validityMonths: z.number().optional(),
        isRequired: z.boolean().default(true),
        targetRoles: z.array(z.string()).optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role !== "admin" &&
        ctx.user.role !== "committee_coordinator"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para crear capacitaciones",
        });
      }

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [result] = await (db.insert(committeeTrainings) as any).values({
        title: input.title,
        description: input.description,
        type: input.type,
        duration: input.duration,
        validityMonths: input.validityMonths,
        isRequired: input.isRequired,
        targetRoles: input.targetRoles,
        content: input.content,
      } as any);

      return {
        id: result.insertId,
        message: "Capacitación creada exitosamente",
      };
    }),

  /**
   * Actualizar capacitación existente
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        type: z
          .enum([
            "mobbing",
            "burnout",
            "primeros_auxilios_psicologicos",
            "nom035",
            "investigacion",
            "otro",
          ])
          .optional(),
        duration: z.number().min(1).optional(),
        validityMonths: z.number().optional(),
        isRequired: z.boolean().optional(),
        targetRoles: z.array(z.string()).optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role !== "admin" &&
        ctx.user.role !== "committee_coordinator"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para actualizar capacitaciones",
        });
      }

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, ...updateData } = input;

      await db
        .update(committeeTrainings)
        .set(updateData as any)
        .where(eq(committeeTrainings.id, id));

      return { message: "Capacitación actualizada exitosamente" };
    }),

  /**
   * Eliminar capacitación
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role !== "admin" &&
        ctx.user.role !== "committee_coordinator"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para eliminar capacitaciones",
        });
      }

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .delete(committeeTrainings)
        .where(eq(committeeTrainings.id, input.id));

      return { message: "Capacitación eliminada exitosamente" };
    }),

  /**
   * Obtener estadísticas de capacitaciones
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        required: sql<number>`SUM(CASE WHEN ${committeeTrainings.isRequired} = 1 THEN 1 ELSE 0 END)`,
        byType: sql<any>`JSON_OBJECTAGG(${committeeTrainings.type}, COUNT(*))`,
      })
      .from(committeeTrainings);

    return stats;
  }),
});
