import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import * as db from '../db';
import { sendActionAssignmentNotification, sendActionStatusChangeNotification } from '../lib/corrective-actions-email-service';

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
          // Enviar notificación de asignación
          try {
            await sendActionAssignmentNotification({
              to: assignedUser.email,
              responsibleName: assignedUser.name || assignedUser.email,
              actionId: action.id,
              description: input.description,
              riskLevel: input.riskLevel,
              department: input.departamento || 'No especificado',
              dueDate: input.dueDate ? new Date(input.dueDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin fecha límite',
              actionUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/surveys/corrective-actions?id=${action.id}`,
            });
          } catch (error) {
            console.error('Error al enviar notificación de asignación:', error);
            // No lanzar error para no bloquear la creación de la acción
          }
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

      // Obtener estado anterior antes de actualizar
      const [previousAction] = await dbInstance
        .select({
          status: correctiveActions.status,
          description: correctiveActions.description,
          responsibleUserId: correctiveActions.responsibleUserId,
        })
        .from(correctiveActions)
        .where(eq(correctiveActions.id, input.id));

      const updateData: any = { status: input.status };
      if (input.notes) updateData.notes = input.notes;
      if (input.status === 'completada') {
        updateData.completedAt = new Date();
      }

      await dbInstance.update(correctiveActions)
        .set(updateData)
        .where(eq(correctiveActions.id, input.id));

      // Obtener información del responsable para notificación
      if (previousAction?.responsibleUserId) {
        const [responsibleUser] = await dbInstance
          .select({
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, previousAction.responsibleUserId));

        // Enviar correo de cambio de estado
        if (responsibleUser?.email) {
          try {
            await sendActionStatusChangeNotification({
              to: responsibleUser.email,
              recipientName: responsibleUser.name || responsibleUser.email,
              actionId: input.id,
              description: previousAction.description,
              oldStatus: previousAction.status,
              newStatus: input.status,
              changedBy: ctx.user.name || ctx.user.email || 'Sistema',
              actionUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/surveys/corrective-actions?id=${input.id}`,
            });
          } catch (error) {
            console.error('Error al enviar notificación de cambio de estado:', error);
            // No lanzar error para no bloquear la actualización
          }
        }
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

  // Enviar recordatorios de acciones próximas a vencer
  sendDueReminders: protectedProcedure
    .mutation(async ({ ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions, users } = await import('../../drizzle/schema');
      const { eq, and, sql } = await import('drizzle-orm');
      const { sendActionDueReminder } = await import('../lib/corrective-actions-email-service');

      // Obtener acciones próximas a vencer (próximos 7 días)
      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const actions = await dbInstance
        .select({
          id: correctiveActions.id,
          description: correctiveActions.description,
          riskLevel: correctiveActions.riskLevel,
          dueDate: correctiveActions.dueDate,
          responsibleUserId: correctiveActions.responsibleUserId,
          responsibleUserName: users.name,
          responsibleUserEmail: users.email,
        })
        .from(correctiveActions)
        .leftJoin(users, eq(correctiveActions.responsibleUserId, users.id))
        .where(
          and(
            sql`${correctiveActions.status} IN ('pendiente', 'en_proceso')`,
            sql`${correctiveActions.dueDate} IS NOT NULL`,
            sql`${correctiveActions.dueDate} BETWEEN ${now.toISOString().split('T')[0]} AND ${sevenDaysFromNow.toISOString().split('T')[0]}`
          )
        );

      let sentCount = 0;
      let errorCount = 0;

      for (const action of actions) {
        if (action.responsibleUserEmail && action.dueDate) {
          const daysRemaining = Math.ceil((new Date(action.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          try {
            await sendActionDueReminder({
              to: action.responsibleUserEmail,
              responsibleName: action.responsibleUserName || action.responsibleUserEmail,
              actionId: action.id,
              description: action.description,
              riskLevel: action.riskLevel,
              dueDate: new Date(action.dueDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
              daysRemaining,
              actionUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/surveys/corrective-actions?id=${action.id}`,
            });
            sentCount++;
          } catch (error) {
            console.error(`Error al enviar recordatorio para acción #${action.id}:`, error);
            errorCount++;
          }
        }
      }

      return {
        success: true,
        sent: sentCount,
        errors: errorCount,
        total: actions.length,
      };
    }),

  // Enviar alertas de acciones vencidas
  sendOverdueAlerts: protectedProcedure
    .mutation(async ({ ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions, users } = await import('../../drizzle/schema');
      const { eq, and, sql, lt } = await import('drizzle-orm');
      const { sendActionOverdueNotification } = await import('../lib/corrective-actions-email-service');

      // Obtener acciones vencidas
      const now = new Date();
      const actions = await dbInstance
        .select({
          id: correctiveActions.id,
          description: correctiveActions.description,
          riskLevel: correctiveActions.riskLevel,
          dueDate: correctiveActions.dueDate,
          responsibleUserId: correctiveActions.responsibleUserId,
          responsibleUserName: users.name,
          responsibleUserEmail: users.email,
        })
        .from(correctiveActions)
        .leftJoin(users, eq(correctiveActions.responsibleUserId, users.id))
        .where(
          and(
            sql`${correctiveActions.status} IN ('pendiente', 'en_proceso')`,
            sql`${correctiveActions.dueDate} IS NOT NULL`,
            sql`${correctiveActions.dueDate} < ${now.toISOString().split('T')[0]}`
          )
        );

      let sentCount = 0;
      let errorCount = 0;

      for (const action of actions) {
        if (action.responsibleUserEmail && action.dueDate) {
          const daysOverdue = Math.ceil((now.getTime() - new Date(action.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          
          try {
            await sendActionOverdueNotification({
              to: action.responsibleUserEmail,
              responsibleName: action.responsibleUserName || action.responsibleUserEmail,
              actionId: action.id,
              description: action.description,
              riskLevel: action.riskLevel,
              dueDate: new Date(action.dueDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
              daysOverdue,
              actionUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/surveys/corrective-actions?id=${action.id}`,
            });
            sentCount++;
          } catch (error) {
            console.error(`Error al enviar alerta de vencimiento para acción #${action.id}:`, error);
            errorCount++;
          }
        }
      }

      return {
        success: true,
        sent: sentCount,
        errors: errorCount,
        total: actions.length,
      };
    }),

  // Enviar resumen de acciones vencidas al coordinador
  sendOverdueSummaryToCoordinator: protectedProcedure
    .input(z.object({
      coordinatorEmail: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions, users } = await import('../../drizzle/schema');
      const { eq, and, sql } = await import('drizzle-orm');
      const { sendOverdueActionsSummary } = await import('../lib/corrective-actions-email-service');

      // Obtener acciones vencidas con información del responsable
      const now = new Date();
      const overdueActions = await dbInstance
        .select({
          id: correctiveActions.id,
          description: correctiveActions.description,
          departamento: correctiveActions.departamento,
          dueDate: correctiveActions.dueDate,
          responsibleUserName: users.name,
          responsibleUserEmail: users.email,
        })
        .from(correctiveActions)
        .leftJoin(users, eq(correctiveActions.responsibleUserId, users.id))
        .where(
          and(
            sql`${correctiveActions.status} IN ('pendiente', 'en_proceso')`,
            sql`${correctiveActions.dueDate} IS NOT NULL`,
            sql`${correctiveActions.dueDate} < ${now.toISOString().split('T')[0]}`
          )
        );

      if (overdueActions.length === 0) {
        return {
          success: true,
          sent: 0,
          message: 'No hay acciones vencidas para reportar',
        };
      }

      // Obtener nombre del coordinador
      const [coordinator] = await dbInstance
        .select({ name: users.name })
        .from(users)
        .where(eq(users.email, input.coordinatorEmail));

      // Preparar datos para el correo
      const summaryData = overdueActions.map(action => ({
        id: action.id,
        description: action.description,
        responsibleName: action.responsibleUserName || action.responsibleUserEmail || 'Sin asignar',
        department: action.departamento || 'No especificado',
        dueDate: action.dueDate ? new Date(action.dueDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin fecha',
        daysOverdue: action.dueDate ? Math.ceil((now.getTime() - new Date(action.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      }));

      try {
        await sendOverdueActionsSummary({
          to: input.coordinatorEmail,
          coordinatorName: coordinator?.name || input.coordinatorEmail,
          overdueActions: summaryData,
          dashboardUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/surveys/corrective-actions`,
        });

        return {
          success: true,
          sent: 1,
          overdueCount: overdueActions.length,
        };
      } catch (error) {
        console.error('Error al enviar resumen al coordinador:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al enviar el correo al coordinador',
        });
      }
    }),

  // Eliminar acción correctiva
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { correctiveActions } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      await dbInstance.delete(correctiveActions)
        .where(eq(correctiveActions.id, input.id));

      return { success: true };
    }),
});
