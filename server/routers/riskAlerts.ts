import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  departments,
  employees,
  riskAlertHistory,
  riskAlertThresholds,
  surveyResponses,
  surveys,
  users,
} from "../../drizzle/schema";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const riskAlertsRouter = router({
  /**
   * Verificar niveles de riesgo y disparar alertas automáticas
   */
  checkRiskLevels: protectedProcedure
    .input(
      z
        .object({
          departmentId: z.number().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener umbrales configurados
      let thresholds: any;
      if (input?.departmentId) {
        [thresholds] = await db
          .select()
          .from(riskAlertThresholds)
          .where(eq(riskAlertThresholds.departmentId, input.departmentId));
      }

      // Si no hay umbrales configurados, usar valores por defecto
      const highRiskThreshold = thresholds?.highRiskThreshold || 30;
      const mediumRiskThreshold = thresholds?.mediumRiskThreshold || 20;

      // Obtener encuestas recientes
      const surveys = await db
        .select()
        .from(surveyResponses)
        .orderBy(desc(surveyResponses.completedAt));

      // Agrupar por departamento usando userId → employees.userId
      const departmentGroups: Record<number, any[]> = {};
      for (const survey of surveys) {
        if (!survey.userId) continue;

        // Buscar el empleado por userId
        const [employee] = await db
          .select()
          .from(employees)
          .where(eq(employees.userId, survey.userId));

        if (!employee || !employee.departmentId) continue;

        const deptId = employee.departmentId;
        if (!departmentGroups[deptId]) {
          departmentGroups[deptId] = [];
        }
        departmentGroups[deptId].push({ survey, employee });
      }

      const alertsTriggered = [];

      // Verificar cada departamento
      for (const [deptId, deptEntries] of Object.entries(departmentGroups)) {
        const totalEmployees = deptEntries.length;
        // riskLevel viene del campo results (JSON) de surveyResponses
        const highRiskEmployees = deptEntries.filter((e: any) => {
          try {
            const results = JSON.parse(e.survey.results || "{}");
            return (
              results.riskLevel === "high" || results.globalRiskLevel === "high"
            );
          } catch {
            return false;
          }
        }).length;
        const riskPercentage = (highRiskEmployees / totalEmployees) * 100;

        let alertType:
          | "high_risk_threshold_exceeded"
          | "medium_risk_threshold_exceeded"
          | null = null;

        if (riskPercentage >= highRiskThreshold) {
          alertType = "high_risk_threshold_exceeded";
        } else if (riskPercentage >= mediumRiskThreshold) {
          alertType = "medium_risk_threshold_exceeded";
        }

        if (alertType) {
          // Insertar alerta en historial
          await (db.insert(riskAlertHistory) as any).values({
            departmentId: parseInt(deptId),
            alertType,
            riskPercentage: riskPercentage.toFixed(2),
            threshold: `${alertType === "high_risk_threshold_exceeded" ? highRiskThreshold : mediumRiskThreshold}%`,
            totalEmployees,
            highRiskEmployees,
            triggeredBy: ctx.user.id,
            notificationSent: false,
          });

          // Enviar notificación al propietario
          const [dept] = await db
            .select()
            .from(departments)
            .where(eq(departments.id, parseInt(deptId)));

          const deptName = dept?.name || `Departamento ${deptId}`;

          await notifyOwner({
            title: `⚠️ Alerta de Riesgo Psicosocial - ${deptName}`,
            content:
              `El departamento ${deptName} ha superado el umbral de riesgo ${alertType === "high_risk_threshold_exceeded" ? "alto" : "medio"}.\n\n` +
              `📊 Estadísticas:\n` +
              `- Total de empleados: ${totalEmployees}\n` +
              `- Empleados en riesgo alto: ${highRiskEmployees}\n` +
              `- Porcentaje de riesgo: ${riskPercentage.toFixed(2)}%\n` +
              `- Umbral configurado: ${alertType === "high_risk_threshold_exceeded" ? highRiskThreshold : mediumRiskThreshold}%\n\n` +
              `Se requiere acción inmediata para mitigar los riesgos identificados.`,
          });

          alertsTriggered.push({
            departmentId: parseInt(deptId),
            departmentName: deptName,
            riskPercentage: riskPercentage.toFixed(2),
            alertType,
          });
        }
      }

      return {
        success: true,
        alertsTriggered,
        totalChecked: Object.keys(departmentGroups).length,
      };
    }),

  /**
   * Disparar alerta manual
   */
  triggerAlert: adminProcedure
    .input(
      z.object({
        departmentId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener encuestas del departamento via userId → employees
      const surveys = await db
        .select()
        .from(surveyResponses)
        .orderBy(desc(surveyResponses.completedAt));

      const deptEmployees = [];
      for (const survey of surveys) {
        if (!survey.userId) continue;

        const [employee] = await db
          .select()
          .from(employees)
          .where(eq(employees.userId, survey.userId));

        if (employee && employee.departmentId === input.departmentId) {
          deptEmployees.push({ survey, employee });
        }
      }

      const totalEmployees = deptEmployees.length;
      const highRiskEmployees = deptEmployees.filter((e: any) => {
        try {
          const results = JSON.parse(e.survey.results || "{}");
          return (
            results.riskLevel === "high" || results.globalRiskLevel === "high"
          );
        } catch {
          return false;
        }
      }).length;
      const riskPercentage =
        totalEmployees > 0 ? (highRiskEmployees / totalEmployees) * 100 : 0;

      // Insertar alerta manual
      await (db.insert(riskAlertHistory) as any).values({
        departmentId: input.departmentId,
        alertType: "manual_alert",
        riskPercentage: riskPercentage.toFixed(2),
        threshold: "Manual",
        totalEmployees,
        highRiskEmployees,
        triggeredBy: ctx.user.id,
        notificationSent: false,
        notes: input.notes,
      });

      // Enviar notificación
      const [dept] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, input.departmentId));

      const deptName = dept?.name || `Departamento ${input.departmentId}`;

      await notifyOwner({
        title: `🔔 Alerta Manual - ${deptName}`,
        content:
          `Se ha generado una alerta manual para el departamento ${deptName}.\n\n` +
          `📊 Estadísticas actuales:\n` +
          `- Total de empleados: ${totalEmployees}\n` +
          `- Empleados en riesgo alto: ${highRiskEmployees}\n` +
          `- Porcentaje de riesgo: ${riskPercentage.toFixed(2)}%\n\n` +
          `${input.notes ? `Notas: ${input.notes}` : ""}`,
      });

      return { success: true, riskPercentage: riskPercentage.toFixed(2) };
    }),

  /**
   * Obtener historial de alertas
   */
  getAlertHistory: protectedProcedure
    .input(
      z
        .object({
          departmentId: z.number().optional(),
          limit: z.number().optional().default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const alerts = await db
        .select()
        .from(riskAlertHistory)
        .where(
          input?.departmentId
            ? eq(riskAlertHistory.departmentId, input.departmentId)
            : undefined
        )
        .orderBy(desc(riskAlertHistory.triggeredAt))
        .limit(input?.limit || 50);

      return alerts;
    }),

  /**
   * Configurar umbrales de alerta para un departamento
   */
  configureThresholds: adminProcedure
    .input(
      z.object({
        departmentId: z.number(),
        highRiskThreshold: z.number().min(0).max(100),
        mediumRiskThreshold: z.number().min(0).max(100),
        enableAutoAlerts: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar si ya existe configuración
      const [existing] = await db
        .select()
        .from(riskAlertThresholds)
        .where(eq(riskAlertThresholds.departmentId, input.departmentId));

      if (existing) {
        // Actualizar
        await db
          .update(riskAlertThresholds)
          .set({
            highRiskThreshold: input.highRiskThreshold,
            mediumRiskThreshold: input.mediumRiskThreshold,
            enableAutoAlerts: input.enableAutoAlerts,
            updatedBy: ctx.user.id,
          } as any)
          .where(eq(riskAlertThresholds.departmentId, input.departmentId));
      } else {
        // Insertar
        await (db.insert(riskAlertThresholds) as any).values({
          departmentId: input.departmentId,
          highRiskThreshold: input.highRiskThreshold,
          mediumRiskThreshold: input.mediumRiskThreshold,
          enableAutoAlerts: input.enableAutoAlerts,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });
      }

      return { success: true };
    }),

  /**
   * Obtener umbrales configurados
   */
  getThresholds: protectedProcedure
    .input(z.object({ departmentId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input?.departmentId) {
        const [threshold] = await db
          .select()
          .from(riskAlertThresholds)
          .where(eq(riskAlertThresholds.departmentId, input.departmentId));

        return threshold || null;
      }

      const thresholds = await db.select().from(riskAlertThresholds);
      return thresholds;
    }),

  /**
   * Obtener estadísticas de riesgo por departamento
   */
  getDepartmentRiskStats: protectedProcedure
    .input(z.object({ departmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener encuestas del departamento via userId → employees
      const surveys = await db
        .select()
        .from(surveyResponses)
        .orderBy(desc(surveyResponses.completedAt));

      const deptSurveys = [];
      for (const survey of surveys) {
        if (!survey.userId) continue;

        const [employee] = await db
          .select()
          .from(employees)
          .where(eq(employees.userId, survey.userId));

        if (employee && employee.departmentId === input.departmentId) {
          deptSurveys.push({ survey, employee });
        }
      }

      const totalEmployees = deptSurveys.length;

      const getRiskLevel = (entry: any): string => {
        try {
          const results = JSON.parse(entry.survey.results || "{}");
          return results.riskLevel || results.globalRiskLevel || "low";
        } catch {
          return "low";
        }
      };

      const highRiskCount = deptSurveys.filter(
        (e: any) => getRiskLevel(e) === "high"
      ).length;
      const mediumRiskCount = deptSurveys.filter(
        (e: any) => getRiskLevel(e) === "medium"
      ).length;
      const lowRiskCount = deptSurveys.filter(
        (e: any) => getRiskLevel(e) === "low"
      ).length;

      const highRiskPercentage =
        totalEmployees > 0 ? (highRiskCount / totalEmployees) * 100 : 0;
      const mediumRiskPercentage =
        totalEmployees > 0 ? (mediumRiskCount / totalEmployees) * 100 : 0;
      const lowRiskPercentage =
        totalEmployees > 0 ? (lowRiskCount / totalEmployees) * 100 : 0;

      return {
        totalEmployees,
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
        highRiskPercentage: highRiskPercentage.toFixed(2),
        mediumRiskPercentage: mediumRiskPercentage.toFixed(2),
        lowRiskPercentage: lowRiskPercentage.toFixed(2),
      };
    }),
});
