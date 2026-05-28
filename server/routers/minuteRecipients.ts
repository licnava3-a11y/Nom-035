import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { minuteRecipients } from "../../drizzle/schema";
import { eq, asc, like, or, and } from "drizzle-orm";

const recipientInput = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(255),
  email: z.string().email("Correo electrónico inválido").max(255),
  position: z.string().min(2, "El cargo debe tener al menos 2 caracteres").max(255),
  department: z.string().max(255).optional().nullable(),
});

export const minuteRecipientsRouter = router({
  // Listar todos los destinatarios con búsqueda y filtros
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        onlyActive: z.boolean().optional().default(false),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      const conditions = [];

      if (input.onlyActive) {
        conditions.push(eq(minuteRecipients.isActive, true));
      }

      if (input.search && input.search.trim() !== "") {
        const term = `%${input.search.trim()}%`;
        conditions.push(
          or(
            like(minuteRecipients.name, term),
            like(minuteRecipients.email, term),
            like(minuteRecipients.position, term),
            like(minuteRecipients.department, term)
          )
        );
      }

      const results = await db
        .select()
        .from(minuteRecipients)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(minuteRecipients.name));

      return results;
    }),

  // Obtener un destinatario por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      const [recipient] = await db
        .select()
        .from(minuteRecipients)
        .where(eq(minuteRecipients.id, input.id))
        .limit(1);

      if (!recipient) {
        throw new Error("Destinatario no encontrado");
      }

      return recipient;
    }),

  // Crear un nuevo destinatario
  create: protectedProcedure
    .input(recipientInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      const result = await db.insert(minuteRecipients).values({
        name: input.name,
        email: input.email,
        position: input.position,
        department: input.department ?? null,
        isActive: true,
      });

      return { id: Number(result[0].insertId), success: true };
    }),

  // Actualizar un destinatario existente
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: recipientInput,
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      await db
        .update(minuteRecipients)
        .set({
          name: input.data.name,
          email: input.data.email,
          position: input.data.position,
          department: input.data.department ?? null,
        })
        .where(eq(minuteRecipients.id, input.id));

      return { success: true };
    }),

  // Eliminar un destinatario
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      await db
        .delete(minuteRecipients)
        .where(eq(minuteRecipients.id, input.id));

      return { success: true };
    }),

  // Activar o desactivar un destinatario
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      await db
        .update(minuteRecipients)
        .set({ isActive: input.isActive })
        .where(eq(minuteRecipients.id, input.id));

      return { success: true };
    }),
});
