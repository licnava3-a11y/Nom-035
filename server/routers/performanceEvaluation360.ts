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
   * Obtener comparativa departamental de una competencia específica
   */
  getDepartmentCompetencyComparison: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
        competencyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener nombre de la competencia
      const [competency] = await db
        .select({ name: competencies.name, requiredLevel: competencies.requiredLevel })
        .from(competencies)
        .where(eq(competencies.id, input.competencyId));

      if (!competency) throw new Error("Competencia no encontrada");

      // Obtener nivel promedio por departamento
      const departmentComparison = await db
        .select({
          departmentId: employees.departmentId,
          departmentName: sql<string>`COALESCE(${employees.departmentId}, 'Sin Departamento')`,
          averageLevel: sql<number>`AVG(${evaluation360Responses.rating})`,
          employeeCount: sql<number>`COUNT(DISTINCT ${employees.id})`,
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
          employees,
          eq(evaluation360Assignments.employeeId, employees.id)
        )
        .where(
          and(
            eq(evaluation360Assignments.cycleId, input.cycleId),
            eq(evaluation360Responses.competencyId, input.competencyId)
          )
        )
        .groupBy(employees.departmentId)
        .orderBy(sql<number>`AVG(${evaluation360Responses.rating}) DESC`);

      return {
        competencyName: competency.name,
        requiredLevel: competency.requiredLevel,
        departments: departmentComparison.map((dept) => ({
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          averageLevel: dept.averageLevel,
          requiredLevel: competency.requiredLevel,
          employeeCount: dept.employeeCount,
          gap: competency.requiredLevel - dept.averageLevel,
          status:
            dept.averageLevel >= competency.requiredLevel
              ? "fortaleza"
              : "oportunidad",
        })),
      };
    }),

  // Exportación Masiva de Reportes Departamentales en PDF
  generateDepartmentReport: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
        departmentIds: z.array(z.number()).optional(), // Si no se especifica, genera para todos los departamentos
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Obtener todos los departamentos o los especificados
      const departmentsQuery = input.departmentIds
        ? await db
            .select()
            .from(departments)
            .where(sql`${departments.id} IN (${sql.join(input.departmentIds.map((id) => sql`${id}`), sql`, `)})`)
        : await db.select().from(departments);

      // Obtener todas las competencias
      const competenciesData = await db.select().from(competencies);

      const reportData = [];

      for (const dept of departmentsQuery) {
        const departmentCompetencies = [];

        for (const comp of competenciesData) {
          // Calcular nivel promedio de la competencia en el departamento
          const avgLevelQuery = await db
            .select({
              averageLevel: sql<number>`AVG(${evaluation360Responses.rating})`,
              employeeCount: sql<number>`COUNT(DISTINCT ${employees.id})`,
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
              employees,
              eq(evaluation360Assignments.employeeId, employees.id)
            )
            .where(
              and(
                eq(evaluation360Assignments.cycleId, input.cycleId),
                eq(evaluation360Responses.competencyId, comp.id),
                eq(employees.departmentId, dept.id)
              )
            );

          const avgLevel = avgLevelQuery[0]?.averageLevel || 0;
          const employeeCount = avgLevelQuery[0]?.employeeCount || 0;
          const gap = comp.requiredLevel - avgLevel;

          departmentCompetencies.push({
            competencyName: comp.name,
            averageLevel: avgLevel,
            requiredLevel: comp.requiredLevel,
            gap: gap,
            status: avgLevel >= comp.requiredLevel ? "fortaleza" : "oportunidad",
            employeeCount: employeeCount,
          });
        }

        // Generar plan de desarrollo colectivo
        const developmentPlan = departmentCompetencies
          .filter((c) => c.status === "oportunidad")
          .map((c) => ({
            competency: c.competencyName,
            gap: c.gap.toFixed(2),
            recommendation:
              c.gap > 1.5
                ? "Capacitación intensiva requerida (talleres presenciales, mentorías)"
                : c.gap > 0.5
                ? "Capacitación estándar recomendada (cursos en línea, webinars)"
                : "Refuerzo ligero sugerido (lecturas, videos cortos)",
          }));

        reportData.push({
          departmentId: dept.id,
          departmentName: dept.name,
          competencies: departmentCompetencies,
          developmentPlan: developmentPlan,
          ranking:
            departmentCompetencies.filter((c) => c.status === "fortaleza").length /
            departmentCompetencies.length,
        });
      }

      // Ordenar departamentos por ranking (mayor a menor)
      reportData.sort((a, b) => b.ranking - a.ranking);

      // Generar HTML para PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1e40af; text-align: center; }
            h2 { color: #059669; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1e40af; color: white; }
            .fortaleza { background-color: #d1fae5; }
            .oportunidad { background-color: #fee2e2; }
            .ranking { font-size: 24px; font-weight: bold; color: #1e40af; }
          </style>
        </head>
        <body>
          <h1>Reporte Departamental de Competencias</h1>
          <p style="text-align: center; color: #6b7280;">Ciclo de Evaluación 360° - ${new Date().toLocaleDateString()}</p>
          
          <h2>Ranking de Departamentos</h2>
          <table>
            <tr>
              <th>Posición</th>
              <th>Departamento</th>
              <th>Score de Fortaleza</th>
              <th>Competencias Fortaleza</th>
              <th>Competencias Oportunidad</th>
            </tr>
            ${reportData
              .map(
                (dept, index) => `
              <tr>
                <td class="ranking">${index + 1}</td>
                <td>${dept.departmentName}</td>
                <td>${(dept.ranking * 100).toFixed(1)}%</td>
                <td>${dept.competencies.filter((c) => c.status === "fortaleza").length}</td>
                <td>${dept.competencies.filter((c) => c.status === "oportunidad").length}</td>
              </tr>
            `
              )
              .join("")}
          </table>

          ${reportData
            .map(
              (dept) => `
            <div style="page-break-before: always;">
              <h2>${dept.departmentName}</h2>
              
              <h3>Comparativa de Competencias</h3>
              <table>
                <tr>
                  <th>Competencia</th>
                  <th>Nivel Promedio</th>
                  <th>Nivel Requerido</th>
                  <th>Brecha</th>
                  <th>Estado</th>
                  <th>Empleados Evaluados</th>
                </tr>
                ${dept.competencies
                  .map(
                    (comp) => `
                  <tr class="${comp.status}">
                    <td>${comp.competencyName}</td>
                    <td>${comp.averageLevel.toFixed(2)}</td>
                    <td>${comp.requiredLevel}</td>
                    <td>${comp.gap.toFixed(2)}</td>
                    <td>${comp.status === "fortaleza" ? "✅ Fortaleza" : "⚠️ Oportunidad"}</td>
                    <td>${comp.employeeCount}</td>
                  </tr>
                `
                  )
                  .join("")}
              </table>

              <h3>Plan de Desarrollo Colectivo</h3>
              ${dept.developmentPlan.length > 0
                ? `
                <table>
                  <tr>
                    <th>Competencia</th>
                    <th>Brecha</th>
                    <th>Recomendación</th>
                  </tr>
                  ${dept.developmentPlan
                    .map(
                      (plan) => `
                    <tr>
                      <td>${plan.competency}</td>
                      <td>${plan.gap}</td>
                      <td>${plan.recommendation}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </table>
              `
                : `<p style="color: #059669;">✅ Este departamento no requiere plan de desarrollo. Todas las competencias están en nivel de fortaleza.</p>`}
            </div>
          `
            )
            .join("")}
        </body>
        </html>
      `;

      // Generar PDF
      const pdfUrl = await generatePDFFromHTML(htmlContent);

      return {
        success: true,
        pdfUrl: pdfUrl,
        departmentsCount: reportData.length,
        summary: {
          totalCompetencies: competenciesData.length,
          topDepartment: reportData[0]?.departmentName || "N/A",
          topDepartmentScore: reportData[0] ? (reportData[0].ranking * 100).toFixed(1) : "0",
        },
      };
    }),
});
