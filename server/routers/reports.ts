/**
 * Router de Reportes Normativos
 * Generación de informes oficiales NOM-035 y NMX-025
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { generateNom035Report } from '../pdfGenerators/nom035Report';
import { 
  companyGeneralData, 
  companyLogo,
  surveyResponses, 
  surveyPeriods, 
  users,
  signatures,
  cases
} from '../../drizzle/schema';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';

export const reportsRouter = router({
  /**
   * Generar Informe Numeral 7.5 NOM-035-STPS-2018
   */
  generateNom035Report: protectedProcedure
    .input(z.object({
      periodId: z.number(),
      signerIds: z.array(z.number()).min(2, 'Se requieren al menos 2 firmantes'),
      conclusions: z.string().min(50, 'Las conclusiones deben tener al menos 50 caracteres'),
      recommendations: z.string().min(50, 'Las recomendaciones deben tener al menos 50 caracteres'),
    }))
    .mutation(async ({ input }: { input: any }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // 1. Obtener datos de la empresa
      const [companyData] = await db.select().from(companyGeneralData).limit(1);
      const [logoData] = await db.select().from(companyLogo).limit(1);
      if (!companyData) {
        throw new Error('No se encontraron datos de la empresa');
      }

      // 2. Obtener período de la encuesta
      const [period] = await db
        .select()
        .from(surveyPeriods)
        .where(eq(surveyPeriods.id, input.periodId));
      
      if (!period) {
        throw new Error('Período no encontrado');
      }

      // 3. Obtener total de trabajadores
      const [employeeCount] = await db
        .select({ count: count() })
        .from(users);

      // 4. Obtener resultados de encuestas del período
      const surveyResults = await db
        .select({
          surveyId: surveyResponses.surveyId,
          totalResponses: count(),
        })
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.periodId, input.periodId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        )
        .groupBy(surveyResponses.surveyId);

      const guideIResults = surveyResults.find((r: any) => r.surveyId === 1);
      const guideIIResults = surveyResults.find((r: any) => r.surveyId === 2);
      const guideIIIResults = surveyResults.find((r: any) => r.surveyId === 3);

      // 5. Obtener casos identificados (Guía I)
      const [casesCount] = await db
        .select({ count: count() })
        .from(cases)
        .where(
          and(
            gte(cases.createdAt, period.startDate),
            lte(cases.createdAt, period.endDate)
          )
        );

      // 6. Calcular factores de riesgo (simplificado - en producción se calcularía desde las respuestas)
      const riskFactors = [
        {
          category: 'Ambiente de trabajo',
          domain: 'Condiciones en el ambiente de trabajo',
          dimension: 'Condiciones peligrosas e inseguras',
          score: 15.5,
          level: 'Medio' as const,
          affectedEmployees: 12,
        },
        {
          category: 'Factores propios de la actividad',
          domain: 'Carga de trabajo',
          dimension: 'Cargas cuantitativas',
          score: 22.3,
          level: 'Alto' as const,
          affectedEmployees: 18,
        },
        {
          category: 'Organización del tiempo de trabajo',
          domain: 'Jornada de trabajo',
          dimension: 'Jornadas de trabajo superiores a las previstas',
          score: 18.7,
          level: 'Medio' as const,
          affectedEmployees: 15,
        },
      ];

      // 7. Obtener medidas de control (simplificado)
      const controlMeasures = [
        {
          riskFactor: 'Condiciones peligrosas e inseguras',
          measure: 'Implementar programa de mantenimiento preventivo de instalaciones y equipo',
          responsiblePerson: 'Jefe de Seguridad e Higiene',
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días
          status: 'En proceso' as const,
        },
        {
          riskFactor: 'Cargas cuantitativas',
          measure: 'Redistribución de cargas de trabajo y contratación de personal adicional',
          responsiblePerson: 'Gerente de Recursos Humanos',
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 días
          status: 'Pendiente' as const,
        },
      ];

      // 8. Obtener firmantes
      const signers = await db
        .select({
          id: signatures.id,
          name: signatures.signerName,
          position: signatures.signerRole,
          signatureUrl: signatures.signatureImageUrl,
        })
        .from(signatures)
        .where(
          sql`${signatures.id} IN (${sql.join(input.signerIds.map((id: number) => sql`${id}`), sql`, `)})`
        );

      if (signers.length < 2) {
        throw new Error('Se requieren al menos 2 firmantes válidos');
      }

      // 9. Generar folio único
      const folio = `NOM035-${new Date(period.startDate).getFullYear()}-${String(period.id).padStart(4, '0')}`;

      // 10. URL de validación (incluye folio)
      const validationUrl = `${process.env.VITE_APP_URL || 'https://nom035.manus.space'}/validate/${folio}`;

      // 11. Generar PDF
      const pdfResult = await generateNom035Report({
        company: {
          name: companyData.razonSocial,
          rfc: companyData.rfc,
          address: companyData.direccionFiscal,
          mainActivity: companyData.giro || 'No especificada',
          totalEmployees: employeeCount.count,
          logoUrl: logoData?.logoUrl || undefined,
        },
        reportPeriod: {
          startDate: period.startDate,
          endDate: period.endDate,
        },
        surveyResults: {
          guideI: {
            applied: !!guideIResults,
            casesIdentified: casesCount.count,
          },
          guideII: {
            applied: !!guideIIResults,
            totalResponses: guideIIResults?.totalResponses || 0,
          },
          guideIII: {
            applied: !!guideIIIResults,
            totalResponses: guideIIIResults?.totalResponses || 0,
          },
        },
        riskFactors,
        controlMeasures,
        conclusions: input.conclusions,
        recommendations: input.recommendations,
        signers: signers.map((s: any) => ({
          name: s.name,
          position: s.position,
          signatureUrl: s.signatureUrl || undefined,
          signatureDate: new Date(),
        })),
        folio,
        validationUrl,
      });

      return {
        success: true,
        pdfUrl: pdfResult.url,
        folio,
        message: 'Informe NOM-035 generado exitosamente',
      };
    }),

  /**
   * Obtener períodos disponibles para generar informes
   */
  getAvailablePeriods: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      const periods = await db
        .select({
          id: surveyPeriods.id,
          year: sql<number>`YEAR(${surveyPeriods.startDate})`,
          startDate: surveyPeriods.startDate,
          endDate: surveyPeriods.endDate,
          description: surveyPeriods.description,
        })
        .from(surveyPeriods)
        .orderBy(surveyPeriods.startDate);

      return periods;
    }),

  /**
   * Obtener firmantes disponibles
   */
  getAvailableSigners: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      const signers = await db
        .select({
          id: signatures.id,
          name: signatures.signerName,
          position: signatures.signerRole,
          hasSignature: sql<boolean>`${signatures.signatureImageUrl} IS NOT NULL`,
        })
        .from(signatures);

      return signers;
    }),
});
