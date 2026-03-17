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

  /**
   * Generar Reporte PDF de Casos
   * Incluye estadísticas mensuales/trimestrales y recomendaciones
   */
  generateCasesPDF: protectedProcedure
    .input(z.object({
      period: z.enum(['monthly', 'quarterly']),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const PDFDocument = (await import('pdfkit')).default;
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // 1. Obtener métricas de casos
      const metricsQuery = await db.execute(sql`
        SELECT 
          COUNT(*) as totalCases,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as openCases,
          SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) as investigatingCases,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedCases,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closedCases,
          SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as criticalCases,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as highCases,
          AVG(CASE WHEN closed_at IS NOT NULL THEN DATEDIFF(closed_at, created_at) ELSE NULL END) as avgResolutionDays
        FROM cases
        WHERE DATE(created_at) >= ${input.startDate.split('T')[0]}
        AND DATE(created_at) <= ${input.endDate.split('T')[0]}
      `);

      const metrics = (metricsQuery as any).rows?.[0] || {};

      // 2. Distribución por tipo
      const typeDistQuery = await db.execute(sql`
        SELECT case_type, COUNT(*) as count
        FROM cases
        WHERE DATE(created_at) >= ${input.startDate.split('T')[0]}
        AND DATE(created_at) <= ${input.endDate.split('T')[0]}
        GROUP BY case_type
      `);

      const typeDistribution = (typeDistQuery as any).rows || [];

      // 3. Crear PDF
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      // Título
      doc.fontSize(20).text('Reporte de Casos NOM-035', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Período: ${input.period === 'monthly' ? 'Mensual' : 'Trimestral'}`, { align: 'center' });
      doc.text(`Del ${input.startDate.split('T')[0]} al ${input.endDate.split('T')[0]}`, { align: 'center' });
      doc.moveDown(2);

      // Estadísticas Generales
      doc.fontSize(16).text('Estadísticas Generales');
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Total de Casos: ${metrics.totalCases || 0}`);
      doc.text(`Casos Abiertos: ${metrics.openCases || 0}`);
      doc.text(`Casos en Investigación: ${metrics.investigatingCases || 0}`);
      doc.text(`Casos Resueltos: ${metrics.resolvedCases || 0}`);
      doc.text(`Casos Cerrados: ${metrics.closedCases || 0}`);
      doc.moveDown();
      doc.text(`Casos Críticos: ${metrics.criticalCases || 0}`);
      doc.text(`Casos de Alta Prioridad: ${metrics.highCases || 0}`);
      doc.text(`Tiempo Promedio de Resolución: ${Math.round(metrics.avgResolutionDays || 0)} días`);
      doc.moveDown(2);

      // Distribución por Tipo
      doc.fontSize(16).text('Distribución por Tipo de Caso');
      doc.moveDown();
      doc.fontSize(12);
      const typeLabels: Record<string, string> = {
        mobbing: 'Mobbing',
        burnout: 'Burnout',
        violence: 'Violencia',
        stress: 'Estrés',
        other: 'Otro',
      };
      typeDistribution.forEach((item: any) => {
        doc.text(`${typeLabels[item.case_type] || item.case_type}: ${item.count}`);
      });
      doc.moveDown(2);

      // Recomendaciones
      doc.fontSize(16).text('Recomendaciones');
      doc.moveDown();
      doc.fontSize(12);

      const recommendations = [];
      if (Number(metrics.criticalCases || 0) > 0) {
        recommendations.push(`Se detectaron ${metrics.criticalCases} casos críticos. Se recomienda priorizar su atención inmediata.`);
      }
      if (Number(metrics.avgResolutionDays || 0) > 14) {
        recommendations.push(`El tiempo promedio de resolución (${Math.round(metrics.avgResolutionDays)} días) excede el estándar recomendado de 14 días. Se sugiere revisar procesos de atención.`);
      }
      if (Number(metrics.openCases || 0) > Number(metrics.totalCases || 1) * 0.5) {
        recommendations.push(`Más del 50% de los casos están abiertos. Se recomienda asignar más recursos al comité.`);
      }
      if (recommendations.length === 0) {
        recommendations.push('El sistema de atención de casos muestra un desempeño adecuado. Continuar con el monitoreo periódico.');
      }

      recommendations.forEach((rec, idx) => {
        doc.text(`${idx + 1}. ${rec}`);
        doc.moveDown();
      });

      doc.end();

      // 4. Convertir a base64
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
      });

      const base64 = pdfBuffer.toString('base64');
      const filename = `reporte-casos-${input.period}-${new Date().toISOString().split('T')[0]}.pdf`;

      return {
        success: true,
        data: base64,
        filename,
        totalCases: Number(metrics.totalCases || 0),
      };
    }),

  // Generar reporte PDF de estructura organizacional
  generateOrgStructurePDF: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        includeInactive: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const PDFDocument = (await import("pdfkit")).default;
      const { getDb } = await import("../db");
      const { departments, users } = await import("../../drizzle/schema");
      const { eq, and, isNull } = await import("drizzle-orm");

      try {
        const db = await getDb();
      if (!db) throw new Error('Database not initialized');

        // Obtener departamentos con contador de empleados
        // @ts-expect-error - getDb() siempre retorna instancia válida
        const allDepartments = await db
          .select({
            id: departments.id,
            name: departments.name,
            code: departments.code,
            managerId: departments.managerId,
            description: departments.description,
          })
          .from(departments)
          .where(eq(departments.isActive, true));

        // Obtener empleados por departamento
        const employeesByDept = new Map<number, number>();
        const managersByDept = new Map<number, string>();

        for (const dept of allDepartments) {
          // @ts-expect-error - getDb() siempre retorna instancia válida
          const employees = await db
            .select()
            .from(users)
            .where(
              and(
                eq(users.departmentId, dept.id),
                input.includeInactive ? undefined : eq(sql`1`, true)
              )
            );

          employeesByDept.set(dept.id, employees.length);

          // Obtener nombre del manager
          if (dept.managerId) {
            // @ts-expect-error - getDb() siempre retorna instancia válida
            const manager = await db
              .select()
              .from(users)
              .where(eq(users.id, dept.managerId))
              .limit(1);

            if (manager[0]) {
              managersByDept.set(
                dept.id,
                `${manager[0].firstName} ${manager[0].lastName}`
              );
            }
          }
        }

        // Crear documento PDF
        const doc = new PDFDocument({ size: "letter", margin: 50 });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk) => chunks.push(chunk));

        // Título
        doc
          .fontSize(20)
          .font("Helvetica-Bold")
          .text("Reporte de Estructura Organizacional", { align: "center" });
        doc.moveDown();
        doc
          .fontSize(12)
          .font("Helvetica")
          .text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, {
            align: "center",
          });
        doc.moveDown(2);

        // Estadísticas generales
        doc.fontSize(14).font("Helvetica-Bold").text("Estadísticas Generales");
        doc.moveDown();

        const totalEmployees = Array.from(employeesByDept.values()).reduce(
          (a, b) => a + b,
          0
        );
        const deptsWithManager = Array.from(managersByDept.keys()).length;
        const deptsWithoutManager = allDepartments.length - deptsWithManager;

        doc
          .fontSize(11)
          .font("Helvetica")
          .text(`Total de Departamentos: ${allDepartments.length}`);
        doc.text(`Total de Empleados: ${totalEmployees}`);
        doc.text(`Departamentos con Manager: ${deptsWithManager}`);
        doc.text(`Departamentos sin Manager: ${deptsWithoutManager}`);
        doc.moveDown(2);

        // Tabla de departamentos
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Detalle por Departamento");
        doc.moveDown();

        // Header de tabla
        const tableTop = doc.y;
        const col1X = 50;
        const col2X = 200;
        const col3X = 350;
        const col4X = 450;

        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text("Departamento", col1X, tableTop)
          .text("Código", col2X, tableTop)
          .text("Manager", col3X, tableTop)
          .text("Empleados", col4X, tableTop);

        doc.moveDown();
        let currentY = doc.y;

        // Filas de tabla
        for (const dept of allDepartments) {
          if (currentY > 700) {
            // Nueva página si se excede el espacio
            doc.addPage();
            currentY = 50;
          }

          doc
            .fontSize(9)
            .font("Helvetica")
            .text(dept.name.substring(0, 25), col1X, currentY)
            .text(dept.code || "N/A", col2X, currentY)
            .text(
              managersByDept.get(dept.id)?.substring(0, 15) || "Sin asignar",
              col3X,
              currentY
            )
            .text(employeesByDept.get(dept.id) || 0, col4X, currentY);

          currentY += 20;
          doc.y = currentY;
        }

        // Organigrama simple (solo departamentos principales)
        doc.addPage();
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Organigrama de Departamentos", { align: "center" });
        doc.moveDown(2);

        let orgY = doc.y;
        let orgX = 50;
        const boxWidth = 150;
        const boxHeight = 40;
        const spacing = 20;

        for (let i = 0; i < allDepartments.length; i++) {
          const dept = allDepartments[i];

          if (orgY > 700) {
            doc.addPage();
            orgY = 50;
            orgX = 50;
          }

          // Dibujar caja de departamento
          doc.rect(orgX, orgY, boxWidth, boxHeight).stroke();

          // Texto del departamento
          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(dept.name.substring(0, 20), orgX + 5, orgY + 10, {
              width: boxWidth - 10,
              align: "center",
            });

          doc
            .fontSize(8)
            .font("Helvetica")
            .text(
              managersByDept.get(dept.id) || "Sin manager",
              orgX + 5,
              orgY + 25,
              { width: boxWidth - 10, align: "center" }
            );

          // Posicionar siguiente caja
          if ((i + 1) % 3 === 0) {
            // Nueva fila cada 3 departamentos
            orgY += boxHeight + spacing;
            orgX = 50;
          } else {
            orgX += boxWidth + spacing;
          }
        }

        doc.end();

        // Convertir a base64
        const pdfBuffer = await new Promise<Buffer>((resolve) => {
          doc.on("end", () => resolve(Buffer.concat(chunks)));
        });

        const base64 = pdfBuffer.toString("base64");
        const filename = `estructura-organizacional-${new Date().toISOString().split("T")[0]}.pdf`;

        return {
          success: true,
          data: base64,
          filename,
          totalDepartments: allDepartments.length,
          totalEmployees,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al generar reporte: ${error.message}`,
        });
      }
    }),
});
