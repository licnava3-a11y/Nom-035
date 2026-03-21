import { z } from "zod";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { correctiveActionPlans, actionEvidences, users, notifications } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { randomBytes } from "crypto";

export const correctiveActionPlansRouter = router({
  // CRUD - List with filters
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "assigned", "in_progress", "completed", "verified", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        originType: z.enum(["root_cause_analysis", "intelligent_alert", "manual_case", "recommendation"]).optional(),
        assignedTo: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const offset = (input.page - 1) * input.pageSize;
      const conditions = [];

      if (input.status) conditions.push(eq(correctiveActionPlans.status, input.status));
      if (input.priority) conditions.push(eq(correctiveActionPlans.priority, input.priority));
      if (input.originType) conditions.push(eq(correctiveActionPlans.originType, input.originType));
      if (input.assignedTo) conditions.push(eq(correctiveActionPlans.assignedTo, input.assignedTo));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [plans, totalResult] = await Promise.all([
        dbInstance
          .select({
            id: correctiveActionPlans.id,
            title: correctiveActionPlans.title,
            description: correctiveActionPlans.description,
            originType: correctiveActionPlans.originType,
            originId: correctiveActionPlans.originId,
            status: correctiveActionPlans.status,
            priority: correctiveActionPlans.priority,
            assignedTo: correctiveActionPlans.assignedTo,
            assignedToName: users.name,
            verifiedBy: correctiveActionPlans.verifiedBy,
            createdBy: correctiveActionPlans.createdBy,
            dueDate: correctiveActionPlans.dueDate,
            completedAt: correctiveActionPlans.completedAt,
            verifiedAt: correctiveActionPlans.verifiedAt,
            closedAt: correctiveActionPlans.closedAt,
            createdAt: correctiveActionPlans.createdAt,
            updatedAt: correctiveActionPlans.updatedAt,
            effectivenessScore: correctiveActionPlans.effectivenessScore,
            notes: correctiveActionPlans.notes,
          })
          .from(correctiveActionPlans)
          .leftJoin(users, eq(correctiveActionPlans.assignedTo, users.id))
          .where(whereClause)
          .orderBy(desc(correctiveActionPlans.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        dbInstance
          .select({ count: sql<number>`count(*)` })
          .from(correctiveActionPlans)
          .where(whereClause),
      ]);

      return {
        plans,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalCount: Number(totalResult[0]?.count || 0),
          totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / input.pageSize),
        },
      };
    }),

  // Get by ID with evidences
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const [plan] = await dbInstance
        .select()
        .from(correctiveActionPlans)
        .where(eq(correctiveActionPlans.id, input.id));

      if (!plan) throw new Error("Plan not found");

      const evidences = await dbInstance
        .select({
          id: actionEvidences.id,
          planId: actionEvidences.planId,
          title: actionEvidences.title,
          description: actionEvidences.description,
          fileUrl: actionEvidences.fileUrl,
          fileType: actionEvidences.fileType,
          fileName: actionEvidences.fileName,
          uploadedBy: actionEvidences.uploadedBy,
          uploadedByName: users.name,
          uploadedAt: actionEvidences.uploadedAt,
        })
        .from(actionEvidences)
        .leftJoin(users, eq(actionEvidences.uploadedBy, users.id))
        .where(eq(actionEvidences.planId, input.id))
        .orderBy(desc(actionEvidences.uploadedAt));

      return { ...plan, evidences };
    }),

  // Create
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        originType: z.enum(["root_cause_analysis", "intelligent_alert", "manual_case", "recommendation"]),
        originId: z.number().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]),
        assignedTo: z.number().optional(),
        dueDate: z.string(), // ISO date string
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const [result] = await dbInstance.insert(correctiveActionPlans).values({
        title: input.title,
        description: input.description,
        originType: input.originType,
        originId: input.originId,
        priority: input.priority,
        assignedTo: input.assignedTo,
        createdBy: ctx.user.id,
        dueDate: new Date(input.dueDate),
        status: input.assignedTo ? "assigned" : "draft",
        notes: input.notes,
      });

      // Notificar al responsable asignado
      if (input.assignedTo) {
        await dbInstance.insert(notifications).values({
          userId: input.assignedTo,
          type: "system",
          title: "Nuevo Plan de Acción Asignado",
          message: `Se te ha asignado el plan de acción: ${input.title}`,
          relatedEntityType: "corrective_action_plan",
          relatedEntityId: result.insertId,
          isRead: false,
        });
      }

      return { id: result.insertId };
    }),

  // Update
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        assignedTo: z.number().optional(),
        dueDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const updateData: any = {};
      if (input.title) updateData.title = input.title;
      if (input.description) updateData.description = input.description;
      if (input.priority) updateData.priority = input.priority;
      if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
      if (input.dueDate) updateData.dueDate = new Date(input.dueDate);
      if (input.notes !== undefined) updateData.notes = input.notes;

      await dbInstance
        .update(correctiveActionPlans)
        .set(updateData)
        .where(eq(correctiveActionPlans.id, input.id));

      return { success: true };
    }),

  // Change status
  changeStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["draft", "assigned", "in_progress", "completed", "verified", "closed"]),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const updateData: any = { status: input.status };

      if (input.status === "completed") {
        updateData.completedAt = new Date();
      } else if (input.status === "verified") {
        updateData.verifiedAt = new Date();
      } else if (input.status === "closed") {
        updateData.closedAt = new Date();
      }

      await dbInstance
        .update(correctiveActionPlans)
        .set(updateData)
        .where(eq(correctiveActionPlans.id, input.id));

      return { success: true };
    }),

  // Sign (responsible or verifier)
  sign: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        role: z.enum(["responsible", "verifier"]),
        signature: z.string(), // Base64 signature image
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      const [plan] = await dbInstance
        .select()
        .from(correctiveActionPlans)
        .where(eq(correctiveActionPlans.id, input.id));

      if (!plan) throw new Error("Plan not found");

      // Verificar permisos
      if (input.role === "responsible" && plan.assignedTo !== ctx.user.id) {
        throw new Error("Only the assigned user can sign as responsible");
      }
      if (input.role === "verifier" && plan.verifiedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Only the verifier or admin can sign");
      }

      const updateData: any = {};
      if (input.role === "responsible") {
        updateData.responsibleSignature = input.signature;
        updateData.status = "completed";
        updateData.completedAt = new Date();
      } else {
        updateData.verifierSignature = input.signature;
        updateData.status = "verified";
        updateData.verifiedAt = new Date();
        // Generar código de verificación único
        updateData.verificationCode = `VERF-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
      }

      await dbInstance
        .update(correctiveActionPlans)
        .set(updateData)
        .where(eq(correctiveActionPlans.id, input.id));

      return { success: true, verificationCode: updateData.verificationCode };
    }),

  // Upload evidence
  uploadEvidence: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        fileData: z.string(), // Base64
        fileName: z.string(),
        fileType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      // Decodificar base64 y subir a S3
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `corrective-action-plans/${input.planId}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.fileType);

      const [result] = await dbInstance.insert(actionEvidences).values({
        planId: input.planId,
        title: input.title,
        description: input.description,
        fileUrl: url,
        fileType: input.fileType,
        fileName: input.fileName,
        uploadedBy: ctx.user.id,
      });

      return { id: result.insertId, fileUrl: url };
    }),

  // Delete evidence
  deleteEvidence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      await dbInstance.delete(actionEvidences).where(eq(actionEvidences.id, input.id));

      return { success: true };
    }),

  // Auto-assign based on workload
  autoAssign: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .mutation(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      // Obtener miembros del comité (role = 'admin')
      const committeeMembers = await dbInstance
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.role, "admin"));

      if (committeeMembers.length === 0) {
        throw new Error("No committee members available");
      }

      // Calcular workload actual de cada miembro
      const workloads = await Promise.all(
        committeeMembers.map(async (member) => {
          const [result] = await dbInstance
            .select({ count: sql<number>`count(*)` })
            .from(correctiveActionPlans)
            .where(
              and(
                eq(correctiveActionPlans.assignedTo, member.id),
                or(
                  eq(correctiveActionPlans.status, "assigned"),
                  eq(correctiveActionPlans.status, "in_progress")
                )
              )
            );

          return {
            userId: member.id,
            name: member.name,
            workload: Number(result?.count || 0),
          };
        })
      );

      // Asignar al miembro con menor workload
      workloads.sort((a: any, b: any) => a.workload - b.workload);
      const assignedMember = workloads[0];

      await dbInstance
        .update(correctiveActionPlans)
        .set({
          assignedTo: assignedMember.userId,
          status: "assigned",
        } as any)
        .where(eq(correctiveActionPlans.id, input.planId));

      // Notificar
      const [plan] = await dbInstance
        .select()
        .from(correctiveActionPlans)
        .where(eq(correctiveActionPlans.id, input.planId));

      await dbInstance.insert(notifications).values({
        userId: assignedMember.userId,
        type: "system",
        title: "Plan de Acción Asignado Automáticamente",
        message: `Se te ha asignado automáticamente el plan: ${plan.title}`,
        relatedEntityType: "corrective_action_plan",
        relatedEntityId: input.planId,
        isRead: false,
      });

      return {
        assignedTo: assignedMember.userId,
        assignedToName: assignedMember.name,
        workload: assignedMember.workload,
      };
    }),

  // Dashboard metrics
  getDashboard: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) throw new Error("Database not available");

    const [totalResult, byStatusResult, byPriorityResult, overdueResult, completionRateResult] = await Promise.all([
      dbInstance.select({ count: sql<number>`count(*)` }).from(correctiveActionPlans),
      dbInstance
        .select({
          status: correctiveActionPlans.status,
          count: sql<number>`count(*)`,
        })
        .from(correctiveActionPlans)
        .groupBy(correctiveActionPlans.status),
      dbInstance
        .select({
          priority: correctiveActionPlans.priority,
          count: sql<number>`count(*)`,
        })
        .from(correctiveActionPlans)
        .groupBy(correctiveActionPlans.priority),
      dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(correctiveActionPlans)
        .where(
          and(
            sql`${correctiveActionPlans.dueDate} < NOW()`,
            or(
              eq(correctiveActionPlans.status, "assigned"),
              eq(correctiveActionPlans.status, "in_progress")
            )
          )
        ),
      dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(correctiveActionPlans)
        .where(
          or(
            eq(correctiveActionPlans.status, "completed"),
            eq(correctiveActionPlans.status, "verified"),
            eq(correctiveActionPlans.status, "closed")
          )
        ),
    ]);

    const total = Number(totalResult[0]?.count || 0);
    const completed = Number(completionRateResult[0]?.count || 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      byStatus: byStatusResult.map((r: any) => ({ status: r.status, count: Number(r.count) })),
      byPriority: byPriorityResult.map((r: any) => ({ priority: r.priority, count: Number(r.count) })),
      overdue: Number(overdueResult[0]?.count || 0),
      completionRate,
    };
  }),

  // Plans expiring soon (next 7 days)
  getExpiringSoon: protectedProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) throw new Error("Database not available");

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const plans = await dbInstance
      .select({
        id: correctiveActionPlans.id,
        title: correctiveActionPlans.title,
        priority: correctiveActionPlans.priority,
        assignedTo: correctiveActionPlans.assignedTo,
        assignedToName: users.name,
        dueDate: correctiveActionPlans.dueDate,
        status: correctiveActionPlans.status,
      })
      .from(correctiveActionPlans)
      .leftJoin(users, eq(correctiveActionPlans.assignedTo, users.id))
      .where(
        and(
          sql`${correctiveActionPlans.dueDate} <= ${sevenDaysFromNow}`,
          sql`${correctiveActionPlans.dueDate} >= NOW()`,
          or(
            eq(correctiveActionPlans.status, "assigned"),
            eq(correctiveActionPlans.status, "in_progress")
          )
        )
      )
      .orderBy(correctiveActionPlans.dueDate);

    return plans;
  }),
});
