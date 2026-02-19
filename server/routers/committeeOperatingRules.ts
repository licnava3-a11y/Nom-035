import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  committeeOperatingRules, 
  committeeOperatingRulesVersions,
  users 
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Router para gestión de bases de funcionamiento del comité con sistema de versionado
 */
export const committeeOperatingRulesRouter = router({
  /**
   * Crear nueva base de funcionamiento
   */
  create: protectedProcedure
    .input(
      z.object({
        version: z.string().min(1).max(10),
        effectiveDate: z.string(), // YYYY-MM-DD
        reviewDate: z.string().optional(),
        nextReviewDate: z.string().optional(),
        objectives: z.string().min(1),
        structure: z.string().min(1),
        roles: z.string().min(1),
        meetingFrequency: z.string().min(1),
        quorum: z.string().min(1),
        decisionMaking: z.string().min(1),
        communication: z.string().min(1),
        caseHandling: z.string().min(1),
        confidentiality: z.string().min(1),
        amendments: z.string().optional(),
        signatures: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      try {
        // Crear la base de funcionamiento principal
        const [newRule] = await db.insert(committeeOperatingRules).values({
          version: input.version,
          effectiveDate: input.effectiveDate,
          reviewDate: input.reviewDate,
          nextReviewDate: input.nextReviewDate,
          objectives: input.objectives,
          structure: input.structure,
          roles: input.roles,
          meetingFrequency: input.meetingFrequency,
          quorum: input.quorum,
          decisionMaking: input.decisionMaking,
          communication: input.communication,
          caseHandling: input.caseHandling,
          confidentiality: input.confidentiality,
          amendments: input.amendments,
          signatures: input.signatures,
          status: "draft",
          createdBy: ctx.user.id,
        });

        const ruleId = newRule.insertId;

        // Crear la primera versión en el historial
        await db.insert(committeeOperatingRulesVersions).values({
          operatingRuleId: ruleId,
          versionNumber: 1,
          version: input.version,
          objectives: input.objectives,
          structure: input.structure,
          roles: input.roles,
          meetingFrequency: input.meetingFrequency,
          quorum: input.quorum,
          decisionMaking: input.decisionMaking,
          communication: input.communication,
          caseHandling: input.caseHandling,
          confidentiality: input.confidentiality,
          amendments: input.amendments,
          signatures: input.signatures,
          effectiveDate: input.effectiveDate,
          reviewDate: input.reviewDate,
          nextReviewDate: input.nextReviewDate,
          changeDescription: "Versión inicial creada",
          createdBy: ctx.user.id,
        });

        return { success: true, id: ruleId };
      } catch (error) {
        console.error("Error creating operating rules:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al crear las bases de funcionamiento",
        });
      }
    }),

  /**
   * Actualizar base de funcionamiento y crear nueva versión
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        version: z.string().min(1).max(10),
        effectiveDate: z.string(),
        reviewDate: z.string().optional(),
        nextReviewDate: z.string().optional(),
        objectives: z.string().min(1),
        structure: z.string().min(1),
        roles: z.string().min(1),
        meetingFrequency: z.string().min(1),
        quorum: z.string().min(1),
        decisionMaking: z.string().min(1),
        communication: z.string().min(1),
        caseHandling: z.string().min(1),
        confidentiality: z.string().min(1),
        amendments: z.string().optional(),
        signatures: z.string().min(1),
        changeDescription: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      try {
        // Obtener el número de versión actual
        const versions = await db
          .select({ versionNumber: committeeOperatingRulesVersions.versionNumber })
          .from(committeeOperatingRulesVersions)
          .where(eq(committeeOperatingRulesVersions.operatingRuleId, input.id))
          .orderBy(desc(committeeOperatingRulesVersions.versionNumber))
          .limit(1);

        const nextVersionNumber = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

        // Actualizar la base de funcionamiento principal
        await db
          .update(committeeOperatingRules)
          .set({
            version: input.version,
            effectiveDate: input.effectiveDate,
            reviewDate: input.reviewDate,
            nextReviewDate: input.nextReviewDate,
            objectives: input.objectives,
            structure: input.structure,
            roles: input.roles,
            meetingFrequency: input.meetingFrequency,
            quorum: input.quorum,
            decisionMaking: input.decisionMaking,
            communication: input.communication,
            caseHandling: input.caseHandling,
            confidentiality: input.confidentiality,
            amendments: input.amendments,
            signatures: input.signatures,
            updatedAt: new Date(),
          })
          .where(eq(committeeOperatingRules.id, input.id));

        // Crear nueva versión en el historial
        await db.insert(committeeOperatingRulesVersions).values({
          operatingRuleId: input.id,
          versionNumber: nextVersionNumber,
          version: input.version,
          objectives: input.objectives,
          structure: input.structure,
          roles: input.roles,
          meetingFrequency: input.meetingFrequency,
          quorum: input.quorum,
          decisionMaking: input.decisionMaking,
          communication: input.communication,
          caseHandling: input.caseHandling,
          confidentiality: input.confidentiality,
          amendments: input.amendments,
          signatures: input.signatures,
          effectiveDate: input.effectiveDate,
          reviewDate: input.reviewDate,
          nextReviewDate: input.nextReviewDate,
          changeDescription: input.changeDescription || `Actualización versión ${nextVersionNumber}`,
          createdBy: ctx.user.id,
        });

        return { success: true, versionNumber: nextVersionNumber };
      } catch (error) {
        console.error("Error updating operating rules:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar las bases de funcionamiento",
        });
      }
    }),

  /**
   * Listar todas las bases de funcionamiento activas
   */
  list: protectedProcedure.query(async () => {
    const db = getDb();

    try {
      const rules = await db
        .select({
          id: committeeOperatingRules.id,
          version: committeeOperatingRules.version,
          effectiveDate: committeeOperatingRules.effectiveDate,
          reviewDate: committeeOperatingRules.reviewDate,
          nextReviewDate: committeeOperatingRules.nextReviewDate,
          status: committeeOperatingRules.status,
          createdBy: committeeOperatingRules.createdBy,
          createdAt: committeeOperatingRules.createdAt,
          updatedAt: committeeOperatingRules.updatedAt,
          creatorName: users.name,
        })
        .from(committeeOperatingRules)
        .leftJoin(users, eq(committeeOperatingRules.createdBy, users.id))
        .orderBy(desc(committeeOperatingRules.createdAt));

      return rules;
    } catch (error) {
      console.error("Error listing operating rules:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al listar las bases de funcionamiento",
      });
    }
  }),

  /**
   * Obtener base de funcionamiento específica con última versión
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      try {
        const [rule] = await db
          .select()
          .from(committeeOperatingRules)
          .where(eq(committeeOperatingRules.id, input.id));

        if (!rule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Base de funcionamiento no encontrada",
          });
        }

        return rule;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error getting operating rule:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener la base de funcionamiento",
        });
      }
    }),

  /**
   * Listar historial de versiones
   */
  listVersions: protectedProcedure
    .input(z.object({ operatingRuleId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      try {
        const versions = await db
          .select({
            id: committeeOperatingRulesVersions.id,
            versionNumber: committeeOperatingRulesVersions.versionNumber,
            version: committeeOperatingRulesVersions.version,
            effectiveDate: committeeOperatingRulesVersions.effectiveDate,
            changeDescription: committeeOperatingRulesVersions.changeDescription,
            createdBy: committeeOperatingRulesVersions.createdBy,
            createdAt: committeeOperatingRulesVersions.createdAt,
            creatorName: users.name,
          })
          .from(committeeOperatingRulesVersions)
          .leftJoin(users, eq(committeeOperatingRulesVersions.createdBy, users.id))
          .where(eq(committeeOperatingRulesVersions.operatingRuleId, input.operatingRuleId))
          .orderBy(desc(committeeOperatingRulesVersions.versionNumber));

        return versions;
      } catch (error) {
        console.error("Error listing versions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al listar el historial de versiones",
        });
      }
    }),

  /**
   * Obtener versión específica
   */
  getVersion: protectedProcedure
    .input(z.object({ versionId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      try {
        const [version] = await db
          .select()
          .from(committeeOperatingRulesVersions)
          .where(eq(committeeOperatingRulesVersions.id, input.versionId));

        if (!version) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Versión no encontrada",
          });
        }

        return version;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error getting version:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener la versión",
        });
      }
    }),

  /**
   * Restaurar versión anterior
   */
  restoreVersion: protectedProcedure
    .input(
      z.object({
        operatingRuleId: z.number(),
        versionId: z.number(),
        changeDescription: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      try {
        // Obtener la versión a restaurar
        const [versionToRestore] = await db
          .select()
          .from(committeeOperatingRulesVersions)
          .where(eq(committeeOperatingRulesVersions.id, input.versionId));

        if (!versionToRestore) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Versión no encontrada",
          });
        }

        // Obtener el número de versión actual más alto
        const versions = await db
          .select({ versionNumber: committeeOperatingRulesVersions.versionNumber })
          .from(committeeOperatingRulesVersions)
          .where(eq(committeeOperatingRulesVersions.operatingRuleId, input.operatingRuleId))
          .orderBy(desc(committeeOperatingRulesVersions.versionNumber))
          .limit(1);

        const nextVersionNumber = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

        // Actualizar la base de funcionamiento principal con los datos de la versión restaurada
        await db
          .update(committeeOperatingRules)
          .set({
            version: versionToRestore.version,
            effectiveDate: versionToRestore.effectiveDate,
            reviewDate: versionToRestore.reviewDate,
            nextReviewDate: versionToRestore.nextReviewDate,
            objectives: versionToRestore.objectives,
            structure: versionToRestore.structure,
            roles: versionToRestore.roles,
            meetingFrequency: versionToRestore.meetingFrequency,
            quorum: versionToRestore.quorum,
            decisionMaking: versionToRestore.decisionMaking,
            communication: versionToRestore.communication,
            caseHandling: versionToRestore.caseHandling,
            confidentiality: versionToRestore.confidentiality,
            amendments: versionToRestore.amendments,
            signatures: versionToRestore.signatures,
            updatedAt: new Date(),
          })
          .where(eq(committeeOperatingRules.id, input.operatingRuleId));

        // Crear nueva versión en el historial (restauración)
        await db.insert(committeeOperatingRulesVersions).values({
          operatingRuleId: input.operatingRuleId,
          versionNumber: nextVersionNumber,
          version: versionToRestore.version,
          objectives: versionToRestore.objectives,
          structure: versionToRestore.structure,
          roles: versionToRestore.roles,
          meetingFrequency: versionToRestore.meetingFrequency,
          quorum: versionToRestore.quorum,
          decisionMaking: versionToRestore.decisionMaking,
          communication: versionToRestore.communication,
          caseHandling: versionToRestore.caseHandling,
          confidentiality: versionToRestore.confidentiality,
          amendments: versionToRestore.amendments,
          signatures: versionToRestore.signatures,
          effectiveDate: versionToRestore.effectiveDate,
          reviewDate: versionToRestore.reviewDate,
          nextReviewDate: versionToRestore.nextReviewDate,
          changeDescription:
            input.changeDescription ||
            `Restauración de versión ${versionToRestore.versionNumber}`,
          createdBy: ctx.user.id,
        });

        return { success: true, versionNumber: nextVersionNumber };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error restoring version:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al restaurar la versión",
        });
      }
    }),

  /**
   * Comparar dos versiones
   */
  compareVersions: protectedProcedure
    .input(
      z.object({
        versionId1: z.number(),
        versionId2: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      try {
        const [version1] = await db
          .select()
          .from(committeeOperatingRulesVersions)
          .where(eq(committeeOperatingRulesVersions.id, input.versionId1));

        const [version2] = await db
          .select()
          .from(committeeOperatingRulesVersions)
          .where(eq(committeeOperatingRulesVersions.id, input.versionId2));

        if (!version1 || !version2) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Una o ambas versiones no fueron encontradas",
          });
        }

        // Comparar campos y retornar diferencias
        const differences = {
          version: version1.version !== version2.version,
          objectives: version1.objectives !== version2.objectives,
          structure: version1.structure !== version2.structure,
          roles: version1.roles !== version2.roles,
          meetingFrequency: version1.meetingFrequency !== version2.meetingFrequency,
          quorum: version1.quorum !== version2.quorum,
          decisionMaking: version1.decisionMaking !== version2.decisionMaking,
          communication: version1.communication !== version2.communication,
          caseHandling: version1.caseHandling !== version2.caseHandling,
          confidentiality: version1.confidentiality !== version2.confidentiality,
          amendments: version1.amendments !== version2.amendments,
          signatures: version1.signatures !== version2.signatures,
          effectiveDate: version1.effectiveDate !== version2.effectiveDate,
        };

        return {
          version1,
          version2,
          differences,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error comparing versions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al comparar versiones",
        });
      }
    }),

  /**
   * Aprobar base de funcionamiento
   */
  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      try {
        await db
          .update(committeeOperatingRules)
          .set({
            status: "active",
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(committeeOperatingRules.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("Error approving operating rules:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al aprobar las bases de funcionamiento",
        });
      }
    }),
});
