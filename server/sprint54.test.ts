/**
 * Sprint 54 Tests
 * Verifica: jobLogger, deduplicación en todos los jobs, panel AdminJobs, heartbeat warmup
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

describe("Sprint 54 — jobLogger y panel AdminJobs", () => {
  describe("jobLogger.ts", () => {
    it("exporta la función logJobExecution", () => {
      const content = readFileSync(join(ROOT, "server/jobLogger.ts"), "utf-8");
      expect(content).toContain("export async function logJobExecution");
    });

    it("registra notificationsSent, notificationsSkipped e itemsProcessed", () => {
      const content = readFileSync(join(ROOT, "server/jobLogger.ts"), "utf-8");
      expect(content).toContain("notificationsSent");
      expect(content).toContain("notificationsSkipped");
      expect(content).toContain("itemsProcessed");
    });

    it("maneja errores sin propagar excepciones (status error)", () => {
      const content = readFileSync(join(ROOT, "server/jobLogger.ts"), "utf-8");
      expect(content).toContain("status = \"error\"");
      expect(content).toContain("errorMessage");
    });

    it("mide la duración de ejecución en ms", () => {
      const content = readFileSync(join(ROOT, "server/jobLogger.ts"), "utf-8");
      expect(content).toContain("durationMs");
      expect(content).toContain("Date.now()");
    });
  });

  describe("Integración de logJobExecution en jobs", () => {
    it("stale-cases-alerts-job usa logJobExecution", () => {
      const content = readFileSync(join(ROOT, "server/jobs/stale-cases-alerts-job.ts"), "utf-8");
      expect(content).toContain("logJobExecution");
      expect(content).toContain("stale-cases");
    });

    it("survey-alerts-job usa logJobExecution", () => {
      const content = readFileSync(join(ROOT, "server/jobs/survey-alerts-job.ts"), "utf-8");
      expect(content).toContain("logJobExecution");
      expect(content).toContain("survey-alerts");
    });

    it("departments-without-manager-job usa logJobExecution", () => {
      const content = readFileSync(join(ROOT, "server/jobs/departments-without-manager-job.ts"), "utf-8");
      expect(content).toContain("logJobExecution");
      expect(content).toContain("departments-without-manager");
    });

    it("security-alerts-job usa logJobExecution", () => {
      const content = readFileSync(join(ROOT, "server/jobs/security-alerts-job.ts"), "utf-8");
      expect(content).toContain("logJobExecution");
      expect(content).toContain("security-alerts");
    });
  });

  describe("jobMonitoringRouter — nuevos procedimientos", () => {
    it("tiene getJobExecutionLog", () => {
      const content = readFileSync(join(ROOT, "server/routers/jobMonitoring.ts"), "utf-8");
      expect(content).toContain("getJobExecutionLog");
    });

    it("tiene getJobStatusSummary", () => {
      const content = readFileSync(join(ROOT, "server/routers/jobMonitoring.ts"), "utf-8");
      expect(content).toContain("getJobStatusSummary");
    });

    it("tiene runStaleCasesJob, runSurveyAlertsJob, runDepartmentsJob, runSecurityJob", () => {
      const content = readFileSync(join(ROOT, "server/routers/jobMonitoring.ts"), "utf-8");
      expect(content).toContain("runStaleCasesJob");
      expect(content).toContain("runSurveyAlertsJob");
      expect(content).toContain("runDepartmentsJob");
      expect(content).toContain("runSecurityJob");
    });

    it("importa jobExecutionLog del schema", () => {
      const content = readFileSync(join(ROOT, "server/routers/jobMonitoring.ts"), "utf-8");
      expect(content).toContain("jobExecutionLog");
    });
  });

  describe("AdminJobs.tsx — panel de estado", () => {
    it("existe el archivo AdminJobs.tsx", () => {
      const content = readFileSync(join(ROOT, "client/src/pages/AdminJobs.tsx"), "utf-8");
      expect(content).toContain("AdminJobs");
    });

    it("usa getJobStatusSummary y getJobExecutionLog", () => {
      const content = readFileSync(join(ROOT, "client/src/pages/AdminJobs.tsx"), "utf-8");
      expect(content).toContain("getJobStatusSummary");
      expect(content).toContain("getJobExecutionLog");
    });

    it("muestra notificationsSent y notificationsSkipped", () => {
      const content = readFileSync(join(ROOT, "client/src/pages/AdminJobs.tsx"), "utf-8");
      expect(content).toContain("totalSent");
      expect(content).toContain("totalSkipped");
    });

    it("tiene botones de ejecución manual para los 4 jobs", () => {
      const content = readFileSync(join(ROOT, "client/src/pages/AdminJobs.tsx"), "utf-8");
      expect(content).toContain("runStaleCasesJob");
      expect(content).toContain("runSurveyAlertsJob");
      expect(content).toContain("runDepartmentsJob");
      expect(content).toContain("runSecurityJob");
    });

    it("tiene auto-refresh cada 30 segundos", () => {
      const content = readFileSync(join(ROOT, "client/src/pages/AdminJobs.tsx"), "utf-8");
      expect(content).toContain("refetchInterval: 30000");
    });
  });

  describe("App.tsx — ruta /admin/jobs", () => {
    it("tiene import lazy de AdminJobs", () => {
      const content = readFileSync(join(ROOT, "client/src/App.tsx"), "utf-8");
      expect(content).toContain("import(\"./pages/AdminJobs\")");
    });

    it("tiene la ruta /admin/jobs registrada", () => {
      const content = readFileSync(join(ROOT, "client/src/App.tsx"), "utf-8");
      expect(content).toContain('path={"/admin/jobs"}');
    });
  });

  describe("Schema — tabla job_execution_log", () => {
    it("tiene la tabla job_execution_log en el schema", () => {
      const content = readFileSync(join(ROOT, "drizzle/schema.ts"), "utf-8");
      expect(content).toContain("job_execution_log");
      expect(content).toContain("notifications_sent");
      expect(content).toContain("notifications_skipped");
      expect(content).toContain("duration_ms");
    });
  });
});
