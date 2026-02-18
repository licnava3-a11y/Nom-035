import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq } from "drizzle-orm";

export const salaryImpactSimulatorRouter = router({
  simulateImpact: publicProcedure
    .input(
      z.object({
        employeeId: z.number(),
        adjustmentType: z.enum(["percentage", "fixed", "market"]),
        adjustmentValue: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // Obtener datos del empleado
      const employee = await db.query.employees.findFirst({
        where: (employees, { eq }) => eq(employees.id, input.employeeId),
      });

      if (!employee) {
        throw new Error("Empleado no encontrado");
      }

      // Obtener datos de nómina
      const payroll = await db.query.payrollData.findFirst({
        where: (payrollData, { eq }) => eq(payrollData.employeeId, input.employeeId),
      });

      if (!payroll) {
        throw new Error("Datos de nómina no encontrados");
      }

      const currentSalary = parseFloat(payroll.salary);
      const marketRate = payroll.marketRate ? parseFloat(payroll.marketRate) : currentSalary;
      const currentGap = payroll.salaryGapPercentage ? parseFloat(payroll.salaryGapPercentage) : 0;

      // Calcular nuevo salario según tipo de ajuste
      let newSalary = currentSalary;
      let adjustmentCost = 0;

      if (input.adjustmentType === "percentage" && input.adjustmentValue) {
        const increase = currentSalary * (input.adjustmentValue / 100);
        newSalary = currentSalary + increase;
        adjustmentCost = increase * 12; // Costo anual
      } else if (input.adjustmentType === "fixed" && input.adjustmentValue) {
        newSalary = currentSalary + input.adjustmentValue;
        adjustmentCost = input.adjustmentValue * 12; // Costo anual
      } else if (input.adjustmentType === "market") {
        newSalary = marketRate;
        adjustmentCost = (marketRate - currentSalary) * 12; // Costo anual
      }

      // Calcular nueva brecha salarial
      const newGap = ((newSalary - marketRate) / marketRate) * 100;

      // Obtener datos de riesgo actual
      const highRiskEmployee = await db.query.predictiveTurnoverResults.findFirst({
        where: (results, { eq }) => eq(results.employeeId, input.employeeId),
      });

      const currentRisk = highRiskEmployee ? parseFloat(highRiskEmployee.turnoverProbability) : 50;

      // Calcular reducción de riesgo basado en mejora de brecha salarial
      // Fórmula: Por cada 10% de mejora en brecha, se reduce el riesgo en 5%
      const gapImprovement = Math.abs(currentGap) - Math.abs(newGap);
      const riskReduction = (gapImprovement / 10) * 5;
      const projectedRisk = Math.max(0, currentRisk - riskReduction);

      // Calcular ROI
      // Costo de rotación estimado: 1.5x salario anual
      const turnoverCost = currentSalary * 12 * 1.5;
      const riskReductionDecimal = riskReduction / 100;
      const expectedSavings = turnoverCost * riskReductionDecimal;
      const estimatedROI = adjustmentCost > 0 ? ((expectedSavings - adjustmentCost) / adjustmentCost) * 100 : 0;

      // Generar análisis
      let analysis = "";
      if (projectedRisk < 30) {
        analysis = `El ajuste salarial propuesto reduciría significativamente el riesgo de rotación a ${projectedRisk.toFixed(1)}%, colocando al empleado en un nivel de riesgo bajo. La inversión de $${adjustmentCost.toLocaleString()} MXN anuales tiene un ROI estimado de ${estimatedROI.toFixed(0)}%, lo que representa una estrategia de retención altamente efectiva.`;
      } else if (projectedRisk < 50) {
        analysis = `El ajuste salarial propuesto reduciría el riesgo de rotación a ${projectedRisk.toFixed(1)}%, mejorando la situación del empleado a un nivel de riesgo medio. Con un ROI estimado de ${estimatedROI.toFixed(0)}%, esta intervención es recomendable para prevenir la rotación.`;
      } else {
        analysis = `El ajuste salarial propuesto tendría un impacto limitado, reduciendo el riesgo solo a ${projectedRisk.toFixed(1)}%. Se recomienda combinar este ajuste con otras intervenciones (capacitación, cambio de puesto) para maximizar la efectividad de retención.`;
      }

      return {
        employeeId: input.employeeId,
        employeeName: employee.name,
        currentSalary,
        newSalary,
        currentGap: currentGap.toFixed(1),
        newGap: newGap.toFixed(1),
        currentRisk: currentRisk.toFixed(1),
        projectedRisk: projectedRisk.toFixed(1),
        riskReduction: riskReduction.toFixed(1),
        adjustmentCost: Math.round(adjustmentCost),
        estimatedROI: Math.round(estimatedROI),
        analysis,
      };
    }),
});
