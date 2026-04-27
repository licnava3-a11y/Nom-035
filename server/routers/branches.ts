import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { branches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const branchesRouter = router({
  // List all active branches
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    return db.select().from(branches).where(eq(branches.isActive, true)).orderBy(branches.name);
  }),

  // Get all branches including inactive (admin)
  listAll: protectedProcedure.query(async () => {
    const db = await getDb();
    return db.select().from(branches).orderBy(branches.name);
  }),

  // Create a new branch
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(150),
      address: z.string().max(300).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      phone: z.string().max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [result] = await db.insert(branches).values({
        name: input.name,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        phone: input.phone ?? null,
        isActive: true,
      });
      return { id: (result as { insertId: number }).insertId, ...input };
    }),

  // Update a branch
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(150).optional(),
      address: z.string().max(300).optional().nullable(),
      city: z.string().max(100).optional().nullable(),
      state: z.string().max(100).optional().nullable(),
      phone: z.string().max(20).optional().nullable(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      await db.update(branches).set(updateData).where(eq(branches.id, id));
      return { success: true };
    }),

  // Delete (soft-delete) a branch
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(branches).set({ isActive: false }).where(eq(branches.id, input.id));
      return { success: true };
    }),
});
