import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { cases, employees, departments, users } from "../../drizzle/schema";
import { eq, desc, and, or, like, isNull, sql } from "drizzle-orm";
import { sendEmail, getCaseCriticalTemplate, getCaseAssignedTemplate } from "../services/emailService";

export const casesManagementRouter = router({
  // Crear nuevo caso manualmente
  createCase: protectedProcedure
    .input(
      z.object({
        reporterName: z.string().min(1, "Nombre del reportante requerido"),
        reporterEmail: z.string().email("Email inválido").optional(),
        isAnonymous: z.boolean().default(false),
        caseType: z.enum(["mobbing", "burnout", "violence", "stress", "other"]),
        description: z.string().min(10, "Descripción debe tener al menos 10 caracteres"),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        departmentId: z.number({ message: "Departamento requerido" }),
        assignedTo: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Generar número de caso único
        const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        // Crear caso
        const [newCase] = await (db.insert(cases) as any).values({
          caseNumber,
          reporterName: input.reporterName,
          reporterEmail: input.reporterEmail || null,
          isAnonymous: input.isAnonymous,
          caseType: input.caseType,
          description: input.description,
          status: "open",
          priority: input.priority,
          departmentId: input.departmentId,
          assignedTo: input.assignedTo || null,
          createdAt: new Date(),
        });

        // Enviar notificación por email si el caso es crítico o alto
        if (input.priority === "critical" || input.priority === "high") {
          try {
            // Obtener información del departamento
            const [department] = await db.select().from(departments).where(eq(departments.id, input.departmentId)).limit(1);
            
            // Obtener emails de administradores y responsables de NOM-035
            const admins = await db.select().from(users).where(
              or(
                eq(users.role, "admin"),
                eq(users.role, "responsable_nom035"),
                eq(users.role, "director")
              )
            );
            
            const adminEmails = admins
              .map(admin => admin.email)
              .filter((email): email is string => email !== null && email !== undefined);

            if (adminEmails.length > 0) {
              const emailHtml = getCaseCriticalTemplate({
                folio: caseNumber,
                caseType: input.caseType,
                reporterName: input.reporterName,
                description: input.description,
                priority: input.priority,
                departmentName: department?.name,
              });

              // Enviar email de forma asíncrona (no bloquear la respuesta)
              sendEmail({
                to: adminEmails,
                subject: `🚨 Caso Crítico: ${caseNumber} - ${input.caseType}`,
                html: emailHtml,
                template: "case_critical",
              }).catch(error => {
                console.error("[CasesManagement] Error al enviar email de caso crítico:", error);
              });
            }
          } catch (emailError) {
            console.error("[CasesManagement] Error al preparar email de notificación:", emailError);
            // No lanzar error, solo registrar - el caso ya fue creado exitosamente
          }
        }

        // Si se asignó a alguien, enviar notificación
        if (input.assignedTo) {
          try {
            const [assignedUser] = await db.select().from(users).where(eq(users.id, input.assignedTo)).limit(1);
            
            if (assignedUser && assignedUser.email) {
              const emailHtml = getCaseAssignedTemplate({
                folio: caseNumber,
                caseType: input.caseType,
                assignedToName: assignedUser.name || "Usuario",
                reporterName: input.reporterName,
                description: input.description,
              });

              sendEmail({
                to: assignedUser.email,
                subject: `📋 Nuevo Caso Asignado: ${caseNumber}`,
                html: emailHtml,
                template: "case_assigned",
              }).catch(error => {
                console.error("[CasesManagement] Error al enviar email de asignación:", error);
              });
            }
          } catch (emailError) {
            console.error("[CasesManagement] Error al preparar email de asignación:", emailError);
          }
        }

        return {
          success: true,
          caseId: newCase.insertId,
          caseNumber,
        };
      } catch (error) {
        console.error("[CasesManagement] Error creating case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al crear caso",
        });
      }
    }),

  // Listar casos con filtros
  listCases: protectedProcedure
    .input(
      z.object({
        status: z.enum(["open", "investigating", "resolved", "closed", "all"]).default("all"),
        priority: z.enum(["low", "medium", "high", "critical", "all"]).default("all"),
        departmentId: z.number().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(), // ISO date string YYYY-MM-DD
        dateTo: z.string().optional(),   // ISO date string YYYY-MM-DD
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const page = input?.page || 1;
        const pageSize = input?.pageSize || 20;
        const offset = (page - 1) * pageSize;

        let conditions = [];
        if (input?.status && input.status !== "all") {
          conditions.push(sql`${cases.status} = ${input.status}`);
        }
        if (input?.priority && input.priority !== "all") {
          conditions.push(sql`${cases.priority} = ${input.priority}`);
        }
        if (input?.departmentId) {
          conditions.push(eq(cases.departmentId, input.departmentId));
        }
        if (input?.search) {
          conditions.push(or(
            like(cases.reporterName, `%${input.search}%`),
            like(cases.caseNumber, `%${input.search}%`),
            like(cases.description, `%${input.search}%`),
          ) as any);
        }
        if (input?.dateFrom) {
          conditions.push(sql`${cases.createdAt} >= ${new Date(input.dateFrom)}`);
        }
        if (input?.dateTo) {
          const toDate = new Date(input.dateTo);
          toDate.setHours(23, 59, 59, 999);
          conditions.push(sql`${cases.createdAt} <= ${toDate}`);
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [casesList, totalCount] = await Promise.all([
          db
            .select()
            .from(cases)
            .where(whereClause)
            .orderBy(desc(cases.createdAt))
            .limit(pageSize)
            .offset(offset),
          db
            .select({ count: sql<number>`count(*)` })
            .from(cases)
            .where(whereClause)
            .then(r => r[0]?.count || 0),
        ]);

        return {
          cases: casesList,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
          },
        };
      } catch (error) {
        console.error("[CasesManagement] Error listing cases:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al listar casos",
        });
      }
    }),

  // Obtener caso por ID
  getCaseById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const [caseData] = await db
          .select()
          .from(cases)
          .where(eq(cases.id, input.id))
          .limit(1);

        if (!caseData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Caso no encontrado",
          });
        }

        return caseData;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[CasesManagement] Error getting case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener caso",
        });
      }
    }),

  // Actualizar caso
  updateCase: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        assignedTo: z.number().nullable().optional(),
        resolution: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const updateData: any = {};
        if (input.status) updateData.status = input.status;
        if (input.priority) updateData.priority = input.priority;
        if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
        if (input.resolution) updateData.resolution = input.resolution;

        if (input.status === "resolved" || input.status === "closed") {
          updateData.resolvedAt = new Date();
        }

        await db.update(cases).set(updateData).where(eq(cases.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("[CasesManagement] Error updating case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar caso",
        });
      }
    }),

  // Asignar caso a usuario
  assignCase: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
        assignedTo: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        await db
          .update(cases)
          .set({ assignedTo: input.assignedTo } as any)
          .where(eq(cases.id, input.caseId));

        return { success: true };
      } catch (error) {
        console.error("[CasesManagement] Error assigning case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al asignar caso",
        });
      }
    }),

  // Obtener estadísticas de casos
  getCasesStats: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const [stats] = await db
        .select({
          total: sql<number>`count(*)`,
          open: sql<number>`sum(case when ${cases.status} = 'open' then 1 else 0 end)`,
          investigating: sql<number>`sum(case when ${cases.status} = 'investigating' then 1 else 0 end)`,
          resolved: sql<number>`sum(case when ${cases.status} = 'resolved' then 1 else 0 end)`,
          closed: sql<number>`sum(case when ${cases.status} = 'closed' then 1 else 0 end)`,
          critical: sql<number>`sum(case when ${cases.priority} = 'critical' then 1 else 0 end)`,
          unassigned: sql<number>`sum(case when ${cases.assignedTo} is null then 1 else 0 end)`,
        })
        .from(cases);

      return stats || {
        total: 0,
        open: 0,
        investigating: 0,
        resolved: 0,
        closed: 0,
        critical: 0,
        unassigned: 0,
      };
    } catch (error) {
      console.error("[CasesManagement] Error getting stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener estadísticas",
      });
    }
  }),
});
