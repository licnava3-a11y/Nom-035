import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { employees, evaluation360Responses, evaluation360Evaluators, evaluation360Assignments, competencies, courses } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const interventionsRouter = router({
  // Generar Plan de Intervención Personalizado para Empleado en Riesgo Crítico
  generateInterventionPlan: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        cycleId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener datos del empleado
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee || employee.length === 0) {
        throw new Error("Empleado no encontrado");
      }

      const employeeData = employee[0];

      // Obtener competencias con tendencias descendentes (últimos 3 ciclos)
      const competencyTrends = await db
        .select({
          competencyId: competencies.id,
          competencyName: competencies.name,
          requiredLevel: sql<number>`3`,
          averageRating: sql<number>`AVG(${evaluation360Responses.score})`,
        })
        .from(evaluation360Responses)
        .innerJoin(
          evaluation360Evaluators,
          eq(evaluation360Responses.evaluatorId, evaluation360Evaluators.id)
        )
        .innerJoin(
          evaluation360Assignments,
          eq(evaluation360Evaluators.assignmentId, evaluation360Assignments.id)
        )
        .innerJoin(
          competencies,
          eq(evaluation360Responses.competencyId, competencies.id)
        )
        .where(
          and(
            eq(evaluation360Assignments.evaluatedEmployeeId, input.employeeId),
            eq(evaluation360Assignments.cycleId, input.cycleId)
          )
        )
        .groupBy(competencies.id, competencies.name, sql<number>`3`);

      // Identificar competencias críticas (brecha > 1.5)
      const criticalCompetencies = competencyTrends.filter((comp: any) => comp.requiredLevel - comp.averageRating > 1.5
      );

      // Generar recomendaciones de cursos (mock - en producción conectar con catálogo real)
      const courseRecommendations = criticalCompetencies.map((comp: any) => ({
        competencyName: comp.competencyName,
        gap: (comp.requiredLevel - comp.averageRating).toFixed(2),
        recommendedCourses: [
          {
            courseName: `Taller Intensivo de ${comp.competencyName}`,
            duration: "40 horas",
            modality: "Presencial",
            priority: "Alta",
          },
          {
            courseName: `Curso en Línea: ${comp.competencyName} Avanzado`,
            duration: "20 horas",
            modality: "En línea",
            priority: "Media",
          },
        ],
      }));

      // Asignar mentor (empleado con mejor desempeño en competencias críticas del mismo departamento)
      const potentialMentors = await db
        .select({
          mentorId: employees.id,
          mentorName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          averageRating: sql<number>`AVG(${evaluation360Responses.score})`,
        })
        .from(employees)
        .innerJoin(
          evaluation360Assignments,
          eq(employees.id, evaluation360Assignments.evaluatedEmployeeId)
        )
        .innerJoin(
          evaluation360Evaluators,
          eq(evaluation360Assignments.id, evaluation360Evaluators.assignmentId)
        )
        .innerJoin(
          evaluation360Responses,
          eq(evaluation360Evaluators.id, evaluation360Responses.evaluatorId)
        )
        .where(
          and(
            eq(employees.departmentId, employeeData.departmentId!),
            sql`${employees.id} != ${input.employeeId}`,
            eq(evaluation360Assignments.cycleId, input.cycleId)
          )
        )
        .groupBy(employees.id, employees.firstName, employees.lastName)
        .orderBy(sql<number>`AVG(${evaluation360Responses.score}) DESC`)
        .limit(1);

      const assignedMentor = potentialMentors[0] || null;

      // Generar plan de seguimiento trimestral
      const followUpPlan = [
        {
          quarter: "Q1",
          month: "Mes 1-3",
          activities: [
            "Inicio de capacitación intensiva",
            "Primera sesión de mentoría",
            "Evaluación de progreso inicial",
          ],
          expectedOutcome: "Reducción de brecha en 30%",
        },
        {
          quarter: "Q2",
          month: "Mes 4-6",
          activities: [
            "Continuación de cursos en línea",
            "Sesiones de mentoría quincenales",
            "Evaluación intermedia de competencias",
          ],
          expectedOutcome: "Reducción de brecha en 50%",
        },
        {
          quarter: "Q3",
          month: "Mes 7-9",
          activities: [
            "Aplicación práctica en proyectos reales",
            "Sesiones de mentoría mensuales",
            "Evaluación final de competencias",
          ],
          expectedOutcome: "Reducción de brecha en 70%+",
        },
      ];

      // Calcular score de retención (0-100)
      const retentionScore =
        100 -
        (criticalCompetencies.reduce(
          (sum, comp) => sum + (comp.requiredLevel - comp.averageRating),
          0
        ) /
          criticalCompetencies.length) *
          25;

      // Determinar nivel de riesgo
      const riskLevel =
        retentionScore < 30
          ? "crítico"
          : retentionScore < 50
          ? "alto"
          : retentionScore < 70
          ? "medio"
          : "bajo";

      // Guardar plan en la base de datos
      const planResult = await db.execute(sql`
        INSERT INTO intervention_plans (
          employee_id, cycle_id, retention_score, risk_level, 
          critical_competencies_count, assigned_mentor_id, 
          course_recommendations, follow_up_plan, created_by
        ) VALUES (
          ${input.employeeId}, ${input.cycleId}, ${retentionScore.toFixed(2)}, ${riskLevel},
          ${criticalCompetencies.length}, ${assignedMentor?.mentorId || null},
          ${JSON.stringify(courseRecommendations)}, ${JSON.stringify(followUpPlan)}, ${1}
        )
      `);

      // Enviar alerta al propietario si score < 30 (riesgo crítico)
      if (retentionScore < 30) {
        await notifyOwner({
          title: `⚠️ Empleado en Riesgo Crítico de Rotación`,
          content: `El empleado ${employeeData.firstName} ${employeeData.lastName} (ID: ${employeeData.id}) tiene un score de retención de ${retentionScore.toFixed(1)}%. Se ha generado un plan de intervención personalizado con ${criticalCompetencies.length} competencias críticas identificadas.`,
        });
      }

      return {
        employeeId: input.employeeId,
        employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
        retentionScore: retentionScore.toFixed(1),
        riskLevel:
          retentionScore < 30
            ? "crítico"
            : retentionScore < 50
            ? "alto"
            : retentionScore < 70
            ? "medio"
            : "bajo",
        criticalCompetencies: criticalCompetencies.length,
        courseRecommendations: courseRecommendations,
        assignedMentor: assignedMentor
          ? {
              mentorId: assignedMentor.mentorId,
              mentorName: assignedMentor.mentorName,
              averageRating: assignedMentor.averageRating.toFixed(2),
            }
          : null,
        followUpPlan: followUpPlan,
        createdAt: new Date().toISOString(),
      };
    }),

  // Obtener Historial de Intervenciones de un Empleado
  getEmployeeInterventions: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
      })
    )
    .query(async ({ input }) => {
      // Mock - en producción conectar con tabla de intervenciones
      return {
        employeeId: input.employeeId,
        interventions: [
          {
            id: 1,
            createdAt: "2025-01-15",
            riskLevel: "crítico",
            retentionScore: 28,
            status: "en_progreso",
            completedActivities: 3,
            totalActivities: 9,
          },
        ],
      };
    }),
});
