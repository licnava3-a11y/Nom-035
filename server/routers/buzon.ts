import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  buzonRequests,
  buzonAuditTrail,
  buzonAttachments,
  employees,
} from "../../drizzle/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { TRPCError } from "@trpc/server";

// ─── Tipos de solicitud ───────────────────────────────────────────────────────
const REQUEST_TYPES = [
  "QUEJA",
  "FELICITACION",
  "CAPACITACION",
  "SUGERENCIA",
] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

// ─── Máquina de estados ───────────────────────────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  REGISTRADA: ["EN_ANALISIS"],
  EN_ANALISIS: ["EN_INVESTIGACION", "RESUELTA"],
  EN_INVESTIGACION: ["PENDIENTE_ACLARACION", "RESUELTA"],
  PENDIENTE_ACLARACION: ["EN_INVESTIGACION"],
  RESUELTA: ["NOTIFICADA"],
  NOTIFICADA: [],
};

// ─── Generador de folio ───────────────────────────────────────────────────────
async function generateFolio(type: RequestType): Promise<string> {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  const year = new Date().getFullYear();
  const prefix = type.substring(0, 3);
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(buzonRequests)
    .where(
      and(eq(buzonRequests.requestType, type), sql`YEAR(created_at) = ${year}`)
    );
  const seq = (countResult[0]?.count ?? 0) + 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

// ─── Roles con acceso de administración ──────────────────────────────────────
const ADMIN_ROLES = [
  "admin",
  "super_admin",
  "committee",
  "committee_coordinator",
  "rh",
  "responsable_nom035",
];

export const buzonRouter = router({
  // ─── Enviar solicitud ───────────────────────────────────────────────────────
  submitRequest: protectedProcedure
    .input(
      z.object({
        requestType: z.enum(REQUEST_TYPES),
        formPayload: z.string().min(1),
        anonymityFlag: z.boolean().default(false),
        employeeId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Validar que el JSON es parseable
      let parsedPayload: Record<string, unknown>;
      try {
        parsedPayload = JSON.parse(input.formPayload);
      } catch {
        throw new Error("Payload inválido");
      }

      // Validaciones mínimas por tipo
      if (input.requestType === "QUEJA") {
        if (
          !parsedPayload.detailedNarrative ||
          String(parsedPayload.detailedNarrative).length < 50
        ) {
          throw new Error(
            "La narrativa de la queja debe tener al menos 50 caracteres"
          );
        }
      } else if (input.requestType === "FELICITACION") {
        if (!parsedPayload.recognizedName) {
          throw new Error("El nombre del reconocido es requerido");
        }
      } else if (input.requestType === "CAPACITACION") {
        if (!parsedPayload.topic) {
          throw new Error("El tema de capacitación es requerido");
        }
      } else if (input.requestType === "SUGERENCIA") {
        if (!parsedPayload.proposedSolution) {
          throw new Error("La solución propuesta es requerida");
        }
      }

      const folio = await generateFolio(input.requestType);

      const [inserted] = await db.insert(buzonRequests).values({
        publicFolio: folio,
        requestType: input.requestType,
        status: "REGISTRADA",
        employeeId: input.employeeId ?? null,
        anonymityFlag: input.anonymityFlag,
        formPayload: input.formPayload,
        priority: "NORMAL",
      });

      const requestId = (inserted as { insertId: number }).insertId;

      await db.insert(buzonAuditTrail).values({
        requestId,
        fromStatus: null,
        toStatus: "REGISTRADA",
        actionByUserId: ctx.user.id,
        actionByName: ctx.user.name ?? "Usuario",
        systemNote: `Solicitud registrada. Folio: ${folio}`,
      });

      const typeLabels: Record<string, string> = {
        QUEJA: "Queja/Denuncia",
        FELICITACION: "Felicitación",
        CAPACITACION: "Solicitud de Capacitación",
        SUGERENCIA: "Sugerencia",
      };
      notifyOwner({
        title: `📬 Nueva ${typeLabels[input.requestType]} — Buzón Interno`,
        content: `Se recibió una nueva solicitud con folio **${folio}**.\n\nTipo: ${typeLabels[input.requestType]}\nEstatus: REGISTRADA\n${input.anonymityFlag ? "⚠️ El empleado solicitó anonimato." : ""}`,
      }).catch(() => {});

      return { success: true, folio, requestId };
    }),

  // ─── Listar solicitudes ─────────────────────────────────────────────────────
  listRequests: protectedProcedure
    .input(
      z.object({
        requestType: z.enum([...REQUEST_TYPES, "ALL"]).default("ALL"),
        status: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      const isAdmin = ADMIN_ROLES.includes(ctx.user.role);

      const conditions = [];
      if (input.requestType !== "ALL") {
        conditions.push(eq(buzonRequests.requestType, input.requestType));
      }
      if (input.status) {
        conditions.push(eq(buzonRequests.status, input.status));
      }
      if (input.search) {
        conditions.push(like(buzonRequests.publicFolio, `%${input.search}%`));
      }

      if (!isAdmin) {
        const emp = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.userId, ctx.user.id))
          .limit(1);
        if (emp.length > 0) {
          conditions.push(eq(buzonRequests.employeeId, emp[0].id));
        } else {
          return { requests: [], total: 0 };
        }
      }

      const offset = (input.page - 1) * input.pageSize;
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [requests, countResult] = await Promise.all([
        db
          .select()
          .from(buzonRequests)
          .where(whereClause)
          .orderBy(desc(buzonRequests.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(buzonRequests)
          .where(whereClause),
      ]);

      const sanitized = requests.map(r => {
        if (r.anonymityFlag && !isAdmin) {
          return { ...r, employeeId: null };
        }
        return r;
      });

      return { requests: sanitized, total: countResult[0]?.count ?? 0 };
    }),

  // ─── Detalle de solicitud ───────────────────────────────────────────────────
  getRequestDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      const isAdmin = ADMIN_ROLES.includes(ctx.user.role);

      const [request] = await db
        .select()
        .from(buzonRequests)
        .where(eq(buzonRequests.id, input.id))
        .limit(1);

      if (!request) throw new Error("Solicitud no encontrada");

      const [auditEntries, attachments] = await Promise.all([
        db
          .select()
          .from(buzonAuditTrail)
          .where(eq(buzonAuditTrail.requestId, input.id))
          .orderBy(desc(buzonAuditTrail.createdAt)),
        db
          .select()
          .from(buzonAttachments)
          .where(eq(buzonAttachments.requestId, input.id)),
      ]);

      const sanitized =
        request.anonymityFlag && !isAdmin
          ? { ...request, employeeId: null }
          : request;

      return { request: sanitized, auditEntries, attachments };
    }),

  // ─── Actualizar estado ──────────────────────────────────────────────────────
  updateStatus: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        newStatus: z.string(),
        internalNotes: z.string().min(1),
        resolutionText: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      if (!ADMIN_ROLES.includes(ctx.user.role))
        throw new Error("Sin permisos para actualizar el estado");

      const [request] = await db
        .select({ status: buzonRequests.status })
        .from(buzonRequests)
        .where(eq(buzonRequests.id, input.requestId))
        .limit(1);

      if (!request) throw new Error("Solicitud no encontrada");

      const validNext = VALID_TRANSITIONS[request.status] ?? [];
      if (!validNext.includes(input.newStatus)) {
        throw new Error(
          `Transición inválida: ${request.status} → ${input.newStatus}. Válidas: ${validNext.join(", ") || "ninguna"}`
        );
      }

      const updateData: Record<string, unknown> = {
        status: input.newStatus,
        updatedAt: new Date(),
      };
      if (input.resolutionText) {
        updateData.resolutionText = input.resolutionText;
        updateData.resolvedAt = new Date();
        updateData.resolvedByUserId = ctx.user.id;
      }

      await db
        .update(buzonRequests)
        .set(updateData as Parameters<ReturnType<typeof db.update>["set"]>[0])
        .where(eq(buzonRequests.id, input.requestId));

      await db.insert(buzonAuditTrail).values({
        requestId: input.requestId,
        fromStatus: request.status,
        toStatus: input.newStatus,
        actionByUserId: ctx.user.id,
        actionByName: ctx.user.name ?? "Admin",
        internalNotes: input.internalNotes,
        systemNote: `Estado actualizado de ${request.status} a ${input.newStatus}`,
      });

      return { success: true };
    }),

  // ─── Agregar nota interna ───────────────────────────────────────────────────
  addAuditNote: protectedProcedure
    .input(z.object({ requestId: z.number(), notes: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      if (!ADMIN_ROLES.includes(ctx.user.role)) throw new Error("Sin permisos");

      const [request] = await db
        .select({ status: buzonRequests.status })
        .from(buzonRequests)
        .where(eq(buzonRequests.id, input.requestId))
        .limit(1);

      if (!request) throw new Error("Solicitud no encontrada");

      await db.insert(buzonAuditTrail).values({
        requestId: input.requestId,
        fromStatus: request.status,
        toStatus: request.status,
        actionByUserId: ctx.user.id,
        actionByName: ctx.user.name ?? "Admin",
        internalNotes: input.notes,
        systemNote: "Nota interna agregada",
      });

      return { success: true };
    }),

  // ─── Consulta pública por folio (sin autenticación) ─────────────────────────
  lookupByFolio: publicProcedure
    .input(z.object({ folio: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [request] = await db
        .select({
          id: buzonRequests.id,
          publicFolio: buzonRequests.publicFolio,
          requestType: buzonRequests.requestType,
          status: buzonRequests.status,
          createdAt: buzonRequests.createdAt,
          updatedAt: buzonRequests.updatedAt,
          resolvedAt: buzonRequests.resolvedAt,
          resolutionText: buzonRequests.resolutionText,
          // NO exponer: employeeId, formPayload (datos personales), internalNotes
        })
        .from(buzonRequests)
        .where(eq(buzonRequests.publicFolio, input.folio.toUpperCase()))
        .limit(1);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No se encontró ninguna solicitud con ese folio",
        });
      }

      // Obtener historial de estados (sin notas internas)
      const auditHistory = await db
        .select({
          fromStatus: buzonAuditTrail.fromStatus,
          toStatus: buzonAuditTrail.toStatus,
          systemNote: buzonAuditTrail.systemNote,
          createdAt: buzonAuditTrail.createdAt,
        })
        .from(buzonAuditTrail)
        .where(eq(buzonAuditTrail.requestId, request.id))
        .orderBy(buzonAuditTrail.createdAt);

      return { request, auditHistory };
    }),

  // ─── Estadísticas ───────────────────────────────────────────────────────────
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    if (!ADMIN_ROLES.includes(ctx.user.role)) return null;

    const [byType, byStatus] = await Promise.all([
      db
        .select({
          requestType: buzonRequests.requestType,
          count: sql<number>`COUNT(*)`,
        })
        .from(buzonRequests)
        .groupBy(buzonRequests.requestType),
      db
        .select({ status: buzonRequests.status, count: sql<number>`COUNT(*)` })
        .from(buzonRequests)
        .groupBy(buzonRequests.status),
    ]);

    return { byType, byStatus };
  }),
});
