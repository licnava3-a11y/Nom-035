import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc.js";
import { getDb } from '../db.js';
import { complianceChecklist, complianceChecks, complianceEvidence } from "../../drizzle/schema.js";
import { eq, sql } from "drizzle-orm";

export const complianceRouter = router({
  // Obtener checklist completo con estado de cumplimiento
  getChecklist: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const items = await db
      .select({
        id: complianceChecklist.id,
        section: complianceChecklist.section,
        sectionName: complianceChecklist.sectionName,
        itemCode: complianceChecklist.itemCode,
        requirement: complianceChecklist.requirement,
        evidence: complianceChecklist.evidence,
        fundament: complianceChecklist.fundament,
        checkId: complianceChecks.id,
        isCompliant: complianceChecks.isCompliant,
        verifiedBy: complianceChecks.verifiedBy,
        verifiedAt: complianceChecks.verifiedAt,
        notes: complianceChecks.notes,
      })
      .from(complianceChecklist)
      .leftJoin(
        complianceChecks,
        eq(complianceChecklist.id, complianceChecks.checklistItemId)
      )
      .orderBy(complianceChecklist.itemCode);

    return items;
  }),

  // Obtener estadísticas de cumplimiento por sección
  getComplianceStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const stats = await db
      .select({
        section: complianceChecklist.section,
        sectionName: complianceChecklist.sectionName,
        total: sql<number>`COUNT(${complianceChecklist.id})`,
        compliant: sql<number>`SUM(CASE WHEN ${complianceChecks.isCompliant} = 1 THEN 1 ELSE 0 END)`,
      })
      .from(complianceChecklist)
      .leftJoin(
        complianceChecks,
        eq(complianceChecklist.id, complianceChecks.checklistItemId)
      )
      .groupBy(complianceChecklist.section, complianceChecklist.sectionName)
      .orderBy(complianceChecklist.section);

    const overall = stats.reduce(
      (acc: { total: number; compliant: number }, curr: { total: number; compliant: number | null }) => ({
        total: acc.total + curr.total,
        compliant: acc.compliant + (curr.compliant || 0),
      }),
      { total: 0, compliant: 0 }
    );

    return {
      overall: {
        total: overall.total,
        compliant: overall.compliant,
        percentage: overall.total > 0 ? Math.round((overall.compliant / overall.total) * 100) : 0,
      },
      sections: stats.map((s: { section: string; sectionName: string; total: number; compliant: number | null }) => ({
        section: s.section,
        sectionName: s.sectionName,
        total: s.total,
        compliant: s.compliant || 0,
        percentage: s.total > 0 ? Math.round(((s.compliant || 0) / s.total) * 100) : 0,
      })),
    };
  }),

  // Marcar item como cumplido/no cumplido
  updateCompliance: protectedProcedure
    .input(
      z.object({
        checklistItemId: z.number(),
        isCompliant: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      // Verificar si ya existe un registro de verificación
      const existing = await db
        .select()
        .from(complianceChecks)
        .where(eq(complianceChecks.checklistItemId, input.checklistItemId))
        .limit(1);

      if (existing.length > 0) {
        // Actualizar registro existente
        await db
          .update(complianceChecks)
          .set({
            isCompliant: input.isCompliant,
            verifiedBy: ctx.user.id,
            verifiedAt: new Date(),
            notes: input.notes,
          })
          .where(eq(complianceChecks.id, existing[0].id));

        return { success: true, checkId: existing[0].id };
      } else {
        // Crear nuevo registro
        const result = await db.insert(complianceChecks).values({
          checklistItemId: input.checklistItemId,
          isCompliant: input.isCompliant,
          verifiedBy: ctx.user.id,
          verifiedAt: new Date(),
          notes: input.notes,
        });

        return { success: true, checkId: result[0].insertId };
      }
    }),

  // Obtener matriz de trazabilidad (requisito -> módulo -> evidencia)
  getTraceabilityMatrix: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const items = await db
      .select({
        section: complianceChecklist.section,
        sectionName: complianceChecklist.sectionName,
        itemCode: complianceChecklist.itemCode,
        requirement: complianceChecklist.requirement,
        evidence: complianceChecklist.evidence,
        fundament: complianceChecklist.fundament,
        isCompliant: complianceChecks.isCompliant,
      })
      .from(complianceChecklist)
      .leftJoin(
        complianceChecks,
        eq(complianceChecklist.id, complianceChecks.checklistItemId)
      )
      .orderBy(complianceChecklist.itemCode);

    return items;
  }),

  // Obtener items pendientes (no cumplidos o sin verificar)
  getPendingItems: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const items = await db
      .select({
        id: complianceChecklist.id,
        section: complianceChecklist.section,
        sectionName: complianceChecklist.sectionName,
        itemCode: complianceChecklist.itemCode,
        requirement: complianceChecklist.requirement,
        evidence: complianceChecklist.evidence,
        fundament: complianceChecklist.fundament,
        isCompliant: complianceChecks.isCompliant,
      })
      .from(complianceChecklist)
      .leftJoin(
        complianceChecks,
        eq(complianceChecklist.id, complianceChecks.checklistItemId)
      )
      .where(
        sql`${complianceChecks.isCompliant} IS NULL OR ${complianceChecks.isCompliant} = 0`
      )
      .orderBy(complianceChecklist.section, complianceChecklist.itemCode);

    return items;
  }),
});
