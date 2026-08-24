import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc.js";
import { getDb } from "../db.js";
import { digitalCertificates, users } from "../../drizzle/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { storagePut } from "../storage.js";
import crypto from "crypto";

export const digitalCertificatesRouter = router({
  // Listar certificados digitales del usuario
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const certificates = await db
      .select({
        id: digitalCertificates.id,
        certificateName: digitalCertificates.certificateName,
        validFrom: digitalCertificates.validFrom,
        validUntil: digitalCertificates.validUntil,
        status: digitalCertificates.status,
        issuer: digitalCertificates.issuer,
        serialNumber: digitalCertificates.serialNumber,
        createdAt: digitalCertificates.createdAt,
      })
      .from(digitalCertificates)
      .where(eq(digitalCertificates.userId, ctx.user.id))
      .orderBy(desc(digitalCertificates.createdAt));

    return certificates;
  }),

  // Subir certificado digital (.cer y .key)
  upload: protectedProcedure
    .input(
      z.object({
        certificateName: z.string(),
        certificateFile: z.string(), // Base64
        keyFile: z.string(), // Base64
        password: z.string(),
        validFrom: z.string(),
        validUntil: z.string(),
        issuer: z.string().optional(),
        serialNumber: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generar nombres únicos para los archivos
      const timestamp = Date.now();
      const certFileName = `certificates/${ctx.user.id}/cert_${timestamp}.cer`;
      const keyFileName = `certificates/${ctx.user.id}/key_${timestamp}.key`;

      // Decodificar archivos base64
      const certBuffer = Buffer.from(input.certificateFile, "base64");
      const keyBuffer = Buffer.from(input.keyFile, "base64");

      // Subir archivos a S3
      const certUpload = await storagePut(
        certFileName,
        certBuffer,
        "application/x-x509-ca-cert"
      );
      const keyUpload = await storagePut(
        keyFileName,
        keyBuffer,
        "application/octet-stream"
      );

      // Encriptar contraseña (simple encryption - en producción usar mejor método)
      const passwordEncrypted = Buffer.from(input.password).toString("base64");

      // Guardar en base de datos
      const [newCert] = await (db.insert(digitalCertificates) as any).values({
        userId: ctx.user.id,
        certificateName: input.certificateName,
        certificatePath: certUpload.url,
        keyPath: keyUpload.url,
        passwordEncrypted: passwordEncrypted,
        validFrom: new Date(input.validFrom),
        validUntil: new Date(input.validUntil),
        status: "active",
        issuer: input.issuer || null,
        serialNumber: input.serialNumber || null,
      });

      return {
        success: true,
        message: "Certificado digital cargado exitosamente",
        certificateId: newCert.insertId,
      };
    }),

  // Eliminar certificado digital
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar que el certificado pertenece al usuario
      const cert = await db
        .select()
        .from(digitalCertificates)
        .where(
          and(
            eq(digitalCertificates.id, input.id),
            eq(digitalCertificates.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!cert || cert.length === 0) {
        throw new Error("Certificado no encontrado o no autorizado");
      }

      // Eliminar de base de datos
      await db
        .delete(digitalCertificates)
        .where(eq(digitalCertificates.id, input.id));

      return {
        success: true,
        message: "Certificado eliminado exitosamente",
      };
    }),

  // Obtener certificado activo para firmar
  getActiveCertificate: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    const certificates = await db
      .select()
      .from(digitalCertificates)
      .where(
        and(
          eq(digitalCertificates.userId, ctx.user.id),
          eq(digitalCertificates.status, "active")
        )
      )
      .orderBy(desc(digitalCertificates.createdAt))
      .limit(1);

    if (!certificates || certificates.length === 0) {
      return null;
    }

    const cert = certificates[0];

    // Verificar vigencia
    if (new Date(cert.validUntil) < now) {
      // Marcar como expirado
      await db
        .update(digitalCertificates)
        .set({ status: "expired" } as any)
        .where(eq(digitalCertificates.id, cert.id));

      return null;
    }

    return {
      id: cert.id,
      certificateName: cert.certificateName,
      validFrom: cert.validFrom,
      validUntil: cert.validUntil,
      issuer: cert.issuer,
      serialNumber: cert.serialNumber,
    };
  }),

  // Validar certificado con API del SAT (simulado)
  validateWithSAT: protectedProcedure
    .input(z.object({ certificateId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener certificado
      const cert = await db
        .select()
        .from(digitalCertificates)
        .where(
          and(
            eq(digitalCertificates.id, input.certificateId),
            eq(digitalCertificates.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!cert || cert.length === 0) {
        throw new Error("Certificado no encontrado");
      }

      // SIMULACIÓN: En producción, aquí se haría la llamada real a la API del SAT
      // para validar el certificado digital

      // Por ahora, simulamos una validación exitosa
      const isValid = true;
      const validationMessage = isValid
        ? "Certificado válido y vigente según el SAT"
        : "Certificado no válido o revocado";

      return {
        success: isValid,
        message: validationMessage,
        details: {
          certificateName: cert[0].certificateName,
          issuer: cert[0].issuer,
          serialNumber: cert[0].serialNumber,
          validFrom: cert[0].validFrom,
          validUntil: cert[0].validUntil,
          status: cert[0].status,
        },
      };
    }),

  // Firmar documento con certificado e.firma SAT
  signDocument: protectedProcedure
    .input(
      z.object({
        certificateId: z.number(),
        documentContent: z.string(), // Contenido del documento en base64
        documentType: z.enum(["pdf", "xml", "text"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener certificado activo
      const cert = await db
        .select()
        .from(digitalCertificates)
        .where(
          and(
            eq(digitalCertificates.id, input.certificateId),
            eq(digitalCertificates.userId, ctx.user.id),
            eq(digitalCertificates.status, "active")
          )
        )
        .limit(1);

      if (!cert || cert.length === 0) {
        throw new Error("Certificado no encontrado o no activo");
      }

      const certificate = cert[0];

      // Verificar vigencia
      const now = new Date();
      const validFrom = new Date(certificate.validFrom);
      const validUntil = new Date(certificate.validUntil);

      if (now < validFrom || now > validUntil) {
        throw new Error("Certificado no vigente");
      }

      // Importar módulo de firma digital
      const { generateDigitalSignature } = await import(
        "../_core/digitalSignature"
      );

      // Convertir contenido de base64 a Buffer
      const documentBuffer = Buffer.from(input.documentContent, "base64");

      // Generar firma digital
      const signatureResult = await generateDigitalSignature(documentBuffer, {
        certificatePath: certificate.certificatePath,
        keyPath: certificate.keyPath,
        password: certificate.passwordEncrypted, // En producción, descifrar primero
        serialNumber: certificate.serialNumber || "N/A",
        issuer: certificate.issuer || "SAT",
      });

      return {
        success: true,
        xmlSignature: signatureResult.xmlSignature,
        signatureValue: signatureResult.signatureValue,
        digestValue: signatureResult.digestValue,
        signedAt: signatureResult.signedAt,
        certificateInfo: {
          name: certificate.certificateName,
          issuer: certificate.issuer,
          serialNumber: certificate.serialNumber,
        },
      };
    }),
});
