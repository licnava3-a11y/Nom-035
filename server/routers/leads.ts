import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { leads, whatsappTrackingEvents } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const leadsRouter = router({
  /**
   * Crear un nuevo lead manualmente o desde conversión de WhatsApp
   */
  createLead: protectedProcedure
    .input(
      z.object({
        whatsappEventId: z.number().optional(),
        nombre: z.string().min(1),
        email: z.string().email().optional(),
        empresa: z.string().optional(),
        telefono: z.string().optional(),
        normativas: z.array(z.string()).optional(),
        estado: z.enum(["nuevo", "contactado", "en_negociacion", "propuesta_enviada", "ganado", "perdido"]).default("nuevo"),
        fechaContacto: z.date().optional(),
        proximaAccion: z.date().optional(),
        proximaAccionDescripcion: z.string().optional(),
        notas: z.string().optional(),
        asignadoA: z.number().optional(),
        asignadoNombre: z.string().optional(),
        origen: z.string().optional(),
        valorEstimado: z.number().optional(),
        probabilidadCierre: z.number().min(0).max(100).default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [newLead] = await db.insert(leads).values({
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, leadId: newLead.insertId };
    }),

  /**
   * Obtener pipeline de leads agrupados por estado
   */
  getLeadsPipeline: protectedProcedure
    .input(
      z.object({
        origen: z.string().optional(),
        normativa: z.string().optional(),
        asignadoA: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      let query = db.select().from(leads);

      // Aplicar filtros opcionales
      const conditions = [];
      if (input.origen) {
        conditions.push(eq(leads.origen, input.origen));
      }
      if (input.asignadoA) {
        conditions.push(eq(leads.asignadoA, input.asignadoA));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const allLeads = await query.orderBy(desc(leads.createdAt));

      // Filtrar por normativa si se especifica (JSON array)
      let filteredLeads = allLeads;
      if (input.normativa) {
        filteredLeads = allLeads.filter((lead) => {
          const normativas = lead.normativas as string[] | null;
          return normativas?.includes(input.normativa!);
        });
      }

      // Agrupar por estado
      const pipeline = {
        nuevo: filteredLeads.filter((l) => l.estado === "nuevo"),
        contactado: filteredLeads.filter((l) => l.estado === "contactado"),
        en_negociacion: filteredLeads.filter((l) => l.estado === "en_negociacion"),
        propuesta_enviada: filteredLeads.filter((l) => l.estado === "propuesta_enviada"),
        ganado: filteredLeads.filter((l) => l.estado === "ganado"),
        perdido: filteredLeads.filter((l) => l.estado === "perdido"),
      };

      return pipeline;
    }),

  /**
   * Actualizar estado de un lead (para drag-and-drop)
   */
  updateLeadStatus: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        nuevoEstado: z.enum(["nuevo", "contactado", "en_negociacion", "propuesta_enviada", "ganado", "perdido"]),
        razonPerdida: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const updateData: any = {
        estado: input.nuevoEstado,
        updatedAt: new Date(),
      };

      // Si se marca como ganado o perdido, registrar fecha de cierre
      if (input.nuevoEstado === "ganado" || input.nuevoEstado === "perdido") {
        updateData.fechaCierre = new Date();
      }

      // Si se marca como perdido, guardar razón
      if (input.nuevoEstado === "perdido" && input.razonPerdida) {
        updateData.razonPerdida = input.razonPerdida;
      }

      // Si se marca como contactado por primera vez, registrar fecha de contacto
      if (input.nuevoEstado === "contactado") {
        const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
        if (lead && !lead.fechaContacto) {
          updateData.fechaContacto = new Date();
        }
      }

      await db.update(leads).set(updateData).where(eq(leads.id, input.leadId));

      return { success: true };
    }),

  /**
   * Actualizar información de un lead
   */
  updateLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        nombre: z.string().optional(),
        email: z.string().email().optional(),
        empresa: z.string().optional(),
        telefono: z.string().optional(),
        normativas: z.array(z.string()).optional(),
        proximaAccion: z.date().optional(),
        proximaAccionDescripcion: z.string().optional(),
        notas: z.string().optional(),
        asignadoA: z.number().optional(),
        asignadoNombre: z.string().optional(),
        valorEstimado: z.number().optional(),
        probabilidadCierre: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const { leadId, ...updateData } = input;

      await db
        .update(leads)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      return { success: true };
    }),

  /**
   * Eliminar un lead
   */
  deleteLead: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      await db.delete(leads).where(eq(leads.id, input.leadId));
      return { success: true };
    }),

  /**
   * Convertir evento de WhatsApp a lead automáticamente
   */
  convertWhatsAppEventToLead: protectedProcedure
    .input(z.object({
      whatsappEventId: z.number(),
      nombre: z.string().min(1),
      email: z.string().email().optional(),
      telefono: z.string().optional(),
      empresa: z.string().optional(),
      normativas: z.array(z.string()).optional(),
      notas: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Verificar si ya existe un lead para este evento
      const [existingLead] = await db
        .select()
        .from(leads)
        .where(eq(leads.whatsappEventId, input.whatsappEventId))
        .limit(1);

      if (existingLead) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un lead para este evento",
        });
      }

      // Crear lead con datos del input
      const [newLead] = await db.insert(leads).values({
        whatsappEventId: input.whatsappEventId,
        nombre: input.nombre,
        email: input.email,
        empresa: input.empresa,
        telefono: input.telefono,
        normativas: input.normativas || [],
        estado: "nuevo",
        origen: "whatsapp",
        notas: input.notas,
        probabilidadCierre: 25, // Probabilidad inicial del 25%
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Actualizar estado de conversión del evento
      await db
        .update(whatsappTrackingEvents)
        .set({
          conversionStatus: "converted",
          convertedAt: new Date(),
        })
        .where(eq(whatsappTrackingEvents.id, input.whatsappEventId));

      return { success: true, leadId: newLead.insertId };
    }),

  /**
   * Obtener detalles de un lead por ID
   */
  getLeadById: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);

      if (!lead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead no encontrado",
        });
      }

      return lead;
    }),

  /**
   * Asignar lead a un usuario
   */
  assignLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        asignadoA: z.number(),
        asignadoNombre: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      await db
        .update(leads)
        .set({
          asignadoA: input.asignadoA,
          asignadoNombre: input.asignadoNombre,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, input.leadId));

      return { success: true };
    }),

  /**
   * Agregar nota a un lead
   */
  addLeadNote: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        nota: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Obtener lead actual
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);

      if (!lead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead no encontrado",
        });
      }

      // Agregar nueva nota con timestamp
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${input.nota}`;
      const updatedNotes = lead.notas ? `${lead.notas}\n\n${newNote}` : newNote;

      await db
        .update(leads)
        .set({
          notas: updatedNotes,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, input.leadId));

      return { success: true };
    }),

  /**
   * Obtener recordatorios próximos (próximas acciones en las próximas 24 horas)
   */
  getUpcomingReminders: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          gte(leads.proximaAccion, now),
          lte(leads.proximaAccion, tomorrow),
          sql`${leads.estado} NOT IN ('ganado', 'perdido')`
        )
      )
      .orderBy(leads.proximaAccion);

    return upcomingLeads;
  }),

  /**
   * Obtener estadísticas del pipeline
   */
  getPipelineStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    
    const allLeads = await db.select().from(leads);

    const stats = {
      total: allLeads.length,
      nuevo: allLeads.filter((l) => l.estado === "nuevo").length,
      contactado: allLeads.filter((l) => l.estado === "contactado").length,
      en_negociacion: allLeads.filter((l) => l.estado === "en_negociacion").length,
      propuesta_enviada: allLeads.filter((l) => l.estado === "propuesta_enviada").length,
      ganado: allLeads.filter((l) => l.estado === "ganado").length,
      perdido: allLeads.filter((l) => l.estado === "perdido").length,
      tasaConversion: allLeads.length > 0 ? (allLeads.filter((l) => l.estado === "ganado").length / allLeads.length) * 100 : 0,
      valorTotalEstimado: allLeads
        .filter((l) => l.estado !== "perdido" && l.estado !== "ganado")
        .reduce((sum, l) => sum + (Number(l.valorEstimado) || 0), 0),
      valorGanado: allLeads.filter((l) => l.estado === "ganado").reduce((sum, l) => sum + (Number(l.valorEstimado) || 0), 0),
    };

    return stats;
  }),

  /**
   * Conversión masiva de eventos de WhatsApp a leads
   */
  bulkConvertWhatsAppEventsToLeads: protectedProcedure
    .input(
      z.object({
        eventIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const results = {
        successful: [] as number[],
        failed: [] as { eventId: number; reason: string }[],
        duplicates: [] as number[],
      };

      for (const eventId of input.eventIds) {
        try {
          // Verificar si el evento existe
          const [event] = await db
            .select()
            .from(whatsappTrackingEvents)
            .where(eq(whatsappTrackingEvents.id, eventId));

          if (!event) {
            results.failed.push({ eventId, reason: "Evento no encontrado" });
            continue;
          }

          // Verificar si ya fue convertido
          if (event.conversionStatus === "converted") {
            results.duplicates.push(eventId);
            continue;
          }

          // Verificar si ya existe un lead vinculado
          const existingLeads = await db
            .select()
            .from(leads)
            .where(eq(leads.whatsappEventId, eventId));

          if (existingLeads.length > 0) {
            results.duplicates.push(eventId);
            continue;
          }

          // Extraer datos del evento
          const userData = event.userData && typeof event.userData === "object" ? event.userData as any : {};
          const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as any : {};

          // Crear lead
          const [newLead] = await db.insert(leads).values({
            whatsappEventId: eventId,
            nombre: userData.nombre || "Contacto desde WhatsApp",
            email: userData.email || null,
            empresa: userData.empresa || null,
            telefono: userData.telefono || null,
            normativas: event.normativas ? JSON.stringify(event.normativas) : null,
            estado: "nuevo",
            origen: metadata.source || "whatsapp",
            notas: `Lead creado desde evento de WhatsApp (${event.eventType})`,
            probabilidadCierre: 20,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Actualizar estado del evento
          await db
            .update(whatsappTrackingEvents)
            .set({ conversionStatus: "converted" })
            .where(eq(whatsappTrackingEvents.id, eventId));

          results.successful.push(eventId);
        } catch (error) {
          console.error(`Error al convertir evento ${eventId}:`, error);
          results.failed.push({ eventId, reason: "Error interno" });
        }
      }

      return results;
    }),
});
