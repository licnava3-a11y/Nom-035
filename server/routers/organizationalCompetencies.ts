import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  competencies,
  departments,
  employeeCompetencies,
  employees,
  organizationalCompetencies,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const organizationalCompetenciesRouter = router({
  /**
   * Create an organizational competency (soft skill or transversal)
   */
  create: protectedProcedure
    .input(
      z.object({
        competencyName: z.string(),
        competencyCategory: z.enum([
          "soft_skill",
          "organizational",
          "leadership",
          "technical_transversal",
        ]),
        description: z.string().optional(),
        requiredLevel: z.enum(["basico", "intermedio", "avanzado", "experto"]),
        appliesToDepartments: z.array(z.string()).optional(), // Array of department names
        appliesToRoles: z.array(z.string()).optional(), // Array of role types
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const [competency] = await (
        db.insert(organizationalCompetencies) as any
      ).values({
        ...input,
        appliesToDepartments: input.appliesToDepartments
          ? JSON.stringify(input.appliesToDepartments)
          : null,
        appliesToRoles: input.appliesToRoles
          ? JSON.stringify(input.appliesToRoles)
          : null,
      });

      return { success: true, competencyId: competency.insertId };
    }),

  /**
   * Get all organizational competencies
   */
  list: protectedProcedure
    .input(
      z
        .object({
          category: z
            .enum([
              "soft_skill",
              "organizational",
              "leadership",
              "technical_transversal",
            ])
            .optional(),
          isActive: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      let query: any = db.select().from(organizationalCompetencies);

      const conditions: any[] = [];
      if (input?.category) {
        conditions.push(
          eq(organizationalCompetencies.competencyCategory, input.category)
        );
      }
      if (input?.isActive !== undefined) {
        conditions.push(
          eq(organizationalCompetencies.isActive, input.isActive)
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const competencies = await query.orderBy(
        organizationalCompetencies.competencyCategory,
        organizationalCompetencies.competencyName
      );

      // Parse JSON fields
      return competencies.map((c: any) => ({
        ...c,
        appliesToDepartments:
          c.appliesToDepartments && c.appliesToDepartments !== "all"
            ? JSON.parse(c.appliesToDepartments)
            : c.appliesToDepartments,
        appliesToRoles:
          c.appliesToRoles && c.appliesToRoles !== "all"
            ? JSON.parse(c.appliesToRoles)
            : c.appliesToRoles,
      }));
    }),

  /**
   * Get organizational competencies applicable to an employee
   * Based on their department and role
   */
  getApplicableToEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get employee info
      const [employee] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          departmentId: employees.departmentId,
          departmentName: departments.name,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // Get all active organizational competencies
      const allCompetencies = await db
        .select()
        .from(organizationalCompetencies)
        .where(eq(organizationalCompetencies.isActive, true));

      // Filter competencies applicable to this employee
      const applicableCompetencies = allCompetencies.filter((c: any) => {
        // Handle special case: "all" means applies to everyone
        if (c.appliesToDepartments === "all") return true;

        const departments =
          c.appliesToDepartments && c.appliesToDepartments !== "all"
            ? JSON.parse(c.appliesToDepartments)
            : null;
        const roles =
          c.appliesToRoles && c.appliesToRoles !== "all"
            ? JSON.parse(c.appliesToRoles)
            : null;

        // If no restrictions, applies to everyone
        if (!departments && !roles) return true;

        // Check department match
        const departmentMatch =
          !departments || departments.includes(employee.departmentName);

        // Check role match (if roles are specified)
        const roleMatch = !roles; // For now, we don't have role field in employees table

        return departmentMatch && roleMatch;
      });

      return applicableCompetencies.map((c: any) => ({
        ...c,
        appliesToDepartments:
          c.appliesToDepartments === "all"
            ? "all"
            : c.appliesToDepartments
              ? JSON.parse(c.appliesToDepartments)
              : null,
        appliesToRoles: c.appliesToRoles ? JSON.parse(c.appliesToRoles) : null,
      }));
    }),

  /**
   * Update an organizational competency
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        competencyName: z.string().optional(),
        competencyCategory: z
          .enum([
            "soft_skill",
            "organizational",
            "leadership",
            "technical_transversal",
          ])
          .optional(),
        description: z.string().optional(),
        requiredLevel: z
          .enum(["basico", "intermedio", "avanzado", "experto"])
          .optional(),
        appliesToDepartments: z.array(z.string()).optional(),
        appliesToRoles: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const { id, ...updateData } = input;

      const processedData: any = { ...updateData };
      if (updateData.appliesToDepartments) {
        processedData.appliesToDepartments = JSON.stringify(
          updateData.appliesToDepartments
        );
      }
      if (updateData.appliesToRoles) {
        processedData.appliesToRoles = JSON.stringify(
          updateData.appliesToRoles
        );
      }

      await db
        .update(organizationalCompetencies)
        .set(processedData)
        .where(eq(organizationalCompetencies.id, id));

      return { success: true };
    }),

  /**
   * Importación masiva desde Excel (XLSX)
   */
  bulkImport: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            competencyName: z.string().min(1),
            competencyCategory: z.enum([
              "soft_skill",
              "organizational",
              "leadership",
              "technical_transversal",
            ]),
            description: z.string().optional(),
            requiredLevel: z.enum([
              "basico",
              "intermedio",
              "avanzado",
              "experto",
            ]),
            appliesToDepartments: z.string().optional(),
            appliesToRoles: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "rh") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores o RH pueden importar competencias",
        });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });
      let created = 0;
      let updated = 0;
      const errors: string[] = [];
      for (const row of input.rows) {
        try {
          const existing = await db
            .select({ id: organizationalCompetencies.id })
            .from(organizationalCompetencies)
            .where(
              eq(organizationalCompetencies.competencyName, row.competencyName)
            )
            .limit(1);
          const depts = row.appliesToDepartments
            ? row.appliesToDepartments
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];
          const roles = row.appliesToRoles
            ? row.appliesToRoles
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];
          if (existing.length > 0) {
            await (db.update(organizationalCompetencies) as any)
              .set({
                competencyCategory: row.competencyCategory,
                description: row.description ?? null,
                requiredLevel: row.requiredLevel,
                appliesToDepartments: depts.length
                  ? JSON.stringify(depts)
                  : null,
                appliesToRoles: roles.length ? JSON.stringify(roles) : null,
              })
              .where(eq(organizationalCompetencies.id, existing[0].id));
            updated++;
          } else {
            await (db.insert(organizationalCompetencies) as any).values({
              competencyName: row.competencyName,
              competencyCategory: row.competencyCategory,
              description: row.description ?? null,
              requiredLevel: row.requiredLevel,
              appliesToDepartments: depts.length ? JSON.stringify(depts) : null,
              appliesToRoles: roles.length ? JSON.stringify(roles) : null,
              isActive: true,
            });
            created++;
          }
        } catch (e: any) {
          errors.push(`${row.competencyName}: ${e.message}`);
        }
      }
      return { created, updated, errors, total: input.rows.length };
    }),

  /**
   * Delete an organizational competency
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      await db
        .delete(organizationalCompetencies)
        .where(eq(organizationalCompetencies.id, input.id));

      return { success: true };
    }),
});
