import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { meetingMinutes, meetingParticipants, meetingAttachments, employees } from "../../drizzle/schema";
import { eq, desc, and, like, gte, lte } from "drizzle-orm";
import { storagePut } from "../storage";
import QRCode from "qrcode";

// Función para generar folio automático
async function generateFolio(prefix: string = "MIN"): Promise<string> {
  const db = (await getDb())!;
  const year = new Date().getFullYear();
  const lastMinute = await db
    .select()
    .from(meetingMinutes)
    .where(like(meetingMinutes.folio, `${prefix}-${year}-%`))
    .orderBy(desc(meetingMinutes.createdAt))
    .limit(1);

  let nextNumber = 1;
  if (lastMinute.length > 0) {
    const lastFolio = lastMinute[0].folio;
    const lastNumber = parseInt(lastFolio.split("-")[2] || "0");
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${year}-${nextNumber.toString().padStart(4, "0")}`;
}

// Función para generar código QR único (NOM-151)
async function generateQRCode(minuteId: number, folio: string): Promise<{ qrCode: string; qrCodeUrl: string }> {
  // Generar URL única para la minuta
  const minuteUrl = `${process.env.VITE_APP_URL || "https://app.example.com"}/meeting-minutes/${minuteId}`;
  
  // Generar código QR como data URL
  const qrCodeDataUrl = await QRCode.toDataURL(minuteUrl, {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 300,
    margin: 1,
  });

  // Convertir data URL a buffer
  const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  // Subir a S3
  const fileKey = `meeting-minutes/qr-codes/${folio}.png`;
  const { url } = await storagePut(fileKey, buffer, "image/png");

  return {
    qrCode: qrCodeDataUrl,
    qrCodeUrl: url,
  };
}

export const meetingMinutesRouter = router({
  // Crear nueva minuta
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      meetingDate: z.string(), // ISO string
      meetingType: z.string(),
      location: z.string().optional(),
      agenda: z.string().min(1),
      agreements: z.string().optional(),
      observations: z.string().optional(),
      participants: z.array(z.object({
        employeeId: z.number().optional(),
        name: z.string(),
        curp: z.string().optional(),
        ineNumber: z.string().optional(),
        role: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      
      // Generar folio automático
      const folio = await generateFolio();

      // Crear minuta
      const [minute] = await db.insert(meetingMinutes).values({
        folio,
        title: input.title,
        meetingDate: new Date(input.meetingDate),
        meetingType: input.meetingType,
        location: input.location,
        agenda: input.agenda,
        agreements: input.agreements,
        observations: input.observations,
        status: "draft",
        createdBy: ctx.user.id,
      });

      const minuteId = minute.insertId;

      // Generar código QR único
      const { qrCode, qrCodeUrl } = await generateQRCode(minuteId, folio);

      // Actualizar minuta con código QR
      await db.update(meetingMinutes)
        .set({ qrCode, qrCodeUrl })
        .where(eq(meetingMinutes.id, minuteId));

      // Agregar participantes
      if (input.participants.length > 0) {
        await db.insert(meetingParticipants).values(
          input.participants.map(p => ({
            meetingMinuteId: minuteId,
            employeeId: p.employeeId,
            name: p.name,
            curp: p.curp,
            ineNumber: p.ineNumber,
            role: p.role,
          }))
        );
      }

      return { id: minuteId, folio, qrCodeUrl };
    }),

  // Listar minutas con filtros
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "finalized", "signed"]).optional(),
      meetingType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      
      const conditions = [];
      if (input.status) {
        conditions.push(eq(meetingMinutes.status, input.status));
      }
      if (input.meetingType) {
        conditions.push(eq(meetingMinutes.meetingType, input.meetingType));
      }
      if (input.startDate) {
        conditions.push(gte(meetingMinutes.meetingDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(meetingMinutes.meetingDate, new Date(input.endDate)));
      }
      if (input.search) {
        conditions.push(like(meetingMinutes.title, `%${input.search}%`));
      }

      const minutes = await db
        .select()
        .from(meetingMinutes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(meetingMinutes.meetingDate));

      return minutes;
    }),

  // Obtener detalle de minuta
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      
      const [minute] = await db
        .select()
        .from(meetingMinutes)
        .where(eq(meetingMinutes.id, input.id));

      if (!minute) {
        throw new Error("Minuta no encontrada");
      }

      // Obtener participantes
      const participants = await db
        .select({
          id: meetingParticipants.id,
          employeeId: meetingParticipants.employeeId,
          name: meetingParticipants.name,
          curp: meetingParticipants.curp,
          ineNumber: meetingParticipants.ineNumber,
          role: meetingParticipants.role,
          signature: meetingParticipants.signature,
          signedAt: meetingParticipants.signedAt,
        })
        .from(meetingParticipants)
        .where(eq(meetingParticipants.meetingMinuteId, input.id));

      // Obtener adjuntos
      const attachments = await db
        .select()
        .from(meetingAttachments)
        .where(eq(meetingAttachments.meetingMinuteId, input.id));

      return {
        ...minute,
        participants,
        attachments,
      };
    }),

  // Actualizar minuta
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      meetingDate: z.string().optional(),
      meetingType: z.string().optional(),
      location: z.string().optional(),
      agenda: z.string().optional(),
      agreements: z.string().optional(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      
      const updateData: Record<string, unknown> = {};
      if (input.title) updateData.title = input.title;
      if (input.meetingDate) updateData.meetingDate = new Date(input.meetingDate);
      if (input.meetingType) updateData.meetingType = input.meetingType;
      if (input.location !== undefined) updateData.location = input.location;
      if (input.agenda) updateData.agenda = input.agenda;
      if (input.agreements !== undefined) updateData.agreements = input.agreements;
      if (input.observations !== undefined) updateData.observations = input.observations;

      await db.update(meetingMinutes)
        .set(updateData)
        .where(eq(meetingMinutes.id, input.id));

      return { success: true };
    }),

  // Finalizar minuta (cambiar estado a finalized)
  finalize: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      
      await db.update(meetingMinutes)
        .set({
          status: "finalized",
          finalizedAt: new Date(),
        })
        .where(eq(meetingMinutes.id, input.id));

      return { success: true };
    }),

  // Agregar firma de participante
  addSignature: protectedProcedure
    .input(z.object({
      participantId: z.number(),
      signature: z.string(), // Base64 de la firma
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      
      await db.update(meetingParticipants)
        .set({
          signature: input.signature,
          signedAt: new Date(),
        })
        .where(eq(meetingParticipants.id, input.participantId));

      // Verificar si todos los participantes han firmado
      const [participant] = await db
        .select()
        .from(meetingParticipants)
        .where(eq(meetingParticipants.id, input.participantId));

      const allParticipants = await db
        .select()
        .from(meetingParticipants)
        .where(eq(meetingParticipants.meetingMinuteId, participant.meetingMinuteId));

      const allSigned = allParticipants.every(p => p.signature !== null);

      // Si todos firmaron, cambiar estado a "signed"
      if (allSigned) {
        await db.update(meetingMinutes)
          .set({ status: "signed" })
          .where(eq(meetingMinutes.id, participant.meetingMinuteId));
      }

      return { success: true, allSigned };
    }),

  // Subir adjunto (evidencia fotográfica)
  uploadAttachment: protectedProcedure
    .input(z.object({
      meetingMinuteId: z.number(),
      fileName: z.string(),
      fileData: z.string(), // Base64
      fileType: z.enum(["photo", "document", "other"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      
      // Convertir base64 a buffer
      const buffer = Buffer.from(input.fileData, "base64");
      const fileSize = buffer.length;

      // Subir a S3
      const fileKey = `meeting-minutes/${input.meetingMinuteId}/${Date.now()}-${input.fileName}`;
      const mimeType = input.fileType === "photo" ? "image/jpeg" : "application/pdf";
      const { url } = await storagePut(fileKey, buffer, mimeType);

      // Guardar en base de datos
      await db.insert(meetingAttachments).values({
        meetingMinuteId: input.meetingMinuteId,
        fileName: input.fileName,
        fileUrl: url,
        fileType: input.fileType,
        fileSize,
        uploadedBy: ctx.user.id,
      });

      return { success: true, fileUrl: url };
    }),

  // Eliminar adjunto
  deleteAttachment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      
      await db.delete(meetingAttachments)
        .where(eq(meetingAttachments.id, input.id));

      return { success: true };
    }),

  // Obtener tipos de reunión disponibles
  getMeetingTypes: protectedProcedure
    .query(async () => {
      return [
        { value: "Ordinaria", label: "Reunión Ordinaria" },
        { value: "Extraordinaria", label: "Reunión Extraordinaria" },
        { value: "Comité", label: "Sesión de Comité" },
        { value: "Junta Directiva", label: "Junta Directiva" },
        { value: "Capacitación", label: "Sesión de Capacitación" },
        { value: "Evaluación", label: "Sesión de Evaluación" },
        { value: "Otra", label: "Otra" },
      ];
    }),

  // Generar PDF de minuta
  generatePDF: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      
      // Obtener minuta completa
      const [minute] = await db
        .select()
        .from(meetingMinutes)
        .where(eq(meetingMinutes.id, input.id));

      if (!minute) {
        throw new Error("Minuta no encontrada");
      }

      // Obtener participantes con firmas
      const participants = await db
        .select()
        .from(meetingParticipants)
        .where(eq(meetingParticipants.meetingMinuteId, input.id));

      // Obtener adjuntos
      const attachments = await db
        .select()
        .from(meetingAttachments)
        .where(eq(meetingAttachments.meetingMinuteId, input.id));

      // Importar generador PDF
      const { generateMeetingMinutePDF } = await import('../pdfGenerator');

      // Generar PDF
      const pdfBuffer = await generateMeetingMinutePDF({
        folio: minute.folio,
        title: minute.title,
        meetingDate: minute.meetingDate,
        meetingType: minute.meetingType,
        location: minute.location || '',
        agenda: minute.agenda,
        agreements: minute.agreements || '',
        observations: minute.observations || '',
        participants: participants.map(p => ({
          name: p.name,
          role: p.role || '',
          curp: p.curp || '',
          ineNumber: p.ineNumber || '',
          signature: p.signature || '',
          signedAt: p.signedAt,
        })),
        attachments: attachments.map(a => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileType: a.fileType,
        })),
        qrCode: minute.qrCode || '',
        createdAt: minute.createdAt,
      });

      // Subir PDF a S3
      const fileName = `meeting-minutes/${minute.folio}-minuta.pdf`;
      const { url: pdfUrl } = await storagePut(fileName, pdfBuffer, 'application/pdf');

      // Actualizar minuta con URL del PDF
      await db
        .update(meetingMinutes)
        .set({ updatedAt: new Date() })
        .where(eq(meetingMinutes.id, input.id));

      return { pdfUrl };
    }),
});
