/**
 * Router para Carpeta de Evidencias STPS
 * Organiza evidencias de cumplimiento NOM-035 por numerales según tamaño de empresa
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  cases, 
  surveys, 
  surveyPeriods,
  surveyResponses,
  employees,
  courses,
  manualEvidences
} from "../../drizzle/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { storagePut, storageDelete } from "../storage";

// Tipos para evidencias
interface Evidence {
  type: string;
  name: string;
  description: string;
  date: string;
  status: string;
  id?: number;
}

interface NumeralEvidence {
  title: string;
  required: boolean;
  description: string;
  evidences: Evidence[];
  status: 'pending' | 'partial' | 'complete';
}

export const evidencesFolderRouter = router({
  /**
   * Obtener carpeta de evidencias organizada por numerales NOM-035
   * Según tamaño de empresa (hasta 15, 16-50, más de 50 trabajadores)
   */
  getEvidences: protectedProcedure
    .input(
      z.object({
        companySize: z.enum(['small', 'medium', 'large']), // small: ≤15, medium: 16-50, large: >50
      })
    )
    .query(async ({ input }: { input: { companySize: 'small' | 'medium' | 'large' } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { companySize } = input;

      // Obtener total de empleados activos
      const [employeeCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(employees)
        .where(eq(employees.isActive, true));

      const totalEmployees = employeeCount?.count || 0;

      // Estructura de evidencias por numeral
      const evidences: {
        companyInfo: {
          totalEmployees: number;
          companySize: string;
          generatedAt: string;
        };
        [key: string]: NumeralEvidence | any;
      } = {
        companyInfo: {
          totalEmployees,
          companySize,
          generatedAt: new Date().toISOString(),
        },
        
        // 5.1 - Política de prevención de riesgos psicosociales (TODOS)
        "5.1": {
          title: "5.1 Política de prevención de riesgos psicosociales",
          required: true,
          description: "Establecer, implantar, mantener y difundir en el centro de trabajo una política de prevención de riesgos psicosociales",
          evidences: [],
          status: "pending", // pending, partial, complete
        },

        // 5.2 - Medidas de prevención y acciones de control (16+ trabajadores)
        "5.2": {
          title: "5.2 Medidas de prevención y acciones de control de factores de riesgo psicosocial",
          required: companySize !== 'small',
          description: "Adoptar medidas para prevenir y controlar los factores de riesgo psicosocial",
          evidences: [],
          status: "pending",
        },

        // 5.3 - Identificación de trabajadores expuestos a acontecimientos traumáticos (16+ trabajadores)
        "5.3": {
          title: "5.3 Identificación de trabajadores expuestos a acontecimientos traumáticos severos",
          required: companySize !== 'small',
          description: "Identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos",
          evidences: [],
          status: "pending",
        },

        // 5.4 - Identificación y análisis de factores de riesgo (TODOS)
        "5.4": {
          title: "5.4 Identificación y análisis de los factores de riesgo psicosocial",
          required: true,
          description: "Identificar y analizar los factores de riesgo psicosocial mediante Guía de referencia I o cuestionarios",
          evidences: [],
          status: "pending",
        },

        // 5.5 - Evaluación del entorno organizacional (16+ trabajadores)
        "5.5": {
          title: "5.5 Evaluación del entorno organizacional",
          required: companySize !== 'small',
          description: "Evaluar el entorno organizacional favorable mediante cuestionarios de la Guía de referencia II o III",
          evidences: [],
          status: "pending",
        },

        // 5.6 - Medidas y acciones de control (TODOS)
        "5.6": {
          title: "5.6 Medidas y acciones de control",
          required: true,
          description: "Adoptar medidas para prevenir los factores de riesgo psicosocial y promover el entorno organizacional favorable",
          evidences: [],
          status: "pending",
        },

        // 5.7 - Difusión de información (TODOS)
        "5.7": {
          title: "5.7 Difusión de información",
          required: true,
          description: "Difundir información a los trabajadores sobre la política, medidas adoptadas y mecanismos de atención",
          evidences: [],
          status: "pending",
        },

        // 5.8 - Registros (más de 50 trabajadores)
        "5.8": {
          title: "5.8 Registros",
          required: companySize === 'large',
          description: "Conservar los registros sobre identificación, análisis, evaluación, medidas de control y seguimiento",
          evidences: [],
          status: "pending",
        },
      };

      // Recopilar evidencias de cada numeral

      // 5.1 - Política (verificar si existe documento de política)
      // TODO: Implementar tabla de políticas en futuro
      evidences["5.1"].evidences.push({
        type: "document",
        name: "Política de Prevención de Riesgos Psicosociales",
        description: "Documento que establece el compromiso de la organización",
        date: new Date().toISOString(),
        status: "pending",
      });

      // 5.3 - Casos de acontecimientos traumáticos severos
      if (companySize !== 'small') {
        const traumaticCases = await db
          .select({
            id: cases.id,
            caseNumber: cases.caseNumber,
            caseType: cases.caseType,
            createdAt: cases.createdAt,
            status: cases.status,
          })
          .from(cases)
          .where(
            and(
              sql`${cases.caseType} IN ('violence', 'mobbing')`,
              sql`${cases.priority} = 'critical'`
            )
          )
          .limit(50);

        evidences["5.3"].evidences = traumaticCases.map((c: any) => ({
          type: "case",
          name: `Caso ${c.caseNumber}`,
          description: `Caso de ${c.caseType} - Prioridad crítica`,
          date: c.createdAt?.toISOString() || "",
          status: c.status || "open",
          id: c.id,
        }));

        evidences["5.3"].status = traumaticCases.length > 0 ? "complete" : "pending";
      }

      // 5.4 - Identificación y análisis (Guía de referencia I)
      // Para empresas pequeñas, usar Guía I
      if (companySize === 'small') {
        evidences["5.4"].evidences.push({
          type: "document",
          name: "Guía de Referencia I - Identificación de factores de riesgo",
          description: "Cuestionario aplicado para identificar factores de riesgo psicosocial",
          date: new Date().toISOString(),
          status: "pending",
        });
      }

      // 5.5 - Evaluación del entorno organizacional (Encuestas NOM-035)
      if (companySize !== 'small') {
        const nom035Surveys = await db
          .select({
            id: surveys.id,
            title: surveys.title,
            type: surveys.type,
            createdAt: surveys.createdAt,
          })
          .from(surveys)
          .limit(10);

        // Obtener periodos de aplicación
        for (const survey of nom035Surveys) {
            const periods = await db
            .select({
              id: surveyPeriods.id,
              name: surveyPeriods.name,
              startDate: surveyPeriods.startDate,
              endDate: surveyPeriods.endDate,
              status: surveyPeriods.status,
            })
            .from(surveyPeriods)
            .where(eq(surveyPeriods.id, survey.id))
            .limit(5);

          for (const period of periods) {
            // Contar respuestas completadas
            const [responseCount] = await db
              .select({ count: sql<number>`COUNT(*)` })
              .from(surveyResponses)
              .where(
                and(
                  eq(surveyResponses.surveyId, survey.id),
                  eq(surveyResponses.periodId, period.id),
                  sql`${surveyResponses.completedAt} IS NOT NULL`
                )
              );

            evidences["5.5"].evidences.push({
              type: "survey",
              name: `${survey.title} - ${period.name}`,
              description: `Periodo: ${period.startDate?.toLocaleDateString('es-MX')} - ${period.endDate?.toLocaleDateString('es-MX')} | Respuestas: ${responseCount?.count || 0}`,
              date: period.startDate?.toISOString() || "",
              status: period.status || "active",
              id: period.id,
            });
          }
        }

        evidences["5.5"].status = nom035Surveys.length > 0 ? "complete" : "pending";
      }

      // 5.6 - Medidas y acciones de control (Cursos y casos atendidos)
      const coursesCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(courses);

      const casesResolvedCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(sql`${cases.status} = 'resolved'`);

      evidences["5.6"].evidences.push({
        type: "program",
        name: "Cursos de Capacitación Disponibles",
        description: `Total de cursos disponibles: ${coursesCount[0]?.count || 0}`,
        date: new Date().toISOString(),
        status: "active",
      });

      evidences["5.6"].evidences.push({
        type: "cases",
        name: "Casos Resueltos",
        description: `Total de casos atendidos y resueltos: ${casesResolvedCount[0]?.count || 0}`,
        date: new Date().toISOString(),
        status: "complete",
      });

      evidences["5.6"].status = (coursesCount[0]?.count || 0) > 0 ? "complete" : "pending";

      // 5.7 - Difusión de información
      evidences["5.7"].evidences.push({
        type: "document",
        name: "Evidencias de Difusión",
        description: "Constancias de capacitación, carteles, correos electrónicos de difusión",
        date: new Date().toISOString(),
        status: "pending",
      });

      // 5.8 - Registros (más de 50 trabajadores)
      if (companySize === 'large') {
        evidences["5.8"].evidences.push({
          type: "database",
          name: "Sistema de Registro Digital",
          description: "Base de datos con historial completo de identificación, análisis, evaluación y seguimiento",
          date: new Date().toISOString(),
          status: "active",
        });

        evidences["5.8"].status = "complete";
      }

      // Agregar evidencias manuales cargadas
      const manualEvidencesList = await db
        .select()
        .from(manualEvidences)
        .orderBy(manualEvidences.uploadedAt);

      for (const manualEvidence of manualEvidencesList) {
        const numeral = manualEvidence.numeral;
        if (evidences[numeral]) {
          evidences[numeral].evidences.push({
            type: "manual",
            name: manualEvidence.title,
            description: manualEvidence.description || "",
            date: manualEvidence.uploadedAt?.toISOString() || "",
            status: "complete",
            id: manualEvidence.id,
            fileUrl: manualEvidence.fileUrl,
            fileName: manualEvidence.fileName,
          });

          // Actualizar status del numeral si tiene evidencias manuales
          if (evidences[numeral].status === "pending") {
            evidences[numeral].status = "partial";
          }
        }
      }

      return evidences;
    }),

  /**
   * Generar PDF de carpeta de evidencias STPS
   */
  generatePDF: protectedProcedure
    .input(
      z.object({
        companySize: z.enum(['small', 'medium', 'large']),
      })
    )
    .mutation(async ({ input }: { input: { companySize: 'small' | 'medium' | 'large' } }) => {
      const { default: PDFDocument } = await import('pdfkit');
      const { companySize } = input;
      
      // Obtener evidencias
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const employeeCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(employees)
        .where(eq(employees.isActive, true));

      const totalEmployees = employeeCount[0]?.count || 0;

      // Crear documento PDF
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      return new Promise<{ pdfBase64: string }>((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({ pdfBase64: pdfBuffer.toString('base64') });
        });

        doc.on('error', reject);

        // Portada
        doc.fontSize(24).font('Helvetica-Bold').text('CARPETA DE EVIDENCIAS STPS', { align: 'center' });
        doc.moveDown();
        doc.fontSize(18).text('Cumplimiento NOM-035-STPS-2018', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica').text(`Total de Empleados: ${totalEmployees}`, { align: 'center' });
        doc.text(`Tamaño de Empresa: ${companySize === 'small' ? 'Pequeña (≤15)' : companySize === 'medium' ? 'Mediana (16-50)' : 'Grande (>50)'}`, { align: 'center' });
        doc.moveDown(2);
        doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
        
        // Folio único
        const folio = `CARP-NOM035-${Date.now()}`;
        doc.moveDown(3);
        doc.fontSize(10).text(`Folio: ${folio}`, { align: 'center' });

        // Índice
        doc.addPage();
        doc.fontSize(18).font('Helvetica-Bold').text('ÍNDICE', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica');
        
        const numerals = [
          '5.1 - Política de prevención de riesgos psicosociales',
          '5.2 - Medidas de prevención',
          '5.3 - Identificación de trabajadores expuestos a acontecimientos traumáticos severos',
          '5.4 - Identificación y análisis de factores de riesgo psicosocial',
          '5.5 - Evaluación del entorno organizacional',
          '5.6 - Medidas y acciones de control',
          '5.7 - Difusión de información',
          '5.8 - Registros',
        ];

        numerals.forEach((numeral: any, index: number) => {
          doc.text(`${index + 1}. ${numeral}`, { indent: 20 });
          doc.moveDown(0.5);
        });

        // Contenido de evidencias (simplificado para MVP)
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('EVIDENCIAS POR NUMERAL', { align: 'center' });
        doc.moveDown(2);

        numerals.forEach((numeral: any) => {
          doc.fontSize(14).font('Helvetica-Bold').text(numeral);
          doc.moveDown(0.5);
          doc.fontSize(10).font('Helvetica').text('Evidencias recopiladas automáticamente del sistema.', { indent: 20 });
          doc.moveDown(1);
        });

        // Pie de página en todas las páginas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).text(
            `Folio: ${folio} | Página ${i + 1} de ${pages.count} | ${new Date().toLocaleDateString('es-MX')}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
        }

        doc.end();
      });
    }),

  /**
   * Subir evidencia manual
   */
  uploadEvidence: protectedProcedure
    .input(
      z.object({
        numeral: z.string(),
        title: z.string(),
        description: z.string().optional(),
        fileData: z.string(), // Base64 data
        fileName: z.string(),
        fileType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Subir archivo a S3
      const buffer = Buffer.from(input.fileData, 'base64');
      const fileKey = `manual-evidences/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      
      const { url: fileUrl } = await storagePut(
        fileKey,
        buffer,
        input.fileType || 'application/octet-stream'
      );

      // Guardar en base de datos
      const [evidence] = await (db.insert(manualEvidences) as any).values({
        numeral: input.numeral,
        title: input.title,
        description: input.description,
        fileUrl,
        fileKey,
        fileName: input.fileName,
        fileType: input.fileType,
        uploadedBy: ctx.user.id,
      });

      return { success: true, evidenceId: evidence.insertId };
    }),

  /**
   * Eliminar evidencia manual
   */
  deleteEvidence: protectedProcedure
    .input(
      z.object({
        evidenceId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener evidencia para eliminar archivo de S3
      const [evidence] = await db
        .select()
        .from(manualEvidences)
        .where(eq(manualEvidences.id, input.evidenceId))
        .limit(1);

      if (!evidence) {
        throw new Error("Evidence not found");
      }

      // Eliminar archivo de S3
      await storageDelete(evidence.fileKey);

      // Eliminar registro de base de datos
      await db.delete(manualEvidences).where(eq(manualEvidences.id, input.evidenceId));

      return { success: true };
    }),
});
