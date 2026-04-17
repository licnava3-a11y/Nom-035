import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { employees, courses, trainingAssignments, vacationRequests, cases, internalMessages, psychometricAssessments } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

export const executiveReportRouter = router({
  getKPIs: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const allEmployees = await db.select({ id: employees.id, isActive: employees.isActive }).from(employees);
      const totalEmployees = allEmployees.length;
      const activeEmployees = allEmployees.filter(e => e.isActive).length;
      const inactiveEmployees = totalEmployees - activeEmployees;
      const turnoverRate = totalEmployees > 0 ? Math.round((inactiveEmployees / totalEmployees) * 100) : 0;

      const allCourses = await db.select({ id: courses.id }).from(courses);
      const totalCourses = allCourses.length;

      const allAssignments = await db.select({ status: trainingAssignments.status }).from(trainingAssignments);
      const totalAssignments = allAssignments.length;
      const completedAssignments = allAssignments.filter(a => a.status === "completed").length;
      const trainingCompletionRate = totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

      const allVacations = await db.select({ status: vacationRequests.status }).from(vacationRequests);
      const pendingVacations = allVacations.filter(v => v.status === "pending").length;
      const approvedVacations = allVacations.filter(v => v.status === "approved").length;

      const allCases = await db.select({ status: cases.status, riskLevel: cases.riskLevel }).from(cases);
      const totalCases = allCases.length;
      const openCases = allCases.filter(c => c.status !== "closed" && c.status !== "resolved").length;
      const highRiskCases = allCases.filter(c => c.riskLevel === "high" || c.riskLevel === "critical").length;

      const allMessages = await db.select({ status: internalMessages.status }).from(internalMessages);
      const pendingMessages = allMessages.filter(m => m.status === "nuevo" || m.status === "en_proceso").length;

      const allPsycho = await db.select({ riskLevel: psychometricAssessments.riskLevel }).from(psychometricAssessments);
      const highPsychoRisk = allPsycho.filter(p => p.riskLevel === "alto" || p.riskLevel === "muy_alto").length;

      return {
        employees: { total: totalEmployees, active: activeEmployees, inactive: inactiveEmployees, turnoverRate },
        training: { totalCourses, totalAssignments, completedAssignments, completionRate: trainingCompletionRate },
        vacations: { pending: pendingVacations, approved: approvedVacations, total: allVacations.length },
        cases: { total: totalCases, open: openCases, highRisk: highRiskCases },
        mailbox: { pending: pendingMessages, total: allMessages.length },
        psychometric: { total: allPsycho.length, highRisk: highPsychoRisk },
        generatedAt: new Date().toISOString(),
      };
    }),
});
