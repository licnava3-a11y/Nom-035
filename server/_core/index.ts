import "dotenv/config";
import compression from "compression";
import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import { globalLimiter, authLimiter, apiLimiter } from "./rateLimiter";
import net from "net";
import fs from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerLocalAuthRoutes } from "./localAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";
import uploadRouter from "../upload";
import exportRouter from "../exportRouter";
import confirmReadRouter from "../confirmReadRouter";
import evidenceTokenRouter from "../nom035EvidenceTokenRouter";
import { initializeWebSocket } from "./websocket";

// ─── NO static job imports here ──────────────────────────────────────────────
// All job modules are loaded dynamically inside startJobs() to keep the initial
// memory footprint below the 512 MiB Cloud Run Autoscale limit.
// Loading 34 job modules statically adds ~200 MB at startup, causing OOM before
// the health check passes, which triggers a restart loop that destroys the
// session cookie set by the OAuth callback → infinite login cycle.
// ─────────────────────────────────────────────────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Consolidated minute-tick scheduler.
 * Replaces 14+ individual setInterval(fn, 60_000) calls with a single timer.
 * Each entry: { hour, minute, dayOfWeek?, dayOfMonth?, fn, label }
 */
function startConsolidatedMinuteTick() {
  // Schedule table — all times are server-local (UTC in Cloud Run)
  const schedules: Array<{
    label: string;
    hour: number;
    minute: number;
    dayOfWeek?: number;   // 0=Sun … 6=Sat
    dayOfMonth?: number;  // 1-31
    fn: () => Promise<void> | void;
  }> = [];

  // Populated after dynamic imports (see startJobs)
  (globalThis as any).__consolidatedSchedules = schedules;

  setInterval(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const dow = now.getDay();
    const dom = now.getDate();
    for (const s of schedules) {
      if (s.hour !== h || s.minute !== m) continue;
      if (s.dayOfWeek !== undefined && s.dayOfWeek !== dow) continue;
      if (s.dayOfMonth !== undefined && s.dayOfMonth !== dom) continue;
      console.log(`[Scheduler] Triggering: ${s.label}`);
      Promise.resolve(s.fn()).catch(err =>
        console.error(`[Scheduler] Error in ${s.label}:`, err)
      );
    }
  }, 60_000);
}

async function startJobs() {
  console.log('[Jobs] Iniciando todos los jobs de alertas automáticas...');
  const schedules: Array<any> = (globalThis as any).__consolidatedSchedules ?? [];

  // ── Jobs with their own internal scheduler ──────────────────────────────
  const jobModules = await Promise.allSettled([
    import("../jobs/survey-alerts-job"),
    import("../jobs/survey-coverage-alerts-job"),
    import("../jobs/alertSummaryCronJob"),
    import("../jobs/security-alerts-job"),
    import("../jobs/model-performance-monitor-job"),
    import("../jobs/model-auto-retraining-job"),
    import("../jobs/payroll-compensation-alerts-job"),
    import("../jobs/external-offer-risk-monitor-job"),
    import("../jobs/agreementsAlerts"),
    import("../jobs/corrective-actions-reminders-job"),
    import("../jobs/stale-cases-alerts-job"),
    import("../jobs/calculate-risk-level-job"),
    import("../jobs/training-reminders-job"),
    import("../jobs/departments-without-manager-job"),
    import("../jobs/predictive-turnover-job"),
    import("../jobs/approvalRemindersJob"),
    import("../jobs/dispatch-unread-alerts-job"),
    import("../jobs/nom035-action-alerts-job"),
    import("../jobs/deadlineAlertsJob"),
    import("../jobs/post-case-surveys-job"),
    import("../jobs/departmental-alerts-job"),
    import("../jobs/survey-reminders-job"),
    import("../jobs/sentiment-analysis-job"),
    import("../jobs/compliance-reminders-job"),
    import("../jobs/psychometric-reminder-job"),
    import("../jobs/performance-lcp-alerts-job"),
  ]);

  const starters: Array<[string, string]> = [
    ["startSurveyAlertsJob", "survey-alerts-job"],
    ["startCoverageAlertsJob", "survey-coverage-alerts-job"],
    ["startAlertSummaryCronJob", "alertSummaryCronJob"],
    ["startSecurityAlertsJob", "security-alerts-job"],
    ["startModelPerformanceMonitorJob", "model-performance-monitor-job"],
    ["startModelAutoRetrainingJob", "model-auto-retraining-job"],
    ["startPayrollCompensationAlertsJob", "payroll-compensation-alerts-job"],
    ["startExternalOfferRiskMonitorJob", "external-offer-risk-monitor-job"],
    ["startAgreementsAlertsJob", "agreementsAlerts"],
    ["startCorrectiveActionsRemindersJob", "corrective-actions-reminders-job"],
    ["startStaleCasesJob", "stale-cases-alerts-job"],
    ["startCalculateRiskLevelJob", "calculate-risk-level-job"],
    ["startTrainingRemindersJob", "training-reminders-job"],
    ["startDepartmentsWithoutManagerJob", "departments-without-manager-job"],
    ["startPredictiveTurnoverJob", "predictive-turnover-job"],
    ["startApprovalRemindersJob", "approvalRemindersJob"],
    ["startDispatchUnreadAlertsJob", "dispatch-unread-alerts-job"],
    ["startNom035ActionAlertsJob", "nom035-action-alerts-job"],
    ["startDeadlineAlertsJob", "deadlineAlertsJob"],
    ["schedulePostCaseSurveysJob", "post-case-surveys-job"],
    ["scheduleDepartmentalAlertsJob", "departmental-alerts-job"],
    ["scheduleSurveyRemindersJob", "survey-reminders-job"],
    ["initializeSentimentAnalysisJob", "sentiment-analysis-job"],
    ["initializeComplianceRemindersJob", "compliance-reminders-job"],
    ["startPsychometricReminderJob", "psychometric-reminder-job"],
    ["startPerformanceLcpAlertsJob", "performance-lcp-alerts-job"],
  ];

  for (let i = 0; i < jobModules.length; i++) {
    const result = jobModules[i];
    const [fnName, modName] = starters[i];
    if (result.status === "fulfilled") {
      const mod = result.value as any;
      if (typeof mod[fnName] === "function") {
        try { mod[fnName](); } catch (e) { console.error(`[Jobs] Error starting ${modName}:`, e); }
      }
    } else {
      console.error(`[Jobs] Failed to load ${modName}:`, result.reason);
    }
  }

  // ── Jobs registered in the consolidated minute-tick ──────────────────────
  try {
    const { runCorrectiveActionPlansRemindersJob } = await import("../jobs/corrective-action-plans-reminders-job");
    schedules.push({ label: "corrective-action-plans-reminders", hour: 9, minute: 0, fn: runCorrectiveActionPlansRemindersJob });
  } catch (e) { console.error("[Jobs] corrective-action-plans-reminders-job load error:", e); }

  try {
    const { runIntelligentAlertsJob } = await import("../jobs/intelligent-alerts-job");
    schedules.push({ label: "intelligent-alerts", hour: 2, minute: 0, fn: runIntelligentAlertsJob });
  } catch (e) { console.error("[Jobs] intelligent-alerts-job load error:", e); }

  try {
    const { runRootCauseAnalysisJob } = await import("../jobs/root-cause-analysis-job");
    schedules.push({ label: "root-cause-analysis", hour: 3, minute: 0, dayOfMonth: 1, fn: runRootCauseAnalysisJob });
  } catch (e) { console.error("[Jobs] root-cause-analysis-job load error:", e); }

  try {
    const { runPredictiveAlertsJob } = await import("../jobs/predictiveAlertsJob");
    schedules.push({ label: "predictive-alerts", hour: 8, minute: 0, fn: runPredictiveAlertsJob });
  } catch (e) { console.error("[Jobs] predictiveAlertsJob load error:", e); }

  try {
    const { generateMonthlySnapshots } = await import("../jobs/autoSnapshotsJob");
    schedules.push({ label: "auto-snapshots", hour: 0, minute: 0, dayOfMonth: 1, fn: generateMonthlySnapshots });
  } catch (e) { console.error("[Jobs] autoSnapshotsJob load error:", e); }

  try {
    const { detectCompetencyRegressions } = await import("../jobs/competencyRegressionAlertsJob");
    schedules.push({ label: "competency-regression", hour: 9, minute: 0, fn: detectCompetencyRegressions });
  } catch (e) { console.error("[Jobs] competencyRegressionAlertsJob load error:", e); }

  try {
    const { weeklyReportJob, monthlyReportJob } = await import("../jobs/executive-reports-job");
    schedules.push({ label: "weekly-report", hour: 8, minute: 0, dayOfWeek: 1, fn: weeklyReportJob });
    schedules.push({ label: "monthly-report", hour: 8, minute: 0, dayOfMonth: 1, fn: monthlyReportJob });
  } catch (e) { console.error("[Jobs] executive-reports-job load error:", e); }

  try {
    const { runMonthlyReportsJob } = await import("./jobs/monthly-reports-job");
    schedules.push({ label: "monthly-reports", hour: 8, minute: 0, dayOfMonth: 1, fn: runMonthlyReportsJob });
  } catch (e) { console.error("[Jobs] monthly-reports-job load error:", e); }

  try {
    const { runContractExpirationAlertsJob } = await import("../jobs/contract-expiration-alerts-job");
    schedules.push({ label: "contract-expiration", hour: 8, minute: 0, fn: runContractExpirationAlertsJob });
  } catch (e) { console.error("[Jobs] contract-expiration-alerts-job load error:", e); }

  try {
    const { runDictamenExpiryAlertJob } = await import("../jobs/dictamen-expiry-alert-job");
    schedules.push({ label: "dictamen-expiry", hour: 8, minute: 0, fn: runDictamenExpiryAlertJob });
  } catch (e) { console.error("[Jobs] dictamen-expiry-alert-job load error:", e); }

  try {
    const { runDc3ExpiryAlertsJob } = await import("../jobs/dc3-expiry-alerts-job");
    schedules.push({ label: "dc3-expiry", hour: 7, minute: 30, fn: runDc3ExpiryAlertsJob });
  } catch (e) { console.error("[Jobs] dc3-expiry-alerts-job load error:", e); }

  try {
    const { runPacStaleItemsJob } = await import("../jobs/pac-stale-items-job");
    schedules.push({ label: "pac-stale-items", hour: 9, minute: 0, fn: runPacStaleItemsJob });
  } catch (e) { console.error("[Jobs] pac-stale-items-job load error:", e); }

  try {
    const { runRealtimeAlertsJob } = await import("../jobs/realtime-alerts-job");
    // Realtime runs every 15 min — use its own interval (not minute-tick)
    setInterval(() => runRealtimeAlertsJob().catch(console.error), 15 * 60 * 1000);
    console.log("[Realtime Alerts Job] Scheduled to run every 15 minutes via WebSocket");
  } catch (e) { console.error("[Jobs] realtime-alerts-job load error:", e); }

  // Token expiration job — needs its own setTimeout for first-run alignment
  try {
    const { runTokenExpirationJob } = await import("../jobs/anonymousTokenExpirationJob");
    const now = new Date();
    const next9AM = new Date(now);
    next9AM.setHours(9, 0, 0, 0);
    if (now >= next9AM) next9AM.setDate(next9AM.getDate() + 1);
    const msUntilNext9AM = next9AM.getTime() - now.getTime();
    setTimeout(() => {
      runTokenExpirationJob();
      setInterval(runTokenExpirationJob, 24 * 60 * 60 * 1000);
    }, msUntilNext9AM);
    console.log(`[Token Expiration Job] First execution scheduled for ${next9AM.toLocaleString('es-MX')}`);
  } catch (e) { console.error("[Jobs] anonymousTokenExpirationJob load error:", e); }

  console.log('[Jobs] Todos los jobs de alertas automáticas iniciados correctamente.');
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust ALL proxies in the chain (Cloud Run / Manus tunnel / CDN) so that:
  // - req.protocol reflects HTTPS from x-forwarded-proto
  // - cookies with sameSite='none' + secure=true are set correctly
  // - req.hostname reflects the real host from x-forwarded-host
  app.set('trust proxy', true);

  // Compresión gzip/deflate
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  }));

  // Rate limiting
  app.use(globalLimiter);
  app.use("/api/oauth", authLimiter);
  app.use("/api/trpc", apiLimiter);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        frameSrc: ["'self'", "https:"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check — always available, no auth required
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true, ts: Date.now() });
  });

  // Authentication mode
  const useLocalAuth = process.env.LOCAL_AUTH === 'true';
  if (useLocalAuth) {
    registerLocalAuthRoutes(app);
    console.log('[Auth] Modo: Autenticación local (usuario/contraseña)');
  } else {
    registerOAuthRoutes(app);
    console.log('[Auth] Modo: Manus OAuth');
  }

  app.use("/api", uploadRouter);
  app.use("/api", exportRouter);
  app.use("/api", confirmReadRouter);
  app.use("/api", evidenceTokenRouter);

  // Email Digest scheduled endpoint
  app.post("/api/scheduled/email-digest", (req, res) => {
    import("../scheduledHandlers/emailDigestHandler")
      .then(({ emailDigestHandler }) => emailDigestHandler(req, res))
      .catch((err) => res.status(500).json({ error: String(err) }));
  });

  // Warmup / anti-cold-start ping
  app.post("/api/scheduled/warmup", (req, res) => {
    try {
      const taskUid = req.headers["x-manus-cron-task-uid"] ?? "manual";
      console.log(`[Warmup] Ping recibido. taskUid=${taskUid} ts=${Date.now()}`);
      res.json({ ok: true, ts: Date.now(), taskUid });
    } catch (err) {
      console.error("[Warmup] Error:", err);
      res.status(500).json({ error: String(err), ts: Date.now() });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Static files (production) or Vite proxy (development)
  serveStatic(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  initializeWebSocket(server);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Start the consolidated minute-tick scheduler (single setInterval)
    startConsolidatedMinuteTick();

    // Delay job loading by 30s so Cloud Run health check passes BEFORE
    // job modules are loaded into memory. This prevents OOM restarts that
    // destroy the session cookie set by the OAuth callback.
    const JOB_STARTUP_DELAY_MS = 30_000;
    console.log(`[Jobs] Todos los jobs iniciarán en ${JOB_STARTUP_DELAY_MS / 1000}s para permitir el health check de Cloud Run`);

    setTimeout(() => {
      startJobs().catch(err => console.error('[Jobs] Error iniciando jobs:', err));
    }, JOB_STARTUP_DELAY_MS);
  });
}

startServer().catch(console.error);
