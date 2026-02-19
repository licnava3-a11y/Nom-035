/**
 * Committee Annual Reports Router
 * Router tRPC para gestión de reportes anuales del comité NOM-035
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { committeeAnnualReports } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { generateAnnualReportPDF } from '../services/committeeDocumentsPDF';
import { storagePut } from '../storage';

/**
 * Router de reportes anuales del comité
 */
export const committeeAnnualReportsRouter = router({
  /**
   * Listar todos los reportes anuales
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.enum(['draft', 'final', 'approved']).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });

      const { limit, offset, status } = input;

      const where = status ? eq(committeeAnnualReports.status, status) : undefined;

      const reports = await db
        .select()
        .from(committeeAnnualReports)
        .where(where)
        .orderBy(desc(committeeAnnualReports.reportYear))
        .limit(limit)
        .offset(offset);

      return {
        reports,
        total: reports.length,
      };
    }),

  /**
   * Obtener un reporte anual específico
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });

      const report = await db
        .select()
        .from(committeeAnnualReports)
        .where(eq(committeeAnnualReports.id, input.id))
        .limit(1);

      if (!report.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Reporte no encontrado' });
      }

      return report[0];
    }),

  /**
   * Crear nuevo reporte anual
   */
  create: protectedProcedure
    .input(
      z.object({
        reportYear: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        executiveSummary: z.string().min(1),
        activities: z.string(), // JSON string
        metrics: z.string(), // JSON string
        trainings: z.string(), // JSON string
        casesHandled: z.string(), // JSON string
        complianceMetrics: z.string(), // JSON string
        recommendations: z.string().min(1),
        actionPlan: z.string().min(1),
        attachments: z.string().optional(), // JSON string
        signatures: z.string(), // JSON string
        status: z.enum(['draft', 'final', 'approved']).default('draft'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });

      // Obtener el último número de folio del año del reporte
      const lastReport = await db
        .select()
        .from(committeeAnnualReports)
        .where(eq(committeeAnnualReports.folioYear, input.reportYear))
        .orderBy(desc(committeeAnnualReports.folioNumber))
        .limit(1);

      const nextFolioNumber = lastReport.length ? lastReport[0].folioNumber + 1 : 1;

      const result = await db.insert(committeeAnnualReports).values({
        folioNumber: nextFolioNumber,
        folioYear: input.reportYear,
        folioCode: 'ARF',
        folioVersion: '1.0',
        reportYear: input.reportYear,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        executiveSummary: input.executiveSummary,
        activities: input.activities,
        metrics: input.metrics,
        trainings: input.trainings,
        casesHandled: input.casesHandled,
        complianceMetrics: input.complianceMetrics,
        recommendations: input.recommendations,
        actionPlan: input.actionPlan,
        attachments: input.attachments,
        signatures: input.signatures,
        status: input.status,
        createdBy: ctx.user.id,
      });

      return {
        success: true,
        id: Number(result.insertId),
        folioNumber: nextFolioNumber,
        folioYear: input.reportYear,
        message: 'Reporte anual creado exitosamente',
      };
    }),

  /**
   * Actualizar reporte anual
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        executiveSummary: z.string().optional(),
        activities: z.string().optional(),
        metrics: z.string().optional(),
        trainings: z.string().optional(),
        casesHandled: z.string().optional(),
        complianceMetrics: z.string().optional(),
        recommendations: z.string().optional(),
        actionPlan: z.string().optional(),
        attachments: z.string().optional(),
        signatures: z.string().optional(),
        status: z.enum(['draft', 'final', 'approved']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });

      const { id, ...updates } = input;

      await db.update(committeeAnnualReports).set(updates).where(eq(committeeAnnualReports.id, id));

      return {
        success: true,
        message: 'Reporte anual actualizado exitosamente',
      };
    }),

  /**
   * Eliminar reporte anual
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });

      await db.delete(committeeAnnualReports).where(eq(committeeAnnualReports.id, input.id));

      return {
        success: true,
        message: 'Reporte anual eliminado exitosamente',
      };
    }),

  /**
   * Generar PDF de reporte anual
   */
  generatePDF: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });

      const report = await db
        .select()
        .from(committeeAnnualReports)
        .where(eq(committeeAnnualReports.id, input.id))
        .limit(1);

      if (!report.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Reporte no encontrado' });
      }

      const data = report[0];
      const folio = `${data.folioCode}-${String(data.folioNumber).padStart(3, '0')}/${data.folioYear}`;

      const pdfDoc = await generateAnnualReportPDF({
        folio,
        reportYear: data.reportYear,
        executiveSummary: data.executiveSummary,
        metrics: JSON.parse(data.metrics),
        activities: JSON.parse(data.activities),
        recommendations: data.recommendations,
        actionPlan: data.actionPlan,
        signatures: JSON.parse(data.signatures),
      });

      // Convertir el stream del PDF a buffer
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));

      await new Promise<void>((resolve, reject) => {
        pdfDoc.on('end', () => resolve());
        pdfDoc.on('error', reject);
      });

      const pdfBuffer = Buffer.concat(chunks);

      // Subir PDF a S3
      const { url: pdfUrl, key: pdfKey } = await storagePut(
        `committee-annual-reports/${folio.replace('/', '-')}.pdf`,
        pdfBuffer,
        'application/pdf'
      );

      return {
        success: true,
        pdfUrl,
        pdfKey,
        filename: `${folio.replace('/', '-')}.pdf`,
        message: 'PDF generado exitosamente',
      };
    }),

  /**
   * Publicar borrador (cambiar estado a final)
   */
  publish: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });

      await db
        .update(committeeAnnualReports)
        .set({ status: 'final' })
        .where(eq(committeeAnnualReports.id, input.id));

      return {
        success: true,
        message: 'Reporte publicado exitosamente',
      };
    }),

  /**
   * Aprobar reporte final
   */
  approve: protectedProcedure
    .input(z.object({ id: z.number(), approvedBy: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });

      await db
        .update(committeeAnnualReports)
        .set({
          status: 'approved',
          approvedBy: input.approvedBy,
          approvedAt: new Date(),
        })
        .where(eq(committeeAnnualReports.id, input.id));

      return {
        success: true,
        message: 'Reporte aprobado exitosamente',
      };
    }),
});
