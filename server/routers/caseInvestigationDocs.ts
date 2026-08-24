import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";

async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Base de datos no disponible",
    });
  return db;
}
import { caseInvestigationDocs, docFormatConfig } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function generateFolio(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<string> {
  // Get format config
  const [config] = await db
    .select()
    .from(docFormatConfig)
    .where(eq(docFormatConfig.docType, "investigacion"))
    .limit(1);
  const prefix = config?.codigoFormato ?? "INV";
  const year = new Date().getFullYear();
  // Count existing docs this year
  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(caseInvestigationDocs);
  const consecutive = String((countRow?.count ?? 0) + 1).padStart(3, "0");
  return `${prefix}-${consecutive}/${year}`;
}

const SYSTEM_PROMPT_INVESTIGACION = `Eres el mejor abogado laboral especialista en seguridad y salud en el trabajo en México, con amplia experiencia en la NOM-035-STPS-2018. Generas documentación técnico-jurídica impecable, formal, estructurada y completamente apegada a la normativa vigente. Cada apartado debe ser exhaustivo, preciso y listo para integrar al expediente de cumplimiento normativo. Usa lenguaje técnico-jurídico formal. Responde EXCLUSIVAMENTE en formato JSON con los campos especificados.`;

async function generateInvestigacionContent(params: {
  empresa: string;
  area: string;
  fechaInvestigacion: string;
  responsableSst: string;
}): Promise<Record<string, string>> {
  const userPrompt = `Genera el documento "Investigación de caso" para la NOM-035-STPS-2018 con los siguientes datos:
- Empresa: ${params.empresa}
- Área/Departamento: ${params.area}
- Fecha de investigación: ${params.fechaInvestigacion}
- Responsable SST: ${params.responsableSst}

Genera los 11 apartados obligatorios en formato JSON con exactamente estas claves:
{
  "fundamento_normativo": "Texto completo del apartado 1 - Fundamento normativo (artículos y puntos de la NOM-035 que exigen la investigación)",
  "objetivo": "Texto completo del apartado 2 - Objetivo de la investigación (general y específicos)",
  "alcance": "Texto completo del apartado 3 - Alcance (puestos, áreas, modalidades de trabajo)",
  "instrumentos": "Texto completo del apartado 4 - Instrumentos de evaluación (Guía de Referencia I, II y III; especificar cuál se usa para qué)",
  "poblacion_muestra": "Texto completo del apartado 5 - Población objetivo y muestra (criterios de inclusión, exclusión y cálculo muestral)",
  "periodicidad": "Texto completo del apartado 6 - Periodicidad (cada 12 o 24 meses; eventos traumáticos)",
  "responsables": "Texto completo del apartado 7 - Responsables de la investigación (perfil: psicólogo con experiencia en SST, cédula profesional)",
  "calendario": "Texto completo del apartado 8 - Calendario de etapas (planeación, aplicación, análisis, integración del expediente)",
  "confidencialidad": "Texto completo del apartado 9 - Mecanismos de confidencialidad y no represalias",
  "integracion_normas": "Texto completo del apartado 10 - Criterios de integración con otras normas (NOM-036, NOM-037, etc.)",
  "aprobacion_registro": "Texto completo del apartado 11 - Aprobación y registro (visto bueno del patrón o responsable de SST)"
}

Cada apartado debe ser extenso, técnico-jurídico y completamente desarrollado (mínimo 3 párrafos por apartado).`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT_INVESTIGACION },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "investigacion_caso",
        strict: true,
        schema: {
          type: "object",
          properties: {
            fundamento_normativo: { type: "string" },
            objetivo: { type: "string" },
            alcance: { type: "string" },
            instrumentos: { type: "string" },
            poblacion_muestra: { type: "string" },
            periodicidad: { type: "string" },
            responsables: { type: "string" },
            calendario: { type: "string" },
            confidencialidad: { type: "string" },
            integracion_normas: { type: "string" },
            aprobacion_registro: { type: "string" },
          },
          required: [
            "fundamento_normativo",
            "objetivo",
            "alcance",
            "instrumentos",
            "poblacion_muestra",
            "periodicidad",
            "responsables",
            "calendario",
            "confidencialidad",
            "integracion_normas",
            "aprobacion_registro",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "LLM no retornó contenido",
    });
  return JSON.parse(content);
}

// ── Router ────────────────────────────────────────────────────────────────────

export const caseInvestigationDocsRouter = router({
  generate: protectedProcedure
    .input(
      z.object({
        empresa: z.string().min(2, "Nombre de empresa requerido"),
        area: z.string().min(2, "Área requerida"),
        fechaInvestigacion: z.string().min(4, "Fecha requerida"),
        responsableSst: z.string().min(2, "Responsable SST requerido"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const contenido = await generateInvestigacionContent(input);
      const folio = await generateFolio(db);
      const [result] = await db.insert(caseInvestigationDocs).values({
        folio,
        empresa: input.empresa,
        area: input.area,
        fechaInvestigacion: input.fechaInvestigacion,
        responsableSst: input.responsableSst,
        contenido,
        estado: "borrador",
        creadoPor: ctx.user.id,
      });
      const id = (result as any).insertId;
      const [doc] = await db
        .select()
        .from(caseInvestigationDocs)
        .where(eq(caseInvestigationDocs.id, id))
        .limit(1);
      return { success: true, doc };
    }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        contenido: z.record(z.string(), z.string()),
        estado: z.enum(["borrador", "final"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(caseInvestigationDocs)
        .set({ contenido: input.contenido as any, estado: input.estado })
        .where(eq(caseInvestigationDocs.id, input.id));
      return { success: true };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db
        .update(caseInvestigationDocs)
        .set({
          estado: "aprobado",
          aprobadoPor: ctx.user.id,
          fechaAprobacion: new Date(),
        })
        .where(eq(caseInvestigationDocs.id, input.id));
      return { success: true };
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          estado: z
            .enum(["borrador", "final", "aprobado", "all"])
            .default("all"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const query = db
        .select()
        .from(caseInvestigationDocs)
        .orderBy(desc(caseInvestigationDocs.createdAt));
      const docs = await query;
      if (input?.estado && input.estado !== "all") {
        return docs.filter(d => d.estado === input.estado);
      }
      return docs;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [doc] = await db
        .select()
        .from(caseInvestigationDocs)
        .where(eq(caseInvestigationDocs.id, input.id))
        .limit(1);
      if (!doc)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Documento no encontrado",
        });
      return doc;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .delete(caseInvestigationDocs)
        .where(eq(caseInvestigationDocs.id, input.id));
      return { success: true };
    }),
});
