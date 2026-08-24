/**
 * Router de Integración con Sistema de Nómina
 * Gestiona datos de compensación y beneficios para análisis de correlación con riesgo de rotación
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { payrollValidators, commonValidators } from "../validators/common";
import { getDb } from "../db";
import { payrollData } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const payrollIntegrationRouter = router({
  /**
   * Obtener todos los datos de nómina
   */
  getAllPayrollData: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const data = await db.select().from(payrollData);
      return data;
    } catch (error: any) {
      console.error("Error al obtener datos de nómina:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Error al obtener datos de nómina",
      });
    }
  }),

  /**
   * Obtener datos de nómina por empleado
   */
  getPayrollDataByEmployee: protectedProcedure
    .input(z.object({ employeeId: commonValidators.positiveId }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const data = await db
          .select()
          .from(payrollData)
          .where(eq(payrollData.employeeId, input.employeeId))
          .limit(1);

        return data[0] || null;
      } catch (error: any) {
        console.error("Error al obtener datos de nómina del empleado:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Error al obtener datos de nómina del empleado",
        });
      }
    }),

  /**
   * Crear o actualizar datos de nómina
   */
  upsertPayrollData: protectedProcedure
    .input(payrollValidators.upsertPayrollData)
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Calcular compensación total
        const totalCompensation = input.salary + (input.benefits || 0);

        // Calcular meses desde último aumento
        let monthsSinceLastRaise = null;
        if (input.lastRaiseDate) {
          const lastRaise = new Date(input.lastRaiseDate);
          const now = new Date();
          monthsSinceLastRaise = Math.floor(
            (now.getTime() - lastRaise.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
        }

        // Calcular brecha salarial
        let salaryGapPercentage = null;
        let salaryGapStatus = null;
        if (input.marketRate) {
          salaryGapPercentage =
            ((input.salary - input.marketRate) / input.marketRate) * 100;

          if (salaryGapPercentage < -10) {
            salaryGapStatus = "below_market";
          } else if (salaryGapPercentage > 10) {
            salaryGapStatus = "above_market";
          } else {
            salaryGapStatus = "at_market";
          }
        }

        // Calcular nivel de riesgo por compensación
        let compensationRiskLevel = "low";
        let requiresReview = false;

        if (salaryGapPercentage !== null) {
          if (salaryGapPercentage < -20) {
            compensationRiskLevel = "critical";
            requiresReview = true;
          } else if (salaryGapPercentage < -10) {
            compensationRiskLevel = "high";
            requiresReview = true;
          } else if (salaryGapPercentage < 0) {
            compensationRiskLevel = "medium";
          }
        }

        // Verificar si el empleado ya existe
        const existing = await db
          .select()
          .from(payrollData)
          .where(eq(payrollData.employeeId, input.employeeId))
          .limit(1);

        if (existing.length > 0) {
          // Actualizar
          await db
            .update(payrollData)
            .set({
              employeeName: input.employeeName,
              department: input.department,
              position: input.position,
              salary: input.salary.toString(),
              benefits: input.benefits?.toString(),
              totalCompensation: totalCompensation.toString(),
              lastRaiseDate: input.lastRaiseDate
                ? new Date(input.lastRaiseDate)
                : null,
              lastRaisePercentage: input.lastRaisePercentage?.toString(),
              monthsSinceLastRaise,
              marketRate: input.marketRate?.toString(),
              salaryGapPercentage: salaryGapPercentage?.toFixed(2),
              salaryGapStatus,
              compensationRiskLevel,
              requiresReview,
            } as any)
            .where(eq(payrollData.employeeId, input.employeeId));

          return { success: true, action: "updated" };
        } else {
          // Insertar
          await (db.insert(payrollData) as any).values({
            employeeId: input.employeeId,
            employeeName: input.employeeName,
            department: input.department,
            position: input.position,
            salary: input.salary.toString(),
            benefits: input.benefits?.toString(),
            totalCompensation: totalCompensation.toString(),
            lastRaiseDate: input.lastRaiseDate,
            lastRaisePercentage: input.lastRaisePercentage?.toString(),
            monthsSinceLastRaise,
            marketRate: input.marketRate?.toString(),
            salaryGapPercentage: salaryGapPercentage?.toFixed(2),
            salaryGapStatus,
            compensationRiskLevel,
            requiresReview,
          });

          return { success: true, action: "created" };
        }
      } catch (error: any) {
        console.error("Error al guardar datos de nómina:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al guardar datos de nómina",
        });
      }
    }),

  /**
   * Eliminar datos de nómina
   */
  deletePayrollData: protectedProcedure
    .input(z.object({ employeeId: commonValidators.positiveId }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        await db
          .delete(payrollData)
          .where(eq(payrollData.employeeId, input.employeeId));
        return { success: true };
      } catch (error: any) {
        console.error("Error al eliminar datos de nómina:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al eliminar datos de nómina",
        });
      }
    }),

  /**
   * Obtener empleados con brecha salarial crítica
   */
  getCriticalSalaryGaps: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const data = await db
        .select()
        .from(payrollData)
        .where(sql`${payrollData.requiresReview} = true`);

      return data;
    } catch (error: any) {
      console.error("Error al obtener brechas salariales críticas:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error.message || "Error al obtener brechas salariales críticas",
      });
    }
  }),

  /**
   * Análisis de correlación compensación vs riesgo de rotación
   */
  getCompensationRiskCorrelation: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Obtener datos de nómina con nivel de riesgo
      const data = await db.select().from(payrollData);

      // Agrupar por nivel de riesgo de compensación
      const grouped = data.reduce((acc: any, item) => {
        const level = item.compensationRiskLevel || "low";
        if (!acc[level]) {
          acc[level] = { count: 0, avgGap: 0, totalGap: 0 };
        }
        acc[level].count++;
        if (item.salaryGapPercentage) {
          acc[level].totalGap += parseFloat(item.salaryGapPercentage);
        }
        return acc;
      }, {});

      // Calcular promedios
      Object.keys(grouped).forEach((level: any) => {
        grouped[level].avgGap = grouped[level].totalGap / grouped[level].count;
      });

      return {
        byRiskLevel: grouped,
        totalEmployees: data.length,
        criticalCount: data.filter(
          (d: any) => d.compensationRiskLevel === "critical"
        ).length,
        highCount: data.filter((d: any) => d.compensationRiskLevel === "high")
          .length,
        mediumCount: data.filter(
          (d: any) => d.compensationRiskLevel === "medium"
        ).length,
        lowCount: data.filter((d: any) => d.compensationRiskLevel === "low")
          .length,
      };
    } catch (error: any) {
      console.error(
        "Error al analizar correlación compensación-riesgo:",
        error
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error.message || "Error al analizar correlación compensación-riesgo",
      });
    }
  }),
});
