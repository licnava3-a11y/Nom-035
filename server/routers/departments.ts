import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { departments, positions, employees } from "../../drizzle/schema";
import { eq, like, and, sql, count, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const departmentsRouter = router({
  // Listar departamentos con paginación y filtros
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const { page, pageSize, search, isActive } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) {
        conditions.push(like(departments.name, `%${search}%`));
      }
      if (isActive !== undefined) {
        conditions.push(eq(departments.isActive, isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Obtener departamentos con conteo de empleados
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const results = await db
        .select({
          id: departments.id,
          name: departments.name,
          description: departments.description,
          code: departments.code,
          managerId: departments.managerId,

          isActive: departments.isActive,
          createdAt: departments.createdAt,
          employeeCount: sql<number>`(
            SELECT COUNT(*) 
            FROM ${employees} 
            WHERE ${employees.departmentId} = ${departments.id}
          )`,
        })
        .from(departments)
        .where(whereClause)
        .limit(pageSize)
        .offset(offset)
        .orderBy(desc(departments.createdAt));

      // Contar total
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [{ total }] = await db
        .select({ total: count() })
        .from(departments)
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

  // Obtener un departamento por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [department] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, input.id))
        .limit(1);

      if (!department) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Departamento no encontrado",
        });
      }

      return department;
    }),

  // Crear departamento
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido"),
        description: z.string().optional(),
        code: z.string().min(1, "El código es requerido"),
        managerId: z.number().optional(),

        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Verificar código único
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [existing] = await db
        .select()
        .from(departments)
        .where(eq(departments.code, input.code))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un departamento con este código",
        });
      }

      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [newDepartment] = await db
        .insert(departments)
        .values({
          name: input.name,
          description: input.description,
          code: input.code,
          managerId: input.managerId,
  
          isActive: input.isActive,
        })
        .$returningId();

      return { id: newDepartment.id, success: true };
    }),

  // Actualizar departamento
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        code: z.string().min(1).optional(),
        managerId: z.number().optional(),

        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...updates } = input;

      // Verificar que existe
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [existing] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Departamento no encontrado",
        });
      }

      // Si se actualiza el código, verificar que sea único
      if (updates.code && updates.code !== existing.code) {
        // @ts-expect-error - getDb() siempre retorna instancia válida
        const [duplicate] = await db
          .select()
          .from(departments)
          .where(eq(departments.code, updates.code))
          .limit(1);

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ya existe un departamento con este código",
          });
        }
      }

      // @ts-expect-error - getDb() siempre retorna instancia válida
      await db.update(departments).set(updates).where(eq(departments.id, id));

      return { success: true };
    }),

  // Eliminar departamento
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Verificar que no tenga empleados asignados
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [{ employeeCount }] = await db
        .select({ employeeCount: count() })
        .from(employees)
        .where(eq(employees.departmentId, input.id));

      if (Number(employeeCount) > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `No se puede eliminar el departamento porque tiene ${employeeCount} empleado(s) asignado(s)`,
        });
      }

      // Verificar que no tenga puestos asignados
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [{ positionCount }] = await db
        .select({ positionCount: count() })
        .from(positions)
        .where(eq(positions.departmentId, input.id));

      if (Number(positionCount) > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `No se puede eliminar el departamento porque tiene ${positionCount} puesto(s) asignado(s)`,
        });
      }

      // @ts-expect-error - getDb() siempre retorna instancia válida
      await db.delete(departments).where(eq(departments.id, input.id));

      return { success: true };
    }),

  // Obtener jerarquía organizacional
  getHierarchy: protectedProcedure.query(async () => {
    const db = await getDb();

    // @ts-expect-error - getDb() siempre retorna instancia válida
    const allDepartments = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        managerId: departments.managerId,
        isActive: departments.isActive,
        employeeCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${employees} 
          WHERE ${employees.departmentId} = ${departments.id}
        )`,
      })
      .from(departments)
      .where(eq(departments.isActive, true));

    // Retornar lista plana (sin jerarquía de subdepartamentos)
    return allDepartments;
  }),

  // Obtener estadísticas por departamento
  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // Construir condiciones de filtrado
      const conditions = [eq(departments.isActive, true)];
      
      if (input?.startDate && input?.endDate) {
        conditions.push(
          and(
            sql`${employees.hireDate} >= ${input.startDate}`,
            sql`${employees.hireDate} <= ${input.endDate}`
          ) as any
        );
      }

      // @ts-expect-error - getDb() siempre retorna instancia válida
      const stats = await db
        .select({
          departmentId: departments.id,
          departmentName: departments.name,
          employeeCount: count(employees.id),
        })
        .from(departments)
        .leftJoin(employees, eq(employees.departmentId, departments.id))
        .where(and(...conditions))
        .groupBy(departments.id, departments.name)
        .orderBy(desc(count(employees.id)));

      return stats;
    }),
});
