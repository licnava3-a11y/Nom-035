import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb, createNotification } from "../db";
import { committeeTrainings, trainingAssignments, trainingCertificates, users } from "../../drizzle/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

export const trainingAssignmentsRouter = router({
  /**
   * Asignar capacitación a un miembro específico
   */
  assignToMember: protectedProcedure
    .input(
      z.object({
        trainingId: z.number(),
        committeeMemberId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "committee_coordinator") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para asignar capacitaciones" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar si ya existe asignación activa
      const [existing] = await db
        .select()
        .from(trainingAssignments)
        .where(
          and(
            eq(trainingAssignments.trainingId, input.trainingId),
            eq(trainingAssignments.committeeMemberId, input.committeeMemberId),
            sql`${trainingAssignments.status} IN ('pending', 'in_progress')`
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El miembro ya tiene esta capacitación asignada" });
      }

      // Crear asignación
      const [result] = await db.insert(trainingAssignments).values({
        trainingId: input.trainingId,
        committeeMemberId: input.committeeMemberId,
        status: "pending",
        notes: input.notes,
      } as any);

      // Obtener datos de la capacitación para la notificación
      const [training] = await db
        .select()
        .from(committeeTrainings)
        .where(eq(committeeTrainings.id, input.trainingId))
        .limit(1);

      // Enviar notificación al miembro
      await createNotification({
        userId: input.committeeMemberId,
        type: "system",
        title: "Nueva Capacitación Asignada",
        message: `Se te ha asignado la capacitación: ${training?.title}. Duración: ${training?.duration} horas.`,
      });

      return { id: result.insertId, message: "Capacitación asignada exitosamente" };
    }),

  /**
   * Asignar capacitación a todos los miembros con un rol específico
   */
  assignToRole: protectedProcedure
    .input(
      z.object({
        trainingId: z.number(),
        targetRole: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "committee_coordinator") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para asignar capacitaciones" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener todos los usuarios con el rol especificado
      const members = await db
        .select()
        .from(users)
        .where(eq(users.role, input.targetRole as any));

      if (members.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontraron miembros con ese rol" });
      }

      // Obtener datos de la capacitación
      const [training] = await db
        .select()
        .from(committeeTrainings)
        .where(eq(committeeTrainings.id, input.trainingId))
        .limit(1);

      if (!training) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Capacitación no encontrada" });
      }

      let assignedCount = 0;
      let skippedCount = 0;

      for (const member of members) {
        // Verificar si ya existe asignación activa
        const [existing] = await db
          .select()
          .from(trainingAssignments)
          .where(
            and(
              eq(trainingAssignments.trainingId, input.trainingId),
              eq(trainingAssignments.committeeMemberId, member.id),
              sql`${trainingAssignments.status} IN ('pending', 'in_progress')`
            )
          )
          .limit(1);

        if (existing) {
          skippedCount++;
          continue;
        }

        // Crear asignación
        await db.insert(trainingAssignments).values({
          trainingId: input.trainingId,
          committeeMemberId: member.id,
          status: "pending",
          notes: input.notes,
        } as any);

        // Enviar notificación
        await createNotification({
          userId: member.id,
          type: "system",
          title: "Nueva Capacitación Asignada",
          message: `Se te ha asignado la capacitación: ${training.title}. Duración: ${training.duration} horas.`,
        });

        assignedCount++;
      }

      return {
        message: `Capacitación asignada a ${assignedCount} miembros. ${skippedCount} ya tenían la asignación.`,
        assignedCount,
        skippedCount,
      };
    }),

  /**
   * Actualizar estado de asignación
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "expired"]),
        score: z.number().min(0).max(100).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar que el usuario sea admin, coordinador o el miembro asignado
      const [assignment] = await db
        .select()
        .from(trainingAssignments)
        .where(eq(trainingAssignments.id, input.id))
        .limit(1);

      if (!assignment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asignación no encontrada" });
      }

      if (
        ctx.user.role !== "admin" &&
        ctx.user.role !== "committee_coordinator" &&
        ctx.user.id !== assignment.committeeMemberId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para actualizar esta asignación" });
      }

      const updateData: any = {
        status: input.status,
      };

      if (input.status === "in_progress" && !assignment.startDate) {
        updateData.startDate = new Date();
      }

      if (input.status === "completed") {
        updateData.completionDate = new Date();
        if (input.score !== undefined) {
          updateData.score = input.score;
        }
      }

      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }

      await db
        .update(trainingAssignments)
        .set(updateData)
        .where(eq(trainingAssignments.id, input.id));

      return { message: "Estado actualizado exitosamente" };
    }),

  /**
   * Obtener capacitaciones asignadas al usuario actual
   */
  getMyTrainings: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "in_progress", "completed", "expired"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(trainingAssignments.committeeMemberId, ctx.user.id)];
      
      if (input?.status) {
        conditions.push(eq(trainingAssignments.status, input.status));
      }

      const query = db
        .select({
          assignment: trainingAssignments,
          training: committeeTrainings,
          certificate: trainingCertificates,
        })
        .from(trainingAssignments)
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(trainingCertificates, eq(trainingAssignments.id, trainingCertificates.assignmentId))
        .where(and(...conditions));

      const results = await query.orderBy(desc(trainingAssignments.assignedDate));

      return results;
    }),

  /**
   * Obtener dashboard de cumplimiento (admin/coordinador)
   */
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "committee_coordinator") {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver el dashboard" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Estadísticas generales
    const [stats] = await db
      .select({
        totalAssignments: sql<number>`COUNT(*)`,
        pending: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'pending' THEN 1 ELSE 0 END)`,
        inProgress: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'in_progress' THEN 1 ELSE 0 END)`,
        completed: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'completed' THEN 1 ELSE 0 END)`,
        expired: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'expired' THEN 1 ELSE 0 END)`,
      })
      .from(trainingAssignments);

    // Cumplimiento por miembro
    const memberCompliance = await db
      .select({
        memberId: trainingAssignments.committeeMemberId,
        memberName: users.name,
        memberEmail: users.email,
        totalAssigned: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'completed' THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'pending' THEN 1 ELSE 0 END)`,
        expired: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'expired' THEN 1 ELSE 0 END)`,
      })
      .from(trainingAssignments)
      .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
      .groupBy(trainingAssignments.committeeMemberId, users.name, users.email);

    // Certificados próximos a vencer (30 días)
    const expiringCertificates = await db
      .select({
        certificate: trainingCertificates,
        assignment: trainingAssignments,
        training: committeeTrainings,
        member: users,
      })
      .from(trainingCertificates)
      .leftJoin(trainingAssignments, eq(trainingCertificates.assignmentId, trainingAssignments.id))
      .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
      .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
      .where(
        and(
          sql`${trainingCertificates.expiryDate} IS NOT NULL`,
          sql`${trainingCertificates.expiryDate} <= DATE_ADD(NOW(), INTERVAL 30 DAY)`,
          sql`${trainingCertificates.expiryDate} >= NOW()`
        )
      )
      .orderBy(trainingCertificates.expiryDate);

    return {
      stats,
      memberCompliance,
      expiringCertificates,
    };
  }),

  /**
   * Obtener todas las asignaciones (admin/coordinador)
   */
  listAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "in_progress", "completed", "expired"]).optional(),
        trainingId: z.number().optional(),
        committeeMemberId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "committee_coordinator") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver todas las asignaciones" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let query = db
        .select({
          assignment: trainingAssignments,
          training: committeeTrainings,
          member: users,
          certificate: trainingCertificates,
        })
        .from(trainingAssignments)
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
        .leftJoin(trainingCertificates, eq(trainingAssignments.id, trainingCertificates.assignmentId));

      const conditions = [];
      if (input?.status) {
        conditions.push(eq(trainingAssignments.status, input.status));
      }
      if (input?.trainingId) {
        conditions.push(eq(trainingAssignments.trainingId, input.trainingId));
      }
      if (input?.committeeMemberId) {
        conditions.push(eq(trainingAssignments.committeeMemberId, input.committeeMemberId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const results = await query.orderBy(desc(trainingAssignments.assignedDate));

      return results;
    }),
});
