import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { employees, courses, trainingAssignments, trainingNeeds, vacationRequests, cases, internalMessages, psychometricAssessments, departments, annualTrainingPlans, annualTrainingPlanItems, branches } from "../../drizzle/schema";
import { eq, inArray, sql, and, gte, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const executiveReportRouter = router({
  getKPIs: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      departmentId: z.number().optional(),
      branchId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const { departmentId, branchId } = input;

      // Filtrar empleados por departamento y/o sucursal si se especifica
      const buildEmployeeWhere = () => {
        if (departmentId && branchId) return and(eq(employees.departmentId, departmentId), eq(employees.branchId, branchId));
        if (departmentId) return eq(employees.departmentId, departmentId);
        if (branchId) return eq(employees.branchId, branchId);
        return undefined;
      };
      const employeeWhere = buildEmployeeWhere();
      const allEmployeesRaw = employeeWhere
        ? await db.select({ id: employees.id, isActive: employees.isActive, departmentId: employees.departmentId, branchId: employees.branchId }).from(employees).where(employeeWhere)
        : await db.select({ id: employees.id, isActive: employees.isActive, departmentId: employees.departmentId, branchId: employees.branchId }).from(employees);
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

      // Cargar todos los datos en queries paralelas (evita N+1 de O(N*4) a O(4))
      const allDepts = await db.select({ id: departments.id, name: departments.name }).from(departments);
      const deptIds = allDepts.map(d => d.id);

      const [allEmps, allVacPending, allPsycho, allAssignments, allCasesData] = await Promise.all([
        deptIds.length > 0
          ? db.select({ id: employees.id, isActive: employees.isActive, departmentId: employees.departmentId })
              .from(employees).where(inArray(employees.departmentId, deptIds))
          : Promise.resolve([]),
        db.select({ employeeId: vacationRequests.employeeId }).from(vacationRequests)
          .where(eq(vacationRequests.status, 'pending')),
        db.select({ riskLevel: psychometricAssessments.riskLevel }).from(psychometricAssessments),
        db.select({ status: trainingAssignments.status }).from(trainingAssignments),
        db.select({ priority: cases.priority }).from(cases),
      ]);

      // Métricas globales (no dependen del departamento)
      const highRiskPsychoGlobal = allPsycho.filter(p => p.riskLevel === "alto" || p.riskLevel === "muy_alto").length;
      const completedAssignmentsGlobal = allAssignments.filter(a => a.status === "completed").length;
      const globalTrainingRate = allAssignments.length > 0
        ? Math.round((completedAssignmentsGlobal / allAssignments.length) * 100) : 0;
      const highRiskCasesGlobal = allCasesData.filter(c => c.priority === "high" || c.priority === "critical").length;
      const globalNom035Score = allCasesData.length > 0
        ? Math.max(0, 100 - Math.round((highRiskCasesGlobal / allCasesData.length) * 100)) : 100;

      // Agrupar empleados y vacaciones por departamento
      const empByDept = new Map<number, { id: number; isActive: boolean }[]>();
      allEmps.forEach(e => {
        const arr = empByDept.get(e.departmentId) ?? [];
        arr.push(e);
        empByDept.set(e.departmentId, arr);
      });
      const pendingVacEmpIds = new Set(allVacPending.map(v => v.employeeId));

      const results = allDepts.map(dept => {
        const deptEmps = empByDept.get(dept.id) ?? [];
        const total = deptEmps.length;
        const active = deptEmps.filter(e => e.isActive).length;
        const turnoverRate = total > 0 ? Math.round(((total - active) / total) * 100) : 0;
        const pendingVacCount = deptEmps.filter(e => pendingVacEmpIds.has(e.id)).length;
        return {
          deptId: dept.id,
          deptName: dept.name,
          totalEmployees: total,
          activeEmployees: active,
          turnoverRate,
          trainingRate: globalTrainingRate,
          nom035Score: globalNom035Score,
          pendingVacations: pendingVacCount,
          highRiskPsycho: highRiskPsychoGlobal,
        };
      });

      return results.filter(r => r.totalEmployees > 0);
    }),

  getBranchComparative: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const { dateFrom, dateTo } = input;
      const fromTs = dateFrom ? new Date(dateFrom).getTime() : undefined;
      const toTs = dateTo ? new Date(dateTo).getTime() : undefined;

      // Cargar todos los datos en queries paralelas (evita N+1 de O(N*3) a O(3))
      const allBranches = await db.select().from(branches).where(eq(branches.isActive, true));
      const branchIds = allBranches.map(b => b.id);

      const [allBranchEmps, allTrainingNeeds, allBranchCases] = await Promise.all([
        branchIds.length > 0
          ? db.select({ id: employees.id, isActive: employees.isActive, branchId: employees.branchId })
              .from(employees).where(inArray(employees.branchId, branchIds))
          : Promise.resolve([]),
        db.select({ employeeId: trainingNeeds.employeeId, status: trainingNeeds.status }).from(trainingNeeds),
        db.select({ priority: cases.priority }).from(cases),
      ]);

      // Métricas globales de casos
      const highRiskCasesGlobal = allBranchCases.filter(c => c.priority === "high" || c.priority === "critical").length;
      const globalNom035Score = allBranchCases.length > 0
        ? Math.max(0, 100 - Math.round((highRiskCasesGlobal / allBranchCases.length) * 100)) : 100;

      // Agrupar empleados y training needs por sucursal
      const empByBranch = new Map<number, { id: number; isActive: boolean }[]>();
      allBranchEmps.forEach(e => {
        const arr = empByBranch.get(e.branchId!) ?? [];
        arr.push(e);
        empByBranch.set(e.branchId!, arr);
      });
      const trainingByEmp = new Map<number, { status: string }[]>();
      allTrainingNeeds.forEach(n => {
        const arr = trainingByEmp.get(n.employeeId) ?? [];
        arr.push(n);
        trainingByEmp.set(n.employeeId, arr);
      });

      const results = allBranches.map(branch => {
        const branchEmps = empByBranch.get(branch.id) ?? [];
        const total = branchEmps.length;
        if (total === 0) return null;
        const active = branchEmps.filter(e => e.isActive).length;
        const turnoverRate = total > 0 ? Math.round(((total - active) / total) * 100) : 0;
        // Capacitación por empleados de la sucursal
        let trainingCompleted = 0;
        let trainingTotal = 0;
        branchEmps.forEach(e => {
          const needs = trainingByEmp.get(e.id) ?? [];
          trainingTotal += needs.length;
          trainingCompleted += needs.filter(n => n.status === "completada").length;
        });
        const trainingRate = trainingTotal > 0 ? Math.round((trainingCompleted / trainingTotal) * 100) : 0;
        return {
          branchId: branch.id,
          branchName: branch.name,
          city: branch.city ?? "",
          state: branch.state ?? "",
          totalEmployees: total,
          activeEmployees: active,
          turnoverRate,
          trainingRate,
          trainingCompleted,
          trainingTotal,
          nom035Score: globalNom035Score,
          highRiskCount: highRiskCasesGlobal,
          rotationRate: turnoverRate,
        };
      });

      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    }),

});
