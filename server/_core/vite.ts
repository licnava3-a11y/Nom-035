import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";
import { logNonBlockingFailure, logStructured } from "./logger";

// CRITICAL: vite and vite.config MUST be imported dynamically so that esbuild
// marks them as external and does NOT bundle them into dist/index.js.
// Bundling vite.config pulls in @tailwindcss/oxide, @rollup, and other native
// binaries (.node files) that crash Node.js with SIGSEGV on Cloud Run.
export async function setupVite(app: Express, server: Server) {
  const { nanoid } = await import("nanoid");
  const { createServer: createViteServer } = await import("vite");

  // Resolve vite.config.ts from the project root (two levels up from dist/)
  // In dev: __dirname = /project/server/_core → root = /project
  // In prod bundle: import.meta.dirname = /project/dist → root = /project
  const projectRoot = path.resolve(import.meta.dirname, "../..");
  const viteConfigPath = path.join(projectRoot, "vite.config.ts");
  // Dynamic import of vite.config — keeps native vite plugins out of the prod bundle
  const viteConfig = (await import(viteConfigPath)).default;

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    logStructured("warn", "static_directory_missing", {
      environment: process.env.NODE_ENV ?? "unknown",
    });
  }

  // Ensure dist/public/index.html always has the correct %VITE_*% placeholders.
  // In dev (sandbox), vite build never runs, so we always copy from client/index.html.
  // In production (Cloud Run), the Dockerfile runs vite build which produces the
  // compiled index.html with hashed asset references — we must NOT overwrite it.
  const indexPath = path.resolve(distPath, "index.html");
  const clientIndexPath = path.resolve(
    import.meta.dirname,
    "../..",
    "client",
    "index.html"
  );
  const restoreDevelopmentIndex = () => {
    if (
      process.env.NODE_ENV !== "development" ||
      !fs.existsSync(clientIndexPath)
    )
      return false;
    fs.mkdirSync(distPath, { recursive: true });
    fs.copyFileSync(clientIndexPath, indexPath);
    logStructured("info", "preview_index_restored", {
      environment: "development",
    });
    return true;
  };

  if (
    process.env.NODE_ENV === "development" &&
    fs.existsSync(clientIndexPath)
  ) {
    // Always refresh in dev to keep placeholders in sync with client/index.html
    restoreDevelopmentIndex();
  } else if (!fs.existsSync(indexPath) && fs.existsSync(clientIndexPath)) {
    // Production fallback: only copy if missing (should not happen after vite build)
    fs.mkdirSync(distPath, { recursive: true });
    fs.copyFileSync(clientIndexPath, indexPath);
    logStructured("warn", "production_index_fallback_restored", {});
  }

  // Serve static assets (JS, CSS, images, fonts) — but NOT index.html.
  // We exclude index.html from express.static so it always goes through
  // the dynamic handler below, which replaces %VITE_*% placeholders at runtime.
  // This is critical because VITE_APP_ID and other env vars are only available
  // at runtime (Cloud Run / sandbox), NOT at Docker build time.
  app.use(
    express.static(distPath, {
      index: false, // ← Do NOT serve index.html automatically
    })
  );

  // Dynamic handler: serve index.html with %VITE_*% placeholders replaced.
  // Handles ALL routes (SPA fallback) and injects runtime env values.
  app.use("*", (_req, res) => {
    try {
      // A local build may clean dist/ while the preview server remains active.
      // Restore the source index on demand so preview never returns ENOENT.
      if (!fs.existsSync(indexPath)) restoreDevelopmentIndex();
      let html = fs.readFileSync(indexPath, "utf-8");
      // Replace Vite-style %PLACEHOLDER% with actual runtime env values.
      // VITE_APP_ID and VITE_OAUTH_PORTAL_URL are injected by the platform
      // as process.env at startup — both in Cloud Run and in the sandbox dev server.
      html = html
        .replace(/%VITE_APP_ID%/g, process.env.VITE_APP_ID ?? "")
        .replace(
          /%VITE_OAUTH_PORTAL_URL%/g,
          process.env.VITE_OAUTH_PORTAL_URL ?? "https://manus.im"
        )
        .replace(
          /%VITE_ANALYTICS_ENDPOINT%/g,
          process.env.VITE_ANALYTICS_ENDPOINT ?? ""
        )
        .replace(
          /%VITE_ANALYTICS_WEBSITE_ID%/g,
          process.env.VITE_ANALYTICS_WEBSITE_ID ?? ""
        )
        .replace(
          /%VITE_APP_TITLE%/g,
          process.env.VITE_APP_TITLE ?? "NOM-035 STPS"
        )
        .replace(/%VITE_APP_ID%/g, process.env.VITE_APP_ID ?? "")
        .replace(
          /%VITE_FRONTEND_FORGE_API_KEY%/g,
          process.env.VITE_FRONTEND_FORGE_API_KEY ?? ""
        )
        .replace(
          /%VITE_FRONTEND_FORGE_API_URL%/g,
          process.env.VITE_FRONTEND_FORGE_API_URL ?? ""
        );
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (error) {
      logNonBlockingFailure("preview_index_restore_failed", error);
      res
        .status(503)
        .type("text/plain")
        .send(
          "La vista previa se está recuperando. Actualiza la página en unos segundos."
        );
    }
  });
}
