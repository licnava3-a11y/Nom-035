import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  evaluation360Cycles,
  evaluation360Assignments,
  evaluation360Evaluators,
  evaluation360Responses,
  evaluation360Results,
  evaluation360DevelopmentPlans,
  competencies,
  employees,
  nineBoxEvaluations,
} from "../../drizzle/schema";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { generatePDFFromHTML } from "../_core/pdfGenerator";

export const performanceEvaluation360Router = router({
  /**
   * Crear un nuevo ciclo de evaluación 360°
   */
  createCycle: adminProcedure
    .input(
      z.object({
        cycleName: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string(), // ISO date
        endDate: z.string(), // ISO date
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [cycle] = await db.insert(evaluation360Cycles).values({
        cycleName: input.cycleName,
        description: input.description,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "draft",
        createdBy: ctx.user.id,
      });

      return { success: true, cycleId: cycle.insertId };
    }),

  /**
   * Obtener todos los ciclos de evaluación
   */
  getCycles: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db.select().from(evaluation360Cycles).orderBy(desc(evaluation360Cycles.createdAt));

      if (input?.status) {
        query = query.where(sql`${evaluation360Cycles.status} = ${input.status}`);
      }

      const cycles = await query;
      return cycles;
    }),

  /**
   * Asignar empleados a un ciclo de evaluación
   */
  assignEmployees: adminProcedure
    .input(
      z.object({
        cycleId: z.number(),
        employeeIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const assignments = input.employeeIds.map((employeeId) => ({
        cycleId: input.cycleId,
        evaluatedEmployeeId: employeeId,
        status: "pending" as const,
      }));

      await db.insert(evaluation360Assignments).values(assignments);

      return { success: true, assignedCount: assignments.length };
    }),

  /**
   * Asignar evaluadores a un empleado
   */
  assignEvaluators: adminProcedure
    .input(
      z.object({
        assignmentId: z.number(),
        evaluators: z.array(
          z.object({
            employeeId: z.number(),
            type: z.enum(["self", "peer", "supervisor", "subordinate", "external"]),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const evaluatorRecords = input.evaluators.map((evaluator) => ({
        assignmentId: input.assignmentId,
        evaluatorEmployeeId: evaluator.employeeId,
        evaluatorType: evaluator.type,
        status: "pending" as const,
      }));

      await db.insert(evaluation360Evaluators).values(evaluatorRecords);

      return { success: true, evaluatorsCount: evaluatorRecords.length };
    }),

  /**
   * Enviar evaluación (respuestas de un evaluador)
   */
  submitEvaluation: protectedProcedure
    .input(
      z.object({
        evaluatorId: z.number(),
        responses: z.array(
          z.object({
            competencyId: z.number(),
            competencyType: z.enum(["technical", "soft_skill", "leadership", "organizational"]),
            score: z.number().min(1).max(5),
            comments: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const responseRecords = input.responses.map((response) => ({
        evaluatorId: input.evaluatorId,
        competencyId: response.competencyId,
        competencyType: response.competencyType,
        score: response.score,
        comments: response.comments,
      }));

      await db.insert(evaluation360Responses).values(responseRecords);

      // Actualizar estado del evaluador a "completed"
      await db
        .update(evaluation360Evaluators)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(evaluation360Evaluators.id, input.evaluatorId));

      return { success: true, responsesCount: responseRecords.length };
    }),

  /**
   * Consolidar resultados de evaluación 360°
   */
  consolidateResults: adminProcedure
    .input(z.object({ assignmentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener todos los evaluadores y sus respuestas
      const evaluators = await db
        .select()
        .from(evaluation360Evaluators)
        .where(eq(evaluation360Evaluators.assignmentId, input.assignmentId));

      if (evaluators.length === 0) {
        throw new Error("No evaluators found for this assignment");
      }

      const evaluatorIds = evaluators.map((e) => e.id);

      const responses = await db
        .select()
        .from(evaluation360Responses)
        .where(sql`${evaluation360Responses.evaluatorId} IN (${evaluatorIds.join(",")})`);

      // Agrupar respuestas por competencia
      const competencyGroups = responses.reduce((acc, response) => {
        const key = `${response.competencyId}-${response.competencyType}`;
        if (!acc[key]) {
          acc[key] = {
            competencyId: response.competencyId,
            competencyType: response.competencyType,
            self: [],
            peer: [],
            supervisor: [],
            subordinate: [],
          };
        }

        const evaluator = evaluators.find((e) => e.id === response.evaluatorId);
        if (!evaluator) return acc;

        const scoreNum = typeof response.score === 'string' ? parseFloat(response.score) : response.score;

        if (evaluator.evaluatorType === "self") acc[key].self.push(scoreNum);
        else if (evaluator.evaluatorType === "peer") acc[key].peer.push(scoreNum);
        else if (evaluator.evaluatorType === "supervisor") acc[key].supervisor.push(scoreNum);
        else if (evaluator.evaluatorType === "subordinate") acc[key].subordinate.push(scoreNum);

        return acc;
      }, {} as Record<string, any>);

      // Calcular promedios y consolidar resultados
      const results = Object.values(competencyGroups).map((group: any) => {
        const selfScore = group.self.length > 0 ? group.self.reduce((a: number, b: number) => a + b, 0) / group.self.length : null;
        const peerAvgScore = group.peer.length > 0 ? group.peer.reduce((a: number, b: number) => a + b, 0) / group.peer.length : null;
        const supervisorScore = group.supervisor.length > 0 ? group.supervisor[0] : null;
        const subordinateAvgScore = group.subordinate.length > 0 ? group.subordinate.reduce((a: number, b: number) => a + b, 0) / group.subordinate.length : null;

        const allScores = [
          ...(selfScore !== null ? [selfScore] : []),
          ...(peerAvgScore !== null ? [peerAvgScore] : []),
          ...(supervisorScore !== null ? [supervisorScore] : []),
          ...(subordinateAvgScore !== null ? [subordinateAvgScore] : []),
        ];

        const overallAvgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;

        const gapSelfVsOthers = selfScore !== null && peerAvgScore !== null ? selfScore - peerAvgScore : null;
        const gapSupervisorVsPeers = supervisorScore !== null && peerAvgScore !== null ? supervisorScore - peerAvgScore : null;

        return {
          assignmentId: input.assignmentId,
          competencyId: group.competencyId,
          competencyType: group.competencyType,
          selfScore: selfScore !== null ? selfScore.toFixed(2) : null,
          peerAvgScore: peerAvgScore !== null ? peerAvgScore.toFixed(2) : null,
          supervisorScore: supervisorScore !== null ? supervisorScore.toFixed(2) : null,
          subordinateAvgScore: subordinateAvgScore !== null ? subordinateAvgScore.toFixed(2) : null,
          overallAvgScore: overallAvgScore.toFixed(2),
          gapSelfVsOthers: gapSelfVsOthers !== null ? gapSelfVsOthers.toFixed(2) : null,
          gapSupervisorVsPeers: gapSupervisorVsPeers !== null ? gapSupervisorVsPeers.toFixed(2) : null,
          totalEvaluators: evaluators.length,
        };
      });

      // Insertar resultados consolidados
      if (results.length > 0) {
        await db.insert(evaluation360Results).values(results);
      }

      // Actualizar estado de la asignación
      await db
        .update(evaluation360Assignments)
        .set({ status: "completed", completionDate: new Date() })
        .where(eq(evaluation360Assignments.id, input.assignmentId));

      return { success: true, resultsCount: results.length };
    }),

  /**
   * Obtener resultados de evaluación de un empleado
   */
  getEmployeeResults: protectedProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = await db
        .select()
        .from(evaluation360Results)
        .where(eq(evaluation360Results.assignmentId, input.assignmentId));

      return results;
    }),

  /**
   * Generar plan de desarrollo individual (IDP)
   */
  generateDevelopmentPlan: adminProcedure
    .input(z.object({ assignmentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener resultados consolidados
      const results = await db
        .select()
        .from(evaluation360Results)
        .where(eq(evaluation360Results.assignmentId, input.assignmentId));

      if (results.length === 0) {
        throw new Error("No results found for this assignment");
      }

      // Obtener información del empleado
      const [assignment] = await db
        .select()
        .from(evaluation360Assignments)
        .where(eq(evaluation360Assignments.id, input.assignmentId));

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      // Identificar fortalezas (score >= 4.0) y áreas de mejora (score < 3.0)
      const strengths = results
        .filter((r) => parseFloat(r.overallAvgScore as string) >= 4.0)
        .map((r) => ({
          competencyId: r.competencyId,
          competencyType: r.competencyType,
          score: r.overallAvgScore,
        }));

      const improvementAreas = results
        .filter((r) => parseFloat(r.overallAvgScore as string) < 3.0)
        .map((r) => ({
          competencyId: r.competencyId,
          competencyType: r.competencyType,
          score: r.overallAvgScore,
          gap: r.gapSelfVsOthers,
        }));

      // Generar acciones de desarrollo (placeholder)
      const actionItems = improvementAreas.map((area) => ({
        competencyId: area.competencyId,
        action: `Desarrollar competencia ${area.competencyType}`,
        priority: parseFloat(area.score as string) < 2.0 ? "high" : "medium",
      }));

      // Insertar plan de desarrollo
      await db.insert(evaluation360DevelopmentPlans).values({
        assignmentId: input.assignmentId,
        employeeId: assignment.evaluatedEmployeeId,
        strengths: JSON.stringify(strengths),
        improvementAreas: JSON.stringify(improvementAreas),
        actionItems: JSON.stringify(actionItems),
        status: "draft",
      });

      return {
        success: true,
        strengths,
        improvementAreas,
        actionItems,
      };
    }),

  /**
   * Obtener matriz Nine Box (integración con evaluación 360°)
   */
  getNineBoxMatrix: protectedProcedure
    .input(z.object({ cycleId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener evaluaciones Nine Box
      const nineBoxData = await db
        .select()
        .from(nineBoxEvaluations)
        .orderBy(desc(nineBoxEvaluations.evaluationDate));

      return nineBoxData;
    }),

  /**
   * Obtener estadísticas de evaluación 360°
   */
  getEvaluationStats: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Total de asignaciones
      const [totalAssignments] = await db
        .select({ count: count() })
        .from(evaluation360Assignments)
        .where(eq(evaluation360Assignments.cycleId, input.cycleId));

      // Asignaciones completadas
      const [completedAssignments] = await db
        .select({ count: count() })
        .from(evaluation360Assignments)
        .where(
          and(
            eq(evaluation360Assignments.cycleId, input.cycleId),
            sql`${evaluation360Assignments.status} = 'completed'`
          )
        );

      // Total de evaluadores
      const assignments = await db
        .select()
        .from(evaluation360Assignments)
        .where(eq(evaluation360Assignments.cycleId, input.cycleId));

      const assignmentIds = assignments.map((a) => a.id);

      let totalEvaluators = 0;
      let completedEvaluators = 0;

      if (assignmentIds.length > 0) {
        const [evaluatorsCount] = await db
          .select({ count: count() })
          .from(evaluation360Evaluators)
          .where(sql`${evaluation360Evaluators.assignmentId} IN (${assignmentIds.join(",")})`);

        totalEvaluators = evaluatorsCount.count;

        const [completedEvaluatorsCount] = await db
          .select({ count: count() })
          .from(evaluation360Evaluators)
          .where(
            sql`${evaluation360Evaluators.assignmentId} IN (${assignmentIds.join(",")}) AND ${evaluation360Evaluators.status} = 'completed'`
          );

        completedEvaluators = completedEvaluatorsCount.count;
      }

      return {
        totalAssignments: totalAssignments.count,
        completedAssignments: completedAssignments.count,
        totalEvaluators,
        completedEvaluators,
        completionRate: totalAssignments.count > 0
          ? ((completedAssignments.count / totalAssignments.count) * 100).toFixed(2)
          : "0.00",
      };
    }),

  /**
   * Obtener competencias de un empleado con niveles actuales y requeridos
   */
  getEmployeeCompetencies: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener competencias del empleado con niveles actuales y requeridos
      const employeeCompetencies = await db
        .select({
          competencyId: competencies.id,
          competencyName: competencies.name,
          currentLevel: sql<number>`COALESCE(ec.level, 0)`,
          requiredLevel: sql<number>`COALESCE(c.required_level, 3)`,
        })
        .from(competencies)
        .leftJoin(
          sql`employee_competencies ec`,
          sql`ec.competency_id = ${competencies.id} AND ec.employee_id = ${input.employeeId}`
        )
        .leftJoin(
          sql`competencies c`,
          sql`c.id = ${competencies.id}`
        )
        .limit(10); // Limitar a 10 competencias para mejor visualización

      return employeeCompetencies;
    }),

  /**
   * Obtener evolución de una competencia específica a lo largo de múltiples ciclos
   */
  getCompetencyEvolution: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        competencyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener evaluaciones de la competencia a través de múltiples ciclos
      const competencyEvolution = await db
        .select({
          cycleName: evaluation360Cycles.cycleName,
          cycleDate: evaluation360Cycles.endDate,
          competencyLevel: sql<number>`AVG(${evaluation360Responses.rating})`,
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
          evaluation360Cycles,
          eq(evaluation360Assignments.cycleId, evaluation360Cycles.id)
        )
        .where(
          and(
            eq(evaluation360Assignments.employeeId, input.employeeId),
            eq(evaluation360Responses.competencyId, input.competencyId)
          )
        )
        .groupBy(evaluation360Cycles.id, evaluation360Cycles.cycleName, evaluation360Cycles.endDate)
        .orderBy(evaluation360Cycles.endDate);

      return competencyEvolution;
    }),

  /**
   * Generar reporte individual en PDF para un empleado
   */
  generateEmployeeReport: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        cycleId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Obtener datos del empleado
      const [employee] = await db
        .select({
          name: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          position: employees.position,
        })
        .from(employees)
        .where(eq(employees.id, input.employeeId));

      if (!employee) throw new Error("Empleado no encontrado");

      // 2. Obtener datos del ciclo
      const [cycle] = await db
        .select({
          cycleName: evaluation360Cycles.cycleName,
        })
        .from(evaluation360Cycles)
        .where(eq(evaluation360Cycles.id, input.cycleId));

      if (!cycle) throw new Error("Ciclo no encontrado");

      // 3. Obtener competencias del empleado (brechas)
      const employeeCompetencies = await db
        .select({
          competencyId: competencies.id,
          competencyName: competencies.name,
          currentLevel: sql<number>`AVG(${evaluation360Responses.rating})`,
          requiredLevel: competencies.requiredLevel,
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
          sql`${evaluation360Responses.competencyId} = ${competencies.id}`
        )
        .where(
          and(
            eq(evaluation360Assignments.employeeId, input.employeeId),
            eq(evaluation360Assignments.cycleId, input.cycleId)
          )
        )
        .groupBy(competencies.id, competencies.name, competencies.requiredLevel)
        .limit(10);

      // 4. Obtener evolución de competencias (primeras 3 competencias)
      const topCompetencies = employeeCompetencies.slice(0, 3);
      const evolutionData: any[] = [];

      for (const comp of topCompetencies) {
        const evolution = await db
          .select({
            cycleName: evaluation360Cycles.cycleName,
            cycleDate: evaluation360Cycles.endDate,
            competencyLevel: sql<number>`AVG(${evaluation360Responses.rating})`,
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
            evaluation360Cycles,
            eq(evaluation360Assignments.cycleId, evaluation360Cycles.id)
          )
          .where(
            and(
              eq(evaluation360Assignments.employeeId, input.employeeId),
              eq(evaluation360Responses.competencyId, comp.competencyId)
            )
          )
          .groupBy(evaluation360Cycles.id, evaluation360Cycles.cycleName, evaluation360Cycles.endDate)
          .orderBy(evaluation360Cycles.endDate);

        evolutionData.push(...evolution);
      }

      // 5. Generar plan de desarrollo personalizado
      const competenciesWithGaps = employeeCompetencies.filter(
        (c) => c.currentLevel < c.requiredLevel
      );

      let developmentPlan = "";
      if (competenciesWithGaps.length > 0) {
        developmentPlan = `Se han identificado ${competenciesWithGaps.length} competencias con brechas que requieren desarrollo:\n\n`;
        competenciesWithGaps.forEach((comp, index) => {
          const gap = comp.requiredLevel - comp.currentLevel;
          developmentPlan += `${index + 1}. ${comp.competencyName}: Brecha de ${gap.toFixed(1)} puntos\n`;
          developmentPlan += `   - Nivel actual: ${comp.currentLevel.toFixed(1)}\n`;
          developmentPlan += `   - Nivel requerido: ${comp.requiredLevel}\n`;
          developmentPlan += `   - Acciones recomendadas: Capacitación especializada, mentoría, proyectos prácticos\n\n`;
        });
      } else {
        developmentPlan =
          "¡Felicidades! El empleado cumple o supera el nivel requerido en todas las competencias evaluadas. Se recomienda continuar con el desarrollo de habilidades avanzadas y liderazgo.";
      }

      // 6. Generar HTML del reporte
      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Individual de Evaluación 360°</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #2980b9;
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f2f2f2;
    }
    .header-info {
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .development-plan {
      background-color: #ecf0f1;
      padding: 20px;
      border-left: 4px solid #3498db;
      margin-top: 20px;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
    }
  </style>
</head>
<body>
  <h1>Reporte Individual de Evaluación 360°</h1>
  
  <div class="header-info">
    <strong>Empleado:</strong> ${employee.name}<br>
    <strong>Puesto:</strong> ${employee.position || "No especificado"}<br>
    <strong>Ciclo de Evaluación:</strong> ${cycle.cycleName}<br>
    <strong>Fecha de Generación:</strong> ${new Date().toLocaleDateString("es-MX")}
  </div>

  <h2>1. Análisis de Brechas de Competencias</h2>
  <table>
    <thead>
      <tr>
        <th>Competencia</th>
        <th>Nivel Actual</th>
        <th>Nivel Requerido</th>
        <th>Brecha</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${employeeCompetencies
        .map(
          (comp) => `
        <tr>
          <td>${comp.competencyName}</td>
          <td>${comp.currentLevel.toFixed(1)}</td>
          <td>${comp.requiredLevel}</td>
          <td>${(comp.requiredLevel - comp.currentLevel).toFixed(1)}</td>
          <td>${
            comp.currentLevel < comp.requiredLevel
              ? "⚠️ Brecha"
              : comp.currentLevel === comp.requiredLevel
              ? "✅ Cumple"
              : "✅ Supera"
          }</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <h2>2. Evolución de Competencias</h2>
  <p>Se han registrado ${evolutionData.length} evaluaciones a lo largo de ${new Set(evolutionData.map((e) => e.cycleName)).size} ciclos.</p>

  <h2>3. Plan de Desarrollo Personalizado</h2>
  <div class="development-plan">
    ${developmentPlan}
  </div>

  <div class="footer">
    <p>Plataforma NOM-035 STPS 2018 | Generado automáticamente</p>
  </div>
</body>
</html>
      `;

      // 7. Generar PDF y subir a S3
      const fileName = `reporte-360-${input.employeeId}-${input.cycleId}`;
      const pdfUrl = await generatePDFFromHTML(html, fileName, {
        format: "Letter",
        orientation: "portrait",
      });

      return { success: true, pdfUrl };
    }),
});
