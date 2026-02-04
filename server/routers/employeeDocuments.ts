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
          "contrato",
          "identificacion",
          "comprobante_domicilio",
          "acta_nacimiento",
          "curp",
          "rfc",
          "nss",
          "certificado_estudios",
          "carta_recomendacion",
          "examen_medico",
          "carta_antecedentes",
          "otro",
        ]),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        mimeType: z.string(),
        notes: z.string().optional(),
        expirationDate: z.string().optional(), // ISO date string
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

      // Save document metadata to database
      const [document] = await db.insert(employeeDocuments).values({
        employeeId: input.employeeId,
        documentType: input.documentType,
        fileName: input.fileName,
        fileUrl,
        fileSize,
        mimeType: input.mimeType,
        uploadedBy: ctx.user.id,
        notes: input.notes,
        expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
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
            "contrato",
            "identificacion",
            "comprobante_domicilio",
            "acta_nacimiento",
            "curp",
            "rfc",
            "nss",
            "certificado_estudios",
            "carta_recomendacion",
            "examen_medico",
            "carta_antecedentes",
            "otro",
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

      // Delete from database
      await db.delete(employeeDocuments).where(eq(employeeDocuments.id, input.documentId));

      // Note: We don't delete from S3 to maintain audit trail
      // Files can be cleaned up periodically by a separate job

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
      const missingTypes = requiredTypes.filter((type) => !existingTypes.has(type));

      return missingTypes;
    }),
});
