import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  committeeTrainings,
  evaluations,
  trainingAssignments,
  trainingCosts,
  trainingEvaluations,
  workplaceViolenceCases,
} from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export const trainingROIRouter = router({
  // Crear o actualizar costos de una capacitación
  upsertCosts: protectedProcedure
    .input(
      z.object({
        trainingId: z.number(),
        instructorCost: z.number(),
        materialsCost: z.number(),
        facilitiesCost: z.number(),
        laborHoursCost: z.number(),
        otherCosts: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const totalCost =
        input.instructorCost +
        input.materialsCost +
        input.facilitiesCost +
        input.laborHoursCost +
        input.otherCosts;

      // Verificar si ya existe un registro de costos
      const existing = await db
        .select()
        .from(trainingCosts)
        .where(eq(trainingCosts.trainingId, input.trainingId))
        .limit(1);

      if (existing.length > 0) {
        // Actualizar
        await db
          .update(trainingCosts)
          .set({
            instructorCost: input.instructorCost.toString(),
            materialsCost: input.materialsCost.toString(),
            facilitiesCost: input.facilitiesCost.toString(),
            laborHoursCost: input.laborHoursCost.toString(),
            otherCosts: input.otherCosts.toString(),
            totalCost: totalCost.toString(),
            notes: input.notes,
          } as any)
          .where(eq(trainingCosts.id, existing[0].id));

        return { success: true, id: existing[0].id };
      } else {
        // Crear
        const result = await (db.insert(trainingCosts) as any).values({
          trainingId: input.trainingId,
          instructorCost: input.instructorCost.toString(),
          materialsCost: input.materialsCost.toString(),
          facilitiesCost: input.facilitiesCost.toString(),
          laborHoursCost: input.laborHoursCost.toString(),
          otherCosts: input.otherCosts.toString(),
          totalCost: totalCost.toString(),
          notes: input.notes,
        });

        return { success: true, id: Number((result as any).insertId) };
      }
    }),

  // Obtener costos de una capacitación
  getCosts: protectedProcedure
    .input(z.object({ trainingId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const costs = await db
        .select()
        .from(trainingCosts)
        .where(eq(trainingCosts.trainingId, input.trainingId))
        .limit(1);
      return costs[0] || null;
    }),

  // Calcular ROI de una capacitación específica
  calculateROI: protectedProcedure
    .input(
      z.object({
        trainingId: z.number(),
        periodMonths: z.number().default(6), // Período de análisis (meses)
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Obtener costos
      const costsData = await db
        .select()
        .from(trainingCosts)
        .where(eq(trainingCosts.trainingId, input.trainingId))
        .limit(1);
      if (!costsData.length) {
        return {
          error: "No se encontraron costos registrados para esta capacitación",
        };
      }
      const costs = costsData[0];
      const totalCost = parseFloat(costs.totalCost);

      // 2. Obtener información de la capacitación
      const training = await db
        .select()
        .from(committeeTrainings)
        .where(eq(committeeTrainings.id, input.trainingId))
        .limit(1);
      if (!training.length) {
        return { error: "Capacitación no encontrada" };
      }

      // 3. Obtener asignaciones completadas
      const assignments = await db
        .select()
        .from(trainingAssignments)
        .where(
          and(
            eq(trainingAssignments.trainingId, input.trainingId),
            sql`${trainingAssignments.status} = 'completed'`
          )
        );

      const completedCount = assignments.length;

      // 4. Calcular reducción de casos (comparar antes/después de la capacitación)
      // Obtener fecha promedio de completitud
      const completedDates = assignments
        .map((a: any) => a.completedAt)
        .filter(Boolean) as Date[];
      if (completedDates.length === 0) {
        return {
          totalCost,
          completedAssignments: completedCount,
          casesReduction: 0,
          evaluationImprovement: 0,
          certificatesObtained: completedCount,
          totalBenefits: 0,
          roi: 0,
          message: "No hay asignaciones completadas para calcular ROI",
        };
      }

      const avgCompletionDate = new Date(
        completedDates.reduce(
          (sum: any, date: any) => sum + date.getTime(),
          0
        ) / completedDates.length
      );

      // Casos ANTES de la capacitación (6 meses antes de la fecha promedio de completitud)
      const beforeDate = new Date(avgCompletionDate);
      beforeDate.setMonth(beforeDate.getMonth() - 6);

      const casesBeforeRaw = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM workplace_violence_cases 
        WHERE DATE(created_at) >= DATE(${beforeDate.toISOString().split("T")[0]}) 
        AND DATE(created_at) < DATE(${avgCompletionDate.toISOString().split("T")[0]})
      `);
      const casesBefore = ((casesBeforeRaw as any).rows[0] as any).count || 0;

      // Casos DESPUÉS de la capacitación (período especificado)
      const afterDate = new Date(avgCompletionDate);
      const afterEndDate = new Date(avgCompletionDate);
      afterEndDate.setMonth(afterEndDate.getMonth() + input.periodMonths);

      const casesAfterRaw = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM workplace_violence_cases 
        WHERE DATE(created_at) >= DATE(${avgCompletionDate.toISOString().split("T")[0]}) 
        AND DATE(created_at) < DATE(${afterEndDate.toISOString().split("T")[0]})
      `);
      const casesAfter = ((casesAfterRaw as any).rows[0] as any).count || 0;

      const casesReduction = Math.max(0, casesBefore - casesAfter);
      const casesReductionPercent =
        casesBefore > 0 ? (casesReduction / casesBefore) * 100 : 0;

      // 5. Calcular mejora en evaluaciones
      const evaluations = await db
        .select()
        .from(trainingEvaluations)
        .where(eq(trainingEvaluations.assignmentId, input.trainingId));

      const avgRating =
        evaluations.length > 0
          ? evaluations.reduce(
              (sum: number, ev: any) => sum + (ev.overallRating || 0),
              0
            ) / evaluations.length
          : 0;

      const evaluationImprovement =
        avgRating >= 4 ? 10 : avgRating >= 3.5 ? 5 : 0; // % de mejora estimada

      // 6. Certificados obtenidos
      const certificatesObtained = completedCount;

      // 7. Calcular beneficios monetarios (estimación)
      // Asumimos que cada caso cuesta $5,000 MXN en promedio (tiempo, recursos, etc.)
      const costPerCase = 5000;
      const casesBenefit = casesReduction * costPerCase;

      // Beneficio por mejora en evaluaciones (estimación: 2% de productividad por cada 10% de mejora)
      const productivityBenefit =
        (evaluationImprovement / 10) * 0.02 * totalCost;

      // Beneficio por certificaciones (estimación: $1,000 MXN por certificado)
      const certificationsBenefit = certificatesObtained * 1000;

      const totalBenefits =
        casesBenefit + productivityBenefit + certificationsBenefit;

      // 8. Calcular ROI
      const roi =
        totalCost > 0 ? ((totalBenefits - totalCost) / totalCost) * 100 : 0;

      return {
        totalCost,
        completedAssignments: completedCount,
        casesReduction,
        casesReductionPercent: Math.round(casesReductionPercent * 100) / 100,
        casesBefore,
        casesAfter,
        evaluationImprovement: Math.round(evaluationImprovement * 100) / 100,
        avgRating: Math.round(avgRating * 100) / 100,
        certificatesObtained,
        casesBenefit,
        productivityBenefit: Math.round(productivityBenefit * 100) / 100,
        certificationsBenefit,
        totalBenefits: Math.round(totalBenefits * 100) / 100,
        roi: Math.round(roi * 100) / 100,
      };
    }),

  // Dashboard de ROI general
  getDashboard: protectedProcedure
    .input(
      z.object({
        periodMonths: z.number().default(6),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener todas las capacitaciones con costos
      const allCosts = await db
        .select({
          id: trainingCosts.id,
          trainingId: trainingCosts.trainingId,
          totalCost: trainingCosts.totalCost,
          trainingTitle: committeeTrainings.title,
        })
        .from(trainingCosts)
        .leftJoin(
          committeeTrainings,
          eq(trainingCosts.trainingId, committeeTrainings.id)
        );

      const totalInvestment = allCosts.reduce(
        (sum: number, c: any) => sum + parseFloat(c.totalCost),
        0
      );

      // Calcular ROI para cada capacitación
      const roiPromises = allCosts.map(async (cost: any) => {
        const roiData = await db.execute(sql`
          SELECT 
            COUNT(DISTINCT ta.id) as completedAssignments,
            AVG(te.overall_rating) as avgRating
          FROM training_assignments ta
          LEFT JOIN training_evaluations te ON te.training_id = ta.training_id
          WHERE ta.training_id = ${cost.trainingId}
          AND ta.status = 'completed'
        `);

        const row = (roiData as any).rows[0] as any;
        const completedAssignments = row.completedAssignments || 0;
        const avgRating = row.avgRating || 0;

        // Estimación simple de beneficios
        const estimatedBenefits =
          completedAssignments * 1000 + (avgRating >= 4 ? 5000 : 0);
        const roi =
          parseFloat(cost.totalCost) > 0
            ? ((estimatedBenefits - parseFloat(cost.totalCost)) /
                parseFloat(cost.totalCost)) *
              100
            : 0;

        return {
          trainingId: cost.trainingId,
          trainingTitle: cost.trainingTitle,
          totalCost: parseFloat(cost.totalCost),
          completedAssignments,
          avgRating: Math.round(avgRating * 100) / 100,
          estimatedBenefits,
          roi: Math.round(roi * 100) / 100,
        };
      });

      const roiData = await Promise.all(roiPromises);

      const totalBenefits = roiData.reduce(
        (sum: number, r: any) => sum + r.estimatedBenefits,
        0
      );
      const avgROI =
        roiData.length > 0
          ? roiData.reduce((sum: number, r: any) => sum + r.roi, 0) /
            roiData.length
          : 0;

      // Top 5 capacitaciones con mejor ROI
      const topROI = roiData
        .sort((a: any, b: any) => b.roi - a.roi)
        .slice(0, 5);

      return {
        totalInvestment: Math.round(totalInvestment * 100) / 100,
        totalBenefits: Math.round(totalBenefits * 100) / 100,
        avgROI: Math.round(avgROI * 100) / 100,
        trainingsWithCosts: allCosts.length,
        topROI,
        allTrainings: roiData,
      };
    }),

  // Listar todas las capacitaciones con sus costos
  listWithCosts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const trainingsWithCosts = await db
      .select({
        trainingId: committeeTrainings.id,
        title: committeeTrainings.title,
        type: committeeTrainings.type,
        duration: committeeTrainings.duration,
        costId: trainingCosts.id,
        totalCost: trainingCosts.totalCost,
        instructorCost: trainingCosts.instructorCost,
        materialsCost: trainingCosts.materialsCost,
        facilitiesCost: trainingCosts.facilitiesCost,
        laborHoursCost: trainingCosts.laborHoursCost,
        otherCosts: trainingCosts.otherCosts,
      })
      .from(committeeTrainings)
      .leftJoin(
        trainingCosts,
        eq(committeeTrainings.id, trainingCosts.trainingId)
      );

    return trainingsWithCosts.map((t: any) => ({
      ...t,
      totalCost: t.totalCost ? parseFloat(t.totalCost) : 0,
      instructorCost: t.instructorCost ? parseFloat(t.instructorCost) : 0,
      materialsCost: t.materialsCost ? parseFloat(t.materialsCost) : 0,
      facilitiesCost: t.facilitiesCost ? parseFloat(t.facilitiesCost) : 0,
      laborHoursCost: t.laborHoursCost ? parseFloat(t.laborHoursCost) : 0,
      otherCosts: t.otherCosts ? parseFloat(t.otherCosts) : 0,
      hasCosts: t.costId !== null,
    }));
  }),
});
