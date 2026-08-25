import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { evaluations, nineBoxEvaluations, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Función auxiliar para calcular cuadrante y etiqueta según scores
 * Matriz 3x3: Performance (eje X) vs Potential (eje Y)
 *
 * Cuadrantes:
 * 7 (Alto-Bajo) | 8 (Alto-Medio) | 9 (Alto-Alto) "High Potential"
 * 4 (Medio-Bajo) | 5 (Medio-Medio) "Core" | 6 (Medio-Alto) "Emerging Talent"
 * 1 (Bajo-Bajo) "Under Performer" | 2 (Bajo-Medio) | 3 (Bajo-Alto) "Inconsistent"
 */
function calculateQuadrant(
  performanceScore: number,
  potentialScore: number
): { quadrant: number; label: string; developmentPlan: string } {
  // Validar rangos (1-3)
  if (
    performanceScore < 1 ||
    performanceScore > 3 ||
    potentialScore < 1 ||
    potentialScore > 3
  ) {
    throw new Error("Performance and potential scores must be between 1 and 3");
  }

  // Calcular cuadrante (1-9)
  const quadrant = (potentialScore - 1) * 3 + performanceScore;

  // Asignar etiqueta y plan de desarrollo según cuadrante
  const quadrantData: Record<
    number,
    { label: string; developmentPlan: string }
  > = {
    1: {
      label: "Under Performer",
      developmentPlan:
        "Plan de Mejora del Desempeño (PIP): Establecer objetivos claros y medibles. Coaching intensivo. Evaluar fit organizacional en 3-6 meses.",
    },
    2: {
      label: "Low Performer",
      developmentPlan:
        "Desarrollo de habilidades técnicas. Mentoría para mejorar desempeño. Clarificar expectativas del rol.",
    },
    3: {
      label: "Inconsistent Performer",
      developmentPlan:
        "Identificar barreras de desempeño. Coaching para consistencia. Evaluar alineación rol-fortalezas.",
    },
    4: {
      label: "Solid Contributor",
      developmentPlan:
        "Reconocimiento de contribuciones. Desarrollo de habilidades especializadas. Proyectos de ampliación de responsabilidades.",
    },
    5: {
      label: "Core Performer",
      developmentPlan:
        "Backbone de la organización. Desarrollo continuo. Proyectos desafiantes. Reconocimiento y retención.",
    },
    6: {
      label: "Emerging Talent",
      developmentPlan:
        "Desarrollo acelerado. Mentoría con líderes senior. Proyectos estratégicos. Plan de carrera a mediano plazo.",
    },
    7: {
      label: "Solid Professional",
      developmentPlan:
        "Experto técnico. Desarrollo de habilidades de liderazgo. Oportunidades de mentoría a otros.",
    },
    8: {
      label: "High Performer",
      developmentPlan:
        "Desarrollo de liderazgo. Proyectos de alto impacto. Preparación para roles de mayor responsabilidad.",
    },
    9: {
      label: "High Potential",
      developmentPlan:
        "Fast-track de desarrollo. Exposición ejecutiva. Proyectos estratégicos críticos. Sucesión para roles clave.",
    },
  };

  return {
    quadrant,
    label: quadrantData[quadrant].label,
    developmentPlan: quadrantData[quadrant].developmentPlan,
  };
}

export const nineBoxRouter = router({
  /**
   * Crear nueva evaluación Nine Box
   */
  create: protectedProcedure
    .input(
      z.object({
        employeeId: z
          .number()
          .int()
          .positive({ message: "ID de empleado inválido" }),
        performanceScore: z.number().int().min(1).max(3, {
          message: "Score de desempeño debe ser 1-3 (Bajo/Medio/Alto)",
        }),
        potentialScore: z.number().int().min(1).max(3, {
          message: "Score de potencial debe ser 1-3 (Bajo/Medio/Alto)",
        }),
        evaluationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
          message: "Formato de fecha inválido (YYYY-MM-DD)",
        }),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not initialized");

        // Calcular cuadrante y etiqueta automáticamente
        const { quadrant, label, developmentPlan } = calculateQuadrant(
          input.performanceScore,
          input.potentialScore
        );

        // Insertar evaluación
        const [result] = await (db.insert(nineBoxEvaluations) as any).values({
          employeeId: input.employeeId,
          performanceScore: input.performanceScore,
          potentialScore: input.potentialScore,
          quadrant,
          quadrantLabel: label,
          developmentPlan,
          evaluationDate: input.evaluationDate,
          evaluatedBy: ctx.user.id,
          notes: input.notes || null,
        });

        return {
          success: true,
          evaluationId: result.insertId,
          quadrant,
          quadrantLabel: label,
          developmentPlan,
        };
      } catch (error) {
        console.error("[nineBox.create] Error:", error);
        throw new Error("Error al crear evaluación Nine Box");
      }
    }),

  /**
   * Obtener matriz completa de evaluaciones (todos los empleados)
   */
  getMatrix: protectedProcedure
    .input(
      z
        .object({
          departamento: z.string().optional(),
          includeLatestOnly: z.boolean().default(true), // Solo última evaluación por empleado
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not initialized");

        // Subquery para obtener ID de última evaluación por empleado
        const latestEvaluations = db
          .select({
            employeeId: nineBoxEvaluations.employeeId,
            maxDate: sql<string>`MAX(${nineBoxEvaluations.evaluationDate})`.as(
              "max_date"
            ),
          })
          .from(nineBoxEvaluations)
          .groupBy(nineBoxEvaluations.employeeId)
          .as("latest");

        // Query principal con JOIN a users
        let query: any = db
          .select({
            id: nineBoxEvaluations.id,
            employeeId: nineBoxEvaluations.employeeId,
            employeeName: users.name,
            employeeDepartamento: users.departamento,
            employeePuesto: users.puesto,
            performanceScore: nineBoxEvaluations.performanceScore,
            potentialScore: nineBoxEvaluations.potentialScore,
            quadrant: nineBoxEvaluations.quadrant,
            quadrantLabel: nineBoxEvaluations.quadrantLabel,
            developmentPlan: nineBoxEvaluations.developmentPlan,
            evaluationDate: nineBoxEvaluations.evaluationDate,
            notes: nineBoxEvaluations.notes,
          })
          .from(nineBoxEvaluations)
          .leftJoin(users, eq(nineBoxEvaluations.employeeId, users.id));

        // Filtrar por departamento si se especifica
        if (input?.departamento) {
          query = query.where(eq(users.departamento, input.departamento));
        }

        // Si solo queremos última evaluación, hacer JOIN con subquery
        if (input?.includeLatestOnly) {
          query = query.innerJoin(
            latestEvaluations,
            and(
              eq(nineBoxEvaluations.employeeId, latestEvaluations.employeeId),
              sql`${nineBoxEvaluations.evaluationDate} = ${latestEvaluations.maxDate}`
            )
          );
        }

        const evaluations = await query.orderBy(
          desc(nineBoxEvaluations.evaluationDate)
        );

        return {
          evaluations,
          totalEmployees: evaluations.length,
        };
      } catch (error) {
        console.error("[nineBox.getMatrix] Error:", error);
        throw new Error("Error al obtener matriz Nine Box");
      }
    }),

  /**
   * Obtener distribución de empleados por cuadrante
   */
  getDistribution: protectedProcedure
    .input(
      z
        .object({
          departamento: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not initialized");

        // Subquery para última evaluación por empleado
        const latestEvaluations = db
          .select({
            employeeId: nineBoxEvaluations.employeeId,
            maxDate: sql<string>`MAX(${nineBoxEvaluations.evaluationDate})`.as(
              "max_date"
            ),
          })
          .from(nineBoxEvaluations)
          .groupBy(nineBoxEvaluations.employeeId)
          .as("latest");

        // Query de distribución
        let query: any = db
          .select({
            quadrant: nineBoxEvaluations.quadrant,
            quadrantLabel: nineBoxEvaluations.quadrantLabel,
            count: sql<number>`COUNT(*)`.as("count"),
          })
          .from(nineBoxEvaluations)
          .innerJoin(
            latestEvaluations,
            and(
              eq(nineBoxEvaluations.employeeId, latestEvaluations.employeeId),
              sql`${nineBoxEvaluations.evaluationDate} = ${latestEvaluations.maxDate}`
            )
          )
          .leftJoin(users, eq(nineBoxEvaluations.employeeId, users.id));

        // Filtrar por departamento si se especifica
        if (input?.departamento) {
          query = query.where(eq(users.departamento, input.departamento));
        }

        const distribution = await query.groupBy(
          nineBoxEvaluations.quadrant,
          nineBoxEvaluations.quadrantLabel
        );

        // Calcular total y porcentajes
        const total = distribution.reduce(
          (sum: any, item: any) => sum + item.count,
          0
        );
        const distributionWithPercentages = distribution.map((item: any) => ({
          ...item,
          percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
        }));

        return {
          distribution: distributionWithPercentages,
          totalEmployees: total,
        };
      } catch (error) {
        console.error("[nineBox.getDistribution] Error:", error);
        throw new Error("Error al obtener distribución Nine Box");
      }
    }),

  /**
   * Obtener evaluaciones de un empleado específico (historial)
   */
  getByEmployee: protectedProcedure
    .input(
      z.object({
        employeeId: z
          .number()
          .int()
          .positive({ message: "ID de empleado inválido" }),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not initialized");

        const evaluations = await db
          .select({
            id: nineBoxEvaluations.id,
            performanceScore: nineBoxEvaluations.performanceScore,
            potentialScore: nineBoxEvaluations.potentialScore,
            quadrant: nineBoxEvaluations.quadrant,
            quadrantLabel: nineBoxEvaluations.quadrantLabel,
            developmentPlan: nineBoxEvaluations.developmentPlan,
            evaluationDate: nineBoxEvaluations.evaluationDate,
            notes: nineBoxEvaluations.notes,
            evaluatorName: users.name,
          })
          .from(nineBoxEvaluations)
          .leftJoin(users, eq(nineBoxEvaluations.evaluatedBy, users.id))
          .where(eq(nineBoxEvaluations.employeeId, input.employeeId))
          .orderBy(desc(nineBoxEvaluations.evaluationDate));

        return {
          evaluations,
          totalEvaluations: evaluations.length,
        };
      } catch (error) {
        console.error("[nineBox.getByEmployee] Error:", error);
        throw new Error("Error al obtener evaluaciones del empleado");
      }
    }),

  /**
   * Actualizar evaluación existente
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive({ message: "ID de evaluación inválido" }),
        performanceScore: z.number().int().min(1).max(3).optional(),
        potentialScore: z.number().int().min(1).max(3).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not initialized");

        // Obtener evaluación actual
        const [current] = await db
          .select()
          .from(nineBoxEvaluations)
          .where(eq(nineBoxEvaluations.id, input.id))
          .limit(1);

        if (!current) {
          throw new Error("Evaluación no encontrada");
        }

        // Calcular nuevos valores si cambiaron los scores
        const newPerformance =
          input.performanceScore ?? current.performanceScore;
        const newPotential = input.potentialScore ?? current.potentialScore;
        const { quadrant, label, developmentPlan } = calculateQuadrant(
          newPerformance,
          newPotential
        );

        // Actualizar
        await db
          .update(nineBoxEvaluations)
          .set({
            performanceScore: newPerformance,
            potentialScore: newPotential,
            quadrant,
            quadrantLabel: label,
            developmentPlan,
            notes: input.notes ?? current.notes,
          } as any)
          .where(eq(nineBoxEvaluations.id, input.id));

        return {
          success: true,
          quadrant,
          quadrantLabel: label,
        };
      } catch (error) {
        console.error("[nineBox.update] Error:", error);
        throw new Error("Error al actualizar evaluación Nine Box");
      }
    }),

  /**
   * Eliminar evaluación
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive({ message: "ID de evaluación inválido" }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not initialized");

        await db
          .delete(nineBoxEvaluations)
          .where(eq(nineBoxEvaluations.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("[nineBox.delete] Error:", error);
        throw new Error("Error al eliminar evaluación Nine Box");
      }
    }),
});
