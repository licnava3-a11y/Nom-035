import { describe, it, expect } from "vitest";
import { surveyAlertsRouter } from "./routers/surveyAlerts";

/**
 * Tests para el sistema de alertas automáticas de encuestas NOM-035
 *
 * Para ejecutar: pnpm test survey-alerts.test.ts
 */

describe("Survey Alerts System", () => {
  const caller = surveyAlertsRouter.createCaller({
    user: null,
    req: {} as any,
    res: {} as any,
  });

  it("should check low coverage alerts without errors", async () => {
    const result = await caller.checkLowCoverageAlerts({});

    expect(result).toHaveProperty("checked");
    expect(result).toHaveProperty("alertsSent");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);

    console.log("Low coverage alerts check result:", result);
  });

  it("should check pending workers alerts without errors", async () => {
    const result = await caller.checkPendingWorkersAlerts({ daysThreshold: 2 });

    expect(result).toHaveProperty("checked");
    expect(result).toHaveProperty("alertsSent");
    expect(result).toHaveProperty("workersFound");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);

    console.log("Pending workers alerts check result:", result);
  });

  it("should get alert history", async () => {
    const result = await caller.getAlertHistory({ limit: 10 });

    expect(Array.isArray(result)).toBe(true);

    console.log(`Found ${result.length} alerts in history`);
    if (result.length > 0) {
      console.log("Latest alert:", result[0]);
    }
  });

  it("should check specific survey alerts", async () => {
    // Probar con el ID de una encuesta específica (ajustar según tu base de datos)
    const surveyId = 1;

    const coverageResult = await caller.checkLowCoverageAlerts({ surveyId });
    const pendingResult = await caller.checkPendingWorkersAlerts({
      surveyId,
      daysThreshold: 2,
    });

    console.log(`Survey ${surveyId} - Coverage check:`, coverageResult);
    console.log(`Survey ${surveyId} - Pending workers check:`, pendingResult);

    expect(coverageResult.checked).toBeGreaterThanOrEqual(0);
    expect(pendingResult.checked).toBeGreaterThanOrEqual(0);
  });
});
