import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc.js";
import { getDb } from '../db.js';
import { complianceChecklist, complianceChecks, complianceEvidence, complianceRequirements, nom035Policies, nom035Results, correctiveActions, users, companyGeneralData, companyLogo } from "../../drizzle/schema.js";
import { eq, sql, desc } from "drizzle-orm";

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

  // Obtener todos los requisitos normativos NOM-035
  getRequirements: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    return await db
      .select()
      .from(complianceRequirements)
      .where(eq(complianceRequirements.isActive, true))
      .orderBy(complianceRequirements.numeral);
  }),

  // Verificar Numeral 7.1 - Política de Prevención
  verifyNumeral71: protectedProcedure
    .input(z.object({
      policyId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar si existe política de prevención activa
      const policies = await db
        .select()
        .from(nom035Policies)
        .where(eq(nom035Policies.activo, true))
        .limit(1);

      const hasPolicy = policies.length > 0;
      const status = hasPolicy ? 'compliant' : 'non_compliant';

      // Obtener requisito
      const [requirement] = await db
        .select()
        .from(complianceRequirements)
        .where(eq(complianceRequirements.numeral, '7.1'))
        .limit(1);

      if (!requirement) throw new Error('Requirement 7.1 not found');

      // Crear registro de verificación
      await db.insert(complianceChecks).values({
        checklistItemId: requirement.id,
        isCompliant: hasPolicy,
        verifiedBy: ctx.user.id,
        verifiedAt: new Date(),
        notes: hasPolicy
          ? 'Política de prevención de riesgos psicosociales establecida y activa'
          : 'No se encontró política de prevención activa. Se requiere establecer, implantar y difundir política según numeral 7.1',
      });

      return {
        requirementId: requirement.id,
        status,
        hasPolicy,
        findings: hasPolicy ? 'Cumple' : 'No cumple - Política no establecida',
      };
    }),

  // Verificar Numeral 7.2 - Análisis de Factores de Riesgo
  verifyNumeral72: protectedProcedure
    .input(z.object({
      periodId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar si se han aplicado encuestas
      const results = await db
        .select()
        .from(nom035Results)
        .limit(1);

      const hasSurveys = results.length > 0;
      const status = hasSurveys ? 'compliant' : 'non_compliant';

      // Obtener requisito
      const [requirement] = await db
        .select()
        .from(complianceRequirements)
        .where(eq(complianceRequirements.numeral, '7.2'))
        .limit(1);

      if (!requirement) throw new Error('Requirement 7.2 not found');

      // Crear registro de verificación
      await db.insert(complianceChecks).values({
        checklistItemId: requirement.id,
        isCompliant: hasSurveys,
        verifiedBy: ctx.user.id,
        verifiedAt: new Date(),
        notes: hasSurveys
          ? `Identificación y análisis realizado. Total de evaluaciones: ${results.length}`
          : 'No se han aplicado las Guías de Referencia I, II o III para identificar factores de riesgo psicosocial',
      });

      return {
        requirementId: requirement.id,
        status,
        hasSurveys,
        totalEvaluations: results.length,
        findings: hasSurveys
          ? `Cumple - ${results.length} evaluaciones realizadas`
          : 'No cumple - No se han aplicado encuestas NOM-035',
      };
    }),

  // Verificar Numeral 8.2 - Implementación de Medidas de Control
  verifyNumeral82: protectedProcedure
    .input(z.object({
      periodId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar si se han implementado acciones correctivas
      const actions = await db
        .select()
        .from(correctiveActions);

      const hasActions = actions.length > 0;
      const completedActions = actions.filter(a => a.status === 'completada').length;
      const complianceRate = hasActions ? (completedActions / actions.length) * 100 : 0;

      const status = complianceRate >= 80 ? 'compliant' : complianceRate >= 50 ? 'partial' : 'non_compliant';

      // Obtener requisito
      const [requirement] = await db
        .select()
        .from(complianceRequirements)
        .where(eq(complianceRequirements.numeral, '8.2'))
        .limit(1);

      if (!requirement) throw new Error('Requirement 8.2 not found');

      // Crear registro de verificación
      await db.insert(complianceChecks).values({
        checklistItemId: requirement.id,
        isCompliant: status === 'compliant',
        verifiedBy: ctx.user.id,
        verifiedAt: new Date(),
        notes: hasActions
          ? `Acciones correctivas implementadas. Total: ${actions.length}, Completadas: ${completedActions} (${complianceRate.toFixed(1)}%)`
          : 'No se han implementado medidas de control de factores de riesgo psicosocial',
      });

      return {
        requirementId: requirement.id,
        status,
        hasActions,
        totalActions: actions.length,
        completedActions,
        complianceRate,
        findings: hasActions
          ? `${status === 'compliant' ? 'Cumple' : 'Cumplimiento parcial'} - ${completedActions}/${actions.length} acciones completadas (${complianceRate.toFixed(1)}%)`
          : 'No cumple - No se han implementado acciones de control',
      };
    }),

  // Obtener dashboard de cumplimiento normativo
  getDashboard: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Obtener todos los requisitos
    const requirements = await db
      .select()
      .from(complianceRequirements)
      .where(eq(complianceRequirements.isActive, true))
      .orderBy(complianceRequirements.numeral);

    // Obtener últimas verificaciones para cada requisito
    const checks = await db
      .select()
      .from(complianceChecks)
      .orderBy(desc(complianceChecks.verifiedAt));

    // Calcular cumplimiento por categoría
    const complianceByCategory = requirements.reduce((acc, req) => {
      const category = req.category;
      if (!acc[category]) {
        acc[category] = { total: 0, compliant: 0 };
      }
      acc[category].total++;

      const latestCheck = checks.find(c => c.checklistItemId === req.id);
      if (latestCheck?.isCompliant) {
        acc[category].compliant++;
      }

      return acc;
    }, {} as Record<string, { total: number; compliant: number }>);

    // Calcular cumplimiento general
    const totalRequirements = requirements.length;
    const compliantRequirements = Object.values(complianceByCategory).reduce(
      (sum, cat) => sum + cat.compliant,
      0
    );
    const overallCompliance = totalRequirements > 0
      ? (compliantRequirements / totalRequirements) * 100
      : 0;

    return {
      requirements,
      checks,
      complianceByCategory,
      overallCompliance,
      totalRequirements,
      compliantRequirements,
    };
  }),

  // Generar reporte de cumplimiento
  generateReport: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Obtener todos los requisitos con últimas verificaciones
      const requirements = await db
        .select()
        .from(complianceRequirements)
        .where(eq(complianceRequirements.isActive, true))
        .orderBy(complianceRequirements.numeral);

      const checks = await db
        .select()
        .from(complianceChecks)
        .orderBy(desc(complianceChecks.verifiedAt));

      const report = requirements.map(req => {
        const latestCheck = checks.find(c => c.checklistItemId === req.id);
        return {
          numeral: req.numeral,
          title: req.title,
          category: req.category,
          status: latestCheck?.isCompliant ? 'Cumple' : 'No cumple',
          lastVerification: latestCheck?.verifiedAt,
          findings: latestCheck?.notes || 'Sin verificación',
        };
      });

      return {
        generatedAt: new Date(),
        generatedBy: ctx.user.name,
        report,
      };
    }),

  // Generar PDF de verificación de numerales
  generateNumeralsPDF: protectedProcedure
    .input(z.object({
      includeEvidence: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Obtener datos de la empresa
      const companyData = await db
        .select()
        .from(companyGeneralData)
        .limit(1);

      // Obtener logo de la empresa
      const logo = await db
        .select()
        .from(companyLogo)
        .orderBy(desc(companyLogo.createdAt))
        .limit(1);

      // Obtener requisitos de Numerales 7 y 8
      const requirements = await db
        .select()
        .from(complianceRequirements)
        .where(eq(complianceRequirements.isActive, true))
        .orderBy(complianceRequirements.numeral);

      // Obtener últimas verificaciones
      const checks = await db
        .select()
        .from(complianceChecks)
        .orderBy(desc(complianceChecks.verifiedAt));

      // Preparar datos del reporte
      const reportData = requirements.map(req => {
        const latestCheck = checks.find(c => c.checklistItemId === req.id);
        return {
          numeral: req.numeral,
          title: req.title,
          description: req.description,
          category: req.category,
          isCompliant: latestCheck?.isCompliant || false,
          verifiedAt: latestCheck?.verifiedAt,
          verifiedBy: latestCheck?.verifiedBy,
          findings: latestCheck?.notes || 'Sin verificación realizada',
        };
      });

      return {
        success: true,
        data: {
          generatedAt: new Date(),
          generatedBy: ctx.user.name,
          userEmail: ctx.user.email,
          requirements: reportData,
          company: companyData[0] || null,
          logo: logo[0] || null,
        },
      };
    }),
});
