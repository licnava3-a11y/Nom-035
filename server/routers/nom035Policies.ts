import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { nom035Policies, nom035PolicyVersions } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateNom035PolicyPDF } from "../pdfGenerators/nom035Policy";
import { logPolicyEvidence } from "../helpers/evidenceLogger";
import { storagePut } from "../storage";

export const nom035PoliciesRouter = router({
  /**
   * List all policies
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const policies = await db
      .select()
      .from(nom035Policies)
      .orderBy(desc(nom035Policies.createdAt));
    
    return policies;
  }),

  /**
   * Get policy by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const policy = await db
        .select()
        .from(nom035Policies)
        .where(eq(nom035Policies.id, input.id))
        .limit(1);

      if (!policy || policy.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Política no encontrada",
        });
      }

      return policy[0];
    }),

  /**
   * Create new policy
   */
  create: protectedProcedure
    .input(
      z.object({
        nombre: z.string().min(1, "El nombre es requerido"),
        descripcion: z.string().min(1, "La descripción es requerida"),
        fechaPublicacion: z.string(),
        representanteLegalId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [result] = await db.insert(nom035Policies).values({
        nombre: input.nombre,
        descripcion: input.descripcion,
        fechaPublicacion: new Date(input.fechaPublicacion),
        representanteLegalId: input.representanteLegalId,
        createdBy: ctx.user.id,
        activo: true,
      });

      return {
        id: Number(result.insertId),
        success: true,
        message: "Política creada exitosamente",
      };
    }),

  /**
   * Update existing policy
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nombre: z.string().min(1, "El nombre es requerido"),
        descripcion: z.string().min(1, "La descripción es requerida"),
        fechaPublicacion: z.string(),
        representanteLegalId: z.number().optional(),
        activo: z.boolean().optional(),
        changeDescription: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get current policy data to save as version
      const [currentPolicy] = await db
        .select()
        .from(nom035Policies)
        .where(eq(nom035Policies.id, input.id))
        .limit(1);

      if (!currentPolicy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Política no encontrada",
        });
      }

      // Get next version number
      const versions = await db
        .select()
        .from(nom035PolicyVersions)
        .where(eq(nom035PolicyVersions.policyId, input.id));
      const nextVersionNumber = versions.length + 1;

      // Save current state as version
      await db.insert(nom035PolicyVersions).values({
        policyId: currentPolicy.id,
        versionNumber: nextVersionNumber,
        nombre: currentPolicy.nombre,
        descripcion: currentPolicy.descripcion,
        fechaPublicacion: currentPolicy.fechaPublicacion,
        representanteLegalId: currentPolicy.representanteLegalId,
        pdfUrl: currentPolicy.pdfUrl,
        changeDescription: input.changeDescription || `Actualización de política`,
        createdBy: ctx.user.id,
      });

      // Update policy
      await db
        .update(nom035Policies)
        .set({
          nombre: input.nombre,
          descripcion: input.descripcion,
          fechaPublicacion: new Date(input.fechaPublicacion),
          representanteLegalId: input.representanteLegalId,
          activo: input.activo,
        })
        .where(eq(nom035Policies.id, input.id));

      return {
        success: true,
        message: "Política actualizada exitosamente",
      };
    }),

  /**
   * Delete policy
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db
        .delete(nom035Policies)
        .where(eq(nom035Policies.id, input.id));

      return {
        success: true,
        message: "Política eliminada exitosamente",
      };
    }),

  /**
   * Generate PDF for policy
   */
  generatePDF: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const policy = await db
        .select()
        .from(nom035Policies)
        .where(eq(nom035Policies.id, input.id))
        .limit(1);

      if (!policy || policy.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Política no encontrada",
        });
      }

      const pdfUrl = await generateNom035PolicyPDF(policy[0]);

      // Update policy with PDF URL
      await db
        .update(nom035Policies)
        .set({ pdfUrl })
        .where(eq(nom035Policies.id, input.id));

      // Register evidence automatically
      await logPolicyEvidence(
        policy[0].id,
        policy[0].nombre,
        pdfUrl,
        `policies/${policy[0].id}.pdf`,
        ctx.user.id
      );

      return {
        success: true,
        pdfUrl,
        message: "PDF generado exitosamente",
      };
    }),

  /**
   * Upload PDF file for policy
   */
  uploadPolicyFile: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        fileBase64: z.string(),
        fileName: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Validar tipo de archivo
      if (!input.fileName.toLowerCase().endsWith('.pdf')) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo se permiten archivos PDF",
        });
      }

      // Validar tamaño (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB en bytes
      if (input.fileSize > maxSize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El archivo excede el tamaño máximo permitido de 10MB",
        });
      }

      // Verificar que la política existe
      const [policy] = await db
        .select()
        .from(nom035Policies)
        .where(eq(nom035Policies.id, input.id))
        .limit(1);

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Política no encontrada",
        });
      }

      // Convertir base64 a buffer
      const fileBuffer = Buffer.from(input.fileBase64, 'base64');

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileKey = `policies/policy-${input.id}-${timestamp}.pdf`;

      // Subir archivo a S3
      const { url: pdfUrl } = await storagePut(
        fileKey,
        fileBuffer,
        'application/pdf'
      );

      // Actualizar política con URL del PDF y nombre del archivo
      await db
        .update(nom035Policies)
        .set({
          pdfUrl,
          // Nota: Necesitaremos agregar campo uploadedFileName en schema
        })
        .where(eq(nom035Policies.id, input.id));

      // Registrar evidencia automáticamente
      await logPolicyEvidence(
        policy.id,
        policy.nombre,
        pdfUrl,
        fileKey,
        ctx.user.id
      );

      return {
        success: true,
        pdfUrl,
        message: "Archivo PDF cargado exitosamente",
      };
    }),

  /**
   * Get policy version history
   */
  getPolicyVersions: protectedProcedure
    .input(z.object({ policyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const versions = await db
        .select()
        .from(nom035PolicyVersions)
        .where(eq(nom035PolicyVersions.policyId, input.policyId))
        .orderBy(desc(nom035PolicyVersions.versionNumber));

      return versions;
    }),

  /**
   * Restore policy to a previous version
   */
  restorePolicyVersion: protectedProcedure
    .input(z.object({ versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get version data
      const [version] = await db
        .select()
        .from(nom035PolicyVersions)
        .where(eq(nom035PolicyVersions.id, input.versionId))
        .limit(1);

      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Versión no encontrada",
        });
      }

      // Get current policy to save as new version
      const [currentPolicy] = await db
        .select()
        .from(nom035Policies)
        .where(eq(nom035Policies.id, version.policyId))
        .limit(1);

      if (!currentPolicy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Política no encontrada",
        });
      }

      // Get next version number
      const versions = await db
        .select()
        .from(nom035PolicyVersions)
        .where(eq(nom035PolicyVersions.policyId, version.policyId));
      const nextVersionNumber = versions.length + 1;

      // Save current state as new version
      await db.insert(nom035PolicyVersions).values({
        policyId: currentPolicy.id,
        versionNumber: nextVersionNumber,
        nombre: currentPolicy.nombre,
        descripcion: currentPolicy.descripcion,
        fechaPublicacion: currentPolicy.fechaPublicacion,
        representanteLegalId: currentPolicy.representanteLegalId,
        pdfUrl: currentPolicy.pdfUrl,
        changeDescription: `Restauración desde versión ${version.versionNumber}`,
        createdBy: ctx.user.id,
      });

      // Restore version data to main policy
      await db
        .update(nom035Policies)
        .set({
          nombre: version.nombre,
          descripcion: version.descripcion,
          fechaPublicacion: version.fechaPublicacion,
          representanteLegalId: version.representanteLegalId,
          pdfUrl: version.pdfUrl,
        })
        .where(eq(nom035Policies.id, version.policyId));

      return {
        success: true,
        message: `Política restaurada a versión ${version.versionNumber}`,
      };
    }),
});
