import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql, or, like } from "drizzle-orm";
import { getDb } from "../db";
import { sendCriticalGapsNotification } from "../lib/email-sender";
import {
  trainingNeeds,
  employees,
  performanceEvaluations,
  employeeCompetencies,
  jobPositions,
  jobProfiles,
  positions,
  departments,
} from "../../drizzle/schema";

// Schema para crear necesidad de capacitación
const createTrainingNeedSchema = z.object({
  employeeId: z.number(),
  competencyName: z.string(),
  competencyType: z.enum(["tecnica", "transversal", "conocimiento"]),
  currentLevel: z.enum([
    "ninguno",
    "basico",
    "intermedio",
    "avanzado",
    "experto",
  ]),
  requiredLevel: z.enum(["basico", "intermedio", "avanzado", "experto"]),
  gap: z.number(),
  priority: z.enum(["baja", "media", "alta", "critica"]),
  status: z
    .enum(["pendiente", "en_proceso", "completada", "cancelada"])
    .default("pendiente"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

// Schema para actualizar necesidad
const updateTrainingNeedSchema = z.object({
  id: z.number(),
  competencyName: z.string().optional(),
  competencyType: z.enum(["tecnica", "transversal", "conocimiento"]).optional(),
  currentLevel: z
    .enum(["ninguno", "basico", "intermedio", "avanzado", "experto"])
    .optional(),
  requiredLevel: z
    .enum(["basico", "intermedio", "avanzado", "experto"])
    .optional(),
  gap: z.number().optional(),
  priority: z.enum(["baja", "media", "alta", "critica"]).optional(),
  status: z
    .enum(["pendiente", "en_proceso", "completada", "cancelada"])
    .optional(),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
  notes: z.string().optional(),
});

export const trainingNeedsRouter = router({
  // 1. Crear necesidad de capacitación
  create: protectedProcedure
    .input(createTrainingNeedSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [need] = await (db.insert(trainingNeeds) as any).values({
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Drizzle MySQL2 returns [ResultSetHeader, ...] array
      const insertId = (need as any)?.[0]?.insertId ?? (need as any)?.insertId;
      return { success: true, id: Number(insertId) };
    }),

  // 2. Actualizar necesidad
  update: protectedProcedure
    .input(updateTrainingNeedSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, ...data } = input;

      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.dueDate) {
        updateData.dueDate = new Date(data.dueDate);
      }

      if (data.completedDate) {
        updateData.completedDate = new Date(data.completedDate);
      }

      await db
        .update(trainingNeeds)
        .set(updateData)
        .where(eq(trainingNeeds.id, id));

      return { success: true };
    }),

  // 3. Eliminar necesidad
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db.delete(trainingNeeds).where(eq(trainingNeeds.id, input.id));
      return { success: true };
    }),

  // 4. Obtener por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const results = await db
        .select({
          id: trainingNeeds.id,
          employeeId: trainingNeeds.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          competencyName: trainingNeeds.competencyName,
          competencyType: trainingNeeds.competencyType,
          currentLevel: trainingNeeds.currentLevel,
          requiredLevel: trainingNeeds.requiredLevel,
          gap: trainingNeeds.gap,
          priority: trainingNeeds.priority,
          status: trainingNeeds.status,
          dueDate: trainingNeeds.dueDate,
          completedDate: trainingNeeds.completedDate,
          notes: trainingNeeds.notes,
          recommendedCourseId: trainingNeeds.recommendedCourseId,
          createdAt: trainingNeeds.createdAt,
        })
        .from(trainingNeeds)
        .leftJoin(employees, eq(trainingNeeds.employeeId, employees.id))
        .where(eq(trainingNeeds.id, input.id))
        .limit(1);

      if (results.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Necesidad de capacitación no encontrada",
        });
      }

      return results[0];
    }),

  // 5. Listar con filtros
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["pendiente", "en_proceso", "completada", "cancelada"])
          .optional(),
        priority: z.enum(["baja", "media", "alta", "critica"]).optional(),
        employeeId: z.number().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [];

      if (input.status) {
        conditions.push(eq(trainingNeeds.status, input.status));
      }

      if (input.priority) {
        conditions.push(eq(trainingNeeds.priority, input.priority));
      }

      if (input.employeeId) {
        conditions.push(eq(trainingNeeds.employeeId, input.employeeId));
      }

      if (input.search) {
        conditions.push(
          or(
            like(trainingNeeds.competencyName, `%${input.search}%`),
            like(
              sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
              `%${input.search}%`
            )
          )!
        );
      }

      const results = await db
        .select({
          id: trainingNeeds.id,
          employeeId: trainingNeeds.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          competencyName: trainingNeeds.competencyName,
          competencyType: trainingNeeds.competencyType,
          currentLevel: trainingNeeds.currentLevel,
          requiredLevel: trainingNeeds.requiredLevel,
          gap: trainingNeeds.gap,
          priority: trainingNeeds.priority,
          status: trainingNeeds.status,
          dueDate: trainingNeeds.dueDate,
          createdAt: trainingNeeds.createdAt,
        })
        .from(trainingNeeds)
        .leftJoin(employees, eq(trainingNeeds.employeeId, employees.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(trainingNeeds.createdAt));

      return results;
    }),

  // 6. Generar desde evaluación de desempeño
  generateFromPerformanceEvaluation: protectedProcedure
    .input(z.object({ evaluationId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener evaluación
      const [evaluation] = await db
        .select()
        .from(performanceEvaluations)
        .where(eq(performanceEvaluations.id, input.evaluationId))
        .limit(1);

      if (!evaluation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evaluación no encontrada",
        });
      }

      // Obtener empleado desde userId
      const [employee] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          userId: employees.userId,
          departmentId: employees.departmentId,
          positionId: employees.positionId,
          departmentName: departments.name,
          positionName: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.userId, evaluation.userId))
        .limit(1);

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // Obtener competencias del empleado
      const employeeComps = await db
        .select()
        .from(employeeCompetencies)
        .where(eq(employeeCompetencies.employeeId, employee.id));

      // Obtener perfil de puesto
      const [position] = await db
        .select()
        .from(jobPositions)
        .where(sql`${jobPositions.positionName} = ${employee.positionName}`)
        .limit(1);

      if (!position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Perfil de puesto no encontrado",
        });
      }

      // Obtener competencias requeridas
      const requiredComps = await db
        .select()
        .from(jobProfiles)
        .where(eq(jobProfiles.positionId, position.id));

      // Calcular brechas
      const needs = [];
      for (const required of requiredComps) {
        const current = employeeComps.find(
          (c: any) => c.competencyName === required.competencyName
        );
        const currentLevelNum = current
          ? getLevelNumber(current.currentLevel)
          : 0;
        const requiredLevelNum = getLevelNumber(required.requiredLevel);
        const gap = requiredLevelNum - currentLevelNum;

        if (gap > 0) {
          needs.push({
            employeeId: employee.id,
            competencyName: required.competencyName,
            competencyType: required.competencyType,
            currentLevel: (current?.currentLevel || "ninguno") as
              | "ninguno"
              | "basico"
              | "intermedio"
              | "avanzado"
              | "experto",
            requiredLevel: required.requiredLevel,
            gap,
            priority: (gap >= 3 ? "critica" : gap >= 2 ? "alta" : "media") as
              | "baja"
              | "media"
              | "alta"
              | "critica",
            status: "pendiente" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Insertar necesidades
      if (needs.length > 0) {
        await (db.insert(trainingNeeds) as any).values(needs);
      }

      return { success: true, count: needs.length };
    }),

  // 7. Obtener brechas críticas (top 3 competencias con mayor brecha organizacional)
  getCriticalGaps: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    // Obtener top 3 competencias con mayor brecha promedio
    const results = await db
      .select({
        competencyName: trainingNeeds.competencyName,
        competencyType: trainingNeeds.competencyType,
        avgGap: sql<number>`AVG(${trainingNeeds.gap})`,
        affectedEmployees: sql<number>`COUNT(DISTINCT ${trainingNeeds.employeeId})`,
        criticalCount: sql<number>`SUM(CASE WHEN ${trainingNeeds.priority} = 'critica' THEN 1 ELSE 0 END)`,
      })
      .from(trainingNeeds)
      .where(eq(trainingNeeds.status, "pendiente"))
      .groupBy(trainingNeeds.competencyName, trainingNeeds.competencyType)
      .orderBy(
        desc(sql`AVG(${trainingNeeds.gap})`),
        desc(sql`COUNT(DISTINCT ${trainingNeeds.employeeId})`)
      )
      .limit(3);

    // Enviar notificación si hay brechas críticas
    if (results.length > 0) {
      const ownerEmail = process.env.OWNER_EMAIL || "admin@example.com";
      try {
        await sendCriticalGapsNotification(
          ownerEmail,
          results.map(r => ({
            competency: r.competencyName,
            avgGap: Number(r.avgGap),
            affectedEmployees: Number(r.affectedEmployees),
          }))
        );
      } catch (error) {
        console.error(
          "Error al enviar notificación de brechas críticas:",
          error
        );
        // No lanzar error, solo registrar en consola
      }
    }

    // MySQL returns aggregate functions as strings, convert to numbers
    return results.map(r => ({
      ...r,
      avgGap: Number(r.avgGap),
      affectedEmployees: Number(r.affectedEmployees),
      criticalCount: Number(r.criticalCount),
    }));
  }),

  // 8. Generar desde matriz de habilidades
  generateFromSkillsMatrix: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener empleado
      const [employee] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          userId: employees.userId,
          departmentId: employees.departmentId,
          positionId: employees.positionId,
          departmentName: departments.name,
          positionName: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // Obtener competencias del empleado
      const employeeComps = await db
        .select()
        .from(employeeCompetencies)
        .where(eq(employeeCompetencies.employeeId, employee.id));

      // Obtener perfil de puesto
      const [position] = await db
        .select()
        .from(jobPositions)
        .where(sql`${jobPositions.positionName} = ${employee.positionName}`)
        .limit(1);

      if (!position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Perfil de puesto no encontrado",
        });
      }

      // Obtener competencias requeridas
      const requiredComps = await db
        .select()
        .from(jobProfiles)
        .where(eq(jobProfiles.positionId, position.id));

      // Calcular brechas
      const needs = [];
      for (const required of requiredComps) {
        const current = employeeComps.find(
          (c: any) => c.competencyName === required.competencyName
        );
        const currentLevelNum = current
          ? getLevelNumber(current.currentLevel)
          : 0;
        const requiredLevelNum = getLevelNumber(required.requiredLevel);
        const gap = requiredLevelNum - currentLevelNum;

        if (gap > 0) {
          needs.push({
            employeeId: employee.id,
            competencyName: required.competencyName,
            competencyType: required.competencyType,
            currentLevel: (current?.currentLevel || "ninguno") as
              | "ninguno"
              | "basico"
              | "intermedio"
              | "avanzado"
              | "experto",
            requiredLevel: required.requiredLevel,
            gap,
            priority: (gap >= 3 ? "critica" : gap >= 2 ? "alta" : "media") as
              | "baja"
              | "media"
              | "alta"
              | "critica",
            status: "pendiente" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Insertar necesidades
      if (needs.length > 0) {
        await (db.insert(trainingNeeds) as any).values(needs);
      }

      return { success: true, count: needs.length };
    }),
});

// Helper para convertir nivel a número
function getLevelNumber(level: string): number {
  const levels: Record<string, number> = {
    ninguno: 0,
    basico: 1,
    intermedio: 2,
    avanzado: 3,
    experto: 4,
  };
  return levels[level] || 0;
}
