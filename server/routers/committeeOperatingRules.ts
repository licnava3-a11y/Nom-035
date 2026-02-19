import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  committeeOperatingRules, 
  committeeOperatingRulesVersions,
  operatingRulesApprovals,
  users 
} from "../../drizzle/schema";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateOperatingRulesPDF } from "../utils/generateOperatingRulesPDF";
import { notifyOperatingRulesChanges } from "../utils/notifyOperatingRulesChanges";

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

        // Notificar a miembros del comité
        await notifyOperatingRulesChanges({
          operatingRuleId: ruleId,
          version: input.version,
          changeType: "created",
          changedBy: ctx.user.id,
          changedByName: ctx.user.name,
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

        // Notificar a miembros del comité
        await notifyOperatingRulesChanges({
          operatingRuleId: input.id,
          version: input.version,
          changeType: "updated",
          changeDescription: input.changeDescription,
          changedBy: ctx.user.id,
          changedByName: ctx.user.name,
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

        // Notificar a miembros del comité
        await notifyOperatingRulesChanges({
          operatingRuleId: input.operatingRuleId,
          version: versionToRestore.version,
          changeType: "restored",
          changeDescription: input.changeDescription,
          changedBy: ctx.user.id,
          changedByName: ctx.user.name,
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

        // Obtener información de la base de funcionamiento para notificación
        const [rule] = await db
          .select({ version: committeeOperatingRules.version })
          .from(committeeOperatingRules)
          .where(eq(committeeOperatingRules.id, input.id))
          .limit(1);

        if (rule) {
          // Notificar a miembros del comité
          await notifyOperatingRulesChanges({
            operatingRuleId: input.id,
            version: rule.version,
            changeType: "approved",
            changedBy: ctx.user.id,
            changedByName: ctx.user.name,
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Error approving operating rules:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al aprobar las bases de funcionamiento",
        });
      }
    }),

  /**
   * Generar PDF de base de funcionamiento
   */
  generatePDF: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      try {
        // Obtener la base de funcionamiento con información del creador y aprobador
        const [rule] = await db
          .select({
            id: committeeOperatingRules.id,
            version: committeeOperatingRules.version,
            effectiveDate: committeeOperatingRules.effectiveDate,
            reviewDate: committeeOperatingRules.reviewDate,
            nextReviewDate: committeeOperatingRules.nextReviewDate,
            objectives: committeeOperatingRules.objectives,
            structure: committeeOperatingRules.structure,
            roles: committeeOperatingRules.roles,
            meetingFrequency: committeeOperatingRules.meetingFrequency,
            quorum: committeeOperatingRules.quorum,
            decisionMaking: committeeOperatingRules.decisionMaking,
            communication: committeeOperatingRules.communication,
            caseHandling: committeeOperatingRules.caseHandling,
            confidentiality: committeeOperatingRules.confidentiality,
            amendments: committeeOperatingRules.amendments,
            signatures: committeeOperatingRules.signatures,
            status: committeeOperatingRules.status,
            createdAt: committeeOperatingRules.createdAt,
            createdBy: committeeOperatingRules.createdBy,
            approvedAt: committeeOperatingRules.approvedAt,
            approvedBy: committeeOperatingRules.approvedBy,
            creatorName: sql<string>`creator.name`,
            approverName: sql<string>`approver.name`,
          })
          .from(committeeOperatingRules)
          .leftJoin(
            sql`${users} as creator`,
            eq(committeeOperatingRules.createdBy, sql`creator.id`)
          )
          .leftJoin(
            sql`${users} as approver`,
            eq(committeeOperatingRules.approvedBy, sql`approver.id`)
          )
          .where(eq(committeeOperatingRules.id, input.id))
          .limit(1);

        if (!rule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Base de funcionamiento no encontrada",
          });
        }

        // Obtener número de versión actual
        const [latestVersion] = await db
          .select({ versionNumber: committeeOperatingRulesVersions.versionNumber })
          .from(committeeOperatingRulesVersions)
          .where(eq(committeeOperatingRulesVersions.operatingRuleId, input.id))
          .orderBy(desc(committeeOperatingRulesVersions.versionNumber))
          .limit(1);

        // Obtener firmas digitales aprobadas
        const digitalSignatures = await db
          .select({
            approverName: users.name,
            approverRole: operatingRulesApprovals.approverRole,
            approverRoleDescription: operatingRulesApprovals.approverRoleDescription,
            signatureData: operatingRulesApprovals.signatureData,
            signedAt: operatingRulesApprovals.signedAt,
            comments: operatingRulesApprovals.comments,
          })
          .from(operatingRulesApprovals)
          .innerJoin(users, eq(operatingRulesApprovals.approverId, users.id))
          .where(
            and(
              eq(operatingRulesApprovals.operatingRuleId, input.id),
              eq(operatingRulesApprovals.status, "signed")
            )
          )
          .orderBy(operatingRulesApprovals.approvalOrder);

        // Generar PDF
        const pdfBuffer = await generateOperatingRulesPDF({
          ...rule,
          versionNumber: latestVersion?.versionNumber,
          digitalSignatures: digitalSignatures.map((sig) => ({
            approverName: sig.approverName,
            approverRole: sig.approverRole,
            approverRoleDescription: sig.approverRoleDescription || undefined,
            signatureData: sig.signatureData || "",
            signedAt: sig.signedAt || new Date(),
            comments: sig.comments || undefined,
          })),
        });

        // Convertir buffer a base64 para enviar al cliente
        const pdfBase64 = pdfBuffer.toString("base64");

        return {
          success: true,
          pdfBase64,
          filename: `Bases_Funcionamiento_${rule.version}_${new Date().toISOString().split("T")[0]}.pdf`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error generating PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al generar el PDF",
        });
      }
    }),

  /**
   * Solicitar aprobaciones para una base de funcionamiento
   */
  requestApprovals: protectedProcedure
    .input(
      z.object({
        operatingRuleId: z.number(),
        approvers: z.array(
          z.object({
            approverId: z.number(),
            approverRole: z.enum(["president", "secretary", "vocal", "other"]),
            approverRoleDescription: z.string().optional(),
            approvalOrder: z.number().default(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      try {
        // Verificar que la base de funcionamiento existe
        const [rule] = await db
          .select({ id: committeeOperatingRules.id })
          .from(committeeOperatingRules)
          .where(eq(committeeOperatingRules.id, input.operatingRuleId))
          .limit(1);

        if (!rule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Base de funcionamiento no encontrada",
          });
        }

        // Eliminar aprobaciones pendientes anteriores (si existen)
        await db
          .delete(operatingRulesApprovals)
          .where(
            and(
              eq(operatingRulesApprovals.operatingRuleId, input.operatingRuleId),
              eq(operatingRulesApprovals.status, "pending")
            )
          );

        // Crear nuevas solicitudes de aprobación
        const approvalPromises = input.approvers.map((approver) =>
          db.insert(operatingRulesApprovals).values({
            operatingRuleId: input.operatingRuleId,
            approverId: approver.approverId,
            approverRole: approver.approverRole,
            approverRoleDescription: approver.approverRoleDescription,
            approvalOrder: approver.approvalOrder,
            status: "pending",
          })
        );

        await Promise.all(approvalPromises);

        // TODO: Enviar notificaciones a los aprobadores

        return { success: true, approversCount: input.approvers.length };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error requesting approvals:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al solicitar aprobaciones",
        });
      }
    }),

  /**
   * Firmar aprobación (firma digital)
   */
  signApproval: protectedProcedure
    .input(
      z.object({
        approvalId: z.number(),
        signatureData: z.string(), // Base64 de la firma
        signatureMethod: z.enum(["digital_pad", "uploaded", "certificate"]).default("digital_pad"),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      try {
        // Verificar que la aprobación existe y pertenece al usuario
        const [approval] = await db
          .select()
          .from(operatingRulesApprovals)
          .where(eq(operatingRulesApprovals.id, input.approvalId))
          .limit(1);

        if (!approval) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aprobación no encontrada",
          });
        }

        if (approval.approverId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tiene permiso para firmar esta aprobación",
          });
        }

        if (approval.status === "signed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta aprobación ya ha sido firmada",
          });
        }

        // Actualizar la aprobación con la firma
        await db
          .update(operatingRulesApprovals)
          .set({
            status: "signed",
            signatureData: input.signatureData,
            signatureMethod: input.signatureMethod,
            comments: input.comments,
            signedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(operatingRulesApprovals.id, input.approvalId));

        // Verificar si todas las aprobaciones están completas
        const allApprovals = await db
          .select()
          .from(operatingRulesApprovals)
          .where(eq(operatingRulesApprovals.operatingRuleId, approval.operatingRuleId));

        const allSigned = allApprovals.every((a) => a.status === "signed");

        // Si todas las aprobaciones están firmadas, aprobar automáticamente
        if (allSigned) {
          await db
            .update(committeeOperatingRules)
            .set({
              status: "active",
              approvedBy: ctx.user.id,
              approvedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(committeeOperatingRules.id, approval.operatingRuleId));

          // Obtener información para notificación
          const [rule] = await db
            .select({ version: committeeOperatingRules.version })
            .from(committeeOperatingRules)
            .where(eq(committeeOperatingRules.id, approval.operatingRuleId))
            .limit(1);

          if (rule) {
            await notifyOperatingRulesChanges({
              operatingRuleId: approval.operatingRuleId,
              version: rule.version,
              changeType: "approved",
              changedBy: ctx.user.id,
              changedByName: ctx.user.name,
            });
          }
        }

        return { success: true, allApproved: allSigned };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error signing approval:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al firmar aprobación",
        });
      }
    }),

  /**
   * Obtener estado de aprobaciones de una base de funcionamiento
   */
  getApprovalStatus: protectedProcedure
    .input(z.object({ operatingRuleId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();

      try {
        const approvals = await db
          .select({
            id: operatingRulesApprovals.id,
            approverId: operatingRulesApprovals.approverId,
            approverName: users.name,
            approverRole: operatingRulesApprovals.approverRole,
            approverRoleDescription: operatingRulesApprovals.approverRoleDescription,
            status: operatingRulesApprovals.status,
            signatureData: operatingRulesApprovals.signatureData,
            signatureMethod: operatingRulesApprovals.signatureMethod,
            comments: operatingRulesApprovals.comments,
            signedAt: operatingRulesApprovals.signedAt,
            approvalOrder: operatingRulesApprovals.approvalOrder,
            createdAt: operatingRulesApprovals.createdAt,
          })
          .from(operatingRulesApprovals)
          .leftJoin(users, eq(operatingRulesApprovals.approverId, users.id))
          .where(eq(operatingRulesApprovals.operatingRuleId, input.operatingRuleId))
          .orderBy(operatingRulesApprovals.approvalOrder);

        const totalApprovals = approvals.length;
        const signedApprovals = approvals.filter((a) => a.status === "signed").length;
        const pendingApprovals = approvals.filter((a) => a.status === "pending").length;
        const rejectedApprovals = approvals.filter((a) => a.status === "rejected").length;

        return {
          approvals,
          summary: {
            total: totalApprovals,
            signed: signedApprovals,
            pending: pendingApprovals,
            rejected: rejectedApprovals,
            allApproved: totalApprovals > 0 && signedApprovals === totalApprovals,
          },
        };
      } catch (error) {
        console.error("Error getting approval status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener estado de aprobaciones",
        });
      }
    }),

  /**
   * Obtener aprobaciones pendientes del usuario actual
   */
  getMyPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();

    try {
      const pendingApprovals = await db
        .select({
          id: operatingRulesApprovals.id,
          operatingRuleId: operatingRulesApprovals.operatingRuleId,
          operatingRuleVersion: committeeOperatingRules.version,
          approverRole: operatingRulesApprovals.approverRole,
          approverRoleDescription: operatingRulesApprovals.approverRoleDescription,
          approvalOrder: operatingRulesApprovals.approvalOrder,
          createdAt: operatingRulesApprovals.createdAt,
        })
        .from(operatingRulesApprovals)
        .leftJoin(
          committeeOperatingRules,
          eq(operatingRulesApprovals.operatingRuleId, committeeOperatingRules.id)
        )
        .where(
          and(
            eq(operatingRulesApprovals.approverId, ctx.user.id),
            eq(operatingRulesApprovals.status, "pending")
          )
        )
        .orderBy(operatingRulesApprovals.createdAt);

      return pendingApprovals;
    } catch (error) {
      console.error("Error getting pending approvals:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener aprobaciones pendientes",
      });
    }
  }),

  /**
   * Rechazar aprobación con motivo
   */
  rejectApproval: protectedProcedure
    .input(
      z.object({
        approvalId: z.number(),
        rejectionReason: z.string().min(10, "El motivo de rechazo debe tener al menos 10 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      try {
        // Obtener la aprobación
        const [approval] = await db
          .select()
          .from(operatingRulesApprovals)
          .where(eq(operatingRulesApprovals.id, input.approvalId))
          .limit(1);

        if (!approval) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aprobación no encontrada",
          });
        }

        // Verificar que el usuario actual es el aprobador
        if (approval.approverId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para rechazar esta aprobación",
          });
        }

        // Verificar que la aprobación está pendiente
        if (approval.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta aprobación ya fue procesada",
          });
        }

        // Actualizar estado de la aprobación a rechazada
        await db
          .update(operatingRulesApprovals)
          .set({
            status: "rejected",
            rejectionReason: input.rejectionReason,
            rejectedAt: new Date(),
          })
          .where(eq(operatingRulesApprovals.id, input.approvalId));

        // Regresar la base de funcionamiento a estado draft
        await db
          .update(committeeOperatingRules)
          .set({
            status: "draft",
          })
          .where(eq(committeeOperatingRules.id, approval.operatingRuleId));

        // Cancelar todas las demás aprobaciones pendientes
        await db
          .update(operatingRulesApprovals)
          .set({
            status: "rejected",
            rejectionReason: "Cancelada debido a rechazo de otro aprobador",
            rejectedAt: new Date(),
          })
          .where(
            and(
              eq(operatingRulesApprovals.operatingRuleId, approval.operatingRuleId),
              eq(operatingRulesApprovals.status, "pending"),
              sql`${operatingRulesApprovals.id} != ${input.approvalId}`
            )
          );

        // Obtener información de la base de funcionamiento y creador
        const [rule] = await db
          .select({
            id: committeeOperatingRules.id,
            version: committeeOperatingRules.version,
            createdBy: committeeOperatingRules.createdBy,
            creatorName: users.name,
            creatorEmail: users.email,
          })
          .from(committeeOperatingRules)
          .leftJoin(users, eq(committeeOperatingRules.createdBy, users.id))
          .where(eq(committeeOperatingRules.id, approval.operatingRuleId))
          .limit(1);

        // Enviar notificación al creador
        if (rule) {
          await notifyOperatingRulesChanges({
            type: "rejected",
            operatingRuleId: rule.id,
            operatingRuleVersion: rule.version,
            rejectedBy: ctx.user.name || "Usuario",
            rejectionReason: input.rejectionReason,
            creatorEmail: rule.creatorEmail || undefined,
          });
        }

        return {
          success: true,
          message: "Aprobación rechazada correctamente. La base de funcionamiento ha regresado a estado borrador.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error rejecting approval:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al rechazar la aprobación",
        });
      }
    }),

  /**
   * Obtener historial de auditoría de firmas
   */
  getSignatureAuditLog: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        userId: z.number().optional(),
        operatingRuleId: z.number().optional(),
        role: z.enum(["president", "secretary", "vocal", "other"]).optional(),
        status: z.enum(["pending", "signed", "rejected"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      try {
        // Construir condiciones de filtro
        const conditions = [];

        if (input.dateFrom) {
          conditions.push(sql`${operatingRulesApprovals.createdAt} >= ${input.dateFrom}`);
        }

        if (input.dateTo) {
          conditions.push(sql`${operatingRulesApprovals.createdAt} <= ${input.dateTo}`);
        }

        if (input.userId) {
          conditions.push(eq(operatingRulesApprovals.approverId, input.userId));
        }

        if (input.operatingRuleId) {
          conditions.push(eq(operatingRulesApprovals.operatingRuleId, input.operatingRuleId));
        }

        if (input.role) {
          conditions.push(eq(operatingRulesApprovals.approverRole, input.role));
        }

        if (input.status) {
          conditions.push(eq(operatingRulesApprovals.status, input.status));
        }

        // Obtener total de registros
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(operatingRulesApprovals)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = Number(countResult?.count || 0);

        // Obtener registros con paginación
        const auditLog = await db
          .select({
            id: operatingRulesApprovals.id,
            operatingRuleId: operatingRulesApprovals.operatingRuleId,
            operatingRuleVersion: committeeOperatingRules.version,
            approverId: operatingRulesApprovals.approverId,
            approverName: users.name,
            approverEmail: users.email,
            approverRole: operatingRulesApprovals.approverRole,
            approverRoleDescription: operatingRulesApprovals.approverRoleDescription,
            status: operatingRulesApprovals.status,
            comments: operatingRulesApprovals.comments,
            rejectionReason: operatingRulesApprovals.rejectionReason,
            signedAt: operatingRulesApprovals.signedAt,
            rejectedAt: operatingRulesApprovals.rejectedAt,
            createdAt: operatingRulesApprovals.createdAt,
          })
          .from(operatingRulesApprovals)
          .leftJoin(users, eq(operatingRulesApprovals.approverId, users.id))
          .leftJoin(committeeOperatingRules, eq(operatingRulesApprovals.operatingRuleId, committeeOperatingRules.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(sql`${operatingRulesApprovals.createdAt} DESC`)
          .limit(input.limit)
          .offset(input.offset);

        return {
          data: auditLog,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Error getting signature audit log:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener historial de auditoría",
        });
      }
    }),

  // Obtener métricas de aprobaciones
  getApprovalMetrics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["month", "quarter", "year"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Calcular fecha de inicio según período
        const now = new Date();
        let startDate: Date;
        
        if (input.period === "month") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (input.period === "quarter") {
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
        } else {
          startDate = new Date(now.getFullYear(), 0, 1);
        }

        // Total de aprobaciones en el período
        const [totalApprovalsResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(operatingRulesApprovals)
          .where(sql`${operatingRulesApprovals.createdAt} >= ${startDate}`);

        const totalApprovals = Number(totalApprovalsResult?.count || 0);

        // Aprobaciones por estado
        const approvalsByStatus = await db
          .select({
            status: operatingRulesApprovals.status,
            count: sql<number>`count(*)`
          })
          .from(operatingRulesApprovals)
          .where(sql`${operatingRulesApprovals.createdAt} >= ${startDate}`)
          .groupBy(operatingRulesApprovals.status);

        const approved = approvalsByStatus.find(s => s.status === "approved")?.count || 0;
        const rejected = approvalsByStatus.find(s => s.status === "rejected")?.count || 0;
        const pending = approvalsByStatus.find(s => s.status === "pending")?.count || 0;

        // Tasa de rechazo
        const rejectionRate = totalApprovals > 0 ? (Number(rejected) / totalApprovals) * 100 : 0;

        // Tiempo promedio de aprobación (en días)
        const [avgTimeResult] = await db
          .select({
            avgDays: sql<number>`AVG(TIMESTAMPDIFF(DAY, ${operatingRulesApprovals.createdAt}, ${operatingRulesApprovals.signedAt}))`
          })
          .from(operatingRulesApprovals)
          .where(
            and(
              sql`${operatingRulesApprovals.createdAt} >= ${startDate}`,
              eq(operatingRulesApprovals.status, "approved")
            )
          );

        const avgApprovalTime = Number(avgTimeResult?.avgDays || 0);

        // Aprobadores más activos (top 5)
        const topApprovers = await db
          .select({
            approverId: operatingRulesApprovals.approverId,
            approverName: users.name,
            approverEmail: users.email,
            totalApprovals: sql<number>`count(*)`
          })
          .from(operatingRulesApprovals)
          .leftJoin(users, eq(operatingRulesApprovals.approverId, users.id))
          .where(
            and(
              sql`${operatingRulesApprovals.createdAt} >= ${startDate}`,
              eq(operatingRulesApprovals.status, "approved")
            )
          )
          .groupBy(operatingRulesApprovals.approverId, users.name, users.email)
          .orderBy(sql`count(*) DESC`)
          .limit(5);

        // Aprobaciones por mes (últimos 6 meses)
        const approvalsByMonth = await db
          .select({
            month: sql<string>`DATE_FORMAT(${operatingRulesApprovals.createdAt}, '%Y-%m')`,
            approved: sql<number>`SUM(CASE WHEN ${operatingRulesApprovals.status} = 'approved' THEN 1 ELSE 0 END)`,
            rejected: sql<number>`SUM(CASE WHEN ${operatingRulesApprovals.status} = 'rejected' THEN 1 ELSE 0 END)`,
            pending: sql<number>`SUM(CASE WHEN ${operatingRulesApprovals.status} = 'pending' THEN 1 ELSE 0 END)`
          })
          .from(operatingRulesApprovals)
          .where(sql`${operatingRulesApprovals.createdAt} >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`)
          .groupBy(sql`DATE_FORMAT(${operatingRulesApprovals.createdAt}, '%Y-%m')`)
          .orderBy(sql`DATE_FORMAT(${operatingRulesApprovals.createdAt}, '%Y-%m')`);

        return {
          summary: {
            totalApprovals,
            approved: Number(approved),
            rejected: Number(rejected),
            pending: Number(pending),
            rejectionRate: Math.round(rejectionRate * 100) / 100,
            avgApprovalTime: Math.round(avgApprovalTime * 100) / 100,
          },
          topApprovers: topApprovers.map(a => ({
            approverId: a.approverId,
            approverName: a.approverName || "Desconocido",
            approverEmail: a.approverEmail || "",
            totalApprovals: Number(a.totalApprovals)
          })),
          approvalsByMonth: approvalsByMonth.map(m => ({
            month: m.month,
            approved: Number(m.approved),
            rejected: Number(m.rejected),
            pending: Number(m.pending)
          }))
        };
      } catch (error) {
        console.error("Error getting approval metrics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener métricas de aprobaciones",
        });
      }
    }),

  // Obtener historial completo de eventos de una base de funcionamiento
  getOperatingRulesHistory: protectedProcedure
    .input(z.object({
      operatingRuleId: z.number(),
      eventTypes: z.array(z.enum(["created", "updated", "approved", "rejected", "restored"])).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      userId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const { operatingRuleId, eventTypes, startDate, endDate, userId, limit, offset } = input;

        // Obtener eventos de versiones (creación, actualización, restauración)
        const versionEvents = await db
          .select({
            id: committeeOperatingRulesVersions.id,
            eventType: sql<string>`CASE 
              WHEN ${committeeOperatingRulesVersions.versionNumber} = 1 THEN 'created'
              WHEN ${committeeOperatingRulesVersions.changeDescription} LIKE '%Restaurada%' THEN 'restored'
              ELSE 'updated'
            END`,
            eventDate: committeeOperatingRulesVersions.createdAt,
            userId: committeeOperatingRulesVersions.createdBy,
            userName: users.name,
            userEmail: users.email,
            description: committeeOperatingRulesVersions.changeDescription,
            versionNumber: committeeOperatingRulesVersions.versionNumber,
            metadata: sql<string>`JSON_OBJECT(
              'versionId', ${committeeOperatingRulesVersions.id},
              'versionNumber', ${committeeOperatingRulesVersions.versionNumber},
              'title', ${committeeOperatingRulesVersions.title}
            )`
          })
          .from(committeeOperatingRulesVersions)
          .leftJoin(users, eq(committeeOperatingRulesVersions.createdBy, users.id))
          .where(
            and(
              eq(committeeOperatingRulesVersions.operatingRuleId, operatingRuleId),
              startDate ? sql`${committeeOperatingRulesVersions.createdAt} >= ${startDate}` : undefined,
              endDate ? sql`${committeeOperatingRulesVersions.createdAt} <= ${endDate}` : undefined,
              userId ? eq(committeeOperatingRulesVersions.createdBy, userId) : undefined
            )
          );

        // Obtener eventos de aprobaciones (aprobación, rechazo)
        const approvalEvents = await db
          .select({
            id: operatingRulesApprovals.id,
            eventType: sql<string>`CASE 
              WHEN ${operatingRulesApprovals.status} = 'approved' THEN 'approved'
              WHEN ${operatingRulesApprovals.status} = 'rejected' THEN 'rejected'
              ELSE 'pending'
            END`,
            eventDate: sql<Date>`COALESCE(${operatingRulesApprovals.signedAt}, ${operatingRulesApprovals.rejectedAt}, ${operatingRulesApprovals.createdAt})`,
            userId: operatingRulesApprovals.approverId,
            userName: users.name,
            userEmail: users.email,
            description: sql<string>`CASE 
              WHEN ${operatingRulesApprovals.status} = 'approved' THEN CONCAT('Aprobación firmada como ', ${operatingRulesApprovals.role})
              WHEN ${operatingRulesApprovals.status} = 'rejected' THEN CONCAT('Aprobación rechazada: ', ${operatingRulesApprovals.rejectionReason})
              ELSE 'Aprobación solicitada'
            END`,
            versionNumber: sql<number>`NULL`,
            metadata: sql<string>`JSON_OBJECT(
              'approvalId', ${operatingRulesApprovals.id},
              'role', ${operatingRulesApprovals.role},
              'roleDescription', ${operatingRulesApprovals.roleDescription},
              'status', ${operatingRulesApprovals.status},
              'comments', ${operatingRulesApprovals.comments}
            )`
          })
          .from(operatingRulesApprovals)
          .leftJoin(users, eq(operatingRulesApprovals.approverId, users.id))
          .where(
            and(
              eq(operatingRulesApprovals.operatingRuleId, operatingRuleId),
              sql`${operatingRulesApprovals.status} IN ('approved', 'rejected')`,
              startDate ? sql`COALESCE(${operatingRulesApprovals.signedAt}, ${operatingRulesApprovals.rejectedAt}, ${operatingRulesApprovals.createdAt}) >= ${startDate}` : undefined,
              endDate ? sql`COALESCE(${operatingRulesApprovals.signedAt}, ${operatingRulesApprovals.rejectedAt}, ${operatingRulesApprovals.createdAt}) <= ${endDate}` : undefined,
              userId ? eq(operatingRulesApprovals.approverId, userId) : undefined
            )
          );

        // Unificar eventos
        const allEvents = [
          ...versionEvents.map(e => ({
            ...e,
            metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata
          })),
          ...approvalEvents.map(e => ({
            ...e,
            metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata
          }))
        ];

        // Filtrar por tipo de evento si se especifica
        let filteredEvents = allEvents;
        if (eventTypes && eventTypes.length > 0) {
          filteredEvents = allEvents.filter(e => eventTypes.includes(e.eventType as any));
        }

        // Ordenar por fecha (más reciente primero)
        filteredEvents.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

        // Aplicar paginación
        const totalEvents = filteredEvents.length;
        const paginatedEvents = filteredEvents.slice(offset, offset + limit);

        return {
          events: paginatedEvents,
          total: totalEvents,
          hasMore: offset + limit < totalEvents
        };
      } catch (error) {
        console.error("Error getting operating rules history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener historial de cambios",
        });
      }
    }),

  /**
   * Búsqueda global de bases de funcionamiento
   */
  searchOperatingRules: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, "El término de búsqueda es requerido"),
        status: z.enum(["all", "draft", "active"]).optional().default("all"),
        dateFrom: z.string().optional(), // YYYY-MM-DD
        dateTo: z.string().optional(), // YYYY-MM-DD
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const { query, status, dateFrom, dateTo, limit, offset } = input;
      const db = await getDb();

      try {
        // Buscar en bases de funcionamiento
        const searchPattern = `%${query}%`;
        
        // Construir condiciones de filtro
        const conditions = [
          or(
            like(committeeOperatingRules.title, searchPattern),
            like(committeeOperatingRules.objectives, searchPattern),
            like(committeeOperatingRules.structure, searchPattern),
            like(committeeOperatingRules.roles, searchPattern),
            like(committeeOperatingRules.members, searchPattern)
          )
        ];
        
        // Filtro por estado
        if (status !== "all") {
          conditions.push(eq(committeeOperatingRules.status, status));
        }
        
        // Filtro por rango de fechas
        if (dateFrom) {
          conditions.push(sql`${committeeOperatingRules.updatedAt} >= ${dateFrom}`);
        }
        if (dateTo) {
          conditions.push(sql`${committeeOperatingRules.updatedAt} <= ${dateTo}`);
        }
        
        const results = await db
          .select({
            id: committeeOperatingRules.id,
            title: committeeOperatingRules.title,
            version: committeeOperatingRules.version,
            status: committeeOperatingRules.status,
            objectives: committeeOperatingRules.objectives,
            structure: committeeOperatingRules.structure,
            roles: committeeOperatingRules.roles,
            members: committeeOperatingRules.members,
            createdAt: committeeOperatingRules.createdAt,
            updatedAt: committeeOperatingRules.updatedAt,
          })
          .from(committeeOperatingRules)
          .where(and(...conditions))
          .orderBy(desc(committeeOperatingRules.updatedAt));

        // Calcular relevancia (coincidencias exactas primero)
        const resultsWithRelevance = results.map(result => {
          let relevance = 0;
          const lowerQuery = query.toLowerCase();
          
          if (result.title?.toLowerCase().includes(lowerQuery)) relevance += 10;
          if (result.objectives?.toLowerCase().includes(lowerQuery)) relevance += 5;
          if (result.structure?.toLowerCase().includes(lowerQuery)) relevance += 3;
          if (result.roles?.toLowerCase().includes(lowerQuery)) relevance += 3;
          if (result.members?.toLowerCase().includes(lowerQuery)) relevance += 2;

          // Extraer fragmento de contexto
          let snippet = "";
          if (result.title?.toLowerCase().includes(lowerQuery)) {
            snippet = result.title;
          } else if (result.objectives?.toLowerCase().includes(lowerQuery)) {
            const index = result.objectives.toLowerCase().indexOf(lowerQuery);
            const start = Math.max(0, index - 50);
            const end = Math.min(result.objectives.length, index + query.length + 50);
            snippet = (start > 0 ? "..." : "") + result.objectives.substring(start, end) + (end < result.objectives.length ? "..." : "");
          } else if (result.structure?.toLowerCase().includes(lowerQuery)) {
            const index = result.structure.toLowerCase().indexOf(lowerQuery);
            const start = Math.max(0, index - 50);
            const end = Math.min(result.structure.length, index + query.length + 50);
            snippet = (start > 0 ? "..." : "") + result.structure.substring(start, end) + (end < result.structure.length ? "..." : "");
          } else if (result.roles?.toLowerCase().includes(lowerQuery)) {
            const index = result.roles.toLowerCase().indexOf(lowerQuery);
            const start = Math.max(0, index - 50);
            const end = Math.min(result.roles.length, index + query.length + 50);
            snippet = (start > 0 ? "..." : "") + result.roles.substring(start, end) + (end < result.roles.length ? "..." : "");
          }

          return {
            ...result,
            relevance,
            snippet,
          };
        });

        // Ordenar por relevancia
        resultsWithRelevance.sort((a, b) => b.relevance - a.relevance);

        // Paginar
        const total = resultsWithRelevance.length;
        const paginatedResults = resultsWithRelevance.slice(offset, offset + limit);

        return {
          results: paginatedResults,
          total,
          hasMore: offset + limit < total,
        };
      } catch (error) {
        console.error("Error searching operating rules:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al buscar bases de funcionamiento",
        });
      }
    }),
});
