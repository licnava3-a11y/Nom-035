import "dotenv/config";
import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { globalLimiter, authLimiter, contactFormLimiter, apiLimiter, exportLimiter } from "./rateLimiter";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import uploadRouter from "../upload";
import exportRouter from "../exportRouter";
import { startSurveyAlertsJob } from "../jobs/survey-alerts-job";
import { startCoverageAlertsJob } from "../jobs/survey-coverage-alerts-job";
import { startAlertSummaryCronJob } from "../jobs/alertSummaryCronJob";
import { startSecurityAlertsJob } from "../jobs/security-alerts-job";
import { startModelPerformanceMonitorJob } from "../jobs/model-performance-monitor-job";
import { startModelAutoRetrainingJob } from "../jobs/model-auto-retraining-job";
import { startPayrollCompensationAlertsJob } from "../jobs/payroll-compensation-alerts-job";
import { startExternalOfferRiskMonitorJob } from "../jobs/external-offer-risk-monitor-job";
import { startAgreementsAlertsJob } from "../jobs/agreementsAlerts";
import { startCorrectiveActionsRemindersJob } from "../jobs/corrective-actions-reminders-job";
import { startStaleCasesJob } from "../jobs/stale-cases-alerts-job";
import { startCalculateRiskLevelJob } from "../jobs/calculate-risk-level-job";
import { runRootCauseAnalysisJob } from "../jobs/root-cause-analysis-job";
import { startTrainingRemindersJob } from "../jobs/training-reminders-job";
import { startDepartmentsWithoutManagerJob } from "../jobs/departments-without-manager-job";
import { startApprovalRemindersJob } from "../jobs/approvalRemindersJob";
import { startPredictiveTurnoverJob } from "../jobs/predictive-turnover-job";
import { runIntelligentAlertsJob } from "../jobs/intelligent-alerts-job";
import { runCorrectiveActionPlansRemindersJob, correctiveActionPlansRemindersJobSchedule } from "../jobs/corrective-action-plans-reminders-job";
import { schedulePostCaseSurveysJob } from "../jobs/post-case-surveys-job";
import { scheduleDepartmentalAlertsJob } from "../jobs/departmental-alerts-job";
import { scheduleSurveyRemindersJob } from "../jobs/survey-reminders-job";
import { runTokenExpirationJob } from "../jobs/anonymousTokenExpirationJob";
import { runPredictiveAlertsJob } from "../jobs/predictiveAlertsJob";
import { generateMonthlySnapshots } from "../jobs/autoSnapshotsJob";
import { detectCompetencyRegressions } from "../jobs/competencyRegressionAlertsJob";
import { weeklyReportJob, monthlyReportJob } from "../jobs/executive-reports-job";
import { initializeWebSocket } from "./websocket";
import { initializeSentimentAnalysisJob } from "../jobs/sentiment-analysis-job";
import { initializeComplianceRemindersJob } from "../jobs/compliance-reminders-job";
import { runMonthlyReportsJob } from "./jobs/monthly-reports-job";


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

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Aplicar rate limiting global a todas las rutas
  app.use(globalLimiter);
  
  // Rate limiting específico para autenticación (más estricto)
  app.use("/api/oauth", authLimiter);
  
  // Rate limiting para endpoints de API sensibles
  app.use("/api/trpc", apiLimiter);
  
  // Rate limiting para formularios de contacto (si existen)
  // app.use("/api/contact", contactFormLimiter);
  
  // Rate limiting para exportaciones y reportes
  // app.use("/api/export", exportLimiter);

  // Security headers with helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Necesario para Vite HMR en desarrollo
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        frameSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Necesario para algunos recursos externos
  }));
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  

  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Upload API
  app.use("/api", uploadRouter);
  // Export API
  app.use("/api", exportRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Inicializar WebSocket
  initializeWebSocket(server);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Iniciar jobs de alertas automáticas
    startSurveyAlertsJob();
    startCoverageAlertsJob();
    startAlertSummaryCronJob();
    startSecurityAlertsJob();
    startModelPerformanceMonitorJob();
    startModelAutoRetrainingJob();
    startPayrollCompensationAlertsJob();
    startExternalOfferRiskMonitorJob();
    startAgreementsAlertsJob();
    startCorrectiveActionsRemindersJob();
    startStaleCasesJob();
    startCalculateRiskLevelJob();
    startTrainingRemindersJob();
    startDepartmentsWithoutManagerJob();
    startPredictiveTurnoverJob();
    startApprovalRemindersJob();

    // Deadline Alerts Job (daily at 9:00 AM)
    import("../jobs/deadlineAlertsJob").then(({ startDeadlineAlertsJob }) => {
      startDeadlineAlertsJob();
    });

    // Corrective Action Plans Reminders Job (daily at 9:00 AM)
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        await runCorrectiveActionPlansRemindersJob();
      }
    }, 60000); // Check every minute

    // Intelligent Alerts Job (daily at 2:00 AM)
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        await runIntelligentAlertsJob();
      }
    }, 60000); // Check every minute
    schedulePostCaseSurveysJob();
    scheduleDepartmentalAlertsJob();
    scheduleSurveyRemindersJob();
    
    // Schedule root cause analysis job (monthly on 1st day at 3:00 AM)
    setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 3 && now.getMinutes() === 0) {
        runRootCauseAnalysisJob().catch(console.error);
      }
    }, 60000); // Check every minute
    
    // Schedule predictive alerts job (daily at 8:00 AM)
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 8 && now.getMinutes() === 0) {
        runPredictiveAlertsJob().catch(console.error);
      }
    }, 60000); // Check every minute

    // Schedule automatic snapshots job (monthly on 1st at 00:00)
    setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
        console.log("[Auto Snapshots Job] Triggering monthly snapshots generation");
        generateMonthlySnapshots().catch(console.error);
      }
    }, 60000); // Check every minute

    // Schedule competency regression alerts job (daily at 9:00 AM)
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        console.log("[Competency Regression Job] Triggering regression detection");
        detectCompetencyRegressions().catch(console.error);
      }
    }, 60000); // Check every minute
    
    // Job de notificaciones de expiración de tokens anónimos (diario a las 9:00 AM)
    const scheduleTokenExpirationJob = () => {
      const now = new Date();
      const next9AM = new Date(now);
      next9AM.setHours(9, 0, 0, 0);
      
      if (now > next9AM) {
        next9AM.setDate(next9AM.getDate() + 1);
      }
      
      const msUntilNext9AM = next9AM.getTime() - now.getTime();
      
      setTimeout(() => {
        runTokenExpirationJob();
        setInterval(runTokenExpirationJob, 24 * 60 * 60 * 1000); // Cada 24 horas
      }, msUntilNext9AM);
      
      console.log(`[Token Expiration Job] First execution scheduled for ${next9AM.toLocaleString('es-MX')}`);
    };
    
    scheduleTokenExpirationJob();
    
    // Executive Reports Jobs
    // Weekly report: Every Monday at 8:00 AM
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() === 0) {
        console.log("[Executive Reports Job] Triggering weekly report generation");
        weeklyReportJob().catch(console.error);
      }
    }, 60000); // Check every minute
    
    // Monthly report: 1st day of each month at 8:00 AM
    setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 8 && now.getMinutes() === 0) {
        console.log("[Executive Reports Job] Triggering monthly report generation");
        monthlyReportJob().catch(console.error);
      }
    }, 60000); // Check every minute
    
    // Sentiment Analysis Job
    initializeSentimentAnalysisJob();
    
    // Compliance Reminders Job
    initializeComplianceRemindersJob();
    
    // Monthly Reports Job (1st day of month at 8:00 AM)
    setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 8 && now.getMinutes() === 0) {
        console.log("[Monthly Reports Job] Triggering automated monthly reports");
        runMonthlyReportsJob().catch(console.error);
      }
    }, 60000); // Check every minute
  });
}

startServer().catch(console.error);
