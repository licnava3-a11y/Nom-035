/**
 * Router: turnoverManagement
 * Gestión manual de registros de rotación de empleados
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { employeeTurnoverHistory, users } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const turnoverManagementRouter = router({
  /**
   * Query: getAllTurnoverRecords
   * Obtener todos los registros de rotación con información del empleado
   */
  getAllTurnoverRecords: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const records = await db!
        .select({
          id: employeeTurnoverHistory.id,
          userId: employeeTurnoverHistory.userId,
          exitDate: employeeTurnoverHistory.exitDate,
          exitReason: employeeTurnoverHistory.exitReason,
          wasHighRisk: employeeTurnoverHistory.wasHighRisk,
          riskScoreAtExit: employeeTurnoverHistory.riskScoreAtExit,
          createdAt: employeeTurnoverHistory.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(employeeTurnoverHistory)
        .leftJoin(users, eq(employeeTurnoverHistory.userId, users.id))
        .orderBy(desc(employeeTurnoverHistory.exitDate))
        .limit(input.limit)
        .offset(input.offset);

      const totalCount = await db!
        .select({ count: employeeTurnoverHistory.id })
        .from(employeeTurnoverHistory);

      return {
        records,
        total: totalCount.length,
      };
    }),

  /**
   * Mutation: createTurnoverRecord
   * Crear nuevo registro de rotación con validación de duplicados
   */
  createTurnoverRecord: adminProcedure
    .input(
      z.object({
        userId: z.number({ message: "Empleado requerido" }),
        exitDate: z.string({ message: "Fecha de salida requerida" }),
        exitReason: z.enum(["voluntary", "involuntary", "retirement"], {
          message: "Razón de salida inválida",
        }),
        riskScoreAtExit: z
          .number()
          .min(0)
          .max(100)
          .default(50)
          .describe("Puntuación de riesgo al momento de salida (0-100)"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validar que el empleado existe
      const employee = await db!.select().from(users).where(eq(users.id, input.userId)).limit(1);

      if (employee.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // Validar duplicados: mismo empleado con fecha de salida similar (±7 días)
      const exitDate = new Date(input.exitDate);
      const sevenDaysBefore = new Date(exitDate);
      sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
      const sevenDaysAfter = new Date(exitDate);
      sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 7);

      const existingRecords = await db!
        .select()
        .from(employeeTurnoverHistory)
        .where(
          and(
            eq(employeeTurnoverHistory.userId, input.userId),
            // Nota: Drizzle no tiene operadores de rango directo, usamos lógica en memoria
          )
        );

      const duplicate = existingRecords.find((record: any) => {
        const recordDate = new Date(record.exitDate);
        return recordDate >= sevenDaysBefore && recordDate <= sevenDaysAfter;
      });

      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un registro de rotación para este empleado en fechas similares",
        });
      }

      // Determinar si era alto riesgo (>= 70)
      const wasHighRisk = input.riskScoreAtExit >= 70;

      // Insertar registro
      const [newRecord] = await db!
        .insert(employeeTurnoverHistory)
        .values({
          userId: input.userId,
          exitDate: new Date(input.exitDate),
          exitReason: input.exitReason,
          wasHighRisk,
          riskScoreAtExit: input.riskScoreAtExit,
        })
        .$returningId();

      return {
        success: true,
        recordId: newRecord.id,
        message: "Registro de rotación creado exitosamente",
      };
    }),

  /**
   * Mutation: updateTurnoverRecord
   * Actualizar registro de rotación existente
   */
  updateTurnoverRecord: adminProcedure
    .input(
      z.object({
        id: z.number({ message: "ID de registro requerido" }),
        exitDate: z.string().optional(),
        exitReason: z.enum(["voluntary", "involuntary", "retirement"]).optional(),
        riskScoreAtExit: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar que el registro existe
      const existingRecord = await db!
        .select()
        .from(employeeTurnoverHistory)
        .where(eq(employeeTurnoverHistory.id, input.id))
        .limit(1);

      if (existingRecord.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registro de rotación no encontrado",
        });
      }

      // Preparar valores a actualizar
      const updates: any = {};
      if (input.exitDate) updates.exitDate = new Date(input.exitDate);
      if (input.exitReason) updates.exitReason = input.exitReason;
      if (input.riskScoreAtExit !== undefined) {
        updates.riskScoreAtExit = input.riskScoreAtExit;
        updates.wasHighRisk = input.riskScoreAtExit >= 70;
      }

      // Actualizar registro
      await db!.update(employeeTurnoverHistory).set(updates).where(eq(employeeTurnoverHistory.id, input.id));

      return {
        success: true,
        message: "Registro de rotación actualizado exitosamente",
      };
    }),

  /**
   * Mutation: deleteTurnoverRecord
   * Eliminar registro de rotación
   */
  deleteTurnoverRecord: adminProcedure
    .input(
      z.object({
        id: z.number({ message: "ID de registro requerido" }),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar que el registro existe
      const existingRecord = await db!
        .select()
        .from(employeeTurnoverHistory)
        .where(eq(employeeTurnoverHistory.id, input.id))
        .limit(1);

      if (existingRecord.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registro de rotación no encontrado",
        });
      }

      // Eliminar registro
      await db!.delete(employeeTurnoverHistory).where(eq(employeeTurnoverHistory.id, input.id));

      return {
        success: true,
        message: "Registro de rotación eliminado exitosamente",
      };
    }),
});
