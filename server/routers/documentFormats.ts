import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { requirePermission, requireDelete } from "../permissions";
import { documentFormats } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const documentFormatsRouter = router({
  // Listar todos los formatos
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const formats = await db
      .select()
      .from(documentFormats)
      .orderBy(desc(documentFormats.createdAt));

    return formats;
  }),

  // Obtener un formato por ID
  getById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const format = await db
        .select()
        .from(documentFormats)
        .where(eq(documentFormats.id, input.id))
        .limit(1);

      return format[0] || null;
    }),

  // Crear nuevo formato
  create: protectedProcedure
    .use(requirePermission("can_create"))
    .input(
      z.object({
        codigo: z.string().min(1).max(20),
        nombre: z.string().min(1).max(255),
        descripcion: z.string().optional(),
        version: z.string().default("1.0"),
        fechaVersion: z.string(), // Formato: YYYY-MM-DD
        referencia: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await (db.insert(documentFormats) as any).values({
        codigo: input.codigo.toUpperCase(),
        nombre: input.nombre,
        descripcion: input.descripcion,
        version: input.version,
        fechaVersion: new Date(input.fechaVersion),
        referencia: input.referencia,
        consecutivoActual: 0,
        activo: true,
      });

      return {
        success: true,
        message: "Formato creado exitosamente",
      };
    }),

  // Actualizar formato existente
  update: protectedProcedure
    .use(requirePermission("can_edit"))
    .input(
      z.object({
        id: z.number(),
        codigo: z.string().min(1).max(20).optional(),
        nombre: z.string().min(1).max(255).optional(),
        descripcion: z.string().optional(),
        version: z.string().optional(),
        fechaVersion: z.string().optional(), // Formato: YYYY-MM-DD
        referencia: z.string().optional(),
        activo: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};

      if (input.codigo !== undefined)
        updateData.codigo = input.codigo.toUpperCase();
      if (input.nombre !== undefined) updateData.nombre = input.nombre;
      if (input.descripcion !== undefined)
        updateData.descripcion = input.descripcion;
      if (input.version !== undefined) updateData.version = input.version;
      if (input.fechaVersion !== undefined)
        updateData.fechaVersion = new Date(input.fechaVersion);
      if (input.referencia !== undefined)
        updateData.referencia = input.referencia;
      if (input.activo !== undefined) updateData.activo = input.activo;

      await db
        .update(documentFormats)
        .set(updateData)
        .where(eq(documentFormats.id, input.id));

      return {
        success: true,
      };
    }),

  // Eliminar formato
  delete: protectedProcedure
    .use(requireDelete())
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(documentFormats).where(eq(documentFormats.id, input.id));

      return {
        success: true,
      };
    }),

  // Incrementar consecutivo de un formato
  incrementConsecutive: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener formato actual
      const format = await db
        .select()
        .from(documentFormats)
        .where(eq(documentFormats.id, input.id))
        .limit(1);

      if (!format || format.length === 0) {
        throw new Error("Formato no encontrado");
      }

      const newConsecutive = (format[0].consecutivoActual || 0) + 1;

      // Actualizar consecutivo
      await db
        .update(documentFormats)
        .set({ consecutivoActual: newConsecutive } as any)
        .where(eq(documentFormats.id, input.id));

      return {
        success: true,
        consecutivo: newConsecutive,
      };
    }),
});
