/**
 * nom035Matrix.ts
 * Router tRPC para el módulo de Matriz de Acciones con Evidencias NOM-035.
 * Cubre: planes, acciones, evidencias, auditoría, exportación XLSX y generación de PDF.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  nom035Plans,
  nom035Actions,
  nom035Evidences,
  nom035EvidenceAudit,
} from "../../drizzle/schema";
import { eq, and, or, like, gte, lte, desc, asc, inArray, sql } from "drizzle-orm";
import { storageGet } from "../storage";
import { invokeLLM } from "../_core/llm";

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomSuffix() {
  return Math.random().toString(36).substring(2, 10);
}

async function logAudit(params: {
  evidenceId?: number;
  actionId: number;
  planId?: number;
  operacion: "subida" | "reemplazo" | "eliminacion" | "descarga" | "vista_previa";
  nombreArchivo?: string;
  userId?: number;
  userName?: string;
  userEmail?: string;
  detalles?: string;
  ipAddress?: string;
}) {
  const db = await getDb();
  await db.insert(nom035EvidenceAudit).values({
    evidenceId: params.evidenceId ?? null,
    actionId: params.actionId,
    planId: params.planId ?? null,
    operacion: params.operacion,
    nombreArchivo: params.nombreArchivo ?? null,
    userId: params.userId ?? null,
    userName: params.userName ?? null,
    userEmail: params.userEmail ?? null,
    detalles: params.detalles ?? null,
    ipAddress: params.ipAddress ?? null,
  });
}

// ── Schemas de validación ─────────────────────────────────────────────────────

const createPlanSchema = z.object({
  nivelAplicacion: z.enum(["organizacional", "grupal", "individual"]),
  filtroAplicado: z.string().optional(),
  identificadorNivel: z.string().min(1),
  tipoPlan: z.enum(["intervencion", "violencia_laboral", "no_discriminacion", "consolidado"]),
  centroTrabajo: z.string().optional(),
  giroEmpresa: z.string().optional(),
  totalTrabajadores: z.number().int().positive().optional(),
  // Datos de evaluación para generar el plan con IA
  riesgosEvaluacion: z.record(z.string(), z.any()).optional(),
  indicadoresViolencia: z.record(z.string(), z.any()).optional(),
  indicadoresDiscriminacion: z.record(z.string(), z.any()).optional(),
});

const updateActionSchema = z.object({
  id: z.number().int().positive(),
  estado: z.enum(["no_iniciada", "en_proceso", "cumplida", "vencida", "cancelada"]).optional(),
  responsable: z.string().optional(),
  responsableEmail: z.string().email().optional(),
  plazo: z.string().optional(), // ISO date string
  observaciones: z.string().optional(),
  prioridad: z.enum(["alta", "media", "baja"]).optional(),
});

const filterActionsSchema = z.object({
  planId: z.number().int().positive().optional(),
  tipoPlan: z.enum(["intervencion", "violencia_laboral", "no_discriminacion"]).optional(),
  nivelAplicacion: z.enum(["organizacional", "grupal", "individual"]).optional(),
  estado: z.enum(["no_iniciada", "en_proceso", "cumplida", "vencida", "cancelada"]).optional(),
  responsable: z.string().optional(),
  plazoDesde: z.string().optional(),
  plazoHasta: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const nom035MatrixRouter = router({

  // ── PLANES ─────────────────────────────────────────────────────────────────

  /** Listar todos los planes */
  listPlans: protectedProcedure
    .input(z.object({
      status: z.enum(["borrador", "activo", "cerrado", "archivado"]).optional(),
      tipoPlan: z.enum(["intervencion", "violencia_laboral", "no_discriminacion", "consolidado"]).optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const offset = (input.page - 1) * input.pageSize;
      const conditions = [];
      if (input.status) conditions.push(eq(nom035Plans.status, input.status));
      if (input.tipoPlan) conditions.push(eq(nom035Plans.tipoPlan, input.tipoPlan));

      const [plans, [{ total }]] = await Promise.all([
        db.select().from(nom035Plans)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(nom035Plans.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ total: sql<number>`count(*)` }).from(nom035Plans)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      return { plans, total, page: input.page, pageSize: input.pageSize };
    }),

  /** Obtener un plan por ID con sus acciones */
  getPlan: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [plan] = await db.select().from(nom035Plans).where(eq(nom035Plans.id, input.id));
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan no encontrado" });

      const actions = await db.select().from(nom035Actions)
        .where(eq(nom035Actions.planId, input.id))
        .orderBy(asc(nom035Actions.accionId));

      // Para cada acción, obtener el conteo de evidencias
      const actionIds = actions.map(a => a.id);
      let evidenceCounts: Record<number, number> = {};
      if (actionIds.length > 0) {
        const counts = await db.select({
          actionId: nom035Evidences.actionId,
          count: sql<number>`count(*)`,
        })
          .from(nom035Evidences)
          .where(and(inArray(nom035Evidences.actionId, actionIds), eq(nom035Evidences.isActive, true)))
          .groupBy(nom035Evidences.actionId);
        evidenceCounts = Object.fromEntries(counts.map(c => [c.actionId, c.count]));
      }

      const actionsWithCount = actions.map(a => ({
        ...a,
        evidenceCount: evidenceCounts[a.id] ?? 0,
      }));

      return { plan, actions: actionsWithCount };
    }),

  /** Generar un plan con IA basado en datos de evaluación NOM-035 */
  generatePlan: protectedProcedure
    .input(createPlanSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Construir el prompt para la IA
      const tipoLabel = {
        intervencion: "Plan de Intervención de Riesgos Psicosociales",
        violencia_laboral: "Programa de Prevención de Violencia Laboral",
        no_discriminacion: "Programa de Prevención de No Discriminación",
        consolidado: "Plan Consolidado (Intervención + Violencia + No Discriminación)",
      }[input.tipoPlan];

      const prompt = `Eres un experto en cumplimiento de la NOM-035-STPS-2018. Genera un ${tipoLabel} para el siguiente contexto:

Nivel de aplicación: ${input.nivelAplicacion}
Identificador: ${input.identificadorNivel}
${input.filtroAplicado ? `Filtro aplicado: ${input.filtroAplicado}` : ""}
${input.centroTrabajo ? `Centro de trabajo: ${input.centroTrabajo}` : ""}
${input.giroEmpresa ? `Giro de empresa: ${input.giroEmpresa}` : ""}
${input.totalTrabajadores ? `Total de trabajadores: ${input.totalTrabajadores}` : ""}
${input.riesgosEvaluacion ? `Resultados de evaluación: ${JSON.stringify(input.riesgosEvaluacion)}` : ""}
${input.indicadoresViolencia ? `Indicadores de violencia: ${JSON.stringify(input.indicadoresViolencia)}` : ""}
${input.indicadoresDiscriminacion ? `Indicadores de discriminación: ${JSON.stringify(input.indicadoresDiscriminacion)}` : ""}

Genera entre 6 y 12 acciones específicas, con ID único (prefijo INT- para intervención, VL- para violencia, ND- para no discriminación), objetivo claro, acción concreta, indicador de cumplimiento, responsable sugerido y plazo en días.

Responde ÚNICAMENTE con JSON válido con esta estructura:
{
  "acciones": [
    {
      "accionId": "INT-01",
      "tipoPlan": "intervencion",
      "objetivo": "...",
      "accion": "...",
      "descripcionCompleta": "...",
      "indicador": "...",
      "responsable": "Responsable NOM-035",
      "plazoDias": 30,
      "prioridad": "alta"
    }
  ]
}`;

      let acciones: any[] = [];
      try {
        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: "Eres un experto en NOM-035-STPS-2018. Responde solo con JSON válido." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "plan_acciones",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  acciones: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        accionId: { type: "string" },
                        tipoPlan: { type: "string" },
                        objetivo: { type: "string" },
                        accion: { type: "string" },
                        descripcionCompleta: { type: "string" },
                        indicador: { type: "string" },
                        responsable: { type: "string" },
                        plazoDias: { type: "integer" },
                        prioridad: { type: "string" },
                      },
                      required: ["accionId", "tipoPlan", "objetivo", "accion", "indicador", "responsable", "plazoDias", "prioridad"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["acciones"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = llmResponse.choices?.[0]?.message?.content;
        if (content) {
          const parsed = typeof content === "string" ? JSON.parse(content) : content;
          acciones = parsed.acciones || [];
        }
      } catch (err) {
        // Si la IA falla, usar acciones por defecto
        acciones = getDefaultActions(input.tipoPlan);
      }

      // Crear el plan en BD
      const [planResult] = await db.insert(nom035Plans).values({
        nivelAplicacion: input.nivelAplicacion,
        filtroAplicado: input.filtroAplicado ?? null,
        identificadorNivel: input.identificadorNivel,
        tipoPlan: input.tipoPlan,
        centroTrabajo: input.centroTrabajo ?? null,
        giroEmpresa: input.giroEmpresa ?? null,
        totalTrabajadores: input.totalTrabajadores ?? null,
        contenidoJson: { acciones },
        status: "activo",
        createdByUserId: ctx.user.id,
      });

      const planId = (planResult as any).insertId as number;

      // Crear las acciones en BD
      const today = new Date();
      const actionRows = acciones.map((a: any) => {
        const plazoDate = new Date(today);
        plazoDate.setDate(plazoDate.getDate() + (a.plazoDias || 30));
        return {
          planId,
          accionId: a.accionId,
          tipoPlan: (a.tipoPlan || input.tipoPlan) as any,
          nivelAplicacion: input.nivelAplicacion,
          filtroAplicado: input.filtroAplicado ?? null,
          objetivo: a.objetivo,
          accion: a.accion,
          descripcionCompleta: a.descripcionCompleta ?? null,
          indicador: a.indicador ?? null,
          responsable: a.responsable ?? null,
          plazo: plazoDate,
          prioridad: (a.prioridad || "media") as any,
          createdByUserId: ctx.user.id,
        };
      });

      if (actionRows.length > 0) {
        await db.insert(nom035Actions).values(actionRows);
      }

      return { planId, accionesCreadas: actionRows.length };
    }),

  /** Actualizar firmas del plan */
  updatePlanSignatures: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      firmaNombreResponsable: z.string().optional(),
      firmaCargoResponsable: z.string().optional(),
      firmaNombreRepLegal: z.string().optional(),
      firmaCargoRepLegal: z.string().optional(),
      firmaFecha: z.string().optional(),
      status: z.enum(["borrador", "activo", "cerrado", "archivado"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...updates } = input;
      await db.update(nom035Plans).set({
        ...(updates.firmaNombreResponsable !== undefined && { firmaNombreResponsable: updates.firmaNombreResponsable }),
        ...(updates.firmaCargoResponsable !== undefined && { firmaCargoResponsable: updates.firmaCargoResponsable }),
        ...(updates.firmaNombreRepLegal !== undefined && { firmaNombreRepLegal: updates.firmaNombreRepLegal }),
        ...(updates.firmaCargoRepLegal !== undefined && { firmaCargoRepLegal: updates.firmaCargoRepLegal }),
        ...(updates.firmaFecha !== undefined && { firmaFecha: new Date(updates.firmaFecha) }),
        ...(updates.status !== undefined && { status: updates.status }),
      }).where(eq(nom035Plans.id, id));
      return { ok: true };
    }),

  // ── ACCIONES ───────────────────────────────────────────────────────────────

  /** Listar acciones con filtros (matriz interactiva) */
  listActions: protectedProcedure
    .input(filterActionsSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      const offset = (input.page - 1) * input.pageSize;
      const conditions = [];

      if (input.planId) conditions.push(eq(nom035Actions.planId, input.planId));
      if (input.tipoPlan) conditions.push(eq(nom035Actions.tipoPlan, input.tipoPlan));
      if (input.nivelAplicacion) conditions.push(eq(nom035Actions.nivelAplicacion, input.nivelAplicacion));
      if (input.estado) conditions.push(eq(nom035Actions.estado, input.estado));
      if (input.responsable) conditions.push(like(nom035Actions.responsable, `%${input.responsable}%`));
      if (input.plazoDesde) conditions.push(gte(nom035Actions.plazo, new Date(input.plazoDesde)));
      if (input.plazoHasta) conditions.push(lte(nom035Actions.plazo, new Date(input.plazoHasta)));
      if (input.search) {
        conditions.push(or(
          like(nom035Actions.objetivo, `%${input.search}%`),
          like(nom035Actions.accion, `%${input.search}%`),
          like(nom035Actions.accionId, `%${input.search}%`),
        )!);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [actions, [{ total }]] = await Promise.all([
        db.select().from(nom035Actions)
          .where(whereClause)
          .orderBy(asc(nom035Actions.accionId))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ total: sql<number>`count(*)` }).from(nom035Actions).where(whereClause),
      ]);

      // Obtener evidencias para cada acción
      const actionIds = actions.map(a => a.id);
      let evidencesByAction: Record<number, any[]> = {};
      if (actionIds.length > 0) {
        const evidences = await db.select().from(nom035Evidences)
          .where(and(inArray(nom035Evidences.actionId, actionIds), eq(nom035Evidences.isActive, true)))
          .orderBy(desc(nom035Evidences.fechaSubida));
        for (const ev of evidences) {
          if (!evidencesByAction[ev.actionId]) evidencesByAction[ev.actionId] = [];
          evidencesByAction[ev.actionId].push(ev);
        }
      }

      const actionsWithEvidences = actions.map(a => ({
        ...a,
        evidencias: evidencesByAction[a.id] ?? [],
      }));

      return { actions: actionsWithEvidences, total, page: input.page, pageSize: input.pageSize };
    }),

  /** Actualizar estado/datos de una acción */
  updateAction: protectedProcedure
    .input(updateActionSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...updates } = input;
      await db.update(nom035Actions).set({
        ...(updates.estado !== undefined && { estado: updates.estado }),
        ...(updates.responsable !== undefined && { responsable: updates.responsable }),
        ...(updates.responsableEmail !== undefined && { responsableEmail: updates.responsableEmail }),
        ...(updates.plazo !== undefined && { plazo: new Date(updates.plazo) }),
        ...(updates.observaciones !== undefined && { observaciones: updates.observaciones }),
        ...(updates.prioridad !== undefined && { prioridad: updates.prioridad }),
      }).where(eq(nom035Actions.id, id));
      return { ok: true };
    }),

  /** Agregar acción manual a un plan */
  addAction: protectedProcedure
    .input(z.object({
      planId: z.number().int().positive(),
      accionId: z.string().min(1).max(20),
      tipoPlan: z.enum(["intervencion", "violencia_laboral", "no_discriminacion"]),
      nivelAplicacion: z.enum(["organizacional", "grupal", "individual"]),
      filtroAplicado: z.string().optional(),
      objetivo: z.string().min(1),
      accion: z.string().min(1),
      descripcionCompleta: z.string().optional(),
      indicador: z.string().optional(),
      responsable: z.string().optional(),
      responsableEmail: z.string().email().optional(),
      plazo: z.string().optional(),
      prioridad: z.enum(["alta", "media", "baja"]).default("media"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [result] = await db.insert(nom035Actions).values({
        planId: input.planId,
        accionId: input.accionId,
        tipoPlan: input.tipoPlan,
        nivelAplicacion: input.nivelAplicacion,
        filtroAplicado: input.filtroAplicado ?? null,
        objetivo: input.objetivo,
        accion: input.accion,
        descripcionCompleta: input.descripcionCompleta ?? null,
        indicador: input.indicador ?? null,
        responsable: input.responsable ?? null,
        responsableEmail: input.responsableEmail ?? null,
        plazo: input.plazo ? new Date(input.plazo) : null,
        prioridad: input.prioridad,
        createdByUserId: ctx.user.id,
      });
      return { id: (result as any).insertId };
    }),

  // ── EVIDENCIAS ─────────────────────────────────────────────────────────────

  /** Obtener evidencias de una acción */
  getEvidences: protectedProcedure
    .input(z.object({ actionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const evidences = await db.select().from(nom035Evidences)
        .where(and(eq(nom035Evidences.actionId, input.actionId), eq(nom035Evidences.isActive, true)))
        .orderBy(desc(nom035Evidences.fechaSubida));
      return evidences;
    }),

  /** Registrar metadatos de una evidencia subida (el archivo se sube vía endpoint HTTP) */
  registerEvidence: protectedProcedure
    .input(z.object({
      actionId: z.number().int().positive(),
      nombreArchivo: z.string().min(1),
      tipoArchivo: z.string().min(1),
      tamanoBytes: z.number().int().positive().optional(),
      fileKey: z.string().min(1),
      fileUrl: z.string().url(),
      thumbnailKey: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      descripcion: z.string().optional(),
      tipoEvidencia: z.enum([
        "acta_capacitacion", "registro_fotografico", "correo_electronico",
        "lista_asistencia", "comunicado_interno", "captura_pantalla",
        "acta_reunion", "contrato_servicio", "politica_firmada", "otro"
      ]).default("otro"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verificar que la acción existe
      const [action] = await db.select().from(nom035Actions).where(eq(nom035Actions.id, input.actionId));
      if (!action) throw new TRPCError({ code: "NOT_FOUND", message: "Acción no encontrada" });

      const [result] = await db.insert(nom035Evidences).values({
        actionId: input.actionId,
        nombreArchivo: input.nombreArchivo,
        tipoArchivo: input.tipoArchivo,
        tamanoBytes: input.tamanoBytes ?? null,
        fileKey: input.fileKey,
        fileUrl: input.fileUrl,
        thumbnailKey: input.thumbnailKey ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        descripcion: input.descripcion ?? null,
        tipoEvidencia: input.tipoEvidencia,
        subidoPorUserId: ctx.user.id,
        subidoPorNombre: ctx.user.name ?? null,
      });

      const evidenceId = (result as any).insertId as number;

      // Actualizar estado de la acción a "en_proceso" si estaba "no_iniciada"
      if (action.estado === "no_iniciada") {
        await db.update(nom035Actions).set({ estado: "en_proceso" }).where(eq(nom035Actions.id, input.actionId));
      }

      // Registrar auditoría
      await logAudit({
        evidenceId,
        actionId: input.actionId,
        planId: action.planId,
        operacion: "subida",
        nombreArchivo: input.nombreArchivo,
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        userEmail: ctx.user.email ?? undefined,
      });

      return { id: evidenceId };
    }),

  /** Eliminar (desactivar) una evidencia */
  deleteEvidence: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [evidence] = await db.select().from(nom035Evidences).where(eq(nom035Evidences.id, input.id));
      if (!evidence) throw new TRPCError({ code: "NOT_FOUND", message: "Evidencia no encontrada" });

      await db.update(nom035Evidences).set({ isActive: false }).where(eq(nom035Evidences.id, input.id));

      // Registrar auditoría
      const [action] = await db.select({ planId: nom035Actions.planId }).from(nom035Actions).where(eq(nom035Actions.id, evidence.actionId));
      await logAudit({
        evidenceId: input.id,
        actionId: evidence.actionId,
        planId: action?.planId,
        operacion: "eliminacion",
        nombreArchivo: evidence.nombreArchivo,
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        userEmail: ctx.user.email ?? undefined,
      });

      return { ok: true };
    }),

  /** Obtener URL firmada para descargar una evidencia */
  getDownloadUrl: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const [evidence] = await db.select().from(nom035Evidences).where(eq(nom035Evidences.id, input.id));
      if (!evidence || !evidence.isActive) throw new TRPCError({ code: "NOT_FOUND" });

      // Registrar auditoría de descarga
      const [action] = await db.select({ planId: nom035Actions.planId }).from(nom035Actions).where(eq(nom035Actions.id, evidence.actionId));
      await logAudit({
        evidenceId: input.id,
        actionId: evidence.actionId,
        planId: action?.planId,
        operacion: "descarga",
        nombreArchivo: evidence.nombreArchivo,
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
      });

      // Obtener URL de S3
      const { url } = await storageGet(evidence.fileKey);
      return { url, nombreArchivo: evidence.nombreArchivo };
    }),

  // ── AUDITORÍA ──────────────────────────────────────────────────────────────

  /** Obtener log de auditoría de evidencias */
  getAuditLog: protectedProcedure
    .input(z.object({
      actionId: z.number().int().positive().optional(),
      planId: z.number().int().positive().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const offset = (input.page - 1) * input.pageSize;
      const conditions = [];
      if (input.actionId) conditions.push(eq(nom035EvidenceAudit.actionId, input.actionId));
      if (input.planId) conditions.push(eq(nom035EvidenceAudit.planId, input.planId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [logs, [{ total }]] = await Promise.all([
        db.select().from(nom035EvidenceAudit)
          .where(whereClause)
          .orderBy(desc(nom035EvidenceAudit.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ total: sql<number>`count(*)` }).from(nom035EvidenceAudit).where(whereClause),
      ]);

      return { logs, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── ESTADÍSTICAS ───────────────────────────────────────────────────────────

  /** Estadísticas del plan para el dashboard */
  getPlanStats: protectedProcedure
    .input(z.object({ planId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [stats] = await db.select({
        total: sql<number>`count(*)`,
        noIniciadas: sql<number>`sum(case when estado = 'no_iniciada' then 1 else 0 end)`,
        enProceso: sql<number>`sum(case when estado = 'en_proceso' then 1 else 0 end)`,
        cumplidas: sql<number>`sum(case when estado = 'cumplida' then 1 else 0 end)`,
        vencidas: sql<number>`sum(case when estado = 'vencida' then 1 else 0 end)`,
        conEvidencia: sql<number>`sum(case when (select count(*) from nom035_evidences e where e.action_id = nom035_actions.id and e.is_active = 1) > 0 then 1 else 0 end)`,
      }).from(nom035Actions).where(eq(nom035Actions.planId, input.planId));

      return stats;
    }),

  /** Estadísticas globales de todos los planes */
  getGlobalStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const [planStats] = await db.select({
        totalPlanes: sql<number>`count(*)`,
        activos: sql<number>`sum(case when status = 'activo' then 1 else 0 end)`,
      }).from(nom035Plans);

      const [actionStats] = await db.select({
        totalAcciones: sql<number>`count(*)`,
        cumplidas: sql<number>`sum(case when estado = 'cumplida' then 1 else 0 end)`,
        vencidas: sql<number>`sum(case when estado = 'vencida' then 1 else 0 end)`,
        conEvidencia: sql<number>`sum(case when (select count(*) from nom035_evidences e where e.action_id = nom035_actions.id and e.is_active = 1) > 0 then 1 else 0 end)`,
      }).from(nom035Actions);

      return { ...planStats, ...actionStats };
    }),

  // ── Generar PDF del plan ───────────────────────────────────────────────────
  generatePdf: protectedProcedure
    .input(z.object({
      planId: z.number().int().positive(),
      includeEvidenceThumbnails: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Obtener el plan
      const [plan] = await db.select().from(nom035Plans).where(eq(nom035Plans.id, input.planId));
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan no encontrado" });

      // Obtener acciones con evidencias
      const actions = await db.select().from(nom035Actions)
        .where(and(eq(nom035Actions.planId, input.planId), eq(nom035Actions.isActive, true)))
        .orderBy(asc(nom035Actions.accionId));

      const evidencesByAction: Record<number, any[]> = {};
      if (actions.length > 0) {
        const allEvidences = await db.select().from(nom035Evidences)
          .where(and(
            inArray(nom035Evidences.actionId, actions.map(a => a.id)),
            eq(nom035Evidences.isActive, true)
          ))
          .orderBy(asc(nom035Evidences.fechaSubida));

        for (const ev of allEvidences) {
          if (!evidencesByAction[ev.actionId]) evidencesByAction[ev.actionId] = [];
          evidencesByAction[ev.actionId].push(ev);
        }
      }

      const actionsWithEvidences = actions.map(a => ({
        ...a,
        evidencias: evidencesByAction[a.id] || [],
      }));

      const { generateNom035MatrixPdf } = await import("../lib/nom035MatrixPdfGenerator");
      const folio = `NOM035-${plan.id}-${Date.now()}`;
      const pdfBuffer = await generateNom035MatrixPdf(
        plan as any,
        actionsWithEvidences as any,
        { includeEvidenceThumbnails: input.includeEvidenceThumbnails, folio }
      );

      return { pdfBase64: pdfBuffer.toString("base64"), folio };
    }),

  // ── Exportar XLSX del plan ─────────────────────────────────────────────────
  exportXlsx: protectedProcedure
    .input(z.object({
      planId: z.number().int().positive().optional(),
      tipoPlan: z.string().optional(),
      estado: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      const conditions: any[] = [eq(nom035Actions.isActive, true)];
      if (input.planId) conditions.push(eq(nom035Actions.planId, input.planId));
      if (input.tipoPlan) conditions.push(eq(nom035Actions.tipoPlan, input.tipoPlan as any));
      if (input.estado) conditions.push(eq(nom035Actions.estado, input.estado as any));

      const actions = await db.select().from(nom035Actions)
        .where(and(...conditions))
        .orderBy(asc(nom035Actions.accionId));

      // Obtener evidencias
      const evidencesByAction: Record<number, any[]> = {};
      if (actions.length > 0) {
        const allEvidences = await db.select().from(nom035Evidences)
          .where(and(
            inArray(nom035Evidences.actionId, actions.map(a => a.id)),
            eq(nom035Evidences.isActive, true)
          ));
        for (const ev of allEvidences) {
          if (!evidencesByAction[ev.actionId]) evidencesByAction[ev.actionId] = [];
          evidencesByAction[ev.actionId].push(ev);
        }
      }

      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sistema NOM-035";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Matriz de Acciones NOM-035");

      // Estilos
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } } as any;
      const headerFont = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
      const evidFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F4FD" } } as any;

      // Encabezados
      ws.columns = [
        { header: "ID Acción", key: "accionId", width: 12 },
        { header: "Tipo Programa", key: "tipoPlan", width: 22 },
        { header: "Nivel", key: "nivelAplicacion", width: 14 },
        { header: "Objetivo", key: "objetivo", width: 40 },
        { header: "Acción", key: "accion", width: 40 },
        { header: "Indicador", key: "indicador", width: 30 },
        { header: "Responsable", key: "responsable", width: 22 },
        { header: "Plazo", key: "plazo", width: 14 },
        { header: "Estado", key: "estado", width: 14 },
        { header: "Prioridad", key: "prioridad", width: 12 },
        { header: "Observaciones", key: "observaciones", width: 35 },
        { header: "# Evidencias", key: "numEvidencias", width: 13 },
        { header: "Tipos de Evidencia", key: "tiposEvidencia", width: 35 },
        { header: "Última Evidencia", key: "ultimaEvidencia", width: 20 },
      ];

      // Estilo de encabezado
      ws.getRow(1).eachCell(cell => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = { bottom: { style: "thin", color: { argb: "FFD1D5DB" } } };
      });
      ws.getRow(1).height = 28;

      const TIPO_PLAN_LABELS_XLSX: Record<string, string> = {
        intervencion: "Intervención de Riesgos",
        violencia_laboral: "Violencia Laboral",
        no_discriminacion: "No Discriminación",
        consolidado: "Consolidado",
      };
      const ESTADO_LABELS_XLSX: Record<string, string> = {
        no_iniciada: "No iniciada", en_proceso: "En proceso",
        cumplida: "Cumplida", vencida: "Vencida", cancelada: "Cancelada",
      };

      for (const action of actions) {
        const evs = evidencesByAction[action.id] || [];
        const row = ws.addRow({
          accionId: action.accionId,
          tipoPlan: TIPO_PLAN_LABELS_XLSX[action.tipoPlan] || action.tipoPlan,
          nivelAplicacion: action.nivelAplicacion,
          objetivo: action.objetivo,
          accion: action.accion,
          indicador: action.indicador || "",
          responsable: action.responsable || "",
          plazo: action.plazo ? new Date(action.plazo).toLocaleDateString("es-MX") : "",
          estado: ESTADO_LABELS_XLSX[action.estado] || action.estado,
          prioridad: action.prioridad.charAt(0).toUpperCase() + action.prioridad.slice(1),
          observaciones: action.observaciones || "",
          numEvidencias: evs.length,
          tiposEvidencia: evs.map(e => e.tipoEvidencia).join(", "),
          ultimaEvidencia: evs.length > 0 ? new Date(evs[evs.length - 1].fechaSubida).toLocaleDateString("es-MX") : "",
        });

        row.alignment = { wrapText: true, vertical: "top" };
        if (action.estado === "cumplida") {
          row.getCell("estado").font = { color: { argb: "FF16A34A" }, bold: true };
        } else if (action.estado === "vencida") {
          row.getCell("estado").font = { color: { argb: "FFDC2626" }, bold: true };
        }
        if (evs.length > 0) {
          row.getCell("numEvidencias").fill = evidFill;
          row.getCell("numEvidencias").font = { color: { argb: "FF2563EB" }, bold: true };
        }
      }

      // Hoja de evidencias detalladas
      const wsEv = workbook.addWorksheet("Evidencias");
      wsEv.columns = [
        { header: "ID Acción", key: "accionId", width: 12 },
        { header: "Nombre Archivo", key: "nombreArchivo", width: 35 },
        { header: "Tipo Evidencia", key: "tipoEvidencia", width: 22 },
        { header: "Tipo Archivo", key: "tipoArchivo", width: 18 },
        { header: "Tamaño (KB)", key: "tamanoKb", width: 13 },
        { header: "Descripción", key: "descripcion", width: 35 },
        { header: "Fecha Subida", key: "fechaSubida", width: 16 },
        { header: "URL", key: "fileUrl", width: 50 },
      ];
      wsEv.getRow(1).eachCell(cell => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      for (const action of actions) {
        const evs = evidencesByAction[action.id] || [];
        for (const ev of evs) {
          wsEv.addRow({
            accionId: action.accionId,
            nombreArchivo: ev.nombreArchivo,
            tipoEvidencia: ev.tipoEvidencia,
            tipoArchivo: ev.tipoArchivo,
            tamanoKb: ev.tamanoBytes ? Math.round(ev.tamanoBytes / 1024) : 0,
            descripcion: ev.descripcion || "",
            fechaSubida: new Date(ev.fechaSubida).toLocaleDateString("es-MX"),
            fileUrl: ev.fileUrl,
          });
        }
      }

      const xlsxBuffer = await workbook.xlsx.writeBuffer();
      return { xlsxBase64: Buffer.from(xlsxBuffer).toString("base64") };
    }),

  // ── Dashboard de Cumplimiento ─────────────────────────────────────────────
  /** Retorna estadísticas detalladas por plan para el dashboard de cumplimiento */
  getComplianceDashboard: protectedProcedure
    .input(z.object({
      tipoPlan: z.enum(["intervencion", "violencia_laboral", "no_discriminacion", "consolidado"]).optional(),
      nivelAplicacion: z.enum(["organizacional", "grupal", "individual"]).optional(),
      periodoMeses: z.number().int().min(1).max(24).optional().default(12),
    }))
    .query(async ({ input }) => {
      const db = await getDb();

      // 1. KPIs globales
      const [globalActions] = await db.select({
        total: sql<number>`count(*)`,
        noIniciadas: sql<number>`sum(case when estado = 'no_iniciada' then 1 else 0 end)`,
        enProceso: sql<number>`sum(case when estado = 'en_proceso' then 1 else 0 end)`,
        cumplidas: sql<number>`sum(case when estado = 'cumplida' then 1 else 0 end)`,
        vencidas: sql<number>`sum(case when estado = 'vencida' then 1 else 0 end)`,
        canceladas: sql<number>`sum(case when estado = 'cancelada' then 1 else 0 end)`,
        conEvidencia: sql<number>`sum(case when (select count(*) from nom035_evidences e where e.action_id = nom035_actions.id and e.is_active = 1) > 0 then 1 else 0 end)`,
        altaPrioridad: sql<number>`sum(case when prioridad = 'alta' then 1 else 0 end)`,
        altaVencida: sql<number>`sum(case when prioridad = 'alta' and estado = 'vencida' then 1 else 0 end)`,
      }).from(nom035Actions).where(eq(nom035Actions.isActive, true));

      // 2. Estadísticas por tipo de plan
      const byTipoPlan = await db.select({
        tipoPlan: nom035Actions.tipoPlan,
        total: sql<number>`count(*)`,
        cumplidas: sql<number>`sum(case when estado = 'cumplida' then 1 else 0 end)`,
        vencidas: sql<number>`sum(case when estado = 'vencida' then 1 else 0 end)`,
        enProceso: sql<number>`sum(case when estado = 'en_proceso' then 1 else 0 end)`,
        noIniciadas: sql<number>`sum(case when estado = 'no_iniciada' then 1 else 0 end)`,
      }).from(nom035Actions)
        .where(eq(nom035Actions.isActive, true))
        .groupBy(nom035Actions.tipoPlan);

      // 3. Estadísticas por nivel de aplicación
      const byNivel = await db.select({
        nivelAplicacion: nom035Actions.nivelAplicacion,
        total: sql<number>`count(*)`,
        cumplidas: sql<number>`sum(case when estado = 'cumplida' then 1 else 0 end)`,
        vencidas: sql<number>`sum(case when estado = 'vencida' then 1 else 0 end)`,
      }).from(nom035Actions)
        .where(eq(nom035Actions.isActive, true))
        .groupBy(nom035Actions.nivelAplicacion);

      // 4. Estadísticas por prioridad
      const byPrioridad = await db.select({
        prioridad: nom035Actions.prioridad,
        total: sql<number>`count(*)`,
        cumplidas: sql<number>`sum(case when estado = 'cumplida' then 1 else 0 end)`,
        vencidas: sql<number>`sum(case when estado = 'vencida' then 1 else 0 end)`,
      }).from(nom035Actions)
        .where(eq(nom035Actions.isActive, true))
        .groupBy(nom035Actions.prioridad);

      // 5. Planes con su % de cumplimiento (top 10 más recientes)
      const planes = await db.select({
        id: nom035Plans.id,
        identificadorNivel: nom035Plans.identificadorNivel,
        tipoPlan: nom035Plans.tipoPlan,
        nivelAplicacion: nom035Plans.nivelAplicacion,
        status: nom035Plans.status,
        centroTrabajo: nom035Plans.centroTrabajo,
        createdAt: nom035Plans.createdAt,
      }).from(nom035Plans)
        .orderBy(desc(nom035Plans.createdAt))
        .limit(20);

      // Para cada plan, obtener sus stats
      const planesConStats = await Promise.all(planes.map(async (plan) => {
        const [stats] = await db.select({
          total: sql<number>`count(*)`,
          cumplidas: sql<number>`sum(case when estado = 'cumplida' then 1 else 0 end)`,
          vencidas: sql<number>`sum(case when estado = 'vencida' then 1 else 0 end)`,
          enProceso: sql<number>`sum(case when estado = 'en_proceso' then 1 else 0 end)`,
          noIniciadas: sql<number>`sum(case when estado = 'no_iniciada' then 1 else 0 end)`,
          conEvidencia: sql<number>`sum(case when (select count(*) from nom035_evidences e where e.action_id = nom035_actions.id and e.is_active = 1) > 0 then 1 else 0 end)`,
        }).from(nom035Actions)
          .where(and(eq(nom035Actions.planId, plan.id), eq(nom035Actions.isActive, true)));

        const total = Number(stats?.total ?? 0);
        const cumplidas = Number(stats?.cumplidas ?? 0);
        const vencidas = Number(stats?.vencidas ?? 0);
        const porcentajeCumplimiento = total > 0 ? Math.round((cumplidas / total) * 100) : 0;
        // Semáforo: verde >= 80%, amarillo >= 50%, rojo < 50%
        const semaforo: "verde" | "amarillo" | "rojo" =
          porcentajeCumplimiento >= 80 ? "verde" :
          porcentajeCumplimiento >= 50 ? "amarillo" : "rojo";

        return {
          ...plan,
          totalAcciones: total,
          cumplidas,
          vencidas,
          enProceso: Number(stats?.enProceso ?? 0),
          noIniciadas: Number(stats?.noIniciadas ?? 0),
          conEvidencia: Number(stats?.conEvidencia ?? 0),
          porcentajeCumplimiento,
          semaforo,
        };
      }));

      // 6. Acciones próximas a vencer (próximos 14 días)
      const hoy = new Date();
      const en14Dias = new Date(hoy);
      en14Dias.setDate(en14Dias.getDate() + 14);
      const hoyStr = hoy.toISOString().split("T")[0];
      const en14DiasStr = en14Dias.toISOString().split("T")[0];

      const proximasAVencer = await db.select({
        id: nom035Actions.id,
        accionId: nom035Actions.accionId,
        objetivo: nom035Actions.objetivo,
        responsable: nom035Actions.responsable,
        plazo: nom035Actions.plazo,
        prioridad: nom035Actions.prioridad,
        tipoPlan: nom035Actions.tipoPlan,
        planId: nom035Actions.planId,
      }).from(nom035Actions)
        .where(and(
          eq(nom035Actions.isActive, true),
          inArray(nom035Actions.estado, ["no_iniciada", "en_proceso"]),
          gte(nom035Actions.plazo, hoyStr as any),
          lte(nom035Actions.plazo, en14DiasStr as any),
        ))
        .orderBy(asc(nom035Actions.plazo))
        .limit(10);

      // 7. Acciones vencidas recientes (últimas 10)
      const accionesVencidas = await db.select({
        id: nom035Actions.id,
        accionId: nom035Actions.accionId,
        objetivo: nom035Actions.objetivo,
        responsable: nom035Actions.responsable,
        plazo: nom035Actions.plazo,
        prioridad: nom035Actions.prioridad,
        tipoPlan: nom035Actions.tipoPlan,
        planId: nom035Actions.planId,
      }).from(nom035Actions)
        .where(and(
          eq(nom035Actions.isActive, true),
          eq(nom035Actions.estado, "vencida"),
        ))
        .orderBy(desc(nom035Actions.plazo))
        .limit(10);

      // 8. Tendencia mensual de cumplimiento (últimos N meses)
      const tendenciaMeses: Array<{ mes: string; cumplidas: number; vencidas: number; total: number }> = [];
      for (let i = (input.periodoMeses ?? 6) - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mesLabel = d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
        const primerDia = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
        const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

        const [mesStats] = await db.select({
          cumplidas: sql<number>`sum(case when estado = 'cumplida' then 1 else 0 end)`,
          vencidas: sql<number>`sum(case when estado = 'vencida' then 1 else 0 end)`,
          total: sql<number>`count(*)`,
        }).from(nom035Actions)
          .where(and(
            eq(nom035Actions.isActive, true),
            gte(nom035Actions.createdAt, new Date(primerDia)),
            lte(nom035Actions.createdAt, new Date(ultimoDia + "T23:59:59")),
          ));

        tendenciaMeses.push({
          mes: mesLabel,
          cumplidas: Number(mesStats?.cumplidas ?? 0),
          vencidas: Number(mesStats?.vencidas ?? 0),
          total: Number(mesStats?.total ?? 0),
        });
      }

      // Calcular KPIs globales derivados
      const totalGlobal = Number(globalActions?.total ?? 0);
      const cumplidasGlobal = Number(globalActions?.cumplidas ?? 0);
      const vencidasGlobal = Number(globalActions?.vencidas ?? 0);
      const porcentajeCumplimientoGlobal = totalGlobal > 0 ? Math.round((cumplidasGlobal / totalGlobal) * 100) : 0;
      const semaforoGlobal: "verde" | "amarillo" | "rojo" =
        porcentajeCumplimientoGlobal >= 80 ? "verde" :
        porcentajeCumplimientoGlobal >= 50 ? "amarillo" : "rojo";

      return {
        kpis: {
          ...globalActions,
          total: totalGlobal,
          cumplidas: cumplidasGlobal,
          vencidas: vencidasGlobal,
          noIniciadas: Number(globalActions?.noIniciadas ?? 0),
          enProceso: Number(globalActions?.enProceso ?? 0),
          canceladas: Number(globalActions?.canceladas ?? 0),
          conEvidencia: Number(globalActions?.conEvidencia ?? 0),
          altaPrioridad: Number(globalActions?.altaPrioridad ?? 0),
          altaVencida: Number(globalActions?.altaVencida ?? 0),
          porcentajeCumplimiento: porcentajeCumplimientoGlobal,
          semaforoGlobal,
        },
        byTipoPlan: byTipoPlan.map(r => ({
          ...r,
          total: Number(r.total),
          cumplidas: Number(r.cumplidas),
          vencidas: Number(r.vencidas),
          enProceso: Number(r.enProceso),
          noIniciadas: Number(r.noIniciadas),
          porcentaje: Number(r.total) > 0 ? Math.round((Number(r.cumplidas) / Number(r.total)) * 100) : 0,
        })),
        byNivel: byNivel.map(r => ({
          ...r,
          total: Number(r.total),
          cumplidas: Number(r.cumplidas),
          vencidas: Number(r.vencidas),
          porcentaje: Number(r.total) > 0 ? Math.round((Number(r.cumplidas) / Number(r.total)) * 100) : 0,
        })),
        byPrioridad: byPrioridad.map(r => ({
          ...r,
          total: Number(r.total),
          cumplidas: Number(r.cumplidas),
          vencidas: Number(r.vencidas),
          porcentaje: Number(r.total) > 0 ? Math.round((Number(r.cumplidas) / Number(r.total)) * 100) : 0,
        })),
        planes: planesConStats,
        proximasAVencer,
        accionesVencidas,
        tendenciaMeses,
      };
    }),
});

// ── Acciones por defecto si la IA falla ──────────────────────────────────────

function getDefaultActions(tipoPlan: string): any[] {
  const today = new Date();
  const add = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  if (tipoPlan === "violencia_laboral") {
    return [
      { accionId: "VL-01", tipoPlan: "violencia_laboral", objetivo: "Establecer política de cero tolerancia", accion: "Redactar y publicar política de cero tolerancia a la violencia laboral", descripcionCompleta: "Elaborar documento formal de política contra violencia laboral, obtener firma de dirección y difundir a todos los trabajadores.", indicador: "Política publicada y firmada por dirección general", responsable: "Responsable NOM-035", plazoDias: 30, prioridad: "alta" },
      { accionId: "VL-02", tipoPlan: "violencia_laboral", objetivo: "Implementar canal de denuncia", accion: "Crear buzón de quejas y canal de denuncia confidencial", descripcionCompleta: "Establecer mecanismo seguro y confidencial para que los trabajadores reporten actos de violencia.", indicador: "Canal operativo con al menos 1 prueba de funcionamiento", responsable: "RH / Comité NOM-035", plazoDias: 45, prioridad: "alta" },
      { accionId: "VL-03", tipoPlan: "violencia_laboral", objetivo: "Capacitar a supervisores", accion: "Impartir taller de prevención de violencia laboral a mandos medios", descripcionCompleta: "Capacitación de 4 horas sobre identificación, prevención y atención de violencia laboral.", indicador: "Lista de asistencia con mínimo 80% de participación", responsable: "Instructor / RH", plazoDias: 60, prioridad: "media" },
    ];
  }
  if (tipoPlan === "no_discriminacion") {
    return [
      { accionId: "ND-01", tipoPlan: "no_discriminacion", objetivo: "Política de inclusión y no discriminación", accion: "Elaborar y publicar política de no discriminación", descripcionCompleta: "Documento formal que prohíbe discriminación por género, edad, discapacidad, origen étnico, etc.", indicador: "Política publicada en cartelera y portal interno", responsable: "Dirección / RH", plazoDias: 30, prioridad: "alta" },
      { accionId: "ND-02", tipoPlan: "no_discriminacion", objetivo: "Capacitación en diversidad e inclusión", accion: "Impartir taller de diversidad e inclusión a todo el personal", descripcionCompleta: "Taller de 3 horas sobre sesgos inconscientes, inclusión y respeto a la diversidad.", indicador: "80% del personal capacitado con lista de asistencia", responsable: "RH / Instructor", plazoDias: 60, prioridad: "media" },
      { accionId: "ND-03", tipoPlan: "no_discriminacion", objetivo: "Indicadores de equidad", accion: "Establecer métricas de equidad de género y diversidad", descripcionCompleta: "Definir y medir indicadores de paridad salarial, distribución por género en puestos directivos.", indicador: "Reporte trimestral de indicadores de equidad", responsable: "RH / Dirección", plazoDias: 90, prioridad: "baja" },
    ];
  }
  // Intervención por defecto
  return [
    { accionId: "INT-01", tipoPlan: "intervencion", objetivo: "Reducir carga de trabajo excesiva", accion: "Revisar y redistribuir cargas de trabajo por área", descripcionCompleta: "Análisis de distribución de tareas y ajuste de asignaciones para evitar sobrecarga.", indicador: "Reducción de 20% en horas extra reportadas", responsable: "Jefes de área / RH", plazoDias: 30, prioridad: "alta" },
    { accionId: "INT-02", tipoPlan: "intervencion", objetivo: "Mejorar comunicación organizacional", accion: "Implementar reuniones semanales de seguimiento", descripcionCompleta: "Reuniones breves (30 min) semanales entre jefes y equipos para comunicar avances y resolver dudas.", indicador: "Minutas de reunión semanales por 3 meses", responsable: "Supervisores", plazoDias: 14, prioridad: "media" },
    { accionId: "INT-03", tipoPlan: "intervencion", objetivo: "Fortalecer liderazgo positivo", accion: "Capacitar a mandos medios en liderazgo y gestión del estrés", descripcionCompleta: "Programa de 8 horas de capacitación en liderazgo empático y manejo del estrés laboral.", indicador: "Lista de asistencia y evaluación de satisfacción ≥ 80%", responsable: "RH / Instructor", plazoDias: 45, prioridad: "alta" },
    { accionId: "INT-04", tipoPlan: "intervencion", objetivo: "Establecer programa de bienestar", accion: "Implementar actividades de bienestar y pausas activas", descripcionCompleta: "Programa mensual de actividades de bienestar: pausas activas, meditación, actividad física.", indicador: "Registro de participación mensual", responsable: "Comité NOM-035", plazoDias: 60, prioridad: "media" },
  ];
}
