import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { requirePermission, requireDelete } from "../permissions";
import {
  committeeMinuteAgendaItems,
  committeeMinuteAgreements,
  committeeMinuteAttendees,
  committeeMinuteHistory,
  committeeMinutes,
  signatures,
} from "../../drizzle/schema";
import { eq, desc, and, like } from "drizzle-orm";

export const committeeMinutesRouter = router({
  // Listar todas las minutas
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["borrador", "finalizada", "archivada", "all"])
          .optional()
          .default("all"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input.status !== "all") {
        conditions.push(eq(committeeMinutes.status, input.status));
      }

      const minutes = await db
        .select()
        .from(committeeMinutes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(committeeMinutes.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        minutes,
        total: minutes.length,
      };
    }),

  // Obtener una minuta por ID con todos sus detalles
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [minute] = await db
        .select()
        .from(committeeMinutes)
        .where(eq(committeeMinutes.id, input.id))
        .limit(1);

      if (!minute) {
        throw new Error("Minuta no encontrada");
      }

      // Obtener asistentes
      const attendees = await db
        .select()
        .from(committeeMinuteAttendees)
        .where(eq(committeeMinuteAttendees.minuteId, input.id));

      // Obtener orden del día
      const agendaItems = await db
        .select()
        .from(committeeMinuteAgendaItems)
        .where(eq(committeeMinuteAgendaItems.minuteId, input.id))
        .orderBy(committeeMinuteAgendaItems.orderIndex);

      // Obtener acuerdos
      const agreements = await db
        .select()
        .from(committeeMinuteAgreements)
        .where(eq(committeeMinuteAgreements.minuteId, input.id))
        .orderBy(committeeMinuteAgreements.agreementNumber);

      // Obtener historial
      const history = await db
        .select()
        .from(committeeMinuteHistory)
        .where(eq(committeeMinuteHistory.minuteId, input.id))
        .orderBy(desc(committeeMinuteHistory.createdAt));

      return {
        minute,
        attendees,
        agendaItems,
        agreements,
        history,
      };
    }),

  // Crear nueva minuta
  create: protectedProcedure
    .use(requirePermission("can_create"))
    .input(
      z.object({
        numeroSesion: z.string(),
        tipoReunion: z.string(),
        fecha: z.string(),
        hora: z.string(),
        lugar: z.string(),
        desarrollo: z.string().optional(),
        observaciones: z.string().optional(),
        status: z
          .enum(["borrador", "finalizada", "archivada"])
          .default("borrador"),
        attendees: z
          .array(
            z.object({
              nombre: z.string(),
              cargo: z.string(),
              rolComite: z.string(),
              asistencia: z.enum(["presente", "ausente", "justificado"]),
            })
          )
          .optional()
          .default([]),
        agendaItems: z
          .array(
            z.object({
              orden: z.number(),
              tema: z.string(),
              descripcion: z.string().optional(),
            })
          )
          .optional()
          .default([]),
        agreements: z
          .array(
            z.object({
              numero: z.number(),
              descripcion: z.string(),
              responsable: z.string(),
              fechaCompromiso: z.string(),
              estado: z
                .enum(["pendiente", "en_proceso", "completado", "cancelado"])
                .default("pendiente"),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Crear minuta principal
      const [newMinute] = await db
        .insert(committeeMinutes)
        .values({
          folio: `MC-${String(input.numeroSesion).padStart(3, "0")}/${new Date().getFullYear()}`,
          sessionNumber: parseInt(input.numeroSesion),
          meetingDate: new Date(input.fecha),
          meetingTime: input.hora,
          meetingPlace: input.lugar,
          meetingType:
            (input.tipoReunion as
              | "ordinaria"
              | "extraordinaria"
              | "urgente"
              | "seguimiento") || "ordinaria",
          status: input.status,
          createdBy: ctx.user!.id,
        })
        .$returningId();

      const minuteId = newMinute.id;

      // Insertar asistentes
      if (input.attendees.length > 0) {
        await (db.insert(committeeMinuteAttendees) as any).values(
          input.attendees.map(att => ({
            minuteId,
            name: att.nombre,
            position: att.cargo,
            committeeRole: att.rolComite,
            attendance: att.asistencia,
          }))
        );
      }

      // Insertar orden del día
      if (input.agendaItems.length > 0) {
        await (db.insert(committeeMinuteAgendaItems) as any).values(
          input.agendaItems.map(item => ({
            minuteId,
            orderIndex: item.orden,
            topic: item.tema,
            description: item.descripcion || null,
          }))
        );
      }

      // Insertar acuerdos
      if (input.agreements.length > 0) {
        await (db.insert(committeeMinuteAgreements) as any).values(
          input.agreements.map(agr => ({
            minuteId,
            agreementNumber: agr.numero.toString(),
            description: agr.descripcion,
            responsibleName: agr.responsable,
            commitmentDate: agr.fechaCompromiso,
            status: agr.estado,
          }))
        );
      }

      // Registrar en historial
      await (db.insert(committeeMinuteHistory) as any).values({
        minuteId,
        version: 1,
        changeDescription: "Creación inicial de la minuta",
        changedBy: ctx.user!.id,
        snapshot: {},
      });

      return {
        success: true,
        minuteId,
        message: "Minuta creada exitosamente",
      };
    }),

  // Actualizar minuta existente
  update: protectedProcedure
    .use(requirePermission("can_edit"))
    .input(
      z.object({
        id: z.number(),
        numeroSesion: z.string().optional(),
        tipoReunion: z.string().optional(),
        fecha: z.string().optional(),
        hora: z.string().optional(),
        lugar: z.string().optional(),
        desarrollo: z.string().optional(),
        observaciones: z.string().optional(),
        status: z.enum(["borrador", "finalizada", "archivada"]).optional(),
        attendees: z
          .array(
            z.object({
              nombre: z.string(),
              cargo: z.string(),
              rolComite: z.string(),
              asistencia: z.enum(["presente", "ausente", "justificado"]),
            })
          )
          .optional(),
        agendaItems: z
          .array(
            z.object({
              orden: z.number(),
              tema: z.string(),
              descripcion: z.string().optional(),
            })
          )
          .optional(),
        agreements: z
          .array(
            z.object({
              numero: z.number(),
              descripcion: z.string(),
              responsable: z.string(),
              fechaCompromiso: z.string(),
              estado: z.enum([
                "pendiente",
                "en_proceso",
                "completado",
                "cancelado",
              ]),
            })
          )
          .optional(),
        cambios: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar que la minuta existe
      const [existing] = await db
        .select()
        .from(committeeMinutes)
        .where(eq(committeeMinutes.id, input.id))
        .limit(1);

      if (!existing) {
        throw new Error("Minuta no encontrada");
      }

      // Calcular nueva versión
      const historyRecords = await db
        .select()
        .from(committeeMinuteHistory)
        .where(eq(committeeMinuteHistory.minuteId, input.id));

      const newVersion = historyRecords.length + 1;

      // Actualizar minuta principal
      const updateData: any = {};
      if (input.numeroSesion) updateData.numeroSesion = input.numeroSesion;
      if (input.tipoReunion) updateData.tipoReunion = input.tipoReunion;
      if (input.fecha) updateData.fecha = input.fecha;
      if (input.hora) updateData.hora = input.hora;
      if (input.lugar) updateData.lugar = input.lugar;
      if (input.desarrollo !== undefined)
        updateData.desarrollo = input.desarrollo;
      if (input.observaciones !== undefined)
        updateData.observaciones = input.observaciones;
      if (input.status) updateData.status = input.status;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(committeeMinutes)
          .set(updateData)
          .where(eq(committeeMinutes.id, input.id));
      }

      // Actualizar asistentes si se proporcionaron
      if (input.attendees) {
        // Eliminar asistentes existentes
        await db
          .delete(committeeMinuteAttendees)
          .where(eq(committeeMinuteAttendees.minuteId, input.id));

        // Insertar nuevos asistentes
        if (input.attendees.length > 0) {
          await (db.insert(committeeMinuteAttendees) as any).values(
            input.attendees.map(att => ({
              minuteId: input.id,
              name: att.nombre,
              position: att.cargo,
              committeeRole: att.rolComite,
              attendance: att.asistencia,
            }))
          );
        }
      }

      // Actualizar orden del día si se proporcionó
      if (input.agendaItems) {
        await db
          .delete(committeeMinuteAgendaItems)
          .where(eq(committeeMinuteAgendaItems.minuteId, input.id));

        if (input.agendaItems.length > 0) {
          await (db.insert(committeeMinuteAgendaItems) as any).values(
            input.agendaItems.map(item => ({
              minuteId: input.id,
              orderIndex: item.orden,
              topic: item.tema,
              description: item.descripcion || null,
            }))
          );
        }
      }

      // Actualizar acuerdos si se proporcionaron
      if (input.agreements) {
        await db
          .delete(committeeMinuteAgreements)
          .where(eq(committeeMinuteAgreements.minuteId, input.id));

        if (input.agreements.length > 0) {
          await (db.insert(committeeMinuteAgreements) as any).values(
            input.agreements.map(agr => ({
              minuteId: input.id,
              agreementNumber: agr.numero.toString(),
              description: agr.descripcion,
              responsibleName: agr.responsable,
              commitmentDate: agr.fechaCompromiso,
              status: agr.estado,
            }))
          );
        }
      }

      // Registrar en historial
      await (db.insert(committeeMinuteHistory) as any).values({
        minuteId: input.id,
        version: newVersion,
        changeDescription: input.cambios || "Actualización de la minuta",
        changedBy: ctx.user!.id,
        snapshot: {},
      });

      return {
        success: true,
        message: "Minuta actualizada exitosamente",
        version: newVersion,
      };
    }),

  // Eliminar minuta
  delete: protectedProcedure
    .use(requireDelete())
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Eliminar asistentes
      await db
        .delete(committeeMinuteAttendees)
        .where(eq(committeeMinuteAttendees.minuteId, input.id));

      // Eliminar orden del día
      await db
        .delete(committeeMinuteAgendaItems)
        .where(eq(committeeMinuteAgendaItems.minuteId, input.id));

      // Eliminar acuerdos
      await db
        .delete(committeeMinuteAgreements)
        .where(eq(committeeMinuteAgreements.minuteId, input.id));

      // Eliminar historial
      await db
        .delete(committeeMinuteHistory)
        .where(eq(committeeMinuteHistory.minuteId, input.id));

      // Eliminar minuta principal
      await db
        .delete(committeeMinutes)
        .where(eq(committeeMinutes.id, input.id));

      return {
        success: true,
        message: "Minuta eliminada exitosamente",
      };
    }),

  // Publicar borrador
  publish: protectedProcedure
    .use(requirePermission("can_approve"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(committeeMinutes)
        .set({ status: "finalizada" } as any)
        .where(eq(committeeMinutes.id, input.id));

      // Registrar en historial
      const historyRecords = await db
        .select()
        .from(committeeMinuteHistory)
        .where(eq(committeeMinuteHistory.minuteId, input.id));

      const newVersion = historyRecords.length + 1;

      await (db.insert(committeeMinuteHistory) as any).values({
        minuteId: input.id,
        version: newVersion,
        changeDescription: "Minuta publicada",
        changedBy: ctx.user!.id,
        snapshot: {},
      });

      return {
        success: true,
        message: "Minuta publicada exitosamente",
      };
    }),

  // Subir firma digital a S3
  uploadSignature: protectedProcedure
    .input(
      z.object({
        signatureDataUrl: z.string(), // base64 data URL
        attendeeName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Convertir data URL a buffer
      const base64Data = input.signatureDataUrl.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const buffer = Buffer.from(base64Data, "base64");

      // Generar nombre único para la firma
      const timestamp = Date.now();
      const sanitizedName = input.attendeeName.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `signatures/${sanitizedName}_${timestamp}.png`;

      // Subir a S3 usando storagePut
      const { storagePut } = await import("../storage.js");
      const result = await storagePut(fileName, buffer, "image/png");

      return {
        success: true,
        signatureUrl: result.url,
        message: "Firma subida exitosamente",
      };
    }),

  // Subir archivo (foto grupal, lista de asistencia, PDFs) a S3
  uploadFile: protectedProcedure
    .input(
      z.object({
        fileDataUrl: z.string(), // base64 data URL
        fileName: z.string(),
        fileType: z.string(), // mime type
      })
    )
    .mutation(async ({ input }) => {
      // Convertir data URL a buffer
      const base64Data = input.fileDataUrl.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const extension = input.fileName.split(".").pop() || "bin";
      const sanitizedName = input.fileName
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `committee-minutes/${sanitizedName}_${timestamp}.${extension}`;

      // Subir a S3 usando storagePut
      const { storagePut } = await import("../storage.js");
      const result = await storagePut(fileName, buffer, input.fileType);

      return {
        success: true,
        fileUrl: result.url,
        fileKey: result.key,
        message: "Archivo subido exitosamente",
      };
    }),

  // Obtener acuerdos con filtros
  getAgreements: protectedProcedure
    .input(
      z.object({
        responsible: z.string().optional(),
        priority: z.enum(["baja", "media", "alta", "urgente"]).optional(),
        status: z
          .enum(["pendiente", "en_proceso", "completado", "cancelado"])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db.select().from(committeeMinuteAgreements);

      // Aplicar filtros
      const conditions = [];
      if (input.responsible) {
        conditions.push(
          like(
            committeeMinuteAgreements.responsibleName,
            `%${input.responsible}%`
          )
        );
      }
      if (input.priority) {
        conditions.push(eq(committeeMinuteAgreements.priority, input.priority));
      }
      if (input.status) {
        conditions.push(eq(committeeMinuteAgreements.status, input.status));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const agreements = await query;
      return agreements;
    }),

  // Actualizar estado de acuerdo
  updateAgreementStatus: protectedProcedure
    .input(
      z.object({
        agreementId: z.number(),
        status: z.enum(["pendiente", "en_proceso", "completado", "cancelado"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(committeeMinuteAgreements)
        .set({ status: input.status } as any)
        .where(eq(committeeMinuteAgreements.id, input.agreementId));

      return {
        success: true,
        message: "Estado actualizado exitosamente",
      };
    }),
});
