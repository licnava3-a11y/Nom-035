import { sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { requirePermission, requireDelete } from "../permissions";
import * as db from "../db";
import {
  sendActionAssignmentNotification,
  sendActionStatusChangeNotification,
} from "../lib/corrective-actions-email-service";
import { storagePut } from "../storage";
import { logCorrectiveActionEvidence } from "../helpers/evidenceLogger";
import PDFDocument from "pdfkit";

export const correctiveActionsRouter = router({
  // Crear nueva acción correctiva
  create: protectedProcedure
    .use(requirePermission("can_create"))
    .input(
      z.object({
        description: z.string().min(1, "La descripción es requerida"),
        riskLevel: z.enum(["nulo", "bajo", "medio", "alto", "muy_alto"]),
        category: z.string().optional(),
        departamento: z.string().optional(),
        responsibleUserId: z.number().optional(),
        dueDate: z.string().optional(),
        surveyResponseId: z.number().optional(),
        // PROMPT 8.5 — REQ-1
        actionLevel: z
          .enum(["organizacional", "grupal", "individual"])
          .default("organizacional"),
        startDate: z.string().optional(),
        title: z.string().optional(),
        // PROMPT 8.5 — REQ-2
        clinicalTitle: z.enum(["medico", "psicologo", "psiquiatra"]).optional(),
        cedulaProfesional: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions, users } = await import("../../drizzle/schema");

      // REQ-2: Validar que acciones de nivel individual tengan responsable clínico
      if (input.actionLevel === "individual" && !input.clinicalTitle) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Las acciones de Nivel 3 (individual) requieren un responsable clínico válido: médico, psiólogo o psiquiatra.",
        });
      }

      // Insertar acción correctiva
      const [action] = await dbInstance
        .insert(correctiveActions)
        .values({
          description: input.description,
          riskLevel: (input as any).riskLevel,
          category: input.category,
          departamento: input.departamento || "General",
          responsibleUserId: input.responsibleUserId,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          surveyResponseId: input.surveyResponseId,
          actionLevel: input.actionLevel,
          title: input.title,
          startDate: input.startDate ? new Date(input.startDate) : null,
          clinicalTitle: input.clinicalTitle,
          cedulaProfesional: input.cedulaProfesional,
          status: "pendiente",
        } as any)
        .$returningId();

      // Enviar correo de asignación si hay responsable
      if (input.responsibleUserId) {
        const { eq } = await import("drizzle-orm");
        const [assignedUser] = await dbInstance
          .select()
          .from(users)
          .where(eq(users.id, input.responsibleUserId));

        if (assignedUser?.email) {
          // Enviar notificación de asignación
          try {
            await sendActionAssignmentNotification({
              to: assignedUser.email,
              responsibleName: assignedUser.name || assignedUser.email,
              actionId: action.id,
              description: input.description,
              riskLevel: (input as any).riskLevel,
              department: input.departamento || "No especificado",
              dueDate: input.dueDate
                ? new Date(input.dueDate).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Sin fecha límite",
              actionUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/surveys/corrective-actions?id=${action.id}`,
            });
          } catch (error) {
            console.error("Error al enviar notificación de asignación:", error);
            // No lanzar error para no bloquear la creación de la acción
          }
        }
      }

      return { success: true, id: action.id };
    }),

  // Obtener todas las acciones correctivas
  getAll: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["pendiente", "en_proceso", "completada", "cancelada"])
            .optional(),
          departamento: z.string().optional(),
          responsibleUserId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions, users } = await import("../../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      const conditions = [];
      if (input?.status)
        conditions.push(eq(correctiveActions.status, input.status));
      if (input?.departamento)
        conditions.push(eq(correctiveActions.departamento, input.departamento));
      if (input?.responsibleUserId)
        conditions.push(
          eq(correctiveActions.responsibleUserId, input.responsibleUserId)
        );

      const actions = await dbInstance
        .select({
          id: correctiveActions.id,
          description: correctiveActions.description,
          riskLevel: (correctiveActions as any).riskLevel,
          category: correctiveActions.category,
          departamento: correctiveActions.departamento,
          status: correctiveActions.status,
          dueDate: correctiveActions.dueDate,
          createdAt: correctiveActions.createdAt,
          completedAt: correctiveActions.completedAt,
          responsibleUserId: correctiveActions.responsibleUserId,
          responsibleUserName: users.name,
          responsibleUserEmail: users.email,
          pdfUrl: correctiveActions.pdfUrl,
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
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions, users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const [action] = await dbInstance
        .select({
          id: correctiveActions.id,
          description: correctiveActions.description,
          riskLevel: (correctiveActions as any).riskLevel,
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Acción correctiva no encontrada",
        });
      }

      return action;
    }),

  // Actualizar acción correctiva
  update: protectedProcedure
    .use(requirePermission("can_edit"))
    .input(
      z.object({
        id: z.number(),
        description: z.string().min(1).optional(),
        riskLevel: z
          .enum(["nulo", "bajo", "medio", "alto", "muy_alto"])
          .optional(),
        category: z.string().optional(),
        departamento: z.string().optional(),
        responsibleUserId: z.number().optional(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions, users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const updateData: any = {};
      if (input.description) updateData.description = input.description;
      if ((input as any).riskLevel)
        (updateData as any).riskLevel = (input as any).riskLevel;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.departamento !== undefined)
        updateData.departamento = input.departamento;
      if (input.responsibleUserId !== undefined)
        updateData.responsibleUserId = input.responsibleUserId;
      if (input.dueDate) updateData.dueDate = new Date(input.dueDate);

      await dbInstance
        .update(correctiveActions)
        .set(updateData)
        .where(eq(correctiveActions.id, input.id));

      // Si se reasignó, enviar correo al nuevo responsable
      if (input.responsibleUserId) {
        const [action] = await dbInstance
          .select()
          .from(correctiveActions)
          .where(eq(correctiveActions.id, input.id));
        const [assignedUser] = await dbInstance
          .select()
          .from(users)
          .where(eq(users.id, input.responsibleUserId));

        if (assignedUser?.email && action) {
          // TODO: Implementar envío de correo
          /* await sendCorrectiveActionAssignmentEmail({
            to: assignedUser.email,
            actionTitle: action.category || 'Acción Correctiva',
            actionDescription: action.description,
            riskLevel: (action as any).riskLevel,
            dueDate: action.dueDate,
            assignedBy: ctx.user.name || ctx.user.email,
          }); */
        }
      }

      return { success: true };
    }),

  // Actualizar estado de acción correctiva
  updateStatus: protectedProcedure
    .use(requirePermission("can_edit"))
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pendiente", "en_proceso", "completada", "cancelada"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions, users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

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
      if (input.status === "completada") {
        updateData.completedAt = new Date();
      }

      await dbInstance
        .update(correctiveActions)
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
              changedBy: ctx.user!.name || ctx.user!.email || "Sistema",
              actionUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/surveys/corrective-actions?id=${input.id}`,
            });
          } catch (error) {
            console.error(
              "Error al enviar notificación de cambio de estado:",
              error
            );
            // No lanzar error para no bloquear la actualización
          }
        }
      }

      return { success: true };
    }),

  // Obtener estadísticas de cumplimiento
  getStatistics: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const { correctiveActions } = await import("../../drizzle/schema");
    const { eq, and, sql, lt } = await import("drizzle-orm");

    // Contar por estado
    const statusCounts = await dbInstance
      .select({
        status: correctiveActions.status,
        count: sql<number>`count(*)`,
      })
      .from(correctiveActions)
      .groupBy(correctiveActions.status);

    // Contar acciones vencidas (pendientes o en proceso con fecha límite pasada)
    const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
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
    const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];
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
  getDueSoon: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const { correctiveActions, users } = await import("../../drizzle/schema");
    const { eq, and, sql } = await import("drizzle-orm");

    const now = new Date().toISOString().split("T")[0];
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];

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
  sendDueReminders: protectedProcedure.mutation(async ({ ctx }) => {
    const dbInstance = await db.getDb();
    if (!dbInstance)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const { correctiveActions, users } = await import("../../drizzle/schema");
    const { eq, and, sql } = await import("drizzle-orm");
    const { sendActionDueReminder } = await import(
      "../lib/corrective-actions-email-service"
    );

    // Obtener acciones próximas a vencer (próximos 7 días)
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const actions = await dbInstance
      .select({
        id: correctiveActions.id,
        description: correctiveActions.description,
        riskLevel: (correctiveActions as any).riskLevel,
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
          sql`${correctiveActions.dueDate} BETWEEN ${now.toISOString().split("T")[0]} AND ${sevenDaysFromNow.toISOString().split("T")[0]}`
        )
      );

    let sentCount = 0;
    let errorCount = 0;

    for (const action of actions) {
      if (action.responsibleUserEmail && action.dueDate) {
        const daysRemaining = Math.ceil(
          (new Date(action.dueDate).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        try {
          await sendActionDueReminder({
            to: action.responsibleUserEmail,
            responsibleName:
              action.responsibleUserName || action.responsibleUserEmail,
            actionId: action.id,
            description: action.description,
            riskLevel: (action as any).riskLevel,
            dueDate: new Date(action.dueDate).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            daysRemaining,
            actionUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/surveys/corrective-actions?id=${action.id}`,
          });
          sentCount++;
        } catch (error) {
          console.error(
            `Error al enviar recordatorio para acción #${action.id}:`,
            error
          );
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
  sendOverdueAlerts: protectedProcedure.mutation(async ({ ctx }) => {
    const dbInstance = await db.getDb();
    if (!dbInstance)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const { correctiveActions, users } = await import("../../drizzle/schema");
    const { eq, and, sql, lt } = await import("drizzle-orm");
    const { sendActionOverdueNotification } = await import(
      "../lib/corrective-actions-email-service"
    );

    // Obtener acciones vencidas
    const now = new Date();
    const actions = await dbInstance
      .select({
        id: correctiveActions.id,
        description: correctiveActions.description,
        riskLevel: (correctiveActions as any).riskLevel,
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
          sql`${correctiveActions.dueDate} < ${now.toISOString().split("T")[0]}`
        )
      );

    let sentCount = 0;
    let errorCount = 0;

    for (const action of actions) {
      if (action.responsibleUserEmail && action.dueDate) {
        const daysOverdue = Math.ceil(
          (now.getTime() - new Date(action.dueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        try {
          await sendActionOverdueNotification({
            to: action.responsibleUserEmail,
            responsibleName:
              action.responsibleUserName || action.responsibleUserEmail,
            actionId: action.id,
            description: action.description,
            riskLevel: (action as any).riskLevel,
            dueDate: new Date(action.dueDate).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            daysOverdue,
            actionUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/surveys/corrective-actions?id=${action.id}`,
          });
          sentCount++;
        } catch (error) {
          console.error(
            `Error al enviar alerta de vencimiento para acción #${action.id}:`,
            error
          );
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
    .input(
      z.object({
        coordinatorEmail: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions, users } = await import("../../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");
      const { sendOverdueActionsSummary } = await import(
        "../lib/corrective-actions-email-service"
      );

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
            sql`${correctiveActions.dueDate} < ${now.toISOString().split("T")[0]}`
          )
        );

      if (overdueActions.length === 0) {
        return {
          success: true,
          sent: 0,
          message: "No hay acciones vencidas para reportar",
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
        responsibleName:
          action.responsibleUserName ||
          action.responsibleUserEmail ||
          "Sin asignar",
        department: action.departamento || "No especificado",
        dueDate: action.dueDate
          ? new Date(action.dueDate).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "Sin fecha",
        daysOverdue: action.dueDate
          ? Math.ceil(
              (now.getTime() - new Date(action.dueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
      }));

      try {
        await sendOverdueActionsSummary({
          to: input.coordinatorEmail,
          coordinatorName: coordinator?.name || input.coordinatorEmail,
          overdueActions: summaryData,
          dashboardUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/surveys/corrective-actions`,
        });

        return {
          success: true,
          sent: 1,
          overdueCount: overdueActions.length,
        };
      } catch (error) {
        console.error("Error al enviar resumen al coordinador:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al enviar el correo al coordinador",
        });
      }
    }),

  // Eliminar acción correctiva
  delete: protectedProcedure
    .use(requireDelete())
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await dbInstance
        .delete(correctiveActions)
        .where(eq(correctiveActions.id, input.id));

      return { success: true };
    }),

  // Generar PDF de acción correctiva
  generatePDF: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions, users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Obtener acción correctiva
      const [action] = await dbInstance
        .select()
        .from(correctiveActions)
        .where(eq(correctiveActions.id, input.id));
      if (!action) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Acción correctiva no encontrada",
        });
      }

      // Obtener usuario responsable si existe
      let responsibleUser = null;
      if (action.responsibleUserId) {
        [responsibleUser] = await dbInstance
          .select()
          .from(users)
          .where(eq(users.id, action.responsibleUserId));
      }

      // Generar PDF
      const doc = new PDFDocument({ size: "LETTER", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", chunk => chunks.push(chunk));

      await new Promise<void>((resolve, reject) => {
        doc.on("end", () => resolve());
        doc.on("error", reject);

        // Encabezado
        doc
          .fontSize(20)
          .font("Helvetica-Bold")
          .text("PLAN DE ACCIÓN CORRECTIVA", { align: "center" });
        doc
          .fontSize(12)
          .font("Helvetica")
          .text("NOM-035-STPS-2018", { align: "center" });
        doc.moveDown(2);

        // Información general
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Información General", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");
        doc.text(`Folio: AC-${action.id.toString().padStart(6, "0")}`);
        doc.text(
          `Fecha de creación: ${action.createdAt ? new Date(action.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}`
        );
        doc.text(`Estado: ${action.status?.toUpperCase() || "PENDIENTE"}`);
        doc.text(
          `Nivel de riesgo: ${(action as any).riskLevel?.toUpperCase() || "NO ESPECIFICADO"}`
        );
        if (action.category) doc.text(`Categoría: ${action.category}`);
        if (action.departamento)
          doc.text(`Departamento: ${action.departamento}`);
        doc.moveDown(1.5);

        // Descripción
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Descripción del Problema", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");
        doc.text(action.description || "Sin descripción", { align: "justify" });
        doc.moveDown(1.5);

        // Responsable
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Responsable de la Acción", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");
        if (responsibleUser) {
          doc.text(`Nombre: ${responsibleUser.name || "Sin nombre"}`);
          doc.text(`Correo: ${responsibleUser.email || "Sin correo"}`);
        } else {
          doc.text("Sin responsable asignado");
        }
        doc.moveDown(1.5);

        // Fechas
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Fechas Importantes", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");
        if (action.dueDate) {
          doc.text(
            `Fecha límite: ${new Date(action.dueDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`
          );
        } else {
          doc.text("Fecha límite: No establecida");
        }
        if (action.completedAt) {
          doc.text(
            `Fecha de finalización: ${new Date(action.completedAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`
          );
        }
        doc.moveDown(1.5);

        // Observaciones
        if (action.observations) {
          doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .text("Observaciones", { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(11).font("Helvetica");
          doc.text(action.observations, { align: "justify" });
          doc.moveDown(1.5);
        }

        // Pie de página
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(
            `Documento generado el ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`,
            50,
            doc.page.height - 50,
            { align: "center" }
          );

        doc.end();
      });

      const pdfBuffer = Buffer.concat(chunks);

      // Subir PDF a S3
      const filename = `accion_correctiva_${action.id}_${Date.now()}.pdf`;
      const fileKey = `corrective-actions/${action.id}/${filename}`;
      const { url: pdfUrl } = await storagePut(
        fileKey,
        pdfBuffer,
        "application/pdf"
      );

      // Actualizar registro con URL del PDF
      await dbInstance
        .update(correctiveActions)
        .set({ pdfUrl } as any)
        .where(eq(correctiveActions.id, input.id));

      // Registrar evidencia automáticamente
      const actionTitle = `AC-${action.id.toString().padStart(6, "0")} - ${action.description?.substring(0, 50) || "Sin descripción"}`;
      await logCorrectiveActionEvidence(
        action.id,
        actionTitle,
        pdfUrl,
        fileKey,
        ctx.user?.id || 1
      );

      // Retornar URL del PDF
      return {
        pdfUrl,
        filename,
      };
    }),

  // FASE 181: Generar acciones correctivas en 3 niveles con detección de ATS
  generateMultiLevelActions: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number(),
        source_guide: z.enum(["guia_i", "guia_ii", "guia_iii"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions, nom035Results, users, employees } =
        await import("../../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      // Obtener todos los resultados del periodo
      const results = await dbInstance
        .select()
        .from(nom035Results)
        .where(eq(nom035Results.surveyPeriodId, input.surveyPeriodId));

      const actionsCreated = {
        organizacional: 0,
        grupal: 0,
        individual: 0,
        atsDetected: 0,
      };

      // Analizar resultados y generar acciones según nivel de riesgo
      for (const result of results) {
        const riskLevel = result.globalRiskLevel;
        // TODO: Implementar detección de ATS analizando respuestas individuales
        const atsDetected = false; // Simplificado por ahora

        // Generar acciones individuales para riesgo alto/muy alto
        if (riskLevel === "alto" || riskLevel === "muy_alto") {
          await dbInstance.insert(correctiveActions).values({
            surveyPeriodId: input.surveyPeriodId,
            riskLevel,
            actionLevel: "individual",
            targetScope: result.employeeId,
            atsDetected: false,
            source_guide: input.source_guide,
            title: `Acción Individual - Riesgo ${riskLevel}`,
            description: `Seguimiento personalizado para trabajador con nivel de riesgo ${riskLevel}. Evaluar factores específicos y proporcionar apoyo.`,
            priority: riskLevel === "muy_alto" ? "high" : "medium",
            status: "pendiente",
            departamento: (result as any).departamento || "General",
          });
          actionsCreated.individual++;
        }
      }

      // Generar acciones grupales por departamento
      const departmentRisks = await dbInstance
        .select({
          departmentId: employees.departmentId,
          avgRisk: sql<number>`AVG(CASE 
            WHEN ${nom035Results.globalRiskLevel} = 'muy_alto' THEN 5
            WHEN ${nom035Results.globalRiskLevel} = 'alto' THEN 4
            WHEN ${nom035Results.globalRiskLevel} = 'medio' THEN 3
            WHEN ${nom035Results.globalRiskLevel} = 'bajo' THEN 2
            ELSE 1 END)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(nom035Results)
        .leftJoin(employees, eq(nom035Results.employeeId, employees.id))
        .where(eq(nom035Results.surveyPeriodId, input.surveyPeriodId))
        .groupBy(employees.departmentId);

      for (const dept of departmentRisks) {
        if (dept.avgRisk && dept.avgRisk >= 3) {
          await dbInstance.insert(correctiveActions).values({
            surveyPeriodId: input.surveyPeriodId,
            departamento: "Administración", // Departamento por defecto para acciones grupales
            riskLevel: dept.avgRisk >= 4 ? "alto" : "medio",
            actionLevel: "grupal",
            targetScope: dept.departmentId,
            atsDetected: false,
            source_guide: input.source_guide,
            title: `Acción Grupal - Departamento ${dept.departmentId}`,
            description: `Implementar intervenciones grupales en departamento. Riesgo promedio: ${dept.avgRisk.toFixed(2)}. Trabajadores: ${dept.count}.`,
            priority: dept.avgRisk >= 4 ? "high" : "medium",
            status: "pendiente",
          });
          actionsCreated.grupal++;
        }
      }

      // Generar acción organizacional si el riesgo general es alto
      const overallRisk = await dbInstance
        .select({
          avgRisk: sql<number>`AVG(CASE 
            WHEN ${nom035Results.globalRiskLevel} = 'muy_alto' THEN 5
            WHEN ${nom035Results.globalRiskLevel} = 'alto' THEN 4
            WHEN ${nom035Results.globalRiskLevel} = 'medio' THEN 3
            WHEN ${nom035Results.globalRiskLevel} = 'bajo' THEN 2
            ELSE 1 END)`,
        })
        .from(nom035Results)
        .where(eq(nom035Results.surveyPeriodId, input.surveyPeriodId));

      if (overallRisk[0]?.avgRisk && overallRisk[0].avgRisk >= 3.5) {
        await dbInstance.insert(correctiveActions).values({
          surveyPeriodId: input.surveyPeriodId,
          departamento: "Administración", // Departamento por defecto para acciones organizacionales
          riskLevel: overallRisk[0].avgRisk >= 4 ? "alto" : "medio",
          actionLevel: "organizacional",
          targetScope: null,
          atsDetected: false,
          source_guide: input.source_guide,
          title: "Acción Organizacional - Riesgo General Elevado",
          description: `Implementar políticas y programas organizacionales para reducir factores de riesgo psicosocial. Riesgo general: ${overallRisk[0].avgRisk.toFixed(2)}/5.`,
          priority: "high",
          status: "pendiente",
        });
        actionsCreated.organizacional++;
      }

      return {
        success: true,
        actionsCreated,
      };
    }),

  // Obtener acciones por nivel
  getByLevel: protectedProcedure
    .input(
      z.object({
        actionLevel: z.enum(["organizacional", "grupal", "individual"]),
        surveyPeriodId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { correctiveActions, users } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const conditions = [eq(correctiveActions.actionLevel, input.actionLevel)];
      if (input.surveyPeriodId) {
        conditions.push(
          eq(correctiveActions.surveyPeriodId, input.surveyPeriodId)
        );
      }

      const actions = await dbInstance
        .select({
          id: correctiveActions.id,
          title: correctiveActions.title,
          description: correctiveActions.description,
          riskLevel: (correctiveActions as any).riskLevel,
          actionLevel: correctiveActions.actionLevel,
          targetScope: correctiveActions.targetScope,
          atsDetected: correctiveActions.atsDetected,
          source_guide: correctiveActions.source_guide,
          status: correctiveActions.status,
          priority: correctiveActions.priority,
          departamento: correctiveActions.departamento,
          dueDate: correctiveActions.dueDate,
          createdAt: correctiveActions.createdAt,
          completedAt: correctiveActions.completedAt,
        })
        .from(correctiveActions)
        .where(and(...conditions));

      return actions;
    }),

  // PROMPT 8.5 — REQ-3: Reporte de cumplimiento por nivel
  getComplianceByLevel: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    const { correctiveActions } = await import("../../drizzle/schema");
    const { sql } = await import("drizzle-orm");

    const rows = await dbInstance
      .select({
        actionLevel: correctiveActions.actionLevel,
        total: sql<number>`count(*)`,
        completadas: sql<number>`sum(case when ${correctiveActions.status}='completada' then 1 else 0 end)`,
        pendientes: sql<number>`sum(case when ${correctiveActions.status}='pendiente' then 1 else 0 end)`,
        enProceso: sql<number>`sum(case when ${correctiveActions.status}='en_proceso' then 1 else 0 end)`,
      })
      .from(correctiveActions)
      .groupBy(correctiveActions.actionLevel);

    const levels = ["organizacional", "grupal", "individual"] as const;
    return levels.map(level => {
      const row = rows.find(r => r.actionLevel === level);
      return {
        level,
        label:
          level === "organizacional"
            ? "Nivel 1 — Organizacional"
            : level === "grupal"
              ? "Nivel 2 — Grupal"
              : "Nivel 3 — Individual",
        total: Number(row?.total ?? 0),
        completadas: Number(row?.completadas ?? 0),
        pendientes: Number(row?.pendientes ?? 0),
        enProceso: Number(row?.enProceso ?? 0),
      };
    });
  }),

  // PROMPT 8.5 — REQ-4: Alerta de acciones nivel 3 sin responsable clínico
  alertLevel3WithoutClinical: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    const { correctiveActions, users } = await import("../../drizzle/schema");
    const { eq, and, isNull, sql } = await import("drizzle-orm");

    const alerts = await dbInstance
      .select({
        id: correctiveActions.id,
        title: correctiveActions.title,
        description: correctiveActions.description,
        departamento: correctiveActions.departamento,
        status: correctiveActions.status,
        createdAt: correctiveActions.createdAt,
        responsibleUserName: users.name,
      })
      .from(correctiveActions)
      .leftJoin(users, eq(correctiveActions.responsibleUserId, users.id))
      .where(
        and(
          eq(correctiveActions.actionLevel, "individual"),
          isNull((correctiveActions as any).clinicalTitle),
          sql`${correctiveActions.status} != 'cancelada'`
        )
      );

    return {
      count: alerts.length,
      hasAlerts: alerts.length > 0,
      actions: alerts,
    };
  }),

  // PROMPT 8.5 — REQ-5: Resumen ejecutivo de cumplimiento del punto 8.5
  getExecutiveSummary: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    const { correctiveActions } = await import("../../drizzle/schema");
    const { sql } = await import("drizzle-orm");

    const rows = await dbInstance
      .select({
        actionLevel: correctiveActions.actionLevel,
        total: sql<number>`count(*)`,
        completadas: sql<number>`sum(case when ${correctiveActions.status}='completada' then 1 else 0 end)`,
      })
      .from(correctiveActions)
      .where(sql`${correctiveActions.status} != 'cancelada'`)
      .groupBy(correctiveActions.actionLevel);

    const byLevel: Record<string, { total: number; completadas: number }> = {};
    for (const row of rows) {
      if (row.actionLevel)
        byLevel[row.actionLevel] = {
          total: Number(row.total),
          completadas: Number(row.completadas),
        };
    }

    const tieneOrganizacional = (byLevel["organizacional"]?.total ?? 0) > 0;
    const tieneGrupal = (byLevel["grupal"]?.total ?? 0) > 0;
    const tieneIndividual = (byLevel["individual"]?.total ?? 0) > 0;
    const totalAcciones = Object.values(byLevel).reduce(
      (s, v) => s + v.total,
      0
    );
    const totalCompletadas = Object.values(byLevel).reduce(
      (s, v) => s + v.completadas,
      0
    );

    const [alertRow] = await dbInstance
      .select({ count: sql<number>`count(*)` })
      .from(correctiveActions)
      .where(
        sql`${correctiveActions.actionLevel}='individual' and (${correctiveActions as any}.clinicalTitle is null) and ${correctiveActions.status}!='cancelada'`
      );
    const alertasNivel3 = Number(alertRow?.count ?? 0);

    let cumplimiento: "cumple" | "riesgo" | "incumple";
    if (totalAcciones === 0) cumplimiento = "incumple";
    else if (alertasNivel3 > 0) cumplimiento = "riesgo";
    else cumplimiento = "cumple";

    return {
      cumplimiento,
      totalAcciones,
      totalCompletadas,
      porcentajeCompletado:
        totalAcciones > 0
          ? Math.round((totalCompletadas / totalAcciones) * 100)
          : 0,
      tieneOrganizacional,
      tieneGrupal,
      tieneIndividual,
      alertasNivel3SinClinico: alertasNivel3,
      byLevel,
      mensaje:
        cumplimiento === "cumple"
          ? "El centro de trabajo cumple con el punto 8.5 de la NOM-035-STPS-2018."
          : cumplimiento === "riesgo"
            ? `Atención: ${alertasNivel3} acción(es) de Nivel 3 sin responsable clínico asignado.`
            : "El centro de trabajo no tiene acciones registradas para el punto 8.5.",
    };
  }),

  // PROMPT 8.5 — REQ-2: Exportar Resumen Ejecutivo 8.5 como PDF con fecha y sello digital
  generateResumen85PDF: protectedProcedure.mutation(async ({ ctx }) => {
    const dbInstance = await db.getDb();
    if (!dbInstance)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const { correctiveActions } = await import("../../drizzle/schema");

    // Obtener datos del resumen por nivel
    const rows = await dbInstance
      .select({
        actionLevel: correctiveActions.actionLevel,
        total: sql<number>`count(*)`,
        completadas: sql<number>`sum(case when ${correctiveActions.status}='completada' then 1 else 0 end)`,
        pendientes: sql<number>`sum(case when ${correctiveActions.status}='pendiente' then 1 else 0 end)`,
        enProceso: sql<number>`sum(case when ${correctiveActions.status}='en_proceso' then 1 else 0 end)`,
      })
      .from(correctiveActions)
      .groupBy(correctiveActions.actionLevel);

    const [alertRow] = await dbInstance
      .select({ count: sql<number>`count(*)` })
      .from(correctiveActions)
      .where(
        sql`${correctiveActions.actionLevel}='individual' and (${correctiveActions as any}.clinicalTitle is null) and ${correctiveActions.status}!='cancelada'`
      );
    const alertasNivel3 = Number(alertRow?.count ?? 0);

    const byLevel: Record<
      string,
      {
        total: number;
        completadas: number;
        pendientes: number;
        enProceso: number;
      }
    > = {};
    for (const row of rows) {
      if (row.actionLevel) {
        byLevel[row.actionLevel] = {
          total: Number(row.total),
          completadas: Number(row.completadas),
          pendientes: Number(row.pendientes),
          enProceso: Number(row.enProceso),
        };
      }
    }

    const tieneOrganizacional = (byLevel["organizacional"]?.total ?? 0) > 0;
    const tieneGrupal = (byLevel["grupal"]?.total ?? 0) > 0;
    const tieneIndividual = (byLevel["individual"]?.total ?? 0) > 0;
    const totalAcciones = Object.values(byLevel).reduce(
      (s, v) => s + v.total,
      0
    );
    const totalCompletadas = Object.values(byLevel).reduce(
      (s, v) => s + v.completadas,
      0
    );
    const cumplimiento =
      totalAcciones === 0
        ? "incumple"
        : alertasNivel3 > 0
          ? "riesgo"
          : "cumple";

    const fechaEmision = new Date().toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const horaEmision = new Date().toLocaleTimeString("es-MX");
    const responsable = ctx.user?.name ?? "Responsable de SST";
    const folioDoc = `RES85-${Date.now()}`;

    // Generar PDF con PDFKit
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    // Encabezado
    doc
      .fontSize(18)
      .fillColor("#1a365d")
      .text("RESUMEN EJECUTIVO", { align: "center" });
    doc
      .fontSize(14)
      .fillColor("#2d3748")
      .text("Punto 8.5 — NOM-035-STPS-2018", { align: "center" });
    doc
      .fontSize(10)
      .fillColor("#718096")
      .text(
        "Clasificación y Seguimiento de Acciones Preventivas y Correctivas",
        { align: "center" }
      );
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.5);

    // Datos de emisión
    doc.fontSize(10).fillColor("#4a5568");
    doc.text(`Fecha de emisión: ${fechaEmision} ${horaEmision}`, {
      align: "right",
    });
    doc.text(`Emitido por: ${responsable}`, { align: "right" });
    doc.text(`Folio: ${folioDoc}`, { align: "right" });
    doc.moveDown();

    // Veredicto
    const veredictoColor =
      cumplimiento === "cumple"
        ? "#276749"
        : cumplimiento === "riesgo"
          ? "#c05621"
          : "#c53030";
    const veredictoTexto =
      cumplimiento === "cumple"
        ? "✓ CUMPLE — El centro de trabajo cumple con el punto 8.5 de la NOM-035-STPS-2018"
        : cumplimiento === "riesgo"
          ? `⚠ EN RIESGO — ${alertasNivel3} acción(es) de Nivel 3 sin responsable clínico asignado`
          : "✗ INCUMPLE — No hay acciones registradas para el punto 8.5";
    doc
      .fontSize(12)
      .fillColor(veredictoColor)
      .text(veredictoTexto, { align: "center" });
    doc.moveDown();

    // Métricas generales
    doc
      .fontSize(12)
      .fillColor("#1a365d")
      .text("Métricas Generales", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#4a5568");
    doc.text(`Total de acciones registradas: ${totalAcciones}`);
    doc.text(`Acciones completadas: ${totalCompletadas}`);
    doc.text(
      `Porcentaje de avance: ${totalAcciones > 0 ? Math.round((totalCompletadas / totalAcciones) * 100) : 0}%`
    );
    doc.text(`Alertas Nivel 3 sin clínico: ${alertasNivel3}`);
    doc.moveDown();

    // Reporte por nivel
    doc
      .fontSize(12)
      .fillColor("#1a365d")
      .text("Reporte por Nivel de Intervención", { underline: true });
    doc.moveDown(0.3);

    const niveles = [
      {
        key: "organizacional",
        label: "Nivel 1 — Organizacional",
        tiene: tieneOrganizacional,
      },
      { key: "grupal", label: "Nivel 2 — Grupal", tiene: tieneGrupal },
      {
        key: "individual",
        label: "Nivel 3 — Individual (Clínico)",
        tiene: tieneIndividual,
      },
    ];

    for (const nivel of niveles) {
      const data = byLevel[nivel.key] ?? {
        total: 0,
        completadas: 0,
        pendientes: 0,
        enProceso: 0,
      };
      const statusColor = nivel.tiene ? "#276749" : "#c53030";
      const statusMark = nivel.tiene ? "✓" : "✗";
      doc
        .fontSize(11)
        .fillColor(statusColor)
        .text(`${statusMark} ${nivel.label}`);
      doc.fontSize(10).fillColor("#4a5568");
      doc.text(
        `   Total: ${data.total}  |  Completadas: ${data.completadas}  |  En proceso: ${data.enProceso}  |  Pendientes: ${data.pendientes}`
      );
      doc.moveDown(0.5);
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.5);

    // Sello digital
    doc
      .fontSize(9)
      .fillColor("#a0aec0")
      .text("Documento generado digitalmente por la Plataforma NOM-035 STPS", {
        align: "center",
      });
    doc.text(
      `Folio: ${folioDoc} | Fecha: ${fechaEmision} | Responsable: ${responsable}`,
      { align: "center" }
    );
    doc.text(
      "Este documento tiene validez como evidencia de cumplimiento normativo conforme a la NOM-035-STPS-2018.",
      { align: "center" }
    );

    // Espacio para firma
    doc.moveDown(2);
    doc.moveTo(150, doc.y).lineTo(350, doc.y).strokeColor("#4a5568").stroke();
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor("#4a5568")
      .text(responsable, { align: "center" });
    doc.text("Responsable de Seguridad y Salud en el Trabajo", {
      align: "center",
    });

    doc.end();
    await new Promise<void>(resolve => doc.on("end", resolve));

    const pdfBuffer = Buffer.concat(chunks);
    const filename = `resumen_85_${Date.now()}.pdf`;
    const fileKey = `legal-docs/resumen85/${filename}`;
    const { url: pdfUrl } = await storagePut(
      fileKey,
      pdfBuffer,
      "application/pdf"
    );

    return { pdfUrl, filename, folio: folioDoc };
  }),
});
