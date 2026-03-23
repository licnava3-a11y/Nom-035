import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { committeeOperatingRules, committeeOperatingRulesVersions, operatingRulesTemplates, signatures } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const operatingRulesTemplatesRouter = router({
  // Listar plantillas activas
  list: protectedProcedure
    .input(
      z.object({
        companySize: z.enum(["small", "medium", "large"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const conditions = [eq(operatingRulesTemplates.isActive, true)];
        
        if (input?.companySize) {
          conditions.push(eq(operatingRulesTemplates.companySize, input.companySize));
        }

        const templates = await db
          .select()
          .from(operatingRulesTemplates)
          .where(and(...conditions))
          .orderBy(operatingRulesTemplates.companySize);

        return templates;
      } catch (error) {
        console.error("Error listing templates:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener plantillas",
        });
      }
    }),

  // Obtener plantilla por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const [template] = await db
          .select()
          .from(operatingRulesTemplates)
          .where(eq(operatingRulesTemplates.id, input.id));

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plantilla no encontrada",
          });
        }

        return template;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error getting template:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener plantilla",
        });
      }
    }),

  // Crear base de funcionamiento desde plantilla
  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        customTitle: z.string().optional(), // Permitir personalizar el título
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Obtener plantilla
        const [template] = await db
          .select()
          .from(operatingRulesTemplates)
          .where(eq(operatingRulesTemplates.id, input.templateId));

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plantilla no encontrada",
          });
        }

        // Crear nueva base de funcionamiento
        const [newOperatingRule] = await (db
          .insert(committeeOperatingRules) as any)
          .values({
            version: "1",
            objectives: template.objectives || "",
            structure: template.structure || "",
            roles: template.roles || "",
            meetingFrequency: template.meetingSchedule || "",
            quorum: "",
            decisionMaking: template.decisionMaking || "",
            communication: "",
            caseHandling: "",
            confidentiality: template.confidentiality || "",
            amendments: template.amendments,
            signatures: "",
            effectiveDate: new Date().toISOString().split('T')[0],
            status: "draft",
            createdBy: ctx.user.id,
          })
          .$returningId();

        // Crear primera versión
        await (db.insert(committeeOperatingRulesVersions) as any).values({
          operatingRuleId: newOperatingRule.id,
          versionNumber: 1,
          version: "1",
          objectives: template.objectives || "",
          structure: template.structure || "",
          roles: template.roles || "",
          meetingFrequency: template.meetingSchedule || "",
          quorum: "",
          decisionMaking: template.decisionMaking || "",
          communication: "",
          caseHandling: "",
          confidentiality: template.confidentiality || "",
          amendments: template.amendments,
          signatures: "",
          effectiveDate: new Date().toISOString().split('T')[0],
          changeDescription: `Creado desde plantilla: ${template.name}`,
          createdBy: ctx.user.id,
        });

        return {
          id: newOperatingRule.id,
          message: "Base de funcionamiento creada exitosamente desde plantilla",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error creating from template:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al crear base de funcionamiento desde plantilla",
        });
      }
    }),
});
