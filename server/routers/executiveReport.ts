import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { employees, courses, trainingAssignments, vacationRequests, cases, internalMessages, psychometricAssessments, departments, annualTrainingPlans, annualTrainingPlanItems } from "../../drizzle/schema";
import { eq, inArray, sql, and, gte, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const executiveReportRouter = router({
  getKPIs: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      departmentId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const { departmentId } = input;

      // Filtrar empleados por departamento si se especifica
      const employeeQuery = db.select({ id: employees.id, isActive: employees.isActive, departmentId: employees.departmentId }).from(employees);
      const allEmployeesRaw = departmentId
        ? await db.select({ id: employees.id, isActive: employees.isActive, departmentId: employees.departmentId }).from(employees).where(eq(employees.departmentId, departmentId))
        : await employeeQuery;
      const allEmployees = allEmployeesRaw;
      const employeeIds = allEmployees.map(e => e.id);
      const totalEmployees = allEmployees.length;
      const activeEmployees = allEmployees.filter(e => e.isActive).length;
      const inactiveEmployees = totalEmployees - activeEmployees;
      const turnoverRate = totalEmployees > 0 ? Math.round((inactiveEmployees / totalEmployees) * 100) : 0;

      // Calcular tasa de rotación del año anterior para comparativa interanual
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const prevYearInactiveRaw = await db.select({ id: employees.id })
        .from(employees)
        .where(and(
          eq(employees.isActive, false),
          gte(employees.updatedAt, twoYearsAgo),
          lt(employees.updatedAt, oneYearAgo)
        ));
      const prevYearTurnoverRate = totalEmployees > 0 ? Math.round((prevYearInactiveRaw.length / totalEmployees) * 100) : 0;
      const turnoverChange = turnoverRate - prevYearTurnoverRate;

      const allCourses = await db.select({ id: courses.id }).from(courses);
      const totalCourses = allCourses.length;

      // Asignaciones de capacitación (tabla no tiene employeeId directo, se usa sin filtro de departamento)
      const allAssignments = await db.select({ status: trainingAssignments.status }).from(trainingAssignments);
      const totalAssignments = allAssignments.length;
      const completedAssignments = allAssignments.filter(a => a.status === "completed").length;
      const trainingCompletionRate = totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

      // Filtrar vacaciones por empleados del departamento
      const vacationsQuery = departmentId && employeeIds.length > 0
        ? await db.select({ status: vacationRequests.status }).from(vacationRequests).where(inArray(vacationRequests.employeeId, employeeIds))
        : await db.select({ status: vacationRequests.status }).from(vacationRequests);
      const allVacations = vacationsQuery;
      const pendingVacations = allVacations.filter(v => v.status === "pending").length;
      const approvedVacations = allVacations.filter(v => v.status === "approved").length;

      const allCases = await db.select({ status: cases.status, priority: cases.priority }).from(cases);
      const totalCases = allCases.length;
      const openCases = allCases.filter(c => c.status !== "closed" && c.status !== "resolved").length;
      const highRiskCases = allCases.filter(c => c.priority === "high" || c.priority === "critical").length;

      const allMessages = await db.select({ status: internalMessages.status }).from(internalMessages);
      const pendingMessages = allMessages.filter(m => m.status === "nuevo" || m.status === "en_proceso").length;

      const allPsycho = await db.select({ riskLevel: psychometricAssessments.riskLevel }).from(psychometricAssessments);
      const highPsychoRisk = allPsycho.filter(p => p.riskLevel === "alto" || p.riskLevel === "muy_alto").length;

      // Obtener nombre del departamento si se filtró
      let departmentName: string | null = null;
      if (departmentId) {
        const dept = await db.select({ name: departments.name }).from(departments).where(eq(departments.id, departmentId));
        departmentName = dept[0]?.name ?? null;
      }

      return {
        employees: { total: totalEmployees, active: activeEmployees, inactive: inactiveEmployees, turnoverRate, prevYearTurnoverRate, turnoverChange },
        training: { totalCourses, totalAssignments, completedAssignments, completionRate: trainingCompletionRate },
        vacations: { pending: pendingVacations, approved: approvedVacations, total: allVacations.length },
        cases: { total: totalCases, open: openCases, highRisk: highRiskCases },
        mailbox: { pending: pendingMessages, total: allMessages.length },
        psychometric: { total: allPsycho.length, highRisk: highPsychoRisk },
        departmentFilter: departmentId ? { id: departmentId, name: departmentName } : null,
        generatedAt: new Date().toISOString(),
      };
    }),

  getTrends: protectedProcedure
    .input(z.object({ months: z.number().min(3).max(12).default(6) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const { months } = input;
      const now = new Date();

      // Build last N months labels
      const monthLabels: string[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }

      // Cases per month (NOM-035 cases)
      const casesRaw = await db.execute(sql`
        SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count
        FROM cases
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
        GROUP BY month ORDER BY month ASC
      `);
      const casesMap: Record<string, number> = {};
      for (const row of (casesRaw as any[])) casesMap[row.month] = Number(row.count);

      // Training completions per month
      const trainingRaw = await db.execute(sql`
        SELECT DATE_FORMAT(completion_date, '%Y-%m') as month, COUNT(*) as count
        FROM training_assignments
        WHERE status = 'completed' AND completion_date >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
        GROUP BY month ORDER BY month ASC
      `);
      const trainingMap: Record<string, number> = {};
      for (const row of (trainingRaw as any[])) trainingMap[row.month] = Number(row.count);

      // Employee exits per month (isActive=0, using updatedAt as proxy for exit date)
      const exitRaw = await db.execute(sql`
        SELECT DATE_FORMAT(updatedAt, '%Y-%m') as month, COUNT(*) as count
        FROM employees
        WHERE isActive = 0 AND updatedAt >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
        GROUP BY month ORDER BY month ASC
      `);
      const exitMap: Record<string, number> = {};
      for (const row of (exitRaw as any[])) exitMap[row.month] = Number(row.count);

      // Psychometric assessments per month
      const psychoRaw = await db.execute(sql`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
        FROM psychometric_assessments
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
        GROUP BY month ORDER BY month ASC
      `);
      const psychoMap: Record<string, number> = {};
      for (const row of (psychoRaw as any[])) psychoMap[row.month] = Number(row.count);

      // Internal mailbox messages per month
      const mailboxRaw = await db.execute(sql`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
        FROM internal_messages
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
        GROUP BY month ORDER BY month ASC
      `);
      const mailboxMap: Record<string, number> = {};
      for (const row of (mailboxRaw as any[])) mailboxMap[row.month] = Number(row.count);

      return {
        labels: monthLabels.map(m => {
          const [y, mo] = m.split("-");
          return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
        }),
        cases: monthLabels.map(m => casesMap[m] || 0),
        trainingCompletions: monthLabels.map(m => trainingMap[m] || 0),
        employeeExits: monthLabels.map(m => exitMap[m] || 0),
        psychometricAssessments: monthLabels.map(m => psychoMap[m] || 0),
        mailboxMessages: monthLabels.map(m => mailboxMap[m] || 0),
      };
    }),
  // --- Vista comparativa de departamentos ---
  getComparativaDepts: protectedProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ input }) => {
      const { year } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Obtener todos los departamentos
      const allDepts = await db.select({ id: departments.id, name: departments.name }).from(departments);

      const results = await Promise.all(allDepts.map(async (dept) => {
        // Empleados del departamento
        const deptEmployees = await db
          .select({ id: employees.id, isActive: employees.isActive })
          .from(employees)
          .where(eq(employees.departmentId, dept.id));

        const total = deptEmployees.length;
        const active = deptEmployees.filter(e => e.isActive).length;
        const inactive = total - active;
        const turnoverRate = total > 0 ? Math.round((inactive / total) * 100) : 0;

        // Vacaciones pendientes
        const empIds = deptEmployees.map(e => e.id);
        const pendingVac = empIds.length > 0
          ? await db.select({ id: vacationRequests.id }).from(vacationRequests)
              .where(inArray(vacationRequests.employeeId, empIds))
          : [];
        const pendingVacCount = pendingVac.length;

        // Evaluaciones psicometricas de alto riesgo
        const psycho = await db
          .select({ riskLevel: psychometricAssessments.riskLevel })
          .from(psychometricAssessments);
        const highRiskPsycho = psycho.filter(p => p.riskLevel === "alto" || p.riskLevel === "muy_alto").length;

        // Asignaciones de capacitacion completadas (sin filtro por dept ya que no hay FK directa)
        const assignments = await db
          .select({ status: trainingAssignments.status })
          .from(trainingAssignments);
        const completedAssignments = assignments.filter(a => a.status === "completed").length;
        const trainingRate = assignments.length > 0
          ? Math.round((completedAssignments / assignments.length) * 100) : 0;

        // Puntaje NOM-035: promedio de casos de alto riesgo (menor = mejor)
        const deptCases = await db.select({ priority: cases.priority }).from(cases);
        const highRiskCases = deptCases.filter(c => c.priority === "high" || c.priority === "critical").length;
        const nom035Score = deptCases.length > 0
          ? Math.max(0, 100 - Math.round((highRiskCases / deptCases.length) * 100))
          : 100;

        return {
          deptId: dept.id,
          deptName: dept.name,
          totalEmployees: total,
          activeEmployees: active,
          turnoverRate,
          trainingRate,
          nom035Score,
          pendingVacations: pendingVacCount,
          highRiskPsycho,
        };
      }));

      return results.filter(r => r.totalEmployees > 0);
    }),

});
