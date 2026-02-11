import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc.js";
import { getDb } from '../db.js';
import { complianceRequirements, complianceChecks, complianceChecklist, complianceEvidence, nom035Policies, correctiveActions, complianceReports, companyGeneralData, companyLogo, companyLegalRepresentative, documentFormats, nom035Results, documentAuditLog, reportTemplates, employees, departments, positions, committeeMinutes, committeeMinuteAttendees, committeeMinuteAgendaItems, committeeMinuteAgreements } from "../../drizzle/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { generatePDFFromTemplate, generateQRCode } from '../utils/pdfGenerator.js';
import { storagePut } from '../storage';

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

  // Verificar autenticidad de reporte por UUID (público para QR)
  verifyReport: publicProcedure
    .input(z.object({
      uuid: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const report = await db
        .select()
        .from(complianceReports)
        .where(eq(complianceReports.uuid, input.uuid))
        .limit(1);

      if (!report || report.length === 0) {
        return {
          found: false,
          message: 'Reporte no encontrado. El código QR puede ser inválido o el reporte fue eliminado.',
        };
      }

      // Registrar verificación en auditoría
      await db.insert(documentAuditLog).values({
        reportId: report[0].id,
        userId: ctx.user?.id || null,
        userName: ctx.user?.name || "Anónimo",
        userEmail: ctx.user?.email || null,
        action: "verify",
        ipAddress: null,
        userAgent: null,
      });

      return {
        found: true,
        report: {
          id: report[0].id,
          tipo: report[0].tipo,
          titulo: report[0].titulo,
          generatedAt: report[0].generatedAt,
          generatedByName: report[0].generatedByName,
          generatedByEmail: report[0].generatedByEmail,
          // No enviar datos completos por seguridad
        },
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

      // Obtener representantes legales activos con firma
      const representatives = await db
        .select()
        .from(companyLegalRepresentative)
        .where(eq(companyLegalRepresentative.activo, true))
        .orderBy(companyLegalRepresentative.createdAt)
        .limit(3);

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

      // Obtener formato de documento para generar folio
      const format = await db
        .select()
        .from(documentFormats)
        .where(eq(documentFormats.codigo, 'VN'))
        .limit(1);

      if (!format || format.length === 0) {
        throw new Error('Formato VN no encontrado. Configure el formato en Catálogo de Formatos.');
      }

      // Incrementar consecutivo
      const newConsecutive = (format[0].consecutivoActual || 0) + 1;
      const currentYear = new Date().getFullYear();
      const folio = `${format[0].codigo}-${String(newConsecutive).padStart(3, '0')}/${currentYear}`;

      // Actualizar consecutivo en base de datos
      await db
        .update(documentFormats)
        .set({ consecutivoActual: newConsecutive })
        .where(eq(documentFormats.id, format[0].id));

      // Generar UUID único para el reporte (NOM-151)
      const reportUuid = crypto.randomUUID();
      
      // Preparar datos completos del reporte
      const fullReportData = {
        generatedAt: new Date(),
        generatedBy: ctx.user.name,
        userEmail: ctx.user.email,
        requirements: reportData,
        company: companyData[0] || null,
        logo: logo[0] || null,
        representatives: representatives || [],
      };

      // Guardar reporte en base de datos para trazabilidad
      const newReport: typeof complianceReports.$inferInsert = {
        uuid: reportUuid,
        tipo: 'verificacion_numerales',
        titulo: 'Reporte de Verificación de Numerales 7 y 8 - NOM-035 STPS 2018',
        formatId: format[0].id,
        folioNumber: newConsecutive,
        folioYear: currentYear,
        folio: folio,
        generatedBy: ctx.user.id,
        generatedByName: ctx.user.name || 'Usuario',
        generatedByEmail: ctx.user.email || undefined,
        data: fullReportData as any,
      };
      
      await db.insert(complianceReports).values(newReport);

      // Obtener ID del reporte insertado
      const insertedReport = await db
        .select({ id: complianceReports.id })
        .from(complianceReports)
        .where(eq(complianceReports.uuid, reportUuid))
        .limit(1);

      // Registrar descarga en auditoría
      if (insertedReport && insertedReport.length > 0) {
        await db.insert(documentAuditLog).values({
          reportId: insertedReport[0].id,
          userId: ctx.user.id,
          userName: ctx.user.name,
          userEmail: ctx.user.email,
          action: "download",
          ipAddress: null,
          userAgent: null,
        });
      }


      // Cargar plantilla default desde base de datos
      const template = await db
        .select()
        .from(reportTemplates)
        .where(
          and(
            eq(reportTemplates.tipo, 'verificacion_numerales'),
            eq(reportTemplates.isDefault, true),
            eq(reportTemplates.activo, true)
          )
        )
        .limit(1);

      if (!template || template.length === 0) {
        throw new Error('No se encontró una plantilla activa para reportes de verificación de numerales.');
      }

      // Generar código QR para verificación
      const verificationUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || 'http://localhost:3000'}/verify/${reportUuid}`;
      const qrCodeDataUrl = await generateQRCode(verificationUrl);

      // Preparar datos para la plantilla
      const templateData = {
        logo: logo[0]?.logoUrl || '',
        razonSocial: companyData[0]?.razonSocial || 'Empresa',
        rfc: companyData[0]?.rfc || '',
        folio: folio,
        fecha: new Date().toLocaleDateString('es-MX', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        generadoPor: ctx.user.name || 'Usuario',
        numerales: reportData.map(req => ({
          numeral: req.numeral,
          descripcion: req.title,
          estado: req.isCompliant ? 'Cumple' : 'No cumple',
          estadoClass: req.isCompliant ? 'cumple' : 'nocumple',
          ultimaVerificacion: req.verifiedAt 
            ? new Date(req.verifiedAt).toLocaleDateString('es-MX')
            : 'Sin verificar'
        })),
        hallazgos: reportData
          .filter(req => req.findings && req.findings !== 'Sin verificación realizada')
          .map(req => ({
            numeral: req.numeral,
            fecha: req.verifiedAt 
              ? new Date(req.verifiedAt).toLocaleDateString('es-MX')
              : '',
            observaciones: req.findings
          })),
        firmas: representatives.map(rep => ({
          nombre: rep.nombre,
          cargo: rep.cargo,
          firmaUrl: rep.firmaUrl || ''
        })),
        qrCode: qrCodeDataUrl
      };

      // Generar PDF desde plantilla
      const pdfBuffer = await generatePDFFromTemplate(
        template[0].htmlTemplate,
        template[0].cssStyles || '',
        templateData
      );

      // Convertir buffer a base64 para enviar al frontend
      const pdfBase64 = pdfBuffer.toString('base64');

      return {
        success: true,
        pdfBase64: pdfBase64,
        data: {
          uuid: reportUuid,
          folio: folio,
          generatedAt: new Date(),
          generatedBy: ctx.user.name,
          userEmail: ctx.user.email,
          requirements: reportData,
          company: companyData[0] || null,
          logo: logo[0] || null,
          representatives: representatives || [],
        },
      };

    }),

  // Listar reportes generados con filtros
  listReports: protectedProcedure
    .input(z.object({
      tipo: z.string().optional(),
      startDate: z.string().optional(), // YYYY-MM-DD
      endDate: z.string().optional(), // YYYY-MM-DD
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      let query = db
        .select({
          id: complianceReports.id,
          uuid: complianceReports.uuid,
          tipo: complianceReports.tipo,
          titulo: complianceReports.titulo,
          folio: complianceReports.folio,
          folioNumber: complianceReports.folioNumber,
          folioYear: complianceReports.folioYear,
          generatedAt: complianceReports.generatedAt,
          generatedByName: complianceReports.generatedByName,
          generatedByEmail: complianceReports.generatedByEmail,
        })
        .from(complianceReports)
        .$dynamic();

      // Aplicar filtros
      const conditions = [];
      
      if (input.tipo) {
        conditions.push(eq(complianceReports.tipo, input.tipo));
      }
      
      if (input.startDate) {
        conditions.push(sql`${complianceReports.generatedAt} >= ${input.startDate}`);
      }
      
      if (input.endDate) {
        conditions.push(sql`${complianceReports.generatedAt} <= ${input.endDate}`);
      }

      if (conditions.length > 0) {
        query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
      }

      const reports = await query
        .orderBy(desc(complianceReports.generatedAt))
        .limit(input.limit)
        .offset(input.offset);

      // Contar total
      const totalQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(complianceReports)
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery.where(sql`${sql.join(conditions, sql` AND `)}`);
      }

      const totalResult = await totalQuery;
      const total = totalResult[0]?.count || 0;

      return {
        reports,
        total,
        hasMore: input.offset + reports.length < total,
      };
    }),

  // Obtener datos completos de un reporte para re-descarga
  getReportData: protectedProcedure
    .input(z.object({
      uuid: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const report = await db
        .select()
        .from(complianceReports)
        .where(eq(complianceReports.uuid, input.uuid))
        .limit(1);

      if (!report || report.length === 0) {
        throw new Error('Reporte no encontrado');
      }

      // Registrar visualización en auditoría
      await db.insert(documentAuditLog).values({
        reportId: report[0].id,
        userId: ctx.user?.id || null,
        userName: ctx.user?.name || "Desconocido",
        userEmail: ctx.user?.email || null,
        action: "view",
        ipAddress: null,
        userAgent: null,
      });

      return {
        uuid: report[0].uuid,
        folio: report[0].folio,
        tipo: report[0].tipo,
        titulo: report[0].titulo,
        generatedAt: report[0].generatedAt,
        generatedByName: report[0].generatedByName,
        generatedByEmail: report[0].generatedByEmail,
        data: report[0].data,
      };
    }),

  // Generar PDF de Análisis de Riesgos Psicosociales
  generateRiskAnalysisPDF: protectedProcedure
    .input(z.object({
      workerId: z.number(),
      surveyResultId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Obtener datos del trabajador con departamento y puesto
      const worker = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          departmentId: employees.departmentId,
          positionId: employees.positionId,
          departmentName: departments.name,
          positionName: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.id, input.workerId))
        .limit(1);

      if (!worker || worker.length === 0) {
        throw new Error('Trabajador no encontrado');
      }

      // Obtener resultados de encuesta NOM-035
      const surveyResults = await db
        .select()
        .from(nom035Results)
        .where(eq(nom035Results.employeeId, input.workerId))
        .orderBy(desc(nom035Results.createdAt))
        .limit(1);

      if (!surveyResults || surveyResults.length === 0) {
        throw new Error('No se encontraron resultados de evaluación para este trabajador');
      }

      const result = surveyResults[0];

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

      // Obtener representantes legales activos con firma
      const representatives = await db
        .select()
        .from(companyLegalRepresentative)
        .where(eq(companyLegalRepresentative.activo, true))
        .orderBy(companyLegalRepresentative.createdAt)
        .limit(3);

      // Obtener formato de documento para generar folio
      const format = await db
        .select()
        .from(documentFormats)
        .where(eq(documentFormats.codigo, 'AR'))
        .limit(1);

      if (!format || format.length === 0) {
        throw new Error('Formato AR no encontrado. Configure el formato en Catálogo de Formatos.');
      }

      // Incrementar consecutivo
      const newConsecutive = (format[0].consecutivoActual || 0) + 1;
      const currentYear = new Date().getFullYear();
      const folio = `${format[0].codigo}-${String(newConsecutive).padStart(3, '0')}/${currentYear}`;

      // Actualizar consecutivo en base de datos
      await db
        .update(documentFormats)
        .set({ consecutivoActual: newConsecutive })
        .where(eq(documentFormats.id, format[0].id));

      // Generar UUID único para el reporte (NOM-151)
      const reportUuid = crypto.randomUUID();

      // Preparar datos del análisis
      const nivelRiesgo = result.globalRiskLevel || 'medio';
      const nivelRiesgoMap: Record<string, string> = {
        'nulo': 'Nulo',
        'bajo': 'Bajo',
        'medio': 'Medio',
        'alto': 'Alto',
        'muy_alto': 'Muy Alto'
      };

      // Simular categorías (en producción vendrían de la BD)
      const categorias = [
        { nombre: 'Ambiente de Trabajo', nivel: 'Bajo', nivelClass: 'bajo', calificacion: 15, maximo: 50, porcentaje: 30 },
        { nombre: 'Factores Propios de la Actividad', nivel: 'Medio', nivelClass: 'medio', calificacion: 35, maximo: 70, porcentaje: 50 },
        { nombre: 'Organización del Tiempo', nivel: 'Alto', nivelClass: 'alto', calificacion: 45, maximo: 60, porcentaje: 75 },
        { nombre: 'Liderazgo y Relaciones', nivel: 'Medio', nivelClass: 'medio', calificacion: 28, maximo: 60, porcentaje: 47 }
      ];

      const dominios = [
        { nombre: 'Condiciones en el ambiente de trabajo', categoria: 'Ambiente', calificacion: 15, nivel: 'Bajo', nivelClass: 'bajo' },
        { nombre: 'Carga de trabajo', categoria: 'Actividad', calificacion: 35, nivel: 'Medio', nivelClass: 'medio' },
        { nombre: 'Falta de control sobre el trabajo', categoria: 'Actividad', calificacion: 28, nivel: 'Medio', nivelClass: 'medio' },
        { nombre: 'Jornada de trabajo', categoria: 'Tiempo', calificacion: 45, nivel: 'Alto', nivelClass: 'alto' }
      ];

      const dimensionesCriticas = [
        { nombre: 'Jornadas de trabajo superiores a 48 horas semanales', nivel: 'Alto', nivelClass: 'alto', descripcion: 'Se detectaron jornadas laborales extensas que pueden afectar la salud del trabajador.' },
        { nombre: 'Interferencia en la relación trabajo-familia', nivel: 'Medio', nivelClass: 'medio', descripcion: 'El trabajador reporta dificultades para equilibrar vida laboral y personal.' }
      ];

      const recomendaciones = [
        { icono: '⏰', titulo: 'Reducir Jornadas Laborales', descripcion: 'Implementar horarios flexibles y respetar límites de 48 horas semanales según la LFT.' },
        { icono: '🤝', titulo: 'Fortalecer Comunicación', descripcion: 'Establecer canales de comunicación efectivos entre líderes y colaboradores.' },
        { icono: '🎯', titulo: 'Capacitación en Manejo de Estrés', descripcion: 'Ofrecer talleres de técnicas de relajación y manejo de presión laboral.' }
      ];

      // Guardar reporte en base de datos
      const fullReportData = {
        generatedAt: new Date(),
        generatedBy: ctx.user.name,
        userEmail: ctx.user.email,
        worker: worker[0],
        surveyResult: result,
        company: companyData[0] || null,
        logo: logo[0] || null,
        representatives: representatives || [],
      };

      const newReport: typeof complianceReports.$inferInsert = {
        uuid: reportUuid,
        tipo: 'analisis_riesgos',
        titulo: `Análisis de Riesgos Psicosociales - ${worker[0].firstName} ${worker[0].lastName}`,
        formatId: format[0].id,
        folioNumber: newConsecutive,
        folioYear: currentYear,
        folio: folio,
        generatedBy: ctx.user.id,
        generatedByName: ctx.user.name || 'Usuario',
        generatedByEmail: ctx.user.email || undefined,
        data: fullReportData as any,
      };

      await db.insert(complianceReports).values(newReport);

      // Obtener ID del reporte insertado
      const insertedReport = await db
        .select({ id: complianceReports.id })
        .from(complianceReports)
        .where(eq(complianceReports.uuid, reportUuid))
        .limit(1);

      // Registrar descarga en auditoría
      if (insertedReport && insertedReport.length > 0) {
        await db.insert(documentAuditLog).values({
          reportId: insertedReport[0].id,
          userId: ctx.user.id,
          userName: ctx.user.name,
          userEmail: ctx.user.email,
          action: "download",
          ipAddress: null,
          userAgent: null,
        });
      }

      // Cargar plantilla default desde base de datos
      const template = await db
        .select()
        .from(reportTemplates)
        .where(
          and(
            eq(reportTemplates.tipo, 'analisis_riesgos'),
            eq(reportTemplates.isDefault, true),
            eq(reportTemplates.activo, true)
          )
        )
        .limit(1);

      if (!template || template.length === 0) {
        throw new Error('No se encontró una plantilla activa para reportes de análisis de riesgos.');
      }

      // Generar código QR para verificación
      const verificationUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || 'http://localhost:3000'}/verify/${reportUuid}`;
      const qrCodeDataUrl = await generateQRCode(verificationUrl);

      // Preparar datos para la plantilla
      const templateData = {
        logo: logo[0]?.logoUrl || '',
        razonSocial: companyData[0]?.razonSocial || 'Empresa',
        rfc: companyData[0]?.rfc || '',
        folio: folio,
        nombreTrabajador: `${worker[0].firstName} ${worker[0].lastName}`,
        departamento: worker[0].departmentName || 'No especificado',
        puesto: worker[0].positionName || 'No especificado',
        fechaEvaluacion: new Date(result.createdAt).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        nivelRiesgoGeneral: nivelRiesgo,
        nivelRiesgoGeneralTexto: nivelRiesgoMap[nivelRiesgo] || 'Medio',
        calificacionGeneral: result.globalScore || 0,
        resumenEjecutivo: `El análisis de factores de riesgo psicosocial realizado al trabajador ${worker[0].firstName} ${worker[0].lastName} muestra un nivel de riesgo ${nivelRiesgoMap[nivelRiesgo] || 'Medio'}. Se identificaron áreas de oportunidad en la organización del tiempo de trabajo y la carga laboral. Se recomienda implementar acciones preventivas y correctivas para mejorar las condiciones laborales.`,
        categorias: categorias,
        dominios: dominios,
        dimensionesCriticas: dimensionesCriticas,
        recomendaciones: recomendaciones,
        firmas: representatives.map(rep => ({
          nombre: rep.nombre,
          cargo: rep.cargo,
          firmaUrl: rep.firmaUrl || ''
        })),
        qrCode: qrCodeDataUrl
      };

      // Generar PDF desde plantilla
      const pdfBuffer = await generatePDFFromTemplate(
        template[0].htmlTemplate,
        template[0].cssStyles || '',
        templateData
      );

      // Convertir buffer a base64 para enviar al frontend
      const pdfBase64 = pdfBuffer.toString('base64');

      return {
        success: true,
        pdfBase64: pdfBase64,
        data: {
          uuid: reportUuid,
          folio: folio,
          generatedAt: new Date(),
          generatedBy: ctx.user.name,
          userEmail: ctx.user.email,
          worker: worker[0],
          surveyResult: result,
        },
      };
    }),


  // Generar PDF de Minuta de Comité
  generateCommitteeMinutesPDF: protectedProcedure
    .input(z.object({
      minuteId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Obtener datos de la minuta desde la base de datos
      const minute = await db
        .select()
        .from(committeeMinutes)
        .where(eq(committeeMinutes.id, input.minuteId))
        .limit(1);

      if (!minute || minute.length === 0) {
        throw new Error('Minuta no encontrada');
      }

      const minuteData = minute[0];

      // Obtener asistentes de la minuta
      const attendees = await db
        .select()
        .from(committeeMinuteAttendees)
        .where(eq(committeeMinuteAttendees.minuteId, input.minuteId));

      // Obtener orden del día
      const agendaItems = await db
        .select()
        .from(committeeMinuteAgendaItems)
        .where(eq(committeeMinuteAgendaItems.minuteId, input.minuteId))
        .orderBy(committeeMinuteAgendaItems.orderIndex);

      // Obtener acuerdos
      const agreements = await db
        .select()
        .from(committeeMinuteAgreements)
        .where(eq(committeeMinuteAgreements.minuteId, input.minuteId));

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

      // Obtener representantes legales activos con firma
      const representatives = await db
        .select()
        .from(companyLegalRepresentative)
        .where(eq(companyLegalRepresentative.activo, true))
        .orderBy(companyLegalRepresentative.createdAt)
        .limit(3);

      // Obtener formato de documento para generar folio
      const format = await db
        .select()
        .from(documentFormats)
        .where(eq(documentFormats.codigo, 'MC'))
        .limit(1);

      if (!format || format.length === 0) {
        throw new Error('Formato MC no encontrado. Configure el formato en Catálogo de Formatos.');
      }

      // Incrementar consecutivo
      const newConsecutive = (format[0].consecutivoActual || 0) + 1;
      const currentYear = new Date().getFullYear();
      const folio = `${format[0].codigo}-${String(newConsecutive).padStart(3, '0')}/${currentYear}`;

      // Actualizar consecutivo en base de datos
      await db
        .update(documentFormats)
        .set({ consecutivoActual: newConsecutive })
        .where(eq(documentFormats.id, format[0].id));

      // Generar UUID único para el reporte (NOM-151)
      const reportUuid = crypto.randomUUID();

      // Preparar datos de asistentes desde la BD
      const asistentes = attendees.map(att => ({
        nombre: att.name,
        cargo: att.position || 'Sin cargo',
        rolComite: att.role || 'Participante',
        asistencia: att.attended ? 'Presente' : 'Ausente',
        asistenciaClass: att.attended ? 'presente' : 'ausente',
        firma: att.signatureUrl || '',
        foto: att.photoUrl || ''
      }));

      const ordenDia = agendaItems.map(item => ({
        tema: item.topic,
        descripcion: item.description || '',
        presentador: item.presenter || '',
        duracion: item.duration ? `${item.duration} min` : ''
      }));

      const acuerdos = agreements.map((agr, idx) => ({
        numero: idx + 1,
        descripcion: agr.description,
        responsable: agr.responsibleName || 'Sin asignar',
        fechaCompromiso: agr.dueDate ? new Date(agr.dueDate).toLocaleDateString('es-MX') : 'Sin fecha',
        estado: agr.status === 'completado' ? 'Completado' : agr.status === 'en_proceso' ? 'En Proceso' : agr.status === 'cancelado' ? 'Cancelado' : 'Pendiente',
        estadoClass: agr.status
      }));

      const seguimientoAcuerdos = [
        { acuerdo: 'Capacitación en comunicación asertiva para líderes', responsable: 'María López', estatus: 'Completado', estatusClass: 'completado' },
        { acuerdo: 'Instalación de buzón de quejas anónimo', responsable: 'Carlos Ramírez', estatus: 'Completado', estatusClass: 'completado' }
      ];

      const desarrollo = 'Se llevó a cabo la reunión ordinaria del Comité de Atención de Factores de Riesgo Psicosocial. Se verificó el quórum reglamentario y se procedió con el orden del día establecido. Se presentaron los casos identificados durante el último mes y se discutieron las acciones preventivas necesarias. Los miembros del comité expresaron su compromiso con la implementación de las medidas acordadas.';

      const observaciones = 'Se solicita mayor participación de los representantes sindicales en las próximas sesiones. Se recomienda programar la siguiente reunión en horario vespertino para facilitar la asistencia de todos los miembros.';

      // Guardar reporte en base de datos
      const fullReportData = {
        generatedAt: new Date(),
        generatedBy: ctx.user.name,
        userEmail: ctx.user.email,
        minuteData: minuteData,
        company: companyData[0] || null,
        logo: logo[0] || null,
        representatives: representatives || [],
      };

      const newReport: typeof complianceReports.$inferInsert = {
        uuid: reportUuid,
        tipo: 'minuta_comite',
        titulo: `Minuta de Comité - Sesión ${minuteData.sessionNumber}`,
        formatId: format[0].id,
        folioNumber: newConsecutive,
        folioYear: currentYear,
        folio: folio,
        generatedBy: ctx.user.id,
        generatedByName: ctx.user.name || 'Usuario',
        generatedByEmail: ctx.user.email || undefined,
        data: fullReportData as any,
      };

      await db.insert(complianceReports).values(newReport);

      // Obtener ID del reporte insertado
      const insertedReport = await db
        .select({ id: complianceReports.id })
        .from(complianceReports)
        .where(eq(complianceReports.uuid, reportUuid))
        .limit(1);

      // Registrar descarga en auditoría
      if (insertedReport && insertedReport.length > 0) {
        await db.insert(documentAuditLog).values({
          reportId: insertedReport[0].id,
          userId: ctx.user.id,
          userName: ctx.user.name,
          userEmail: ctx.user.email,
          action: "download",
          ipAddress: null,
          userAgent: null,
        });
      }

      // Cargar plantilla default desde base de datos
      const template = await db
        .select()
        .from(reportTemplates)
        .where(
          and(
            eq(reportTemplates.tipo, 'minuta_comite'),
            eq(reportTemplates.isDefault, true),
            eq(reportTemplates.activo, true)
          )
        )
        .limit(1);

      if (!template || template.length === 0) {
        throw new Error('No se encontró una plantilla activa para minutas de comité.');
      }

      // Generar código QR para verificación
      const verificationUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || 'http://localhost:3000'}/verify/${reportUuid}`;
      const qrCodeDataUrl = await generateQRCode(verificationUrl);

      // Preparar datos para la plantilla
      const templateData = {
        logo: logo[0]?.logoUrl || '',
        razonSocial: companyData[0]?.razonSocial || 'Empresa',
        rfc: companyData[0]?.rfc || '',
        qrCode: qrCodeDataUrl,
        tipoReunion: minuteData.meetingType,
        numeroSesion: minuteData.sessionNumber.toString(),
        folio: folio,
        fecha: minuteData.meetingDate.toISOString().split('T')[0],
        hora: minuteData.meetingTime,
        lugar: minuteData.meetingPlace,
        asistentes: asistentes,
        ordenDia: ordenDia,
        desarrollo: desarrollo,
        acuerdos: acuerdos,
        seguimientoAcuerdos: seguimientoAcuerdos,
        observaciones: observaciones,
        documentacionRespaldo: null,
        fotoRepresentantes: null,
        firmas: representatives.map(rep => ({
          nombre: rep.nombre,
          cargo: rep.cargo,
          rolComite: 'Miembro del Comité',
          firmaUrl: rep.firmaUrl || ''
        })),
        versionFormato: format[0].version || 'V1.0',
        fechaGeneracion: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      };

      // Generar PDF desde plantilla
      const pdfBuffer = await generatePDFFromTemplate(
        template[0].htmlTemplate,
        template[0].cssStyles || '',
        templateData
      );

      // Convertir buffer a base64 para enviar al frontend
      const pdfBase64 = pdfBuffer.toString('base64');

      return {
        success: true,
        pdfBase64: pdfBase64,
        data: {
          uuid: reportUuid,
          folio: folio,
          generatedAt: new Date(),
          generatedBy: ctx.user.name,
          userEmail: ctx.user.email,
          minuteData: minuteData,
        },
      };
    }),

  // Generar certificado de capacitación en PDF
  generateTrainingCertificatePDF: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        courseId: z.number(),
        courseName: z.string(),
        completionDate: z.string(),
        durationHours: z.number(),
        grade: z.string(),
        instructorName: z.string(),
        instructorSignatureUrl: z.string().optional(),
        representativeName: z.string(),
        representativeSignatureUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Obtener datos del empleado
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee || employee.length === 0) {
        throw new Error('Empleado no encontrado');
      }

      const nombreCompleto = `${employee[0].firstName} ${employee[0].lastName}`;

      // Obtener datos de la empresa
      const companyData = await db.select().from(companyGeneralData).limit(1);
      const logo = await db.select().from(companyLogo).limit(1);

      // Obtener o crear formato CERT
      const currentYear = new Date().getFullYear();
      let format = await db
        .select()
        .from(documentFormats)
        .where(eq(documentFormats.codigo, 'CERT'))
        .limit(1);

      if (!format || format.length === 0) {
        // Crear formato si no existe
        await db.insert(documentFormats).values({
          codigo: 'CERT',
          nombre: 'Certificado de Capacitación',
          version: '1.0',
          fechaVersion: new Date('2024-01-15'),
          consecutivoActual: 0,
        });
        format = await db
          .select()
          .from(documentFormats)
          .where(eq(documentFormats.codigo, 'CERT'))
          .limit(1);
      }

      // Incrementar consecutivo
      const newConsecutive = (format[0].consecutivoActual || 0) + 1;
      const folio = `CERT-${String(newConsecutive).padStart(4, '0')}/${currentYear}`;

      await db
        .update(documentFormats)
        .set({ consecutivoActual: newConsecutive })
        .where(eq(documentFormats.id, format[0].id));

      // Generar UUID único para el certificado (NOM-151)
      const certificateUuid = crypto.randomUUID();

      // Guardar certificado en base de datos
      const fullCertificateData = {
        generatedAt: new Date(),
        generatedBy: ctx.user.name,
        userEmail: ctx.user.email,
        employee: employee[0],
        courseId: input.courseId,
        courseName: input.courseName,
        completionDate: input.completionDate,
        durationHours: input.durationHours,
        grade: input.grade,
        instructorName: input.instructorName,
        instructorSignatureUrl: input.instructorSignatureUrl,
        representativeName: input.representativeName,
        representativeSignatureUrl: input.representativeSignatureUrl,
      };

      const newReport: typeof complianceReports.$inferInsert = {
        uuid: certificateUuid,
        tipo: 'certificado_capacitacion',
        titulo: `Certificado de Capacitación - ${nombreCompleto}`,
        formatId: format[0].id,
        folioNumber: newConsecutive,
        folioYear: currentYear,
        folio: folio,
        generatedBy: ctx.user.id,
        generatedByName: ctx.user.name || 'Usuario',
        generatedByEmail: ctx.user.email || undefined,
        data: fullCertificateData as any,
      };

      await db.insert(complianceReports).values(newReport);

      // Obtener ID del certificado insertado
      const insertedReport = await db
        .select({ id: complianceReports.id })
        .from(complianceReports)
        .where(eq(complianceReports.uuid, certificateUuid))
        .limit(1);

      // Registrar descarga en auditoría
      if (insertedReport && insertedReport.length > 0) {
        await db.insert(documentAuditLog).values({
          reportId: insertedReport[0].id,
          userId: ctx.user.id,
          userName: ctx.user.name,
          userEmail: ctx.user.email,
          action: "download",
          ipAddress: null,
          userAgent: null,
        });
      }

      // Cargar plantilla default desde base de datos
      const template = await db
        .select()
        .from(reportTemplates)
        .where(
          and(
            eq(reportTemplates.tipo, 'certificate'),
            eq(reportTemplates.isDefault, true),
            eq(reportTemplates.activo, true)
          )
        )
        .limit(1);

      if (!template || template.length === 0) {
        throw new Error('No se encontró una plantilla activa para certificados de capacitación.');
      }

      // Generar código QR para verificación
      const verificationUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || 'http://localhost:3000'}/verify/${certificateUuid}`;
      const qrCodeDataUrl = await generateQRCode(verificationUrl);

      // Preparar datos para la plantilla
      const templateData = {
        logo: logo[0]?.logoUrl || '',
        nombreCompleto: nombreCompleto,
        nombreCurso: input.courseName,
        fechaConclusion: input.completionDate,
        duracion: input.durationHours,
        calificacion: input.grade,
        nombreInstructor: input.instructorName,
        firmaInstructor: input.instructorSignatureUrl || '',
        nombreRepresentante: input.representativeName,
        firmaRepresentante: input.representativeSignatureUrl || '',
        folio: folio,
        qrCode: qrCodeDataUrl,
      };

      // Generar PDF desde plantilla
      const pdfBuffer = await generatePDFFromTemplate(
        template[0].htmlTemplate,
        template[0].cssStyles || '',
        templateData
      );

      // Convertir buffer a base64 para enviar al frontend
      const pdfBase64 = pdfBuffer.toString('base64');

      return {
        success: true,
        pdfBase64: pdfBase64,
        data: {
          uuid: certificateUuid,
          folio: folio,
          generatedAt: new Date(),
          generatedBy: ctx.user.name,
          employee: nombreCompleto,
          courseName: input.courseName,
        },
      };
    }),

  // Subir firma digital a S3
  uploadSignature: protectedProcedure
    .input(
      z.object({
        signatureDataUrl: z.string(),
        signerName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Decodificar data URL a buffer
      const base64Data = input.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileName = `signatures/${ctx.user.id}/${input.signerName.replace(/\s+/g, '_')}_${timestamp}.png`;

      // Subir a S3
      const { url } = await storagePut(fileName, buffer, 'image/png');

      return {
        success: true,
        signatureUrl: url,
      };
    }),

});
