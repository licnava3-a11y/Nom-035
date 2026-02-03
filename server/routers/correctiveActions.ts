import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import * as db from '../db';
// import { sendCorrectiveActionAssignmentEmail, sendCorrectiveActionStatusChangeEmail, sendCorrectiveActionDueDateAlert } from '../lib/survey-email-service';

export const correctiveActionsRouter = router({
  // Crear nueva acción correctiva
  create: protectedProcedure
    .input(z.object({
      description: z.string().min(1, "La descripción es requerida"),
      riskLevel: z.enum(['nulo', 'bajo', 'medio', 'alto', 'muy_alto']),
      category: z.string().optional(),
      departamento: z.string().optional(),
      responsibleUserId: z.number().optional(),
      dueDate: z.string().optional(), // ISO date string
      surveyResponseId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions, users } = await import('../../drizzle/schema');
      
      // Insertar acción correctiva
      const [action] = await dbInstance.insert(correctiveActions).values({
        description: input.description,
        riskLevel: input.riskLevel,
        category: input.category,
        departamento: input.departamento,
        responsibleUserId: input.responsibleUserId,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        surveyResponseId: input.surveyResponseId,
        status: 'pendiente',
      }).$returningId();

      // Enviar correo de asignación si hay responsable
      if (input.responsibleUserId) {
        const { eq } = await import('drizzle-orm');
        const [assignedUser] = await dbInstance.select().from(users).where(eq(users.id, input.responsibleUserId));
        
        if (assignedUser?.email) {
          // TODO: Implementar envío de correo
          /* await sendCorrectiveActionAssignmentEmail({
            to: assignedUser.email,
            actionTitle: input.category || 'Acción Correctiva',
            actionDescription: input.description,
            riskLevel: input.riskLevel,
            dueDate: input.dueDate,
            assignedBy: ctx.user.name || ctx.user.email,
          }); */
        }
      }

      return { success: true, id: action.id };
    }),

  // Obtener todas las acciones correctivas
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(['pendiente', 'en_proceso', 'completada', 'cancelada']).optional(),
      departamento: z.string().optional(),
      responsibleUserId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions, users } = await import('../../drizzle/schema');
      const { eq, and, sql } = await import('drizzle-orm');

      const conditions = [];
      if (input?.status) conditions.push(eq(correctiveActions.status, input.status));
      if (input?.departamento) conditions.push(eq(correctiveActions.departamento, input.departamento));
      if (input?.responsibleUserId) conditions.push(eq(correctiveActions.responsibleUserId, input.responsibleUserId));

      const actions = await dbInstance
        .select({
          id: correctiveActions.id,
          description: correctiveActions.description,
          riskLevel: correctiveActions.riskLevel,
          category: correctiveActions.category,
          departamento: correctiveActions.departamento,
          status: correctiveActions.status,
          dueDate: correctiveActions.dueDate,
          createdAt: correctiveActions.createdAt,
          completedAt: correctiveActions.completedAt,
          responsibleUserId: correctiveActions.responsibleUserId,
          responsibleUserName: users.name,
          responsibleUserEmail: users.email,
        })
        .from(correctiveActions)
        .leftJoin(users, eq(correctiveActions.responsibleUserId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sql`${correctiveActions.createdAt} DESC`);

      return actions;
    }),

  // Obtener acción correctiva por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions, users } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const [action] = await dbInstance
        .select({
          id: correctiveActions.id,
          description: correctiveActions.description,
          riskLevel: correctiveActions.riskLevel,
          category: correctiveActions.category,
          departamento: correctiveActions.departamento,
          status: correctiveActions.status,
          dueDate: correctiveActions.dueDate,
          createdAt: correctiveActions.createdAt,
          completedAt: correctiveActions.completedAt,
          responsibleUserId: correctiveActions.responsibleUserId,
          responsibleUserName: users.name,
          responsibleUserEmail: users.email,
          surveyResponseId: correctiveActions.surveyResponseId,
          notes: correctiveActions.notes,
        })
        .from(correctiveActions)
        .leftJoin(users, eq(correctiveActions.responsibleUserId, users.id))
        .where(eq(correctiveActions.id, input.id));

      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Acción correctiva no encontrada' });
      }

      return action;
    }),

  // Actualizar acción correctiva
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().min(1).optional(),
      riskLevel: z.enum(['nulo', 'bajo', 'medio', 'alto', 'muy_alto']).optional(),
      category: z.string().optional(),
      departamento: z.string().optional(),
      responsibleUserId: z.number().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions, users } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const updateData: any = {};
      if (input.description) updateData.description = input.description;
      if (input.riskLevel) updateData.riskLevel = input.riskLevel;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.departamento !== undefined) updateData.departamento = input.departamento;
      if (input.responsibleUserId !== undefined) updateData.responsibleUserId = input.responsibleUserId;
      if (input.dueDate) updateData.dueDate = new Date(input.dueDate);

      await dbInstance.update(correctiveActions)
        .set(updateData)
        .where(eq(correctiveActions.id, input.id));

      // Si se reasignó, enviar correo al nuevo responsable
      if (input.responsibleUserId) {
        const [action] = await dbInstance.select().from(correctiveActions).where(eq(correctiveActions.id, input.id));
        const [assignedUser] = await dbInstance.select().from(users).where(eq(users.id, input.responsibleUserId));
        
        if (assignedUser?.email && action) {
          // TODO: Implementar envío de correo
          /* await sendCorrectiveActionAssignmentEmail({
            to: assignedUser.email,
            actionTitle: action.category || 'Acción Correctiva',
            actionDescription: action.description,
            riskLevel: action.riskLevel,
            dueDate: action.dueDate,
            assignedBy: ctx.user.name || ctx.user.email,
          }); */
        }
      }

      return { success: true };
    }),

  // Actualizar estado de acción correctiva
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['pendiente', 'en_proceso', 'completada', 'cancelada']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions, users } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const updateData: any = { status: input.status };
      if (input.notes) updateData.notes = input.notes;
      if (input.status === 'completada') {
        updateData.completedAt = new Date();
      }

      await dbInstance.update(correctiveActions)
        .set(updateData)
        .where(eq(correctiveActions.id, input.id));

      // Obtener información de la acción y el responsable
      const [action] = await dbInstance
        .select({
          description: correctiveActions.description,
          category: correctiveActions.category,
          responsibleUserId: correctiveActions.responsibleUserId,
          responsibleUserEmail: users.email,
        })
        .from(correctiveActions)
        .leftJoin(users, eq(correctiveActions.responsibleUserId, users.id))
        .where(eq(correctiveActions.id, input.id));

      // Enviar correo de cambio de estado
      if (action?.responsibleUserEmail) {
        // TODO: Implementar envío de correo
        /* await sendCorrectiveActionStatusChangeEmail({
          to: action.responsibleUserEmail,
          actionTitle: action.category || 'Acción Correctiva',
          newStatus: input.status,
          notes: input.notes,
          changedBy: ctx.user.name || ctx.user.email,
        }); */
      }

      return { success: true };
    }),

  // Obtener estadísticas de cumplimiento
  getStatistics: protectedProcedure
    .query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions } = await import('../../drizzle/schema');
      const { eq, and, sql, lt } = await import('drizzle-orm');

      // Contar por estado
      const statusCounts = await dbInstance
        .select({
          status: correctiveActions.status,
          count: sql<number>`count(*)`,
        })
        .from(correctiveActions)
        .groupBy(correctiveActions.status);

      // Contar acciones vencidas (pendientes o en proceso con fecha límite pasada)
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const [overdueResult] = await dbInstance
        .select({
          count: sql<number>`count(*)`,
        })
        .from(correctiveActions)
        .where(
          and(
            sql`${correctiveActions.status} IN ('pendiente', 'en_proceso')`,
            sql`${correctiveActions.dueDate} < ${now}`
          )
        );

      // Contar acciones por vencer (próximos 7 días)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];
      const [dueSoonResult] = await dbInstance
        .select({
          count: sql<number>`count(*)`,
        })
        .from(correctiveActions)
        .where(
          and(
            sql`${correctiveActions.status} IN ('pendiente', 'en_proceso')`,
            sql`${correctiveActions.dueDate} BETWEEN ${now} AND ${sevenDaysStr}`
          )
        );

      // Estadísticas por departamento
      const departmentStats = await dbInstance
        .select({
          departamento: correctiveActions.departamento,
          total: sql<number>`count(*)`,
          completed: sql<number>`sum(case when ${correctiveActions.status} = 'completada' then 1 else 0 end)`,
        })
        .from(correctiveActions)
        .where(sql`${correctiveActions.departamento} IS NOT NULL`)
        .groupBy(correctiveActions.departamento);

      return {
        byStatus: statusCounts,
        overdue: overdueResult?.count || 0,
        dueSoon: dueSoonResult?.count || 0,
        byDepartment: departmentStats,
      };
    }),

  // Obtener acciones próximas a vencer
  getDueSoon: protectedProcedure
    .query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions, users } = await import('../../drizzle/schema');
      const { eq, and, sql } = await import('drizzle-orm');

      const now = new Date().toISOString().split('T')[0];
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

      const actions = await dbInstance
        .select({
          id: correctiveActions.id,
          description: correctiveActions.description,
          category: correctiveActions.category,
          dueDate: correctiveActions.dueDate,
          status: correctiveActions.status,
          responsibleUserName: users.name,
          departamento: correctiveActions.departamento,
        })
        .from(correctiveActions)
        .leftJoin(users, eq(correctiveActions.responsibleUserId, users.id))
        .where(
          and(
            sql`${correctiveActions.status} IN ('pendiente', 'en_proceso')`,
            sql`${correctiveActions.dueDate} BETWEEN ${now} AND ${sevenDaysStr}`
          )
        )
        .orderBy(correctiveActions.dueDate);

      return actions;
    }),
});
