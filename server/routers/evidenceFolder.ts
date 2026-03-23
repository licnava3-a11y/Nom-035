import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { cases, certificates, nom035EvidenceFolder, surveys } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const categoryEnum = z.enum([
  "policies",
  "preventive_actions",
  "corrective_actions",
  "organizational_environment",
  "training_program",
  "surveys",
  "cases",
  "minutes",
  "certificates",
  "position_acceptance",
  "photographic_evidence"
]);

export const evidenceFolderRouter = router({
  /**
   * List all evidences with optional filters
   */
  list: protectedProcedure
    .input(
      z.object({
        category: categoryEnum.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
      
      let query: any = db.select().from(nom035EvidenceFolder);
      
      const conditions: any[] = [];
      
      if (input.category) {
        conditions.push(eq(nom035EvidenceFolder.category, input.category));
      }
      
      if (input.startDate) {
        conditions.push(sql`${nom035EvidenceFolder.generatedDate} >= ${input.startDate}`);
      }
      
      if (input.endDate) {
        conditions.push(sql`${nom035EvidenceFolder.generatedDate} <= ${input.endDate}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const evidences = await query.orderBy(desc(nom035EvidenceFolder.generatedDate));
      
      // Filter by search term in memory (title + description)
      if (input.searchTerm) {
        const term = input.searchTerm.toLowerCase();
        return evidences.filter((e: any) => 
          e.title.toLowerCase().includes(term) || 
          (e.description && e.description.toLowerCase().includes(term))
        );
      }
      
      return evidences;
    }),

  /**
   * Get evidences by category
   */
  getByCategory: protectedProcedure
    .input(z.object({ category: categoryEnum }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
      
      return await db
        .select()
        .from(nom035EvidenceFolder)
        .where(eq(nom035EvidenceFolder.category, input.category))
        .orderBy(desc(nom035EvidenceFolder.generatedDate));
    }),

  /**
   * Get statistics by category
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
    const allEvidences = await db.select().from(nom035EvidenceFolder);
    
    const stats = {
      total: allEvidences.length,
      byCategory: {} as Record<string, number>,
      totalSize: 0,
    };
    
      allEvidences.forEach((evidence: any) => {
      stats.byCategory[evidence.category] = (stats.byCategory[evidence.category] || 0) + 1;
      stats.totalSize += evidence.fileSize || 0;
    });
    
    return stats;
  }),

  /**
   * Add evidence manually
   */
  addEvidence: protectedProcedure
    .input(
      z.object({
        category: categoryEnum,
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        documentType: z.string().optional(),
        sourceModule: z.string().optional(),
        sourceId: z.number().optional(),
        fileUrl: z.string().url("Invalid file URL"),
        fileKey: z.string().min(1, "File key is required"),
        fileSize: z.number().optional(),
        generatedDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden agregar evidencias manualmente",
        });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
      
      const [result] = await (db.insert(nom035EvidenceFolder) as any).values({
        category: input.category,
        title: input.title,
        description: input.description,
        documentType: input.documentType,
        sourceModule: input.sourceModule,
        sourceId: input.sourceId,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey,
        fileSize: input.fileSize,
        generatedDate: new Date(input.generatedDate),
        uploadedBy: ctx.user.id,
      });
      
      return { success: true, id: Number(result.insertId) };
    }),

  /**
   * Delete evidence
   */
  deleteEvidence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden eliminar evidencias",
        });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
      
      await db.delete(nom035EvidenceFolder).where(eq(nom035EvidenceFolder.id, input.id));
      
      return { success: true };
    }),
});
