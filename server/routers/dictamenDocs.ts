import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { dictamenDocs, docFormatConfig, caseInvestigationDocs, correctiveActions } from "../../drizzle/schema";
import { inArray } from "drizzle-orm";
import { eq, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
  return db;
}

async function generateFolio(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<{ folio: string; numeroDictamen: string }> {
  const [config] = await db.select().from(docFormatConfig).where(eq(docFormatConfig.docType, "dictamen")).limit(1);
  const prefix = config?.codigoFormato ?? "DIC";
  const year = new Date().getFullYear();
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(dictamenDocs);
  const consecutive = String((countRow?.count ?? 0) + 1).padStart(3, "0");
  const folio = `${prefix}-${consecutive}/${year}`;
  return { folio, numeroDictamen: folio };
}

const SYSTEM_PROMPT_DICTAMEN = `Eres el mejor abogado laboral especialista en seguridad y salud en el trabajo en México, con amplia experiencia en la NOM-035-STPS-2018. Generas documentación técnico-jurídica impecable, formal, estructurada y completamente apegada a la normativa vigente. El documento que generas tiene plena validez técnica y jurídica. Usa lenguaje técnico-jurídico formal, estructurado, con precisión normativa. Responde EXCLUSIVAMENTE en formato JSON con los campos especificados.`;

async function generateDictamenContent(params: {
  razonSocial: string;
  domicilio: string;
  totalTrabajadores: number;
  trabajadoresHombres: number;
  trabajadoresMujeres: number;
  periodoEvaluado: string;
  responsableTecnico: string;
  cedulaProfesional: string;
  representanteLegal: string;
  folio: string;
  fechaEmision: string;
  // SECCIÓN 8.5 — datos reales de cumplimiento
  resumen85?: {
    cumplimiento: string;
    mensaje: string;
    totalAcciones: number;
    totalCompletadas: number;
    porcentajeCompletado: number;
    tieneOrganizacional: boolean;
    tieneGrupal: boolean;
    tieneIndividual: boolean;
    alertasNivel3SinClinico: number;
    accionesOrganizacional: number;
    accionesGrupal: number;
    accionesIndividual: number;
  };
}): Promise<{ contenido: Record<string, string>; nivelRiesgoGlobal: string }> {
  const userPrompt = `Genera el documento "Dictamen" para la NOM-035-STPS-2018 con los siguientes datos:
- Razón social: ${params.razonSocial}
- Domicilio: ${params.domicilio}
- Total de trabajadores: ${params.totalTrabajadores} (Hombres: ${params.trabajadoresHombres}, Mujeres: ${params.trabajadoresMujeres})
- Período evaluado: ${params.periodoEvaluado}
- Responsable técnico: ${params.responsableTecnico} (Cédula: ${params.cedulaProfesional})
- Representante legal: ${params.representanteLegal}
- Número de dictamen: ${params.folio}
- Fecha de emisión: ${params.fechaEmision}

Genera los 11 apartados obligatorios del Dictamen NOM-035 en formato JSON con exactamente estas claves:
{
  "encabezado_formal": "Apartado 1 - Encabezado formal completo con razón social, domicilio fiscal, número de trabajadores desglosado por sexo",
  "numero_fecha": "Apartado 2 - Número de dictamen ${params.folio} y fecha de emisión ${params.fechaEmision} con lugar formal",
  "metodologia": "Apartado 3 - Metodología aplicada: instrumentos utilizados (Guía de Referencia I/II/III según tamaño de empresa), fechas de aplicación, tamaño de muestra, tasa de respuesta obtenida",
  "hallazgos_clave": "Apartado 4 - Hallazgos clave: niveles de riesgo por dominio (condiciones del ambiente de trabajo, factores propios de la actividad, organización del tiempo de trabajo, liderazgo y relaciones en el trabajo, entorno organizacional) con clasificación bajo/medio/alto/muy alto",
  "impacto_legal": "Apartado 5 - Análisis de impacto legal: artículos de la LFT (Art. 132 fracc. XXXI, Art. 512) y puntos de la NOM-035 (puntos 5, 6, 7, 8, 9) que se incumplen según los hallazgos identificados",
  "conclusiones_tecnicas": "Apartado 6 - Conclusiones técnicas: determinación del nivel de riesgo global con justificación técnica exhaustiva basada en los hallazgos",
  "conclusiones_juridicas": "Apartado 7 - Conclusiones jurídicas: redacción clara de imputación normativa, señalando obligaciones incumplidas y su base legal precisa",
  "medidas_correctivas": "Apartado 8 - Medidas correctivas: acciones específicas, plazos en días hábiles (30, 60, 90 días) y responsable designado para cada medida",
  "recomendaciones_seguimiento": "Apartado 9 - Recomendaciones de seguimiento: fecha de próxima evaluación, indicadores de cumplimiento a monitorear, métricas de seguimiento",
  "firmas": "Apartado 10 - Firmas: espacio formal para responsable técnico (nombre completo, cédula profesional, cargo) y representante legal (nombre, cargo, firma y sello)",
  "anexos": "Apartado 11 - Anexos: listado numerado de documentos que integran el expediente (cuestionarios aplicados, listas de asistencia, evidencias fotográficas, actas del comité, etc.)"
}

También determina el nivel de riesgo global en el campo "nivel_riesgo_global" con uno de estos valores exactos: ausente, bajo, medio, alto, muy_alto.

Cada apartado debe ser extenso, técnico-jurídico y completamente desarrollado (mínimo 3 párrafos por apartado). El tono debe ser formal, estructurado y con precisión normativa.`;

  // Inyectar datos reales del Resumen 8.5 en el prompt del Apartado 8
  let finalPrompt = userPrompt;
  if (params.resumen85) {
    const r = params.resumen85;
    const nivelesPresentes = [
      r.tieneOrganizacional ? `Nivel 1 Organizacional (${r.accionesOrganizacional} acciones)` : null,
      r.tieneGrupal ? `Nivel 2 Grupal (${r.accionesGrupal} acciones)` : null,
      r.tieneIndividual ? `Nivel 3 Individual (${r.accionesIndividual} acciones)` : null,
    ].filter(Boolean).join(", ");
    finalPrompt = userPrompt + `\n\n--- DATOS REALES DEL PUNTO 8.5 (inyectados automáticamente) ---\nEstado de cumplimiento: ${r.cumplimiento.toUpperCase()} — ${r.mensaje}\nTotal de acciones correctivas registradas: ${r.totalAcciones} (${r.totalCompletadas} completadas, ${r.porcentajeCompletado}% de avance)\nNiveles con acciones: ${nivelesPresentes || 'Ninguno'}\nAlertas Nivel 3 sin responsable clínico: ${r.alertasNivel3SinClinico}\nNOTA: El Apartado 8 (Medidas Correctivas) DEBE reflejar estos datos reales. Si hay alertas de Nivel 3 sin clínico, inclúyelas como medidas urgentes con plazo de 15 días hábiles.`;
  }

  const response = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT_DICTAMEN },
      { role: "user", content: finalPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "dictamen_nom035",
        strict: true,
        schema: {
          type: "object",
          properties: {
            encabezado_formal: { type: "string" },
            numero_fecha: { type: "string" },
            metodologia: { type: "string" },
            hallazgos_clave: { type: "string" },
            impacto_legal: { type: "string" },
            conclusiones_tecnicas: { type: "string" },
            conclusiones_juridicas: { type: "string" },
            medidas_correctivas: { type: "string" },
            recomendaciones_seguimiento: { type: "string" },
            firmas: { type: "string" },
            anexos: { type: "string" },
            nivel_riesgo_global: { type: "string", enum: ["ausente", "bajo", "medio", "alto", "muy_alto"] },
          },
          required: [
            "encabezado_formal","numero_fecha","metodologia","hallazgos_clave",
            "impacto_legal","conclusiones_tecnicas","conclusiones_juridicas",
            "medidas_correctivas","recomendaciones_seguimiento","firmas","anexos","nivel_riesgo_global"
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM no retornó contenido para el Dictamen" });

  const parsed = JSON.parse(content);
  const { nivel_riesgo_global, ...contenido } = parsed;
  return { contenido, nivelRiesgoGlobal: nivel_riesgo_global };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const dictamenDocsRouter = router({
  generate: protectedProcedure
    .input(z.object({
      razonSocial: z.string().min(2, "Razón social requerida"),
      domicilio: z.string().min(5, "Domicilio requerido"),
      totalTrabajadores: z.number().int().positive("Número de trabajadores requerido"),
      trabajadoresHombres: z.number().int().min(0),
      trabajadoresMujeres: z.number().int().min(0),
      periodoEvaluado: z.string().min(4, "Período evaluado requerido"),
      responsableTecnico: z.string().min(2, "Responsable técnico requerido"),
      cedulaProfesional: z.string().min(3, "Cédula profesional requerida"),
      representanteLegal: z.string().min(2, "Representante legal requerido"),
      investigationDocId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { folio, numeroDictamen } = await generateFolio(db);
      const fechaEmision = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

      // Consultar automáticamente el Resumen 8.5 para inyectarlo en el Apartado 8
      let resumen85: Parameters<typeof generateDictamenContent>[0]['resumen85'];
      try {
        const allActions = await db.select().from(correctiveActions);
        const byLevel = {
          organizacional: allActions.filter(a => a.actionLevel === 'organizacional'),
          grupal: allActions.filter(a => a.actionLevel === 'grupal'),
          individual: allActions.filter(a => a.actionLevel === 'individual'),
        };
        const totalAcciones = allActions.length;
        const totalCompletadas = allActions.filter(a => a.status === 'completada').length;
        const alertasNivel3 = byLevel.individual.filter(a => !a.clinicalTitle).length;
        const tieneOrganizacional = byLevel.organizacional.length > 0;
        const tieneGrupal = byLevel.grupal.length > 0;
        const tieneIndividual = byLevel.individual.length > 0;
        const cumplimiento = tieneOrganizacional && tieneGrupal && tieneIndividual && alertasNivel3 === 0
          ? 'cumple' : tieneOrganizacional || tieneGrupal || tieneIndividual ? 'riesgo' : 'incumple';
        resumen85 = {
          cumplimiento,
          mensaje: cumplimiento === 'cumple' ? 'Centro de trabajo CUMPLE con el punto 8.5' : 'Requiere atención en acciones correctivas',
          totalAcciones,
          totalCompletadas,
          porcentajeCompletado: totalAcciones > 0 ? Math.round((totalCompletadas / totalAcciones) * 100) : 0,
          tieneOrganizacional,
          tieneGrupal,
          tieneIndividual,
          alertasNivel3SinClinico: alertasNivel3,
          accionesOrganizacional: byLevel.organizacional.length,
          accionesGrupal: byLevel.grupal.length,
          accionesIndividual: byLevel.individual.length,
        };
      } catch {
        // Si falla la consulta, continuar sin datos del 8.5
      }

      const { contenido, nivelRiesgoGlobal } = await generateDictamenContent({
        ...input,
        folio,
        fechaEmision,
        resumen85,
      });

      const [result] = await db.insert(dictamenDocs).values({
        folio,
        numeroDictamen,
        razonSocial: input.razonSocial,
        domicilio: input.domicilio,
        totalTrabajadores: input.totalTrabajadores,
        trabajadoresHombres: input.trabajadoresHombres,
        trabajadoresMujeres: input.trabajadoresMujeres,
        periodoEvaluado: input.periodoEvaluado,
        responsableTecnico: input.responsableTecnico,
        cedulaProfesional: input.cedulaProfesional,
        representanteLegal: input.representanteLegal,
        investigationDocId: input.investigationDocId,
        contenido,
        nivelRiesgoGlobal: nivelRiesgoGlobal as any,
        estado: "borrador",
        creadoPor: ctx.user.id,
      });

      const id = (result as any).insertId;
      const [doc] = await db.select().from(dictamenDocs).where(eq(dictamenDocs.id, id)).limit(1);
      return { success: true, doc };
    }),

  save: protectedProcedure
    .input(z.object({
      id: z.number(),
      contenido: z.record(z.string(), z.string()),
      estado: z.enum(["borrador", "final"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(dictamenDocs)
        .set({ contenido: input.contenido as any, estado: input.estado })
        .where(eq(dictamenDocs.id, input.id));
      return { success: true };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(dictamenDocs)
        .set({ estado: "aprobado", aprobadoPor: ctx.user.id, fechaAprobacion: new Date() })
        .where(eq(dictamenDocs.id, input.id));
      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({
      estado: z.enum(["borrador", "final", "aprobado", "all"]).default("all"),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const docs = await db.select().from(dictamenDocs).orderBy(desc(dictamenDocs.createdAt));
      if (input?.estado && input.estado !== "all") {
        return docs.filter(d => d.estado === input.estado);
      }
      return docs;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [doc] = await db.select().from(dictamenDocs).where(eq(dictamenDocs.id, input.id)).limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Dictamen no encontrado" });
      return doc;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(dictamenDocs).where(eq(dictamenDocs.id, input.id));
      return { success: true };
    }),

  // Obtener lista de Investigaciones de Caso para vincular
  listInvestigaciones: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      return db.select({
        id: caseInvestigationDocs.id,
        folio: caseInvestigationDocs.folio,
        empresa: caseInvestigationDocs.empresa,
        area: caseInvestigationDocs.area,
        estado: caseInvestigationDocs.estado,
      }).from(caseInvestigationDocs).orderBy(desc(caseInvestigationDocs.createdAt));
    }),
});
