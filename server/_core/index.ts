import "dotenv/config";
import compression from "compression";
import express from "express";
import { createServer, request as httpRequest } from "http";
import helmet from "helmet";
import { globalLimiter, authLimiter, apiLimiter } from "./rateLimiter";
import fs from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerLocalAuthRoutes } from "./localAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import uploadRouter from "../upload";
import exportRouter from "../exportRouter";
import confirmReadRouter from "../confirmReadRouter";
import evidenceTokenRouter from "../nom035EvidenceTokenRouter";
import { initializeWebSocket } from "./websocket";
import { installLegacyConsoleAdapter, logNonBlockingFailure, logStructured } from "./logger";

installLegacyConsoleAdapter();

// ─── NO static job imports here ──────────────────────────────────────────────
// All job modules are loaded dynamically inside startJobs() to keep the initial
// memory footprint below the 512 MiB Cloud Run Autoscale limit.
// Loading 34 job modules statically adds ~200 MB at startup, causing OOM before
// the health check passes, which triggers a restart loop that destroys the
// session cookie set by the OAuth callback → infinite login cycle.
// ─────────────────────────────────────────────────────────────────────────────

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
      logStructured("info", "scheduled_job_triggered", { job: s.label });
      Promise.resolve(s.fn()).catch(err =>
        logNonBlockingFailure("scheduled_job_failed", err, { job: s.label })
      );
    }
  }, 60_000);
}

async function startJobs() {
  // ═══════════════════════════════════════════════════════════════════════════
  // JOBS CRÍTICOS NOM-035 — solo los estrictamente necesarios para la norma.
  // Jobs no críticos (ML, análisis predictivo, reportes ejecutivos, etc.) están
  // deshabilitados para reducir la carga en la BD y el consumo de memoria.
  // ═══════════════════════════════════════════════════════════════════════════
  logStructured("info", "critical_jobs_starting", {});
  const schedules: Array<any> = (globalThis as any).__consolidatedSchedules ?? [];

  // ── Jobs activos con su propio scheduler interno (solo críticos NOM-035) ───
  const jobModules = await Promise.allSettled([
    import("../jobs/survey-alerts-job"),           // Alertas de encuestas NOM-035
    import("../jobs/survey-coverage-alerts-job"),   // Cobertura de encuestas
    import("../jobs/nom035-action-alerts-job"),      // Acciones NOM-035 por vencer
    import("../jobs/corrective-actions-reminders-job"), // Recordatorios acciones correctivas
    import("../jobs/training-reminders-job"),        // Recordatorios de capacitación
    import("../jobs/calculate-risk-level-job"),      // Cálculo nivel de riesgo psicosocial
    import("../jobs/survey-reminders-job"),          // Recordatorios de encuestas pendientes
    import("../jobs/dispatch-unread-alerts-job"),    // Despacho de alertas no leídas
    import("../jobs/compliance-reminders-job"),      // Recordatorios de cumplimiento
    import("../jobs/deadlineAlertsJob"),             // Alertas de fechas límite
  ]);

  const starters: Array<[string, string]> = [
    ["startSurveyAlertsJob", "survey-alerts-job"],
    ["startCoverageAlertsJob", "survey-coverage-alerts-job"],
    ["startNom035ActionAlertsJob", "nom035-action-alerts-job"],
    ["startCorrectiveActionsRemindersJob", "corrective-actions-reminders-job"],
    ["startTrainingRemindersJob", "training-reminders-job"],
    ["startCalculateRiskLevelJob", "calculate-risk-level-job"],
    ["scheduleSurveyRemindersJob", "survey-reminders-job"],
    ["startDispatchUnreadAlertsJob", "dispatch-unread-alerts-job"],
    ["initializeComplianceRemindersJob", "compliance-reminders-job"],
    ["startDeadlineAlertsJob", "deadlineAlertsJob"],
  ];

  // Gap mínimo de 200ms entre jobs — el pool de 15 conexiones puede manejarlo
  for (let i = 0; i < jobModules.length; i++) {
    const result = jobModules[i];
    const [fnName, modName] = starters[i];
    await new Promise(r => setTimeout(r, 200)); // 200ms mínimo entre jobs
    if (result.status === "fulfilled") {
      const mod = result.value as any;
      if (typeof mod[fnName] === "function") {
        try { mod[fnName](); } catch (e) { logNonBlockingFailure("job_start_failed", e, { job: modName }); }
      }
    } else {
      logNonBlockingFailure("job_module_load_failed", result.reason, { job: modName });
    }
  }

  // ── Jobs críticos en el minute-tick consolidado ───────────────────────────
  try {
    const { runCorrectiveActionPlansRemindersJob } = await import("../jobs/corrective-action-plans-reminders-job");
    schedules.push({ label: "corrective-action-plans-reminders", hour: 9, minute: 0, fn: runCorrectiveActionPlansRemindersJob });
  } catch (e) { logNonBlockingFailure("scheduled_job_load_failed", e, { job: "corrective-action-plans-reminders" }); }

  try {
    const { runContractExpirationAlertsJob } = await import("../jobs/contract-expiration-alerts-job");
    schedules.push({ label: "contract-expiration", hour: 8, minute: 0, fn: runContractExpirationAlertsJob });
  } catch (e) { logNonBlockingFailure("scheduled_job_load_failed", e, { job: "contract-expiration" }); }

  try {
    const { runDictamenExpiryAlertJob } = await import("../jobs/dictamen-expiry-alert-job");
    schedules.push({ label: "dictamen-expiry", hour: 8, minute: 0, fn: runDictamenExpiryAlertJob });
  } catch (e) { logNonBlockingFailure("scheduled_job_load_failed", e, { job: "dictamen-expiry" }); }

  try {
    const { runDc3ExpiryAlertsJob } = await import("../jobs/dc3-expiry-alerts-job");
    schedules.push({ label: "dc3-expiry", hour: 7, minute: 30, fn: runDc3ExpiryAlertsJob });
  } catch (e) { logNonBlockingFailure("scheduled_job_load_failed", e, { job: "dc3-expiry" }); }

  try {
    const { runPacStaleItemsJob } = await import("../jobs/pac-stale-items-job");
    schedules.push({ label: "pac-stale-items", hour: 9, minute: 0, fn: runPacStaleItemsJob });
  } catch (e) { logNonBlockingFailure("scheduled_job_load_failed", e, { job: "pac-stale-items" }); }

  // Reportes ejecutivos reactivados (solo se ejecutan en horario programado, no al arrancar)
  try {
    const { weeklyReportJob, monthlyReportJob } = await import("../jobs/executive-reports-job");
    schedules.push({ label: "weekly-report", hour: 8, minute: 0, dayOfWeek: 1, fn: weeklyReportJob });
    schedules.push({ label: "monthly-report", hour: 8, minute: 0, dayOfMonth: 1, fn: monthlyReportJob });
    logStructured("info", "scheduled_job_enabled", { job: "executive-reports" });
  } catch (e) { logNonBlockingFailure("scheduled_job_load_failed", e, { job: "executive-reports" }); }

  // Token expiration job — diario a las 9 AM
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
    logStructured("info", "scheduled_job_registered", { job: "anonymous-token-expiration", scheduledAt: next9AM.toISOString() });
  } catch (e) { logNonBlockingFailure("scheduled_job_load_failed", e, { job: "anonymous-token-expiration" }); }

  // ── Jobs NO CRÍTICOS deshabilitados (reducen carga DB y memoria) ────────────
  // DESHABILITADO: model-performance-monitor-job (ML, no NOM-035)
  // DESHABILITADO: model-auto-retraining-job (ML, no NOM-035)
  // DESHABILITADO: payroll-compensation-alerts-job (nómina, no NOM-035)
  // DESHABILITADO: external-offer-risk-monitor-job (riesgo externo, no NOM-035)
  // DESHABILITADO: predictive-turnover-job (rotación predictiva, no NOM-035)
  // DESHABILITADO: sentiment-analysis-job (análisis de sentimiento, no NOM-035)
  // DESHABILITADO: psychometric-reminder-job (psicometría, no NOM-035)
  // DESHABILITADO: performance-lcp-alerts-job (desempeño LCP, no NOM-035)
  // DESHABILITADO: intelligent-alerts-job (ML, no NOM-035)
  // DESHABILITADO: root-cause-analysis-job (ML, no NOM-035)
  // DESHABILITADO: predictiveAlertsJob (ML, no NOM-035)
  // DESHABILITADO: autoSnapshotsJob (snapshots mensuales, no crítico)
  // DESHABILITADO: competencyRegressionAlertsJob (ML, no NOM-035)
  // DESHABILITADO: executive-reports-job (reportes ejecutivos, no crítico)
  // DESHABILITADO: monthly-reports-job (reportes mensuales, no crítico)
  // DESHABILITADO: security-alerts-job (seguridad doc, no NOM-035 core)
  // DESHABILITADO: alertSummaryCronJob (resumen alertas, no crítico)
  // DESHABILITADO: agreementsAlerts (acuerdos, no NOM-035 core)
  // DESHABILITADO: stale-cases-alerts-job (casos viejos, no crítico)
  // DESHABILITADO: departments-without-manager-job (org, no NOM-035)
  // DESHABILITADO: approvalRemindersJob (aprobaciones, no crítico)
  // DESHABILITADO: post-case-surveys-job (encuestas post-caso, no crítico)
  // DESHABILITADO: departmental-alerts-job (alertas dept, no crítico)
  // DESHABILITADO: realtime-alerts-job (WebSocket, no crítico para NOM-035)

  logStructured("info", "critical_jobs_started", { nonCriticalJobsDisabled: true });
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
    logStructured("info", "authentication_mode_configured", { mode: "local" });
  } else {
    registerOAuthRoutes(app);
    logStructured("info", "authentication_mode_configured", { mode: "oauth" });
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
      logStructured("info", "warmup_ping_received", { taskUid: String(taskUid) });
      res.json({ ok: true, ts: Date.now(), taskUid });
    } catch (err) {
      logNonBlockingFailure("warmup_ping_failed", err);
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

  // El sandbox necesita Vite para transformar /src/main.tsx y completar la hidratación.
  // Producción utiliza únicamente los artefactos estáticos ya compilados.
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // La pasarela de vista previa enruta exclusivamente al puerto configurado.
  // Elegir un puerto alterno tras un conflicto deja el proceso saludable de forma
  // local, pero inaccesible desde la URL temporal y se manifiesta como un 502.
  const port = parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }

  initializeWebSocket(server);

  server.once("error", (error) => {
    logNonBlockingFailure("server_listen_failed", error, { port });
    process.exitCode = 1;
  });

  server.listen(port, () => {
    logStructured("info", "server_started", { port });

    // Start the consolidated minute-tick scheduler (single setInterval)
    startConsolidatedMinuteTick();

    // Delay inicial de 15s: suficiente para que Cloud Run pase el health check (~5s)
    // y el pool de DB se estabilice antes de que los jobs empiecen a conectarse.
    const JOB_STARTUP_DELAY_MS = 15_000;
    logStructured("info", "scheduled_jobs_delayed", { delaySeconds: JOB_STARTUP_DELAY_MS / 1000 });

    setTimeout(() => {
      startJobs().catch(err => logNonBlockingFailure("scheduled_jobs_start_failed", err));
    }, JOB_STARTUP_DELAY_MS);

    // Warmup periódico: ping interno cada 4 minutos para evitar hibernación de Cloud Run.
    // Usa httpRequest importado en la cabecera (ESM, no require).
    const WARMUP_INTERVAL_MS = 4 * 60 * 1000; // 4 minutos
    setInterval(() => {
      const req = httpRequest({ hostname: 'localhost', port, path: '/api/health', method: 'GET' }, (res) => {
        res.resume(); // consume response body
      });
      req.on('error', (error) => logNonBlockingFailure("warmup_request_failed", error));
      req.end();
    }, WARMUP_INTERVAL_MS);
    logStructured("info", "warmup_interval_enabled", { intervalMinutes: WARMUP_INTERVAL_MS / 60000 });
  });
}

startServer().catch((error) => logNonBlockingFailure("server_start_failed", error));
