/**
 * Router de Cumplimiento NOM-035 por Numeral
 * Gestiona checklist de requisitos y porcentajes de cumplimiento
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { commonValidators } from "../validators/common";
import { getDb } from "../db";
import { complianceChecklist, complianceChecks } from "../../drizzle/schema";
import { eq, and, count, sql } from "drizzle-orm";

export const complianceNOM035Router = router({
  /**
   * Obtener porcentaje de cumplimiento por numeral
   */
  getComplianceByNumeral: protectedProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Obtener todos los items del checklist agrupados por fundamento (numeral)
        const items = await db
          .select({
            fundament: complianceChecklist.fundament,
            section: complianceChecklist.section,
            sectionName: complianceChecklist.sectionName,
            itemCode: complianceChecklist.itemCode,
            requirement: complianceChecklist.requirement,
            evidence: complianceChecklist.evidence,
          })
          .from(complianceChecklist);

        // Obtener todos los checks (completados y con fechas)
        const checks = await db
          .select({
            checklistItemId: complianceChecks.checklistItemId,
            isCompliant: complianceChecks.isCompliant,
            dueDate: complianceChecks.dueDate,
          })
          .from(complianceChecks);

        // Mapear checks por item ID
        const checksMap = new Map(checks.map(c => [c.checklistItemId, { isCompliant: c.isCompliant, dueDate: c.dueDate }]));

        // Agrupar por numeral (fundamento)
        const byNumeral: Record<string, { total: number; completed: number; items: any[] }> = {};

        items.forEach((item: any, index: number) => {
          const numeral = item.fundament || "Sin clasificar";
          if (!byNumeral[numeral]) {
            byNumeral[numeral] = { total: 0, completed: 0, items: [] };
          }

          const itemId = index + 1; // Asumiendo IDs secuenciales
          const checkData = checksMap.get(itemId);
          const isCompleted = checkData?.isCompliant || false;
          const dueDate = checkData?.dueDate || null;

          byNumeral[numeral].total++;
          if (isCompleted) {
            byNumeral[numeral].completed++;
          }

          byNumeral[numeral].items.push({
            ...item,
            id: itemId,
            isCompleted,
            dueDate,
          });
        });

        // Calcular porcentajes
        const result = Object.entries(byNumeral).map(([numeral, data]: [string, any]) => ({
          numeral,
          total: data.total,
          completed: data.completed,
          percentage: data.total > 0 ? (data.completed / data.total) * 100 : 0,
          items: data.items,
        }));

        return result;
      } catch (error) {
        console.error("[ComplianceNOM035] Error getting compliance by numeral:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener cumplimiento",
        });
      }
    }),

  /**
   * Obtener estadísticas globales de cumplimiento
   */
  getGlobalStats: protectedProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Total de items
        const totalItems = await db
          .select({ count: count() })
          .from(complianceChecklist);

        // Items completados
        const completedItems = await db
          .select({ count: count() })
          .from(complianceChecks)
          .where(eq(complianceChecks.isCompliant, true));

        const total = totalItems[0]?.count || 0;
        const completed = completedItems[0]?.count || 0;
        const percentage = total > 0 ? (completed / total) * 100 : 0;

        // Determinar nivel de cumplimiento
        let level: "low" | "medium" | "high" = "low";
        if (percentage >= 80) {
          level = "high";
        } else if (percentage >= 50) {
          level = "medium";
        }

        return {
          total,
          completed,
          pending: total - completed,
          percentage,
          level,
        };
      } catch (error) {
        console.error("[ComplianceNOM035] Error getting global stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener estadísticas",
        });
      }
    }),

  /**
   * Marcar item como completado
   */
  markAsCompleted: protectedProcedure
    .input(
      z.object({
        checklistItemId: commonValidators.positiveId,
        notes: z.string().max(1000, "Las notas no pueden exceder 1000 caracteres").optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Verificar si ya existe un check
        const existing = await db
          .select()
          .from(complianceChecks)
          .where(eq(complianceChecks.checklistItemId, input.checklistItemId))
          .limit(1);

        if (existing.length > 0) {
          // Actualizar existente
          await db
            .update(complianceChecks)
            .set({
              isCompliant: true,
              verifiedBy: ctx.user.id,
              verifiedAt: new Date(),
              notes: input.notes || null,
              updatedAt: new Date(),
            } as any)
            .where(eq(complianceChecks.id, existing[0].id));
        } else {
          // Crear nuevo
          await (db.insert(complianceChecks) as any).values({
            checklistItemId: input.checklistItemId,
            isCompliant: true,
            verifiedBy: ctx.user.id,
            verifiedAt: new Date(),
            notes: input.notes || null,
          });
        }

        return { success: true };
      } catch (error) {
        console.error("[ComplianceNOM035] Error marking as completed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al marcar como completado",
        });
      }
    }),

  /**
   * Asignar fecha de vencimiento a item del checklist
   */
  setDueDate: protectedProcedure
    .input(
      z.object({
        checklistItemId: commonValidators.positiveId,
        dueDate: commonValidators.isoDate,
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Verificar si ya existe un check
        const existing = await db
          .select()
          .from(complianceChecks)
          .where(eq(complianceChecks.checklistItemId, input.checklistItemId))
          .limit(1);

        const dueDate = new Date(input.dueDate);

        if (existing.length > 0) {
          // Actualizar existente
          await db
            .update(complianceChecks)
            .set({
              dueDate,
              updatedAt: new Date(),
            } as any)
            .where(eq(complianceChecks.id, existing[0].id));
        } else {
          // Crear nuevo check con fecha de vencimiento
          await (db.insert(complianceChecks) as any).values({
            checklistItemId: input.checklistItemId,
            isCompliant: false,
            dueDate,
          });
        }

        return { success: true };
      } catch (error) {
        console.error("[ComplianceNOM035] Error setting due date:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al asignar fecha de vencimiento",
        });
      }
    }),

  /**
   * Desmarcar item como completado
   */
  markAsIncomplete: protectedProcedure
    .input(
      z.object({
        checklistItemId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Buscar check existente
        const existing = await db
          .select()
          .from(complianceChecks)
          .where(eq(complianceChecks.checklistItemId, input.checklistItemId))
          .limit(1);

        if (existing.length > 0) {
          // Actualizar a no compliant
          await db
            .update(complianceChecks)
            .set({
              isCompliant: false,
              updatedAt: new Date(),
            } as any)
            .where(eq(complianceChecks.id, existing[0].id));
        }

        return { success: true };
      } catch (error) {
        console.error("[ComplianceNOM035] Error marking as incomplete:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al desmarcar",
        });
      }
    }),

  /**
   * Generar reporte de cumplimiento NOM-035 en PDF
   */
  generateComplianceReport: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Importar dinámicamente pdfkit y storage
        const PDFDocument = (await import("pdfkit")).default;
        const { storagePut } = await import("../storage");

        // Obtener datos de cumplimiento
        const items = await db
          .select({
            fundament: complianceChecklist.fundament,
            section: complianceChecklist.section,
            sectionName: complianceChecklist.sectionName,
            itemCode: complianceChecklist.itemCode,
            requirement: complianceChecklist.requirement,
            evidence: complianceChecklist.evidence,
          })
          .from(complianceChecklist);

        const checks = await db
          .select({
            checklistItemId: complianceChecks.checklistItemId,
            isCompliant: complianceChecks.isCompliant,
            dueDate: complianceChecks.dueDate,
          })
          .from(complianceChecks);

        const checksMap = new Map(checks.map(c => [c.checklistItemId, { isCompliant: c.isCompliant, dueDate: c.dueDate }]));

        // Agrupar por numeral
        const byNumeral: Record<string, { total: number; completed: number; items: any[] }> = {};

        items.forEach((item: any, index: number) => {
          const numeral = item.fundament || "Sin clasificar";
          if (!byNumeral[numeral]) {
            byNumeral[numeral] = { total: 0, completed: 0, items: [] };
          }

          const itemId = index + 1;
          const checkData = checksMap.get(itemId);
          const isCompleted = checkData?.isCompliant || false;
          const dueDate = checkData?.dueDate || null;

          byNumeral[numeral].total++;
          if (isCompleted) {
            byNumeral[numeral].completed++;
          }

          byNumeral[numeral].items.push({
            ...item,
            id: itemId,
            isCompleted,
            dueDate,
          });
        });

        // Calcular porcentajes
        const numerals = Object.entries(byNumeral).map(([numeral, data]: [string, any]) => ({
          numeral,
          total: data.total,
          completed: data.completed,
          percentage: data.total > 0 ? (data.completed / data.total) * 100 : 0,
          items: data.items,
        }));

        // Calcular estadísticas globales
        const totalItems = items.length;
        const completedItems = checks.filter(c => c.isCompliant).length;
        const globalPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

        // Crear PDF
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));

        // Portada
        doc.fontSize(24).font("Helvetica-Bold").text("Reporte de Cumplimiento", { align: "center" });
        doc.fontSize(20).text("NOM-035-STPS-2018", { align: "center" });
        doc.moveDown(2);
        doc.fontSize(12).font("Helvetica").text(`Fecha de generación: ${new Date().toLocaleDateString()}`, { align: "center" });
        doc.text(`Generado por: ${ctx.user.nombre}`, { align: "center" });
        doc.moveDown(3);

        // Resumen ejecutivo
        doc.fontSize(16).font("Helvetica-Bold").text("Resumen Ejecutivo", { underline: true });
        doc.moveDown(1);
        doc.fontSize(12).font("Helvetica");
        doc.text(`Total de requisitos: ${totalItems}`);
        doc.text(`Requisitos completados: ${completedItems}`);
        doc.text(`Requisitos pendientes: ${totalItems - completedItems}`);
        doc.text(`Porcentaje de cumplimiento global: ${globalPercentage.toFixed(1)}%`);
        doc.moveDown(2);

        // Cumplimiento por numeral
        doc.fontSize(16).font("Helvetica-Bold").text("Cumplimiento por Numeral", { underline: true });
        doc.moveDown(1);

        numerals.forEach((numeral: any) => {
          doc.fontSize(14).font("Helvetica-Bold").text(numeral.numeral);
          doc.fontSize(12).font("Helvetica");
          doc.text(`Completados: ${numeral.completed}/${numeral.total} (${numeral.percentage.toFixed(1)}%)`);
          doc.moveDown(0.5);

          // Listar items pendientes
          const pendingItems = numeral.items.filter(item => !item.isCompleted);
          if (pendingItems.length > 0) {
            doc.fontSize(10).font("Helvetica-Bold").text("Requisitos pendientes:");
            pendingItems.forEach((item: any) => {
              doc.fontSize(9).font("Helvetica");
              doc.text(`  • ${item.itemCode}: ${item.requirement}`, { indent: 20 });
              if (item.dueDate) {
                const daysUntil = Math.ceil((new Date(item.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                doc.text(`    Vence: ${new Date(item.dueDate).toLocaleDateString()} (${daysUntil} días)`, { indent: 20 });
              }
            });
          }

          doc.moveDown(1);
        });

        // Plan de acción
        doc.addPage();
        doc.fontSize(16).font("Helvetica-Bold").text("Plan de Acción", { underline: true });
        doc.moveDown(1);
        doc.fontSize(12).font("Helvetica");
        doc.text("Recomendaciones para completar el cumplimiento de la NOM-035-STPS-2018:");
        doc.moveDown(1);

        const allPendingItems = numerals.flatMap(n => n.items.filter(item => !item.isCompleted));
        if (allPendingItems.length > 0) {
          doc.fontSize(10).font("Helvetica");
          doc.text("1. Priorizar requisitos con fecha de vencimiento próxima");
          doc.text("2. Asignar responsables para cada requisito pendiente");
          doc.text("3. Establecer fechas de vencimiento para requisitos sin fecha");
          doc.text("4. Revisar evidencias requeridas y comenzar su recopilación");
          doc.text("5. Programar revisiones periódicas del avance de cumplimiento");
        } else {
          doc.text("¡Felicidades! Todos los requisitos han sido completados.");
        }

        doc.end();

        // Esperar a que el PDF termine de generarse
        const pdfBuffer = await new Promise<Buffer>((resolve) => {
          doc.on("end", () => {
            resolve(Buffer.concat(chunks));
          });
        });

        // Subir a S3
        const fileName = `compliance-report-${Date.now()}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");

        return {
          success: true,
          url,
          fileName,
        };
      } catch (error) {
        console.error("[ComplianceNOM035] Error generating compliance report:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al generar reporte",
        });
      }
    }),
});
