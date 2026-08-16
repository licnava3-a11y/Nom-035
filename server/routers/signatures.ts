import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { signatures, documents } from '../../drizzle/schema';
import { uploadSignatureToS3, isValidSignatureDataUrl } from '../lib/signature-upload';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Router de firmas digitales
 * 
 * Procedimientos:
 * - saveSignature: Guarda una firma digitalizada (sube a S3 y registra en BD)
 * - getSignaturesByDocument: Obtiene todas las firmas de un documento
 * - deleteSignature: Elimina una firma (solo admin o creador del documento)
 */
export const signaturesRouter = router({
  /**
   * Guardar una firma digitalizada
   * 
   * Flujo:
   * 1. Validar data URL de la firma
   * 2. Subir imagen a S3
   * 3. Capturar metadata (IP, dispositivo)
   * 4. Guardar en base de datos
   */
  saveSignature: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        signatureDataUrl: z.string(),
        signerName: z.string(),
        signerRole: z.string().optional(),
        // userId es opcional para firmantes externos
        userId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validar que el documento existe
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const document = await db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1);

      if (document.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Validar data URL de la firma
      if (!isValidSignatureDataUrl(input.signatureDataUrl)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid signature data URL',
        });
      }

      // Subir firma a S3
      const signatureUrl = await uploadSignatureToS3(
        input.signatureDataUrl,
        input.userId || ctx.user.id,
        input.documentId
      );

      // Capturar metadata disponible de la solicitud para trazabilidad de la firma.
      const ipAddress = ctx.req?.ip || 'unknown';
      const userAgent = ctx.req?.headers['user-agent'] || 'unknown';
      const deviceInfo = `${userAgent.substring(0, 200)}`;

      // Guardar en base de datos
      const [signature] = await (db.insert(signatures) as any).values({
        documentId: input.documentId,
        userId: input.userId || null,
        signerName: input.signerName,
        signerRole: input.signerRole || null,
        signatureImageUrl: signatureUrl,
        ipAddress,
        deviceInfo,
      });

      return {
        id: signature.insertId,
        signatureUrl,
        message: 'Signature saved successfully',
      };
    }),

  /**
   * Obtener todas las firmas de un documento
   */
  getSignaturesByDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const documentSignatures = await db
        .select()
        .from(signatures)
        .where(eq(signatures.documentId, input.documentId))
        .orderBy(signatures.signedAt);

      return documentSignatures;
    }),

  /**
   * Eliminar una firma
   * Solo el admin o el creador del documento pueden eliminar firmas
   */
  deleteSignature: protectedProcedure
    .input(z.object({ signatureId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Obtener la firma
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const [signature] = await db
        .select()
        .from(signatures)
        .where(eq(signatures.id, input.signatureId))
        .limit(1);

      if (!signature) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Signature not found',
        });
      }

      // Obtener el documento
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, signature.documentId))
        .limit(1);

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Verificar permisos (solo admin o creador del documento)
      if (ctx.user.role !== 'admin' && document.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this signature',
        });
      }

      // Eliminar firma
      await db.delete(signatures).where(eq(signatures.id, input.signatureId));

      return {
        success: true,
        message: 'Signature deleted successfully',
      };
    }),
});
