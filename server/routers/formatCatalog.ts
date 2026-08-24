/**
 * Router: formatCatalog
 * Gestión del catálogo de versiones de formatos oficiales (DC-3, DC-4, etc.).
 *
 * Nomenclatura de folios: CÓDIGO + CONSECUTIVO / AÑO
 * Ejemplo: DC-3-0001/2024 (versión 2.1 activa)
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { formatCatalog } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const formatCatalogRouter = router({
  // ─── Listar todas las versiones de un código de formato ─────────────────────
  list: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(50).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const rows = await db
        .select()
        .from(formatCatalog)
        .orderBy(desc(formatCatalog.versionDate));

      if (input.code) {
        return rows.filter(r => r.code === input.code);
      }
      return rows;
    }),

  // ─── Obtener la versión activa de un código de formato (público) ─────────────
  getActive: publicProcedure
    .input(z.object({ code: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const [active] = await db
        .select()
        .from(formatCatalog)
        .where(
          and(
            eq(formatCatalog.code, input.code),
            eq(formatCatalog.isActive, true)
          )
        );

      return active ?? null;
    }),

  // ─── Crear nueva versión ─────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(50),
        name: z.string().min(1).max(255),
        version: z.string().min(1).max(20),
        versionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reference: z.string().max(500).optional(),
        changeNotes: z.string().optional(),
        setActive: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      // Si se va a activar esta versión, desactivar las demás del mismo código
      if (input.setActive) {
        await db
          .update(formatCatalog)
          .set({ isActive: false })
          .where(eq(formatCatalog.code, input.code));
      }

      // Drizzle MySQL date() espera string 'YYYY-MM-DD' — cast explícito
      const [result] = await (db.insert(formatCatalog) as any).values({
        code: input.code,
        name: input.name,
        version: input.version,
        versionDate: input.versionDate,
        reference: input.reference ?? null,
        changeNotes: input.changeNotes ?? null,
        isActive: input.setActive,
        createdBy: ctx.user.id,
      });

      return { id: (result as any).insertId, success: true };
    }),

  // ─── Actualizar versión existente ────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255).optional(),
        version: z.string().min(1).max(20).optional(),
        versionDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        reference: z.string().max(500).optional(),
        changeNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.version !== undefined) updateData.version = fields.version;
      if (fields.versionDate !== undefined)
        updateData.versionDate = fields.versionDate;
      if (fields.reference !== undefined)
        updateData.reference = fields.reference;
      if (fields.changeNotes !== undefined)
        updateData.changeNotes = fields.changeNotes;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay campos para actualizar",
        });
      }

      await db
        .update(formatCatalog)
        .set(updateData)
        .where(eq(formatCatalog.id, id));
      return { success: true };
    }),

  // ─── Activar una versión (desactiva las demás del mismo código) ──────────────
  setActive: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      // Obtener el código del formato
      const [entry] = await db
        .select({ code: formatCatalog.code })
        .from(formatCatalog)
        .where(eq(formatCatalog.id, input.id));

      if (!entry)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Versión no encontrada",
        });

      // Desactivar todas las versiones del mismo código
      await db
        .update(formatCatalog)
        .set({ isActive: false })
        .where(eq(formatCatalog.code, entry.code));

      // Activar la versión seleccionada
      await db
        .update(formatCatalog)
        .set({ isActive: true })
        .where(eq(formatCatalog.id, input.id));

      return { success: true };
    }),

  // ─── Eliminar versión (solo si no está activa) ───────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const [entry] = await db
        .select({ isActive: formatCatalog.isActive })
        .from(formatCatalog)
        .where(eq(formatCatalog.id, input.id));

      if (!entry)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Versión no encontrada",
        });
      if (entry.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No se puede eliminar la versión activa. Active otra versión primero.",
        });
      }

      await db.delete(formatCatalog).where(eq(formatCatalog.id, input.id));
      return { success: true };
    }),
});
