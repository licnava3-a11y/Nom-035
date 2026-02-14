import "dotenv/config";
import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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
import { startAgreementsAlertsJob } from "../jobs/agreementsAlerts";
import { startCorrectiveActionsRemindersJob } from "../jobs/corrective-actions-reminders-job";
import { initializeWebSocket } from "./websocket";

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
  
  // Rate limiting para proteger contra ataques de fuerza bruta
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 requests por ventana
    message: "Demasiadas solicitudes desde esta IP, por favor intente más tarde.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Límite de 5 intentos de login por ventana
    message: "Demasiados intentos de inicio de sesión, por favor intente más tarde.",
    skipSuccessfulRequests: true,
  });

  // Aplicar rate limiting a rutas específicas
  app.use("/api/trpc", apiLimiter);
  app.use("/api/oauth", authLimiter);

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
    startAgreementsAlertsJob();
    startCorrectiveActionsRemindersJob();
  });
}

startServer().catch(console.error);
