import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

/**
 * Estas pruebas persisten o consultan datos reales y necesitan una base de
 * datos configurada. Por defecto se excluyen de la suite unitaria para que
 * `pnpm test` sea reproducible en CI; se activan explícitamente con
 * RUN_DB_INTEGRATION_TESTS=true.
 */
const databaseIntegrationTests = [
  "server/cases-debug.test.ts",
  "server/cases.test.ts",
  "server/competenciesStats.test.ts",
  "server/correctiveActions.generatePDF.test.ts",
  "server/dc3-rfc-pdf.test.ts",
  "server/documents.test.ts",
  "server/earlyWarnings.coverage.test.ts",
  "server/earlyWarnings.test.ts",
  "server/employees.test.ts",
  "server/employees.terminate.test.ts",
  "server/exitInterviews.test.ts",
  "server/financial.test.ts",
  "server/interventionImpact.test.ts",
  "server/routers/trainingNeeds.test.ts",
  "server/sprint4.test.ts",
  "server/sprint38.test.ts",
  "server/sprint55.test.ts",
  "server/survey-alerts.test.ts",
  "server/systemSettings.test.ts",
];

const runDatabaseIntegrationTests = process.env.RUN_DB_INTEGRATION_TESTS === "true";

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "happy-dom",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.ts",
      "client/**/*.test.tsx",
      "client/**/*.spec.ts",
      "client/**/*.spec.tsx",
    ],
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      ...(runDatabaseIntegrationTests ? [] : databaseIntegrationTests),
    ],
  },
});
