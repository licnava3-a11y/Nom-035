import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { employees, surveyPeriods, surveyResponses, surveyTokens, surveys, users } from "../../drizzle/schema";
import { eq, and, sql, gte, lte, isNull } from "drizzle-orm";
import crypto from "crypto";

// Función para generar token único
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const surveyPeriodsRouter = router({
  /**
   * Crear nuevo periodo de aplicación de encuesta
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "El nombre es requerido"),
      surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
      startDate: z.string(), // Formato: YYYY-MM-DD
      endDate: z.string(),
      description: z.string().optional(),
      generateTokens: z.boolean().default(false), // Si true, genera tokens para trabajadores activos
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Validar que la fecha de fin sea posterior a la fecha de inicio
      if (new Date(input.endDate) <= new Date(input.startDate)) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "La fecha de fin debe ser posterior a la fecha de inicio" 
        });
      }

      // Crear el periodo
      const [period] = await (db.insert(surveyPeriods) as any).values({
        name: input.name,
        surveyType: input.surveyType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        description: input.description,
        status: "draft",
        createdBy: ctx.user.id,
      });

      const periodId = period.insertId;

      // Si se solicita, generar tokens para trabajadores activos
      if (input.generateTokens) {
        // Obtener trabajadores activos (rol student)
        const activeEmployees = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.role, "student"));

        // Obtener la encuesta correspondiente al tipo
        const [survey] = await db
          .select()
          .from(surveys)
          .where(eq(surveys.type, input.surveyType))
          .limit(1);

        if (!survey) {
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: `No se encontró la encuesta de tipo ${input.surveyType}` 
          });
        }

        // Generar tokens para cada trabajador
        const tokenValues = activeEmployees.map(employee => ({
          periodId: periodId,
          userId: employee.id,
          surveyId: survey.id,
          token: generateToken(),
          expiresAt: new Date(input.endDate),
          sentVia: null,
        }));

        if (tokenValues.length > 0) {
          await (db.insert(surveyTokens) as any).values(tokenValues);
        }

        return {
          success: true,
          periodId,
          tokensGenerated: tokenValues.length,
          message: `Periodo creado exitosamente con ${tokenValues.length} tokens generados`,
        };
      }

      return {
        success: true,
        periodId,
        message: "Periodo creado exitosamente",
      };
    }),

  /**
   * Obtener lista de periodos
   */
  list: protectedProcedure
    .input(z.object({
      surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]).optional(),
      status: z.enum(["draft", "active", "closed", "archived"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let query = db
        .select({
          id: surveyPeriods.id,
          name: surveyPeriods.name,
          surveyType: surveyPeriods.surveyType,
          startDate: surveyPeriods.startDate,
          endDate: surveyPeriods.endDate,
          status: surveyPeriods.status,
          description: surveyPeriods.description,
          createdAt: surveyPeriods.createdAt,
          creatorName: users.name,
        })
        .from(surveyPeriods)
        .leftJoin(users, eq(surveyPeriods.createdBy, users.id));

      const conditions = [];
      if (input.surveyType) {
        conditions.push(eq(surveyPeriods.surveyType, input.surveyType));
      }
      if (input.status) {
        conditions.push(eq(surveyPeriods.status, input.status));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const periods = await query;

      // Obtener estadísticas para cada periodo
      const periodsWithStats = await Promise.all(
        periods.map(async (period) => {
          const [tokensCount] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(surveyTokens)
            .where(eq(surveyTokens.periodId, period.id));

          const [responsesCount] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(surveyResponses)
            .where(
              and(
                eq(surveyResponses.periodId, period.id),
                sql`${surveyResponses.completedAt} IS NOT NULL`
              )
            );

          return {
            ...period,
            totalTokens: tokensCount?.count || 0,
            totalResponses: responsesCount?.count || 0,
            completionRate: tokensCount?.count 
              ? Math.round(((responsesCount?.count || 0) / tokensCount.count) * 100)
              : 0,
          };
        })
      );

      return periodsWithStats;
    }),

  /**
   * Obtener detalles de un periodo específico
   */
  getById: protectedProcedure
    .input(z.number())
    .query(async ({ input: periodId }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [period] = await db
        .select({
          id: surveyPeriods.id,
          name: surveyPeriods.name,
          surveyType: surveyPeriods.surveyType,
          startDate: surveyPeriods.startDate,
          endDate: surveyPeriods.endDate,
          status: surveyPeriods.status,
          description: surveyPeriods.description,
          createdAt: surveyPeriods.createdAt,
          creatorName: users.name,
        })
        .from(surveyPeriods)
        .leftJoin(users, eq(surveyPeriods.createdBy, users.id))
        .where(eq(surveyPeriods.id, periodId))
        .limit(1);

      if (!period) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Periodo no encontrado" });
      }

      // Obtener trabajadores asignados con estado de respuesta
      const assignedEmployees = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          departamento: users.departamento,
          puesto: users.puesto,
          token: surveyTokens.token,
          tokenUsedAt: surveyTokens.usedAt,
          responseCompletedAt: surveyResponses.completedAt,
        })
        .from(surveyTokens)
        .innerJoin(users, eq(surveyTokens.userId, users.id))
        .leftJoin(
          surveyResponses,
          and(
            eq(surveyResponses.periodId, periodId),
            eq(surveyResponses.userId, users.id)
          )
        )
        .where(eq(surveyTokens.periodId, periodId));

      return {
        ...period,
        assignedEmployees,
      };
    }),

  /**
   * Actualizar periodo
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["draft", "active", "closed", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...inputData } = input;

      // Preparar datos de actualización con conversión de fechas
      const updateData: any = {};
      if (inputData.name !== undefined) updateData.name = inputData.name;
      if (inputData.description !== undefined) updateData.description = inputData.description;
      if (inputData.status !== undefined) updateData.status = inputData.status;
      if (inputData.startDate !== undefined) updateData.startDate = new Date(inputData.startDate);
      if (inputData.endDate !== undefined) updateData.endDate = new Date(inputData.endDate);

      // Validar fechas si se proporcionan ambas
      if (updateData.startDate && updateData.endDate) {
        if (updateData.endDate <= updateData.startDate) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "La fecha de fin debe ser posterior a la fecha de inicio" 
          });
        }
      }

      await db
        .update(surveyPeriods)
        .set(updateData)
        .where(eq(surveyPeriods.id, id));

      return { success: true, message: "Periodo actualizado exitosamente" };
    }),

  /**
   * Eliminar periodo
   */
  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: periodId }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar si hay respuestas asociadas
      const [responsesCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(eq(surveyResponses.periodId, periodId));

      if ((responsesCount?.count || 0) > 0) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "No se puede eliminar un periodo con respuestas registradas. Considere archivarlo en su lugar." 
        });
      }

      // Eliminar tokens asociados
      await db
        .delete(surveyTokens)
        .where(eq(surveyTokens.periodId, periodId));

      // Eliminar periodo
      await db
        .delete(surveyPeriods)
        .where(eq(surveyPeriods.id, periodId));

      return { success: true, message: "Periodo eliminado exitosamente" };
    }),

  /**
   * Generar tokens para trabajadores activos en un periodo existente
   */
  generateTokens: protectedProcedure
    .input(z.object({
      periodId: z.number(),
      regenerate: z.boolean().default(false), // Si true, regenera tokens para todos
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener información del periodo
      const [period] = await db
        .select()
        .from(surveyPeriods)
        .where(eq(surveyPeriods.id, input.periodId))
        .limit(1);

      if (!period) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Periodo no encontrado" });
      }

      // Obtener la encuesta correspondiente
      const [survey] = await db
        .select()
        .from(surveys)
        .where(eq(surveys.type, period.surveyType))
        .limit(1);

      if (!survey) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: `No se encontró la encuesta de tipo ${period.surveyType}` 
        });
      }

      // Obtener trabajadores activos
      const activeEmployees = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.role, "student"));

      if (input.regenerate) {
        // Eliminar tokens existentes
        await db
          .delete(surveyTokens)
          .where(eq(surveyTokens.periodId, input.periodId));
      }

      // Obtener trabajadores que ya tienen token
      const existingTokens = await db
        .select({ userId: surveyTokens.userId })
        .from(surveyTokens)
        .where(eq(surveyTokens.periodId, input.periodId));

      const existingUserIds = new Set(existingTokens.map(t => t.userId));

      // Generar tokens solo para trabajadores sin token
      const employeesWithoutToken = activeEmployees.filter(
        emp => !existingUserIds.has(emp.id)
      );

      const tokenValues = employeesWithoutToken.map(employee => ({
        periodId: input.periodId,
        userId: employee.id,
        surveyId: survey.id,
        token: generateToken(),
        expiresAt: new Date(period.endDate),
        sentVia: null,
      }));

      if (tokenValues.length > 0) {
        await (db.insert(surveyTokens) as any).values(tokenValues);
      }

      return {
        success: true,
        tokensGenerated: tokenValues.length,
        message: `Se generaron ${tokenValues.length} tokens nuevos`,
      };
    }),

  /**
   * Obtener trabajadores activos al momento actual
   */
  getActiveEmployees: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const activeEmployees = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        curp: users.curp,
        departamento: users.departamento,
        puesto: users.puesto,
        fechaIngreso: users.fechaIngreso,
      })
      .from(users)
      .where(eq(users.role, "student"));

    return {
      total: activeEmployees.length,
      employees: activeEmployees,
    };
  }),
});
