import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { reportTemplates } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const reportTemplatesRouter = router({
  /**
   * Listar todas las plantillas de reportes
   */
  list: protectedProcedure
    .input(
      z.object({
        tipo: z.string().optional(),
        activo: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      
      const conditions = [];
      if (input?.tipo) {
        conditions.push(eq(reportTemplates.tipo, input.tipo));
      }
      if (input?.activo !== undefined) {
        conditions.push(eq(reportTemplates.activo, input.activo));
      }

      const templates = await db
        .select()
        .from(reportTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(reportTemplates.createdAt));

      return templates;
    }),

  /**
   * Obtener plantilla por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      
      const template = await db
        .select()
        .from(reportTemplates)
        .where(eq(reportTemplates.id, input.id))
        .limit(1);

      if (template.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plantilla no encontrada",
        });
      }

      return template[0];
    }),

  /**
   * Obtener plantilla por defecto para un tipo
   */
  getDefault: protectedProcedure
    .input(z.object({ tipo: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      
      const template = await db
        .select()
        .from(reportTemplates)
        .where(
          and(
            eq(reportTemplates.tipo, input.tipo),
            eq(reportTemplates.isDefault, true),
            eq(reportTemplates.activo, true)
          )
        )
        .limit(1);

      if (template.length === 0) {
        return null;
      }

      return template[0];
    }),

  /**
   * Crear nueva plantilla
   */
  create: protectedProcedure
    .input(
      z.object({
        nombre: z.string().min(1, "El nombre es requerido"),
        descripcion: z.string().optional(),
        tipo: z.string().min(1, "El tipo es requerido"),
        htmlTemplate: z.string().min(1, "El template HTML es requerido"),
        cssStyles: z.string().optional(),
        variables: z.any().optional(),
        isDefault: z.boolean().default(false),
        activo: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Si se marca como default, desmarcar otras plantillas del mismo tipo
      if (input.isDefault) {
        await db
          .update(reportTemplates)
          .set({ isDefault: false } as any)
          .where(eq(reportTemplates.tipo, input.tipo));
      }

      const result = await (db.insert(reportTemplates) as any).values({
        nombre: input.nombre,
        descripcion: input.descripcion,
        tipo: input.tipo,
        htmlTemplate: input.htmlTemplate,
        cssStyles: input.cssStyles,
        variables: input.variables,
        isDefault: input.isDefault,
        activo: input.activo,
      });

      return {
        success: true,
        id: Number((result as any).insertId),
      };
    }),

  /**
   * Actualizar plantilla existente
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nombre: z.string().min(1, "El nombre es requerido").optional(),
        descripcion: z.string().optional(),
        tipo: z.string().optional(),
        htmlTemplate: z.string().optional(),
        cssStyles: z.string().optional(),
        variables: z.any().optional(),
        isDefault: z.boolean().optional(),
        activo: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Verificar que la plantilla existe
      const existing = await db
        .select()
        .from(reportTemplates)
        .where(eq(reportTemplates.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plantilla no encontrada",
        });
      }

      // Si se marca como default, desmarcar otras plantillas del mismo tipo
      if (input.isDefault && input.tipo) {
        await db
          .update(reportTemplates)
          .set({ isDefault: false } as any)
          .where(eq(reportTemplates.tipo, input.tipo));
      }

      const updateData: any = {};
      if (input.nombre) updateData.nombre = input.nombre;
      if (input.descripcion !== undefined) updateData.descripcion = input.descripcion;
      if (input.tipo) updateData.tipo = input.tipo;
      if (input.htmlTemplate) updateData.htmlTemplate = input.htmlTemplate;
      if (input.cssStyles !== undefined) updateData.cssStyles = input.cssStyles;
      if (input.variables !== undefined) updateData.variables = input.variables;
      if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;
      if (input.activo !== undefined) updateData.activo = input.activo;

      await db
        .update(reportTemplates)
        .set(updateData)
        .where(eq(reportTemplates.id, input.id));

      return { success: true };
    }),

  /**
   * Eliminar plantilla
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Verificar que la plantilla existe
      const existing = await db
        .select()
        .from(reportTemplates)
        .where(eq(reportTemplates.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plantilla no encontrada",
        });
      }

      // No permitir eliminar plantillas por defecto
      if (existing[0].isDefault) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se puede eliminar una plantilla por defecto. Primero establece otra como default.",
        });
      }

      await db.delete(reportTemplates).where(eq(reportTemplates.id, input.id));

      return { success: true };
    }),

  /**
   * Establecer plantilla como default para su tipo
   */
  setDefault: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Obtener la plantilla
      const template = await db
        .select()
        .from(reportTemplates)
        .where(eq(reportTemplates.id, input.id))
        .limit(1);

      if (template.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plantilla no encontrada",
        });
      }

      // Desmarcar todas las plantillas del mismo tipo
      await db
        .update(reportTemplates)
        .set({ isDefault: false } as any)
        .where(eq(reportTemplates.tipo, template[0].tipo));

      // Marcar esta como default
      await db
        .update(reportTemplates)
        .set({ isDefault: true } as any)
        .where(eq(reportTemplates.id, input.id));

      return { success: true };
    }),
});
