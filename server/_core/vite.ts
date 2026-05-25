import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";

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
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
