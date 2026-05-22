import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
// VitePWA deshabilitado — el SW causaba loops de recarga en iOS Safari
// import { VitePWA } from "vite-plugin-pwa";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  vitePluginManusDebugCollector(),
  // VitePWA eliminado — el SW causaba loops de recarga en iOS Safari
  // y el módulo virtual virtual:pwa-register/react rompe el bundle de producción
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Optimizaciones críticas de velocidad de build para producción
    minify: 'esbuild',         // esbuild es 10-20x más rápido que terser (default)
    sourcemap: false,           // Sin sourcemaps → build ~40% más rápido
    target: 'es2020',           // Target moderno → menos transpilación
    cssMinify: 'esbuild',       // CSS minificado con esbuild también
    rollupOptions: {
      output: {
        // manualChunks simplificado: solo las dependencias más pesadas
        // Menos chunks = menos overhead de análisis en Rollup
        manualChunks(id) {
          // React core (crítico: siempre en caché)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/wouter/')) {
            return 'vendor-react';
          }
          // tRPC + React Query
          if (id.includes('node_modules/@trpc/') || id.includes('node_modules/@tanstack/')) {
            return 'vendor-trpc';
          }
          // Radix UI (muy pesado, vale la pena separar)
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          // Librerías pesadas de visualización y datos (agrupadas juntas)
          if (
            id.includes('node_modules/chart.js/') ||
            id.includes('node_modules/react-chartjs-2/') ||
            id.includes('node_modules/chartjs-plugin-annotation/') ||
            id.includes('node_modules/recharts/') ||
            id.includes('node_modules/d3-')
          ) {
            return 'vendor-charts';
          }
          // Excel + PDF (solo se cargan en páginas de exportación)
          if (
            id.includes('node_modules/xlsx/') ||
            id.includes('node_modules/jspdf/') ||
            id.includes('node_modules/jspdf-autotable/')
          ) {
            return 'vendor-export';
          }
          // i18n (pesado, vale separar)
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next/')) {
            return 'vendor-i18n';
          }
          // Framer Motion
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion';
          }
          // Formularios y validación
          if (id.includes('node_modules/react-hook-form/') || id.includes('node_modules/zod/') || id.includes('node_modules/@hookform/')) {
            return 'vendor-forms';
          }
          // Utilidades de fecha
          if (id.includes('node_modules/date-fns/') || id.includes('node_modules/react-day-picker/')) {
            return 'vendor-dates';
          }
          // Resto de node_modules → vendor-misc
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000, // 2MB para evitar warnings en chunks grandes
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
