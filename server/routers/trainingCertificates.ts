import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb, createNotification } from "../db";
import { certificates, committeeTrainings, trainingAssignments, trainingCertificates, users } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";
import { randomUUID } from "crypto";
import PDFDocument from "pdfkit";

/**
 * Generar certificado PDF profesional
 */
async function generateCertificatePDF(data: {
  certificateNumber: string;
  memberName: string;
  trainingTitle: string;
  duration: number;
  completionDate: Date;
  score?: number;
  signedBy: string;
  signerTitle: string;
  verificationCode: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Colores corporativos
      const primaryColor = "#1e40af"; // Azul
      const secondaryColor = "#64748b"; // Gris
      const accentColor = "#f59e0b"; // Dorado

      // Encabezado con borde decorativo
      doc
        .rect(0, 0, doc.page.width, 150)
        .fill(primaryColor);

      // Título principal
      doc
        .fontSize(32)
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .text("CERTIFICADO DE CAPACITACIÓN", 50, 50, {
          align: "center",
          width: doc.page.width - 100,
        });

      // Subtítulo
      doc
        .fontSize(14)
        .fillColor("#e0e7ff")
        .font("Helvetica")
        .text("NOM-035-STPS-2018", 50, 100, {
          align: "center",
          width: doc.page.width - 100,
        });

      // Número de certificado
      doc
        .fontSize(10)
        .fillColor("#ffffff")
        .text(`Certificado No. ${data.certificateNumber}`, 50, 120, {
          align: "center",
          width: doc.page.width - 100,
        });

      // Cuerpo del certificado
      doc.fillColor("#000000");

      // Texto de otorgamiento
      doc
        .fontSize(14)
        .font("Helvetica")
        .text("Se otorga el presente certificado a:", 50, 200, {
          align: "center",
          width: doc.page.width - 100,
        });

      // Nombre del participante (destacado)
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text(data.memberName.toUpperCase(), 50, 230, {
          align: "center",
          width: doc.page.width - 100,
        });

      // Línea decorativa bajo el nombre
      doc
        .moveTo(150, 270)
        .lineTo(doc.page.width - 150, 270)
        .strokeColor(accentColor)
        .lineWidth(2)
        .stroke();

      // Texto de reconocimiento
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#000000")
        .text("Por haber completado satisfactoriamente la capacitación:", 50, 300, {
          align: "center",
          width: doc.page.width - 100,
        });

      // Título de la capacitación
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text(data.trainingTitle, 50, 330, {
          align: "center",
          width: doc.page.width - 100,
        });

      // Detalles de la capacitación
      const detailsY = 380;
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor(secondaryColor);

      doc.text(`Duración: ${data.duration} horas`, 50, detailsY, {
        align: "center",
        width: doc.page.width - 100,
      });

      doc.text(
        `Fecha de completación: ${data.completionDate.toLocaleDateString("es-MX", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        50,
        detailsY + 20,
        {
          align: "center",
          width: doc.page.width - 100,
        }
      );

      if (data.score !== undefined && data.score !== null) {
        doc.text(`Calificación: ${data.score}/100`, 50, detailsY + 40, {
          align: "center",
          width: doc.page.width - 100,
        });
      }

      // Firma y sello
      const signatureY = 480;

      // Línea de firma
      doc
        .moveTo(200, signatureY)
        .lineTo(doc.page.width - 200, signatureY)
        .strokeColor(secondaryColor)
        .lineWidth(1)
        .stroke();

      // Nombre del firmante
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(data.signedBy, 50, signatureY + 10, {
          align: "center",
          width: doc.page.width - 100,
        });

      // Cargo del firmante
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text(data.signerTitle, 50, signatureY + 30, {
          align: "center",
          width: doc.page.width - 100,
        });

      // Código de verificación (parte inferior)
      const footerY = doc.page.height - 100;

      // Recuadro para código de verificación
      doc
        .rect(50, footerY, doc.page.width - 100, 50)
        .fillAndStroke("#f8fafc", secondaryColor);

      doc
        .fontSize(8)
        .fillColor(secondaryColor)
        .font("Helvetica")
        .text("Código de Verificación:", 60, footerY + 10);

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text(data.verificationCode, 60, footerY + 25);

      // Nota de verificación
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text(
          "Este certificado puede ser verificado en el sistema NOM-035 STPS 2018",
          60,
          footerY + 40,
          {
            width: doc.page.width - 120,
          }
        );

      // Borde decorativo final
      doc
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .strokeColor(accentColor)
        .lineWidth(3)
        .stroke();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export const trainingCertificatesRouter = router({
  /**
   * Generar certificado para una asignación completada
   */
  generateCertificate: protectedProcedure
    .input(
      z.object({
        assignmentId: z.number(),
        signedBy: z.string().min(1, "El nombre del firmante es requerido"),
        signerTitle: z.string().min(1, "El cargo del firmante es requerido"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "committee_coordinator") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para generar certificados" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener datos de la asignación
      const [assignmentData] = await db
        .select({
          assignment: trainingAssignments,
          training: committeeTrainings,
          member: users,
        })
        .from(trainingAssignments)
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
        .where(eq(trainingAssignments.id, input.assignmentId))
        .limit(1);

      if (!assignmentData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asignación no encontrada" });
      }

      if (assignmentData.assignment.status !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La capacitación debe estar completada" });
      }

      if (!assignmentData.assignment.completionDate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Falta fecha de completación" });
      }

      // Verificar si ya existe certificado
      const [existingCert] = await db
        .select()
        .from(trainingCertificates)
        .where(eq(trainingCertificates.assignmentId, input.assignmentId))
        .limit(1);

      if (existingCert) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ya existe un certificado para esta asignación" });
      }

      // Generar número de certificado único
      const year = new Date().getFullYear();
      const certificateNumber = `CERT-NOM035-${year}-${String(input.assignmentId).padStart(6, "0")}`;

      // Generar código de verificación único
      const verificationCode = randomUUID();

      // Calcular fecha de vencimiento si la capacitación tiene vigencia
      let expiryDate: Date | null = null;
      if (assignmentData.training?.validityMonths) {
        expiryDate = new Date(assignmentData.assignment.completionDate);
        expiryDate.setMonth(expiryDate.getMonth() + assignmentData.training.validityMonths);
      }

      // Generar PDF del certificado
      const pdfBuffer = await generateCertificatePDF({
        certificateNumber,
        memberName: assignmentData.member?.name || "Participante",
        trainingTitle: assignmentData.training?.title || "Capacitación",
        duration: assignmentData.training?.duration || 0,
        completionDate: assignmentData.assignment.completionDate,
        score: assignmentData.assignment.score || undefined,
        signedBy: input.signedBy,
        signerTitle: input.signerTitle,
        verificationCode,
      });

      // Subir PDF a S3
      const fileName = `certificates/${certificateNumber}.pdf`;
      const { url: pdfUrl } = await storagePut(fileName, pdfBuffer, "application/pdf");

      // Guardar registro del certificado
      const [result] = await (db.insert(trainingCertificates) as any).values({
        assignmentId: input.assignmentId,
        certificateNumber,
        issueDate: new Date().toISOString().split("T")[0] as any,
        expiryDate: expiryDate ? expiryDate.toISOString().split("T")[0] as any : null,
        pdfUrl,
        verificationCode,
        signedBy: input.signedBy,
        signerTitle: input.signerTitle,
      } as any);

      // Enviar notificación al miembro
      await createNotification({
        userId: assignmentData.assignment.committeeMemberId,
        type: "system",
        title: "Certificado Generado",
        message: `Se ha generado tu certificado para la capacitación: ${assignmentData.training?.title}. Número: ${certificateNumber}`,
      });

      return {
        id: result.insertId,
        certificateNumber,
        pdfUrl,
        verificationCode,
        message: "Certificado generado exitosamente",
      };
    }),

  /**
   * Verificar validez de un certificado por código
   */
  verifyCertificate: publicProcedure
    .input(z.object({ verificationCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [certData] = await db
        .select({
          certificate: trainingCertificates,
          assignment: trainingAssignments,
          training: committeeTrainings,
          member: users,
        })
        .from(trainingCertificates)
        .leftJoin(trainingAssignments, eq(trainingCertificates.assignmentId, trainingAssignments.id))
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
        .where(eq(trainingCertificates.verificationCode, input.verificationCode))
        .limit(1);

      if (!certData) {
        return {
          valid: false,
          message: "Código de verificación no encontrado",
        };
      }

      const isExpired =
        certData.certificate.expiryDate && new Date(certData.certificate.expiryDate) < new Date();

      return {
        valid: !isExpired,
        expired: isExpired,
        certificate: {
          certificateNumber: certData.certificate.certificateNumber,
          memberName: certData.member?.name,
          trainingTitle: certData.training?.title,
          issueDate: certData.certificate.issueDate,
          expiryDate: certData.certificate.expiryDate,
          signedBy: certData.certificate.signedBy,
          signerTitle: certData.certificate.signerTitle,
        },
      };
    }),

  /**
   * Descargar certificado
   */
  downloadCertificate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [certData] = await db
        .select({
          certificate: trainingCertificates,
          assignment: trainingAssignments,
        })
        .from(trainingCertificates)
        .leftJoin(trainingAssignments, eq(trainingCertificates.assignmentId, trainingAssignments.id))
        .where(eq(trainingCertificates.id, input.id))
        .limit(1);

      if (!certData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Certificado no encontrado" });
      }

      // Verificar permisos
      if (
        ctx.user.role !== "admin" &&
        ctx.user.role !== "committee_coordinator" &&
        ctx.user.id !== certData.assignment?.committeeMemberId
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para descargar este certificado" });
      }

      return {
        pdfUrl: certData.certificate.pdfUrl,
        certificateNumber: certData.certificate.certificateNumber,
      };
    }),

  /**
   * Listar certificados del usuario actual
   */
  getMyCertificates: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const results = await db
      .select({
        certificate: trainingCertificates,
        assignment: trainingAssignments,
        training: committeeTrainings,
      })
      .from(trainingCertificates)
      .leftJoin(trainingAssignments, eq(trainingCertificates.assignmentId, trainingAssignments.id))
      .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
      .where(eq(trainingAssignments.committeeMemberId, ctx.user.id))
      .orderBy(desc(trainingCertificates.issueDate));

    return results;
  }),

  /**
   * Listar todos los certificados (admin/coordinador)
   */
  listAll: protectedProcedure
    .input(
      z.object({
        committeeMemberId: z.number().optional(),
        trainingId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "committee_coordinator") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver todos los certificados" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let query = db
        .select({
          certificate: trainingCertificates,
          assignment: trainingAssignments,
          training: committeeTrainings,
          member: users,
        })
        .from(trainingCertificates)
        .leftJoin(trainingAssignments, eq(trainingCertificates.assignmentId, trainingAssignments.id))
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id));

      const conditions = [];
      if (input?.committeeMemberId) {
        conditions.push(eq(trainingAssignments.committeeMemberId, input.committeeMemberId));
      }
      if (input?.trainingId) {
        conditions.push(eq(trainingAssignments.trainingId, input.trainingId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const results = await query.orderBy(desc(trainingCertificates.issueDate));

      return results;
    }),
});
