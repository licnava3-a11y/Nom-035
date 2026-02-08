import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { nom035Policies } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateNom035PolicyPDF } from "../pdfGenerators/nom035Policy";

export const nom035PoliciesRouter = router({
  /**
   * List all policies
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const policies = await db
      .select()
      .from(nom035Policies)
      .orderBy(desc(nom035Policies.createdAt));
    
    return policies;
  }),

  /**
   * Get policy by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const policy = await db
        .select()
        .from(nom035Policies)
        .where(eq(nom035Policies.id, input.id))
        .limit(1);

      if (!policy || policy.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Política no encontrada",
        });
      }

      return policy[0];
    }),

  /**
   * Create new policy
   */
  create: protectedProcedure
    .input(
      z.object({
        nombre: z.string().min(1, "El nombre es requerido"),
        descripcion: z.string().min(1, "La descripción es requerida"),
        fechaPublicacion: z.string(),
        representanteLegalId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [result] = await db.insert(nom035Policies).values({
        nombre: input.nombre,
        descripcion: input.descripcion,
        fechaPublicacion: new Date(input.fechaPublicacion),
        representanteLegalId: input.representanteLegalId,
        createdBy: ctx.user.id,
        activo: true,
      });

      return {
        id: Number(result.insertId),
        success: true,
        message: "Política creada exitosamente",
      };
    }),

  /**
   * Update existing policy
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nombre: z.string().min(1, "El nombre es requerido"),
        descripcion: z.string().min(1, "La descripción es requerida"),
        fechaPublicacion: z.string(),
        representanteLegalId: z.number().optional(),
        activo: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db
        .update(nom035Policies)
        .set({
          nombre: input.nombre,
          descripcion: input.descripcion,
          fechaPublicacion: new Date(input.fechaPublicacion),
          representanteLegalId: input.representanteLegalId,
          activo: input.activo,
        })
        .where(eq(nom035Policies.id, input.id));

      return {
        success: true,
        message: "Política actualizada exitosamente",
      };
    }),

  /**
   * Delete policy
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db
        .delete(nom035Policies)
        .where(eq(nom035Policies.id, input.id));

      return {
        success: true,
        message: "Política eliminada exitosamente",
      };
    }),

  /**
   * Generate PDF for policy
   */
  generatePDF: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const policy = await db
        .select()
        .from(nom035Policies)
        .where(eq(nom035Policies.id, input.id))
        .limit(1);

      if (!policy || policy.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Política no encontrada",
        });
      }

      const pdfUrl = await generateNom035PolicyPDF(policy[0]);

      // Update policy with PDF URL
      await db
        .update(nom035Policies)
        .set({ pdfUrl })
        .where(eq(nom035Policies.id, input.id));

      return {
        success: true,
        pdfUrl,
        message: "PDF generado exitosamente",
      };
    }),
});
