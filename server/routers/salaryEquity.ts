import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { salaryEquityValidators } from "../validators/common";
import { getDb } from "../db";
import { salaryEquityAnalysis, equityReportsHistory, payrollData, users } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { storagePut } from "../storage";

export const salaryEquityRouter = router({
  // Generar nuevo análisis de equidad salarial
  generateAnalysis: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
      if (!db) throw new Error('Database not initialized');
    
    // Obtener datos de nómina con información de empleados
    const payrollRecords = await db
      .select({
        employeeId: payrollData.employeeId,
        employeeName: payrollData.employeeName,
        department: payrollData.department,
        position: payrollData.position,
        salary: payrollData.salary,
        gender: users.sexo,
        dateOfBirth: users.fechaNacimiento,
        hireDate: users.fechaIngreso,
      })
      .from(payrollData)
      .leftJoin(users, eq(payrollData.employeeId, users.id));

    if (payrollRecords.length === 0) {
      throw new Error("No hay datos de nómina disponibles para analizar");
    }

    // Análisis por Género
    const maleRecords = payrollRecords.filter(r => (r.gender as string) === "Masculino" || (r.gender as string) === "male");
    const femaleRecords = payrollRecords.filter(r => (r.gender as string) === "Femenino" || (r.gender as string) === "female");
    
    const maleAvgSalary = maleRecords.length > 0
      ? maleRecords.reduce((sum: any, r: any) => sum + parseFloat(r.salary || "0"), 0) / maleRecords.length
      : 0;
    
    const femaleAvgSalary = femaleRecords.length > 0
      ? femaleRecords.reduce((sum: any, r: any) => sum + parseFloat(r.salary || "0"), 0) / femaleRecords.length
      : 0;
    
    const genderPayGap = maleAvgSalary > 0
      ? ((maleAvgSalary - femaleAvgSalary) / maleAvgSalary) * 100
      : 0;
    
    const genderEquityScore = Math.max(0, 100 - Math.abs(genderPayGap));

    // Análisis por Edad
    const today = new Date();
    const ageGroupAnalysis = [
      { ageRange: "18-25", min: 18, max: 25 },
      { ageRange: "26-35", min: 26, max: 35 },
      { ageRange: "36-45", min: 36, max: 45 },
      { ageRange: "46-55", min: 46, max: 55 },
      { ageRange: "56+", min: 56, max: 999 },
    ].map(group => {
      const groupRecords = payrollRecords.filter(r => {
        if (!r.dateOfBirth) return false;
        const age = today.getFullYear() - new Date(r.dateOfBirth).getFullYear();
        return age >= group.min && age <= group.max;
      });
      
      const avgSalary = groupRecords.length > 0
        ? groupRecords.reduce((sum: any, r: any) => sum + parseFloat(r.salary || "0"), 0) / groupRecords.length
        : 0;
      
      return {
        ageRange: group.ageRange,
        averageSalary: avgSalary,
        employeeCount: groupRecords.length,
        gapPercentage: 0, // Se calculará después
      };
    });

    const overallAvgSalary = payrollRecords.reduce((sum: any, r: any) => sum + parseFloat(r.salary || "0"), 0) / payrollRecords.length;
    ageGroupAnalysis.forEach(group => {
      group.gapPercentage = overallAvgSalary > 0
        ? ((group.averageSalary - overallAvgSalary) / overallAvgSalary) * 100
        : 0;
    });

    const ageEquityScore = Math.max(0, 100 - Math.max(...ageGroupAnalysis.map(g => Math.abs(g.gapPercentage))));

    // Análisis por Antigüedad
    const tenureGroupAnalysis = [
      { tenureRange: "0-1", min: 0, max: 1 },
      { tenureRange: "1-3", min: 1, max: 3 },
      { tenureRange: "3-5", min: 3, max: 5 },
      { tenureRange: "5-10", min: 5, max: 10 },
      { tenureRange: "10+", min: 10, max: 999 },
    ].map(group => {
      const groupRecords = payrollRecords.filter(r => {
        if (!r.hireDate) return false;
        const tenureYears = (today.getTime() - new Date(r.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
        return tenureYears >= group.min && tenureYears < group.max;
      });
      
      const avgSalary = groupRecords.length > 0
        ? groupRecords.reduce((sum: any, r: any) => sum + parseFloat(r.salary || "0"), 0) / groupRecords.length
        : 0;
      
      return {
        tenureRange: group.tenureRange,
        averageSalary: avgSalary,
        employeeCount: groupRecords.length,
        gapPercentage: 0,
      };
    });

    tenureGroupAnalysis.forEach(group => {
      group.gapPercentage = overallAvgSalary > 0
        ? ((group.averageSalary - overallAvgSalary) / overallAvgSalary) * 100
        : 0;
    });

    const tenureEquityScore = Math.max(0, 100 - Math.max(...tenureGroupAnalysis.map(g => Math.abs(g.gapPercentage))));

    // Detectar casos críticos de inequidad (brecha > 20%)
    const criticalCases = payrollRecords
      .map(r => {
        const age = r.dateOfBirth ? today.getFullYear() - new Date(r.dateOfBirth).getFullYear() : 0;
        const tenure = r.hireDate ? (today.getTime() - new Date(r.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365) : 0;
        const currentSalary = parseFloat(r.salary || "0");
        
        // Salario esperado basado en promedio general
        const expectedSalary = overallAvgSalary;
        const gapPercentage = expectedSalary > 0 ? ((currentSalary - expectedSalary) / expectedSalary) * 100 : 0;
        
        return {
          employeeId: r.employeeId,
          employeeName: r.employeeName || "N/A",
          department: r.department || "N/A",
          position: r.position || "N/A",
          gender: r.gender || "N/A",
          age,
          tenure,
          currentSalary,
          expectedSalary,
          gapPercentage,
          inequityType: Math.abs(gapPercentage) > 20 ? ("multiple" as const) : ("gender" as const),
        };
      })
      .filter(c => Math.abs(c.gapPercentage) > 20)
      .sort((a: any, b: any) => Math.abs(b.gapPercentage) - Math.abs(a.gapPercentage))
      .slice(0, 20);

    // Calcular índice de equidad global
    const globalEquityIndex = Math.round((genderEquityScore + ageEquityScore + tenureEquityScore) / 3);

    // Determinar cumplimiento NMX-R-025-SCFI-2015
    const complianceScore = globalEquityIndex;
    const nmxComplianceStatus = complianceScore >= 80 ? "compliant" : complianceScore >= 60 ? "partial" : "non_compliant";

    // Generar recomendaciones
    const recommendations = [];
    if (Math.abs(genderPayGap) > 10) {
      recommendations.push({
        priority: "high" as const,
        category: "Equidad de Género",
        description: `Brecha salarial de género del ${genderPayGap.toFixed(1)}%. Implementar revisión salarial para reducir inequidad.`,
        estimatedCost: Math.abs(maleAvgSalary - femaleAvgSalary) * femaleRecords.length * 0.5,
        expectedImpact: "Reducción de brecha al 5% en 12 meses",
      });
    }

    if (criticalCases.length > 0) {
      recommendations.push({
        priority: "high" as const,
        category: "Casos Críticos",
        description: `${criticalCases.length} empleados con brechas salariales críticas (>20%). Requiere atención inmediata.`,
        estimatedCost: criticalCases.reduce((sum: any, c: any) => sum + Math.abs(c.currentSalary - c.expectedSalary), 0),
        expectedImpact: "Mejora del índice de equidad en 15 puntos",
      });
    }

    // Insertar análisis en BD
    const [analysis] = await (db.insert(salaryEquityAnalysis) as any).values({
      analyzedBy: typeof ctx.user.id === 'string' ? parseInt(ctx.user.id) : ctx.user.id,
      maleAverageSalary: maleAvgSalary.toString(),
      femaleAverageSalary: femaleAvgSalary.toString(),
      genderPayGapPercentage: genderPayGap.toString(),
      genderEquityScore,
      ageGroupAnalysis: JSON.stringify(ageGroupAnalysis),
      ageEquityScore,
      tenureGroupAnalysis: JSON.stringify(tenureGroupAnalysis),
      tenureEquityScore,
      criticalCases: JSON.stringify(criticalCases),
      globalEquityIndex,
      nmxComplianceStatus,
      complianceScore,
      recommendations: JSON.stringify(recommendations),
    });

    return {
      analysisId: analysis.insertId,
      globalEquityIndex,
      nmxComplianceStatus,
      complianceScore,
      genderPayGap,
      criticalCasesCount: criticalCases.length,
    };
  }),

  // Obtener último análisis
  getLatestAnalysis: protectedProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new Error('Database not initialized');
    const [analysis] = await db
      .select()
      .from(salaryEquityAnalysis)
      .orderBy(sql`${salaryEquityAnalysis.analysisDate} DESC`)
      .limit(1);

    if (!analysis) return null;

    return {
      ...analysis,
      ageGroupAnalysis: JSON.parse(analysis.ageGroupAnalysis as unknown as string),
      tenureGroupAnalysis: JSON.parse(analysis.tenureGroupAnalysis as unknown as string),
      criticalCases: JSON.parse(analysis.criticalCases as unknown as string),
      recommendations: JSON.parse(analysis.recommendations as unknown as string),
    };
  }),

  // Obtener historial de análisis
  getAnalysisHistory: protectedProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new Error('Database not initialized');
    const analyses = await db
      .select()
      .from(salaryEquityAnalysis)
      .orderBy(sql`${salaryEquityAnalysis.analysisDate} DESC`)
      .limit(10);

    return analyses.map(a => ({
      id: a.id,
      analysisDate: a.analysisDate,
      globalEquityIndex: a.globalEquityIndex,
      nmxComplianceStatus: a.nmxComplianceStatus,
      complianceScore: a.complianceScore,
      genderPayGapPercentage: parseFloat(a.genderPayGapPercentage || "0"),
      criticalCasesCount: (JSON.parse(a.criticalCases as unknown as string) as any[]).length,
    }));
  }),

  // Generar reporte PDF de equidad
  generateEquityReport: protectedProcedure
    .input(salaryEquityValidators.generateEquityReport)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not initialized');
      
      const [analysis] = await db
        .select()
        .from(salaryEquityAnalysis)
        .where(eq(salaryEquityAnalysis.id, input.analysisId));

      if (!analysis) {
        throw new Error("Análisis no encontrado");
      }

      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      await new Promise<void>((resolve, reject) => {
        doc.on("end", () => resolve());
        doc.on("error", reject);

        // Portada
        doc.fontSize(24).text("Reporte de Equidad Salarial", { align: "center" });
        doc.moveDown();
        doc.fontSize(16).text("NMX-R-025-SCFI-2015", { align: "center" });
        doc.moveDown(2);
        doc.fontSize(12).text(`Fecha de Análisis: ${new Date(analysis.analysisDate).toLocaleDateString("es-MX")}`, { align: "center" });
        doc.moveDown(3);

        // Resumen Ejecutivo
        doc.fontSize(18).text("Resumen Ejecutivo");
        doc.moveDown();
        doc.fontSize(12).text(`Índice de Equidad Global: ${analysis.globalEquityIndex}/100`);
        doc.text(`Estado de Cumplimiento NMX: ${(analysis.nmxComplianceStatus ?? 'non_compliant').toUpperCase()}`);
        doc.text(`Puntuación de Cumplimiento: ${analysis.complianceScore}/100`);
        doc.text(`Brecha Salarial de Género: ${parseFloat(analysis.genderPayGapPercentage || "0").toFixed(1)}%`);
        doc.moveDown(2);

        // Análisis por Género
        doc.fontSize(16).text("Análisis por Género");
        doc.moveDown();
        doc.fontSize(12).text(`Salario Promedio Hombres: $${parseFloat(analysis.maleAverageSalary || "0").toLocaleString()}`);
        doc.text(`Salario Promedio Mujeres: $${parseFloat(analysis.femaleAverageSalary || "0").toLocaleString()}`);
        doc.text(`Puntuación de Equidad de Género: ${analysis.genderEquityScore}/100`);
        doc.moveDown(2);

        // Casos Críticos
        const criticalCases = JSON.parse(analysis.criticalCases as unknown as string);
        doc.fontSize(16).text("Casos Críticos de Inequidad");
        doc.moveDown();
        doc.fontSize(12).text(`Total de Casos Críticos: ${criticalCases.length}`);
        doc.moveDown();

        if (criticalCases.length > 0) {
          criticalCases.slice(0, 10).forEach((c: any, i: number) => {
            doc.text(`${i + 1}. ${c.employeeName} - ${c.position}`);
            doc.text(`   Brecha: ${c.gapPercentage.toFixed(1)}% | Salario: $${c.currentSalary.toLocaleString()}`);
            doc.moveDown(0.5);
          });
        }

        doc.moveDown(2);

        // Recomendaciones
        const recommendations = JSON.parse(analysis.recommendations as unknown as string);
        doc.fontSize(16).text("Recomendaciones");
        doc.moveDown();
        recommendations.forEach((r: any, i: number) => {
          doc.fontSize(12).text(`${i + 1}. ${r.category} (Prioridad: ${r.priority.toUpperCase()})`);
          doc.text(`   ${r.description}`);
          doc.text(`   Costo Estimado: $${r.estimatedCost.toLocaleString()}`);
          doc.text(`   Impacto Esperado: ${r.expectedImpact}`);
          doc.moveDown();
        });

        doc.end();
      });

      const pdfBuffer = Buffer.concat(chunks);
      const fileKey = `equity-reports/equity-report-${input.analysisId}-${Date.now()}.pdf`;
      const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

      // Guardar en historial
      await (db.insert(equityReportsHistory) as any).values({
        analysisId: input.analysisId,
        reportUrl: url,
        reportKey: fileKey,
        generatedBy: ctx.user.id,
      });

      return { url };
    }),
});
