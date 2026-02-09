/**
 * Router tRPC para Módulo de Autodiagnóstico NOM-035
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { 
  autodiagnosticos, 
  requirements, 
  evidences,
  users
} from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { storagePut } from '../storage';

export const autodiagnosticoRouter = router({
  /**
   * Obtiene el catálogo completo de requisitos NOM-035
   */
  getRequirements: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const allRequirements = await db
      .select()
      .from(requirements)
      .orderBy(requirements.orden);

    // Agrupar por categoría
    const grouped: Record<number, any[]> = {};
    for (const req of allRequirements) {
      if (!grouped[req.categoria]) {
        grouped[req.categoria] = [];
      }
      grouped[req.categoria].push(req);
    }

    return {
      requirements: allRequirements,
      byCategory: grouped,
      totalRequirements: allRequirements.length,
    };
  }),

  /**
   * Crea un nuevo autodiagnóstico
   */
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    // Crear autodiagnóstico
    const [newAutodiagnostico] = await db.insert(autodiagnosticos).values({
      userId: ctx.user.id,
      status: 'en_progreso',
    });

    // Obtener todos los requisitos
    const allRequirements = await db.select().from(requirements);

    // Crear evidencias vacías para cada requisito
    const evidencesData = allRequirements.map(req => ({
      autodiagnosticoId: newAutodiagnostico.insertId,
      requirementId: req.id,
      cumple: false,
    }));

    await db.insert(evidences).values(evidencesData);

    return {
      id: newAutodiagnostico.insertId,
      message: 'Autodiagnóstico creado exitosamente',
    };
  }),

  /**
   * Obtiene todos los autodiagnósticos del usuario actual
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const userAutodiagnosticos = await db
      .select()
      .from(autodiagnosticos)
      .where(eq(autodiagnosticos.userId, ctx.user.id))
      .orderBy(desc(autodiagnosticos.createdAt));

    return userAutodiagnosticos;
  }),

  /**
   * Obtiene un autodiagnóstico específico con todas sus evidencias
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Obtener autodiagnóstico
      const [autodiagnostico] = await db
        .select()
        .from(autodiagnosticos)
        .where(
          and(
            eq(autodiagnosticos.id, input.id),
            eq(autodiagnosticos.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!autodiagnostico) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Autodiagnóstico no encontrado',
        });
      }

      // Obtener evidencias con requisitos
      const allEvidences = await db
        .select({
          evidence: evidences,
          requirement: requirements,
        })
        .from(evidences)
        .leftJoin(requirements, eq(evidences.requirementId, requirements.id))
        .where(eq(evidences.autodiagnosticoId, input.id))
        .orderBy(requirements.orden);

      return {
        autodiagnostico,
        evidences: allEvidences,
      };
    }),

  /**
   * Actualiza una evidencia específica
   */
  updateEvidence: protectedProcedure
    .input(z.object({
      evidenceId: z.number(),
      cumple: z.boolean(),
      observaciones: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Verificar que la evidencia pertenece a un autodiagnóstico del usuario
      const [evidence] = await db
        .select({
          evidence: evidences,
          autodiagnostico: autodiagnosticos,
        })
        .from(evidences)
        .leftJoin(autodiagnosticos, eq(evidences.autodiagnosticoId, autodiagnosticos.id))
        .where(eq(evidences.id, input.evidenceId))
        .limit(1);

      if (!evidence || evidence.autodiagnostico?.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tienes permisos para actualizar esta evidencia',
        });
      }

      // Actualizar evidencia
      await db
        .update(evidences)
        .set({
          cumple: input.cumple,
          observaciones: input.observaciones,
        })
        .where(eq(evidences.id, input.evidenceId));

      // Recalcular porcentajes
      const autodiagnosticoId = evidence.evidence.autodiagnosticoId;
      await recalculatePercentages(db, autodiagnosticoId);

      return {
        success: true,
        message: 'Evidencia actualizada exitosamente',
      };
    }),

  /**
   * Sube un archivo de evidencia a S3
   */
  uploadEvidence: protectedProcedure
    .input(z.object({
      evidenceId: z.number(),
      fileName: z.string(),
      fileContent: z.string(), // Base64
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Verificar que la evidencia pertenece a un autodiagnóstico del usuario
      const [evidence] = await db
        .select({
          evidence: evidences,
          autodiagnostico: autodiagnosticos,
        })
        .from(evidences)
        .leftJoin(autodiagnosticos, eq(evidences.autodiagnosticoId, autodiagnosticos.id))
        .where(eq(evidences.id, input.evidenceId))
        .limit(1);

      if (!evidence || evidence.autodiagnostico?.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tienes permisos para subir evidencia',
        });
      }

      // Decodificar base64
      const buffer = Buffer.from(input.fileContent, 'base64');

      // Subir a S3
      const fileKey = `autodiagnostico/${ctx.user.id}/${evidence.evidence.autodiagnosticoId}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // Actualizar evidencia con URL
      await db
        .update(evidences)
        .set({
          evidenciaUrl: url,
          evidenciaNombre: input.fileName,
        })
        .where(eq(evidences.id, input.evidenceId));

      return {
        success: true,
        url,
        message: 'Evidencia subida exitosamente',
      };
    }),

  /**
   * Calcula y actualiza los porcentajes de cumplimiento
   */
  calculate: protectedProcedure
    .input(z.object({
      autodiagnosticoId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Verificar que el autodiagnóstico pertenece al usuario
      const [autodiagnostico] = await db
        .select()
        .from(autodiagnosticos)
        .where(
          and(
            eq(autodiagnosticos.id, input.autodiagnosticoId),
            eq(autodiagnosticos.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!autodiagnostico) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Autodiagnóstico no encontrado',
        });
      }

      // Recalcular porcentajes
      const result = await recalculatePercentages(db, input.autodiagnosticoId);

      return {
        success: true,
        ...result,
      };
    }),

  /**
   * Obtiene datos completos para generar PDF del autodiagnóstico
   */
  getPDFData: protectedProcedure
    .input(z.object({ autodiagnosticoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Obtener autodiagnóstico
      const [autodiagnostico] = await db
        .select()
        .from(autodiagnosticos)
        .where(and(
          eq(autodiagnosticos.id, input.autodiagnosticoId),
          eq(autodiagnosticos.userId, ctx.user.id)
        ));

      if (!autodiagnostico) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Autodiagnóstico no encontrado' });
      }

      // Obtener evidencias con requisitos
      const allEvidences = await db
        .select({
          evidence: evidences,
          requirement: requirements,
        })
        .from(evidences)
        .leftJoin(requirements, eq(evidences.requirementId, requirements.id))
        .where(eq(evidences.autodiagnosticoId, input.autodiagnosticoId))
        .orderBy(requirements.orden);

      // Agrupar por categoría
      const categorias = [
        { id: 1, nombre: 'Política de Prevención' },
        { id: 2, nombre: 'Identificación y Análisis' },
        { id: 3, nombre: 'Medidas de Prevención y Control' },
        { id: 4, nombre: 'Atención de Casos' },
        { id: 5, nombre: 'Registros y Evidencias' },
      ];

      const categoriaData = categorias.map((cat) => {
        const evidenciasCategoria = allEvidences.filter(
          (item) => item.requirement?.categoria === cat.id
        );
        const cumplidos = evidenciasCategoria.filter((item) => item.evidence.cumple).length;
        const total = evidenciasCategoria.length;
        const porcentaje = total > 0 ? Math.round((cumplidos / total) * 100) : 0;

        return {
          categoria: cat.nombre,
          porcentaje,
          cumplidos,
          total,
        };
      });

      // Formatear evidencias
      const evidenciasFormateadas = allEvidences.map((item) => ({
        requirementId: item.evidence.requirementId,
        codigo: item.requirement?.codigo || '',
        descripcion: item.requirement?.descripcion || '',
        cumple: item.evidence.cumple,
        evidenciaUrl: item.evidence.evidenciaUrl,
        observaciones: item.evidence.observaciones,
      }));

      return {
        autodiagnostico: {
          id: autodiagnostico.id,
          fecha: autodiagnostico.fecha.toISOString(),
          porcentajeTotal: autodiagnostico.porcentajeTotal,
          status: autodiagnostico.status,
        },
        categorias: categoriaData,
        evidencias: evidenciasFormateadas,
      };
    }),
});

/**
 * Helper para recalcular porcentajes de cumplimiento
 */
async function recalculatePercentages(db: any, autodiagnosticoId: number) {
  // Obtener todas las evidencias con requisitos
  const allEvidences = await db
    .select({
      evidence: evidences,
      requirement: requirements,
    })
    .from(evidences)
    .leftJoin(requirements, eq(evidences.requirementId, requirements.id))
    .where(eq(evidences.autodiagnosticoId, autodiagnosticoId));

  // Calcular porcentajes por categoría
  const categoryCounts: Record<number, { total: number; cumple: number }> = {};
  
  for (const item of allEvidences) {
    const categoria = item.requirement?.categoria || 0;
    if (!categoryCounts[categoria]) {
      categoryCounts[categoria] = { total: 0, cumple: 0 };
    }
    categoryCounts[categoria].total++;
    if (item.evidence.cumple) {
      categoryCounts[categoria].cumple++;
    }
  }

  // Calcular porcentajes
  const percentages: Record<string, number> = {};
  let totalCumple = 0;
  let totalRequisitos = 0;

  for (let i = 1; i <= 5; i++) {
    const cat = categoryCounts[i] || { total: 0, cumple: 0 };
    const percentage = cat.total > 0 ? (cat.cumple / cat.total) * 100 : 0;
    percentages[`porcentajeCategoria${i}`] = Math.round(percentage * 100) / 100;
    totalCumple += cat.cumple;
    totalRequisitos += cat.total;
  }

  const porcentajeTotal = totalRequisitos > 0 ? (totalCumple / totalRequisitos) * 100 : 0;

  // Actualizar autodiagnóstico
  await db
    .update(autodiagnosticos)
    .set({
      porcentajeTotal: Math.round(porcentajeTotal * 100) / 100,
      porcentajeCategoria1: percentages.porcentajeCategoria1,
      porcentajeCategoria2: percentages.porcentajeCategoria2,
      porcentajeCategoria3: percentages.porcentajeCategoria3,
      porcentajeCategoria4: percentages.porcentajeCategoria4,
      porcentajeCategoria5: percentages.porcentajeCategoria5,
    })
    .where(eq(autodiagnosticos.id, autodiagnosticoId));

  return {
    porcentajeTotal: Math.round(porcentajeTotal * 100) / 100,
    porcentajeCategoria1: percentages.porcentajeCategoria1,
    porcentajeCategoria2: percentages.porcentajeCategoria2,
    porcentajeCategoria3: percentages.porcentajeCategoria3,
    porcentajeCategoria4: percentages.porcentajeCategoria4,
    porcentajeCategoria5: percentages.porcentajeCategoria5,
  };
}
