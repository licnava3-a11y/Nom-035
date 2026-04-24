import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { annualTrainingPlans, annualTrainingPlanItems, departments, employees, trainingNeeds } from "../../drizzle/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const annualTrainingPlanRouter = router({
  // ─── Listar planes ────────────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      departmentId: z.number().optional(),
      status: z.enum(["borrador", "aprobado", "en_ejecucion", "cerrado"]).optional(),
      search: z.string().optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const { year, departmentId, status, search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const conditions = [];
      if (year) conditions.push(eq(annualTrainingPlans.year, year));
      if (departmentId) conditions.push(eq(annualTrainingPlans.departmentId, departmentId));
      if (status) conditions.push(eq(annualTrainingPlans.status, status));
      if (search) conditions.push(like(annualTrainingPlans.title, `%${search}%`));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const plans = await db
        .select({
          id: annualTrainingPlans.id,
          year: annualTrainingPlans.year,
          title: annualTrainingPlans.title,
          description: annualTrainingPlans.description,
          status: annualTrainingPlans.status,
          totalBudget: annualTrainingPlans.totalBudget,
          departmentId: annualTrainingPlans.departmentId,
          responsibleId: annualTrainingPlans.responsibleId,
          approvedAt: annualTrainingPlans.approvedAt,
          createdAt: annualTrainingPlans.createdAt,
          departmentName: departments.name,
          responsibleFirstName: employees.firstName,
          responsibleLastName: employees.lastName,
          itemCount: sql<number>`(SELECT COUNT(*) FROM annual_training_plan_items WHERE plan_id = ${annualTrainingPlans.id})`,
        })
        .from(annualTrainingPlans)
        .leftJoin(departments, eq(annualTrainingPlans.departmentId, departments.id))
        .leftJoin(employees, eq(annualTrainingPlans.responsibleId, employees.id))
        .where(whereClause)
        .orderBy(desc(annualTrainingPlans.year), desc(annualTrainingPlans.createdAt))
        .limit(pageSize)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(annualTrainingPlans)
        .where(whereClause);

      return { plans, total: Number(total), page, pageSize };
    }),

  // ─── Obtener plan por ID con items ───────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [plan] = await db
        .select({
          id: annualTrainingPlans.id,
          year: annualTrainingPlans.year,
          title: annualTrainingPlans.title,
          description: annualTrainingPlans.description,
          status: annualTrainingPlans.status,
          totalBudget: annualTrainingPlans.totalBudget,
          departmentId: annualTrainingPlans.departmentId,
          responsibleId: annualTrainingPlans.responsibleId,
          approvedAt: annualTrainingPlans.approvedAt,
          approvedBy: annualTrainingPlans.approvedBy,
          createdAt: annualTrainingPlans.createdAt,
          updatedAt: annualTrainingPlans.updatedAt,
          departmentName: departments.name,
          responsibleFirstName: employees.firstName,
          responsibleLastName: employees.lastName,
        })
        .from(annualTrainingPlans)
        .leftJoin(departments, eq(annualTrainingPlans.departmentId, departments.id))
        .leftJoin(employees, eq(annualTrainingPlans.responsibleId, employees.id))
        .where(eq(annualTrainingPlans.id, input.id));

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan no encontrado" });

      const items = await db
        .select()
        .from(annualTrainingPlanItems)
        .where(eq(annualTrainingPlanItems.planId, input.id))
        .orderBy(annualTrainingPlanItems.plannedDate);

      return { ...plan, items };
    }),

  // ─── Crear plan ───────────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      year: z.number().min(2020).max(2099),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      departmentId: z.number().optional(),
      responsibleId: z.number().optional(),
      totalBudget: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [result] = await db.insert(annualTrainingPlans).values({
        year: input.year,
        title: input.title,
        description: input.description,
        departmentId: input.departmentId,
        responsibleId: input.responsibleId,
        totalBudget: input.totalBudget,
        status: "borrador",
      });

      return { id: (result as any).insertId, success: true };
    }),

  // ─── Actualizar plan ──────────────────────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      year: z.number().min(2020).max(2099).optional(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      departmentId: z.number().optional(),
      responsibleId: z.number().optional(),
      totalBudget: z.number().optional(),
      status: z.enum(["borrador", "aprobado", "en_ejecucion", "cerrado"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.year !== undefined) updateData.year = data.year;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
      if (data.responsibleId !== undefined) updateData.responsibleId = data.responsibleId;
      if (data.totalBudget !== undefined) updateData.totalBudget = data.totalBudget;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === "aprobado") updateData.approvedAt = new Date();
      }

      await db.update(annualTrainingPlans).set(updateData).where(eq(annualTrainingPlans.id, id));
      return { success: true };
    }),

  // ─── Eliminar plan ────────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      await db.delete(annualTrainingPlanItems).where(eq(annualTrainingPlanItems.planId, input.id));
      await db.delete(annualTrainingPlans).where(eq(annualTrainingPlans.id, input.id));
      return { success: true };
    }),

  // ─── Agregar item al plan ─────────────────────────────────────────────────────
  addItem: protectedProcedure
    .input(z.object({
      planId: z.number(),
      courseName: z.string().min(1).max(255),
      courseId: z.number().optional(),
      objective: z.string().optional(),
      targetAudience: z.string().optional(),
      modality: z.enum(["presencial", "virtual", "mixta", "e_learning"]).default("presencial"),
      durationHours: z.number().optional(),
      plannedDate: z.string().optional(),
      instructor: z.string().optional(),
      estimatedCost: z.number().optional(),
      participantsTarget: z.number().optional(),
      normativeReference: z.string().optional(),
      notes: z.string().optional(),
      dncId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [result] = await db.insert(annualTrainingPlanItems).values({
        planId: input.planId,
        courseName: input.courseName,
        courseId: input.courseId,
        objective: input.objective,
        targetAudience: input.targetAudience,
        modality: input.modality,
        durationHours: input.durationHours,
        plannedDate: input.plannedDate ? new Date(input.plannedDate) : undefined,
        instructor: input.instructor,
        estimatedCost: input.estimatedCost,
        participantsTarget: input.participantsTarget,
        normativeReference: input.normativeReference,
        notes: input.notes,
        dncId: input.dncId,
        status: "pendiente",
      });

      return { id: (result as any).insertId, success: true };
    }),

  // ─── Actualizar item ──────────────────────────────────────────────────────────
  updateItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      courseName: z.string().min(1).max(255).optional(),
      objective: z.string().optional(),
      targetAudience: z.string().optional(),
      modality: z.enum(["presencial", "virtual", "mixta", "e_learning"]).optional(),
      durationHours: z.number().optional(),
      plannedDate: z.string().optional(),
      completedDate: z.string().optional(),
      instructor: z.string().optional(),
      estimatedCost: z.number().optional(),
      actualCost: z.number().optional(),
      participantsTarget: z.number().optional(),
      participantsActual: z.number().optional(),
      normativeReference: z.string().optional(),
      status: z.enum(["pendiente", "en_proceso", "completado", "cancelado"]).optional(),
      notes: z.string().optional(),
      dncId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const { id, plannedDate, completedDate, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (plannedDate !== undefined) updateData.plannedDate = plannedDate ? new Date(plannedDate) : null;
      if (completedDate !== undefined) updateData.completedDate = completedDate ? new Date(completedDate) : null;

      await db.update(annualTrainingPlanItems).set(updateData).where(eq(annualTrainingPlanItems.id, id));
      return { success: true };
    }),

  // ─── Eliminar item ────────────────────────────────────────────────────────────
  deleteItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      await db.delete(annualTrainingPlanItems).where(eq(annualTrainingPlanItems.id, input.id));
      return { success: true };
    }),

  // ─── Listar necesidades DNC disponibles para vincular ──────────────────────────
  listDncNeeds: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      priority: z.enum(["baja", "media", "alta", "critica"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const conditions = [eq(trainingNeeds.status, "pendiente")];
      if (input.employeeId) conditions.push(eq(trainingNeeds.employeeId, input.employeeId));
      if (input.priority) conditions.push(eq(trainingNeeds.priority, input.priority));

      const needs = await db
        .select({
          id: trainingNeeds.id,
          competencyName: trainingNeeds.competencyName,
          competencyType: trainingNeeds.competencyType,
          priority: trainingNeeds.priority,
          gap: trainingNeeds.gap,
          employeeId: trainingNeeds.employeeId,
          dueDate: trainingNeeds.dueDate,
          notes: trainingNeeds.notes,
        })
        .from(trainingNeeds)
        .where(and(...conditions))
        .orderBy(desc(trainingNeeds.priority));

      return needs;
    }),

  // ─── Años disponibles en la BD ────────────────────────────────────────────────
  getAvailableYears: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const rows = await db
        .selectDistinct({ year: annualTrainingPlans.year })
        .from(annualTrainingPlans)
        .orderBy(desc(annualTrainingPlans.year));

      const years = rows.map((r) => r.year);
      // Incluir el año actual si no está
      const currentYear = new Date().getFullYear();
      if (!years.includes(currentYear)) years.unshift(currentYear);
      return years;
    }),

  // ─── Estadísticas del plan ────────────────────────────────────────────────────
  getStats: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const items = await db
        .select({
          status: annualTrainingPlanItems.status,
          estimatedCost: annualTrainingPlanItems.estimatedCost,
          actualCost: annualTrainingPlanItems.actualCost,
          durationHours: annualTrainingPlanItems.durationHours,
          participantsTarget: annualTrainingPlanItems.participantsTarget,
          participantsActual: annualTrainingPlanItems.participantsActual,
        })
        .from(annualTrainingPlanItems)
        .where(eq(annualTrainingPlanItems.planId, input.planId));

      const total = items.length;
      const completed = items.filter(i => i.status === "completado").length;
      const inProgress = items.filter(i => i.status === "en_proceso").length;
      const pending = items.filter(i => i.status === "pendiente").length;
      const cancelled = items.filter(i => i.status === "cancelado").length;
      const totalEstimatedCost = items.reduce((s, i) => s + (i.estimatedCost ?? 0), 0);
      const totalActualCost = items.reduce((s, i) => s + (i.actualCost ?? 0), 0);
      const totalHours = items.reduce((s, i) => s + (i.durationHours ?? 0), 0);
      const totalParticipantsTarget = items.reduce((s, i) => s + (i.participantsTarget ?? 0), 0);
      const totalParticipantsActual = items.reduce((s, i) => s + (i.participantsActual ?? 0), 0);
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total, completed, inProgress, pending, cancelled,
        completionRate, totalEstimatedCost, totalActualCost,
        totalHours, totalParticipantsTarget, totalParticipantsActual,
      };
    }),
});
