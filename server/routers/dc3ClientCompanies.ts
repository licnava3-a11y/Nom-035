import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { dc3ClientCompanies } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";

// ─── Validadores ─────────────────────────────────────────────────────────────
const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

const companyInput = z.object({
  razonSocial: z.string().min(1, "Razón social es requerida"),
  rfc: z.string().regex(rfcRegex, "RFC inválido (formato: XAXX010101000)"),
  representanteLegal: z.string().optional(),
  domicilio: z.string().optional(),
  municipio: z.string().optional(),
  estado: z.string().optional(),
  codigoPostal: z.string().max(5).optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  registroPatronal: z.string().optional(),
  giro: z.string().optional(),
  scian: z.string().optional(),
  numTrabajadores: z.number().int().positive().optional(),
  notas: z.string().optional(),
});

const ALLOWED_ROLES = ["admin", "super_admin", "recursos_humanos", "rh"];

// ─── Router ──────────────────────────────────────────────────────────────────
export const dc3ClientCompaniesRouter = router({
  /**
   * Listar todas las empresas cliente (activas primero, luego por nombre)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          includeInactive: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db
        .select()
        .from(dc3ClientCompanies)
        .orderBy(
          desc(dc3ClientCompanies.isDefault),
          dc3ClientCompanies.razonSocial
        );

      if (!input?.includeInactive) {
        rows = rows.filter(r => r.isActive);
      }
      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter(
          r =>
            r.razonSocial.toLowerCase().includes(q) ||
            r.rfc.toLowerCase().includes(q) ||
            (r.representanteLegal ?? "").toLowerCase().includes(q)
        );
      }
      return rows;
    }),

  /**
   * Obtener una empresa por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "BD no disponible",
        });
      const [row] = await db
        .select()
        .from(dc3ClientCompanies)
        .where(eq(dc3ClientCompanies.id, input.id))
        .limit(1);
      if (!row)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa no encontrada",
        });
      return row;
    }),

  /**
   * Obtener la empresa predeterminada (isDefault=true)
   */
  getDefault: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(dc3ClientCompanies)
      .where(
        and(
          eq(dc3ClientCompanies.isDefault, true),
          eq(dc3ClientCompanies.isActive, true)
        )
      )
      .limit(1);
    return row ?? null;
  }),

  /**
   * Crear empresa cliente
   */
  create: protectedProcedure
    .input(companyInput)
    .mutation(async ({ input, ctx }) => {
      if (!ALLOWED_ROLES.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sin permisos para crear empresas",
        });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "BD no disponible",
        });
      // Si es la primera empresa, marcarla como predeterminada
      const existing = await db
        .select({ id: dc3ClientCompanies.id })
        .from(dc3ClientCompanies)
        .limit(1);
      const isFirst = existing.length === 0;

      const [result] = await db.insert(dc3ClientCompanies).values({
        ...input,
        isDefault: isFirst,
      });
      return {
        success: true,
        id: (result as any).insertId,
        razonSocial: input.razonSocial,
        rfc: input.rfc ?? null,
      };
    }),

  /**
   * Actualizar empresa cliente
   */
  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(companyInput))
    .mutation(async ({ input, ctx }) => {
      if (!ALLOWED_ROLES.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sin permisos para editar empresas",
        });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "BD no disponible",
        });
      const { id, ...data } = input;
      await db
        .update(dc3ClientCompanies)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(dc3ClientCompanies.id, id));
      return { success: true };
    }),

  /**
   * Establecer empresa predeterminada (solo una puede ser default)
   */
  setDefault: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ALLOWED_ROLES.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin permisos" });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "BD no disponible",
        });
      // Quitar default de todas
      await db.update(dc3ClientCompanies).set({ isDefault: false });
      // Marcar la seleccionada
      await db
        .update(dc3ClientCompanies)
        .set({ isDefault: true })
        .where(eq(dc3ClientCompanies.id, input.id));
      return { success: true };
    }),

  /**
   * Activar/desactivar empresa
   */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (!ALLOWED_ROLES.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin permisos" });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "BD no disponible",
        });
      await db
        .update(dc3ClientCompanies)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(dc3ClientCompanies.id, input.id));
      return { success: true };
    }),

  /**
   * Eliminar empresa cliente
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "super_admin"].includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden eliminar empresas",
        });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "BD no disponible",
        });
      await db
        .delete(dc3ClientCompanies)
        .where(eq(dc3ClientCompanies.id, input.id));
      return { success: true };
    }),

  /**
   * Subir logo de empresa cliente
   */
  uploadLogo: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        fileData: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ALLOWED_ROLES.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin permisos" });
      }
      const base64 = input.fileData.includes(",")
        ? input.fileData.split(",")[1]
        : input.fileData;
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El logo no puede superar 5 MB",
        });
      }
      const key = `dc3-client-companies/${input.id}/logo-${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "BD no disponible",
        });
      await db
        .update(dc3ClientCompanies)
        .set({ logoUrl: url, logoKey: key, updatedAt: new Date() })
        .where(eq(dc3ClientCompanies.id, input.id));
      return { success: true, url };
    }),
});
