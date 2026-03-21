import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { employeeDocuments } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

export const employeeDocumentsRouter = router({
  /**
   * Upload a new document for an employee
   */
  upload: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        documentType: z.enum([
          "ine",
          "curp_document",
          "rfc_document",
          "nss_document",
          "birth_certificate",
          "proof_of_address",
          "contract",
          "job_offer",
          "resignation",
          "termination",
          "recommendation",
          "diploma",
          "certificate",
          "medical_exam",
          "background_check",
          "other",
        ]),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        mimeType: z.string(),
        notes: z.string().optional(),
        expiresAt: z.string().optional(), // ISO date string
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Decode base64 file data
      const fileBuffer = Buffer.from(input.fileData, "base64");
      const fileSize = fileBuffer.length;

      // Generate unique file key for S3
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileExtension = input.fileName.split(".").pop();
      const fileKey = `employee-documents/${input.employeeId}/${timestamp}-${randomSuffix}.${fileExtension}`;

      // Upload to S3
      const { url: fileUrl } = await storagePut(fileKey, fileBuffer, input.mimeType);

      // Calculate status based on expiration date
      let status: "vigente" | "por_vencer" | "vencido" = "vigente";
      if (input.expiresAt) {
        const expiresDate = new Date(input.expiresAt);
        const today = new Date();
        const daysUntilExpiration = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiration < 0) {
          status = "vencido";
        } else if (daysUntilExpiration <= 30) {
          status = "por_vencer";
        }
      }

      // Save document metadata to database
      const [document] = await (db.insert(employeeDocuments) as any).values({
        employeeId: input.employeeId,
        documentType: input.documentType,
        fileName: input.fileName,
        fileUrl,
        fileKey,
        fileSize,
        mimeType: input.mimeType,
        uploadedBy: ctx.user.id,
        notes: input.notes,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        status,
      });

      return { success: true, documentId: document.insertId };
    }),

  /**
   * List all documents for an employee
   */
  list: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        documentType: z
          .enum([
            "ine",
            "curp_document",
            "rfc_document",
            "nss_document",
            "birth_certificate",
            "proof_of_address",
            "contract",
            "job_offer",
            "resignation",
            "termination",
            "recommendation",
            "diploma",
            "certificate",
            "medical_exam",
            "background_check",
            "other",
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const conditions = [eq(employeeDocuments.employeeId, input.employeeId)];
      if (input.documentType) {
        conditions.push(eq(employeeDocuments.documentType, input.documentType));
      }

      const documents = await db
        .select()
        .from(employeeDocuments)
        .where(and(...conditions))
        .orderBy(desc(employeeDocuments.createdAt));

      return documents;
    }),

  /**
   * Delete a document
   */
  delete: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Verify document exists
      const [document] = await db
        .select()
        .from(employeeDocuments)
        .where(eq(employeeDocuments.id, input.documentId))
        .limit(1);

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Documento no encontrado",
        });
      }

      // Delete from S3
      if (document.fileKey) {
        try {
          const storage = await import("../storage");
          await storage.storageDelete(document.fileKey);
        } catch (error) {
          console.error("Error deleting file from S3:", error);
          // Continue with database deletion even if S3 deletion fails
        }
      }

      // Delete from database
      await db.delete(employeeDocuments).where(eq(employeeDocuments.id, input.documentId));

      return { success: true };
    }),

  /**
   * Get missing documents for an employee
   */
  getMissing: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Required document types
      const requiredTypes = [
        "contrato",
        "identificacion",
        "curp",
        "rfc",
        "nss",
        "examen_medico",
      ];

      // Get existing documents
      const existingDocs = await db
        .select({ documentType: employeeDocuments.documentType })
        .from(employeeDocuments)
        .where(eq(employeeDocuments.employeeId, input.employeeId));

      const existingTypes = new Set(existingDocs.map((d: { documentType: string }) => d.documentType));

      // Find missing types
      const missingTypes = requiredTypes.filter((type: any) => !existingTypes.has(type));

      return missingTypes;
    }),

  /**
   * Get document statistics for an employee
   */
  getStats: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const documents = await db
        .select()
        .from(employeeDocuments)
        .where(eq(employeeDocuments.employeeId, input.employeeId));

      // Update status for documents with expiration dates
      const today = new Date();
      for (const doc of documents) {
        if (doc.expiresAt) {
          const expiresDate = new Date(doc.expiresAt);
          const daysUntilExpiration = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          let newStatus: "vigente" | "por_vencer" | "vencido" = "vigente";
          if (daysUntilExpiration < 0) {
            newStatus = "vencido";
          } else if (daysUntilExpiration <= 30) {
            newStatus = "por_vencer";
          }

          // Update status if changed
          if (newStatus !== doc.status) {
            await db
              .update(employeeDocuments)
              .set({ status: newStatus } as any)
              .where(eq(employeeDocuments.id, doc.id));
          }
        }
      }

      // Recalculate stats
      const updatedDocuments = await db
        .select()
        .from(employeeDocuments)
        .where(eq(employeeDocuments.employeeId, input.employeeId));

      const total = updatedDocuments.length;
      const vigente = updatedDocuments.filter((d: any) => d.status === "vigente").length;
      const porVencer = updatedDocuments.filter((d: any) => d.status === "por_vencer").length;
      const vencido = updatedDocuments.filter((d: any) => d.status === "vencido").length;

      return {
        total,
        vigente,
        porVencer,
        vencido,
      };
    }),
});
