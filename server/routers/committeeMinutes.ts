import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { committeeMinutes, committeeMinuteAttendees, committeeMinuteAgendaItems, committeeMinuteAgreements, committeeMinuteHistory } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const committeeMinutesRouter = router({
  // Listar todas las minutas
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'published', 'all']).optional().default('all'),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conditions = [];
      if (input.status !== 'all') {
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
      if (!db) throw new Error('Database not available');

      const [minute] = await db
        .select()
        .from(committeeMinutes)
        .where(eq(committeeMinutes.id, input.id))
        .limit(1);

      if (!minute) {
        throw new Error('Minuta no encontrada');
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
        .orderBy(committeeMinuteAgendaItems.orden);

      // Obtener acuerdos
      const agreements = await db
        .select()
        .from(committeeMinuteAgreements)
        .where(eq(committeeMinuteAgreements.minuteId, input.id))
        .orderBy(committeeMinuteAgreements.numero);

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
    .input(z.object({
      numeroSesion: z.string(),
      tipoReunion: z.string(),
      fecha: z.string(),
      hora: z.string(),
      lugar: z.string(),
      desarrollo: z.string().optional(),
      observaciones: z.string().optional(),
      status: z.enum(['draft', 'published']).default('draft'),
      attendees: z.array(z.object({
        nombre: z.string(),
        cargo: z.string(),
        rolComite: z.string(),
        asistencia: z.enum(['presente', 'ausente', 'justificado']),
      })).optional().default([]),
      agendaItems: z.array(z.object({
        orden: z.number(),
        tema: z.string(),
        descripcion: z.string().optional(),
      })).optional().default([]),
      agreements: z.array(z.object({
        numero: z.number(),
        descripcion: z.string(),
        responsable: z.string(),
        fechaCompromiso: z.string(),
        estado: z.enum(['pendiente', 'proceso', 'completado', 'cancelado']).default('pendiente'),
      })).optional().default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Crear minuta principal
      const [newMinute] = await db
        .insert(committeeMinutes)
        .values({
          numeroSesion: input.numeroSesion,
          tipoReunion: input.tipoReunion,
          fecha: input.fecha,
          hora: input.hora,
          lugar: input.lugar,
          desarrollo: input.desarrollo || null,
          observaciones: input.observaciones || null,
          status: input.status,
          createdBy: ctx.user.id,
          createdByName: ctx.user.name || 'Usuario',
        })
        .$returningId();

      const minuteId = newMinute.id;

      // Insertar asistentes
      if (input.attendees.length > 0) {
        await db.insert(committeeMinuteAttendees).values(
          input.attendees.map(att => ({
            minuteId,
            nombre: att.nombre,
            cargo: att.cargo,
            rolComite: att.rolComite,
            asistencia: att.asistencia,
          }))
        );
      }

      // Insertar orden del día
      if (input.agendaItems.length > 0) {
        await db.insert(committeeMinuteAgendaItems).values(
          input.agendaItems.map(item => ({
            minuteId,
            orden: item.orden,
            tema: item.tema,
            descripcion: item.descripcion || null,
          }))
        );
      }

      // Insertar acuerdos
      if (input.agreements.length > 0) {
        await db.insert(committeeMinuteAgreements).values(
          input.agreements.map(agr => ({
            minuteId,
            numero: agr.numero,
            descripcion: agr.descripcion,
            responsable: agr.responsable,
            fechaCompromiso: agr.fechaCompromiso,
            estado: agr.estado,
          }))
        );
      }

      // Registrar en historial
      await db.insert(committeeMinuteHistory).values({
        minuteId,
        version: 1,
        cambios: 'Creación inicial de la minuta',
        modificadoPor: ctx.user.id,
        modificadoPorNombre: ctx.user.name || 'Usuario',
      });

      return {
        success: true,
        minuteId,
        message: 'Minuta creada exitosamente',
      };
    }),

  // Actualizar minuta existente
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      numeroSesion: z.string().optional(),
      tipoReunion: z.string().optional(),
      fecha: z.string().optional(),
      hora: z.string().optional(),
      lugar: z.string().optional(),
      desarrollo: z.string().optional(),
      observaciones: z.string().optional(),
      status: z.enum(['draft', 'published']).optional(),
      attendees: z.array(z.object({
        nombre: z.string(),
        cargo: z.string(),
        rolComite: z.string(),
        asistencia: z.enum(['presente', 'ausente', 'justificado']),
      })).optional(),
      agendaItems: z.array(z.object({
        orden: z.number(),
        tema: z.string(),
        descripcion: z.string().optional(),
      })).optional(),
      agreements: z.array(z.object({
        numero: z.number(),
        descripcion: z.string(),
        responsable: z.string(),
        fechaCompromiso: z.string(),
        estado: z.enum(['pendiente', 'proceso', 'completado', 'cancelado']),
      })).optional(),
      cambios: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar que la minuta existe
      const [existing] = await db
        .select()
        .from(committeeMinutes)
        .where(eq(committeeMinutes.id, input.id))
        .limit(1);

      if (!existing) {
        throw new Error('Minuta no encontrada');
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
      if (input.desarrollo !== undefined) updateData.desarrollo = input.desarrollo;
      if (input.observaciones !== undefined) updateData.observaciones = input.observaciones;
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
          await db.insert(committeeMinuteAttendees).values(
            input.attendees.map(att => ({
              minuteId: input.id,
              nombre: att.nombre,
              cargo: att.cargo,
              rolComite: att.rolComite,
              asistencia: att.asistencia,
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
          await db.insert(committeeMinuteAgendaItems).values(
            input.agendaItems.map(item => ({
              minuteId: input.id,
              orden: item.orden,
              tema: item.tema,
              descripcion: item.descripcion || null,
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
          await db.insert(committeeMinuteAgreements).values(
            input.agreements.map(agr => ({
              minuteId: input.id,
              numero: agr.numero,
              descripcion: agr.descripcion,
              responsable: agr.responsable,
              fechaCompromiso: agr.fechaCompromiso,
              estado: agr.estado,
            }))
          );
        }
      }

      // Registrar en historial
      await db.insert(committeeMinuteHistory).values({
        minuteId: input.id,
        version: newVersion,
        cambios: input.cambios || 'Actualización de la minuta',
        modificadoPor: ctx.user.id,
        modificadoPorNombre: ctx.user.name || 'Usuario',
      });

      return {
        success: true,
        message: 'Minuta actualizada exitosamente',
        version: newVersion,
      };
    }),

  // Eliminar minuta
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

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
        message: 'Minuta eliminada exitosamente',
      };
    }),

  // Publicar borrador
  publish: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(committeeMinutes)
        .set({ status: 'published' })
        .where(eq(committeeMinutes.id, input.id));

      // Registrar en historial
      const historyRecords = await db
        .select()
        .from(committeeMinuteHistory)
        .where(eq(committeeMinuteHistory.minuteId, input.id));
      
      const newVersion = historyRecords.length + 1;

      await db.insert(committeeMinuteHistory).values({
        minuteId: input.id,
        version: newVersion,
        cambios: 'Minuta publicada',
        modificadoPor: ctx.user.id,
        modificadoPorNombre: ctx.user.name || 'Usuario',
      });

      return {
        success: true,
        message: 'Minuta publicada exitosamente',
      };
    }),
});
