import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { positions, employees, departments } from "../../drizzle/schema";
import { eq, like, and, desc, count, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const positionsRouter = router({
  // Listar puestos con paginación y filtros
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        departmentId: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { page, pageSize, search, departmentId, isActive } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) {
        conditions.push(like(positions.title, `%${search}%`));
      }
      if (departmentId) {
        conditions.push(eq(positions.departmentId, departmentId));
      }
      if (isActive !== undefined) {
        conditions.push(eq(positions.isActive, isActive));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Obtener puestos con información del departamento y conteo de empleados
      const results = await db
        .select({
          id: positions.id,
          title: positions.title,
          description: positions.description,
          code: positions.code,
          departmentId: positions.departmentId,
          departmentName: departments.name,
          level: positions.level,
          minimumEducation: positions.minimumEducation,
          isActive: positions.isActive,
          createdAt: positions.createdAt,
          employeeCount: sql<number>`(
            SELECT COUNT(*) 
            FROM ${employees} 
            WHERE ${employees.positionId} = ${positions.id}
          )`,
        })
        .from(positions)
        .leftJoin(departments, eq(positions.departmentId, departments.id))
        .where(whereClause)
        .limit(pageSize)
        .offset(offset)
        .orderBy(desc(positions.createdAt));

      // Contar total
      const [{ total }] = await db
        .select({ total: count() })
        .from(positions)
        .where(whereClause);

      return {
        data: results,
        pagination: {
          page,
          pageSize,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / pageSize),
        },
      };
    }),

  // Obtener un puesto por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [position] = await db
        .select({
          id: positions.id,
          title: positions.title,
          description: positions.description,
          code: positions.code,
          departmentId: positions.departmentId,
          departmentName: departments.name,
          level: positions.level,
          minimumEducation: positions.minimumEducation,
          isActive: positions.isActive,
          createdAt: positions.createdAt,
        })
        .from(positions)
        .leftJoin(departments, eq(positions.departmentId, departments.id))
        .where(eq(positions.id, input.id))
        .limit(1);

      if (!position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Puesto no encontrado",
        });
      }

      return position;
    }),

  // Crear nuevo puesto
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "El título es obligatorio"),
        description: z.string().optional(),
        code: z.string().min(1, "El código es obligatorio"),
        departmentId: z.number({ message: "El departamento es obligatorio" }),
        level: z
          .enum([
            "executive",
            "management",
            "supervisor",
            "specialist",
            "entry",
          ])
          .optional(),
        minimumEducation: z
          .enum([
            "primaria",
            "secundaria",
            "preparatoria",
            "tecnico",
            "licenciatura",
            "especialidad",
            "maestria",
            "doctorado",
          ])
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar código único
      const [existing] = await db
        .select()
        .from(positions)
        .where(eq(positions.code, input.code))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un puesto con este código",
        });
      }
      const [newPosition] = await db.insert(positions).values({
        title: input.title,
        description: input.description,
        code: input.code,
        departmentId: input.departmentId,
        level: input.level,
        minimumEducation: input.minimumEducation,
        isActive: true,
      });

      return newPosition;
    }),

  // Actualizar puesto
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        code: z.string().min(1).optional(),
        departmentId: z.number().optional(),
        level: z
          .enum([
            "executive",
            "management",
            "supervisor",
            "specialist",
            "entry",
          ])
          .optional(),
        minimumEducation: z
          .enum([
            "primaria",
            "secundaria",
            "preparatoria",
            "tecnico",
            "licenciatura",
            "especialidad",
            "maestria",
            "doctorado",
          ])
          .optional()
          .nullable(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;

      // Verificar que existe
      const [existing] = await db
        .select()
        .from(positions)
        .where(eq(positions.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Puesto no encontrado",
        });
      }

      // Si se actualiza el código, verificar que sea único
      if (updates.code && updates.code !== existing.code) {
        const [duplicate] = await db
          .select()
          .from(positions)
          .where(eq(positions.code, updates.code))
          .limit(1);

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ya existe un puesto con este código",
          });
        }
      }
      await db.update(positions).set(updates).where(eq(positions.id, id));

      return { success: true };
    }),

  // Eliminar puesto
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar que no tenga empleados asignados
      const [{ employeeCount }] = await db
        .select({ employeeCount: count() })
        .from(employees)
        .where(eq(employees.positionId, input.id));

      if (Number(employeeCount) > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `No se puede eliminar el puesto porque tiene ${employeeCount} empleado(s) asignado(s)`,
        });
      }
      await db.delete(positions).where(eq(positions.id, input.id));

      return { success: true };
    }),

  // Importación masiva desde Excel (XLSX)
  bulkImport: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            code: z.string().min(1),
            title: z.string().min(1),
            departmentName: z.string().optional(),
            level: z
              .enum([
                "executive",
                "management",
                "supervisor",
                "specialist",
                "entry",
              ])
              .optional(),
            minimumEducation: z
              .enum([
                "primaria",
                "secundaria",
                "preparatoria",
                "tecnico",
                "licenciatura",
                "especialidad",
                "maestria",
                "doctorado",
              ])
              .optional()
              .nullable(),
            description: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "rh") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores o RH pueden importar puestos",
        });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });
      const allDepts = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments);
      const deptMap = new Map(
        allDepts.map(d => [d.name.toLowerCase().trim(), d.id])
      );
      let created = 0;
      let updated = 0;
      const errors: string[] = [];
      for (const row of input.rows) {
        try {
          const departmentId = row.departmentName
            ? (deptMap.get(row.departmentName.toLowerCase().trim()) ?? null)
            : null;
          const existing = await db
            .select({ id: positions.id })
            .from(positions)
            .where(eq(positions.code, row.code))
            .limit(1);
          if (existing.length > 0) {
            await (db.update(positions) as any)
              .set({
                title: row.title,
                description: row.description ?? null,
                level: row.level ?? null,
                minimumEducation: row.minimumEducation ?? null,
                ...(departmentId ? { departmentId } : {}),
              })
              .where(eq(positions.id, existing[0].id));
            updated++;
          } else {
            await (db.insert(positions) as any).values({
              code: row.code,
              title: row.title,
              description: row.description ?? null,
              departmentId: departmentId ?? 1,
              level: row.level ?? null,
              minimumEducation: row.minimumEducation ?? null,
              isActive: true,
            });
            created++;
          }
        } catch (e: any) {
          errors.push(`Código ${row.code}: ${e.message}`);
        }
      }
      return { created, updated, errors, total: input.rows.length };
    }),

  // Obtener estadísticas por puesto
  getStats: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Construir condiciones de filtrado
      const conditions = [eq(positions.isActive, true)];

      if (input?.startDate && input?.endDate) {
        conditions.push(
          and(
            sql`${employees.hireDate} >= ${input.startDate}`,
            sql`${employees.hireDate} <= ${input.endDate}`
          ) as any
        );
      }
      const stats = await db
        .select({
          positionId: positions.id,
          positionTitle: positions.title,
          departmentName: departments.name,
          employeeCount: count(employees.id),
        })
        .from(positions)
        .leftJoin(employees, eq(positions.id, employees.positionId))
        .leftJoin(departments, eq(positions.departmentId, departments.id))
        .where(and(...conditions))
        .groupBy(positions.id, positions.title, departments.name)
        .orderBy(desc(count(employees.id)));

      // Calcular totales
      const totalPositions = stats.length;

      return {
        totalPositions,
        positions: stats,
      };
    }),
});
