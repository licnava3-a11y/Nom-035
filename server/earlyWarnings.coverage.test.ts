import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("earlyWarnings.getSurveyCoverageAlerts", () => {
  it("should return coverage alerts for surveys below 80% threshold", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: "admin",
      },
    });

    const result = await caller.earlyWarnings.getSurveyCoverageAlerts();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("alerts");
    expect(result).toHaveProperty("totalAlerts");
    expect(Array.isArray(result.alerts)).toBe(true);
    expect(typeof result.totalAlerts).toBe("number");
  });

  it("should calculate coverage correctly", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: "admin",
      },
    });

    const result = await caller.earlyWarnings.getSurveyCoverageAlerts();

    if (result.alerts.length > 0) {
      const alert = result.alerts[0];

      expect(alert).toHaveProperty("surveyId");
      expect(alert).toHaveProperty("surveyType");
      expect(alert).toHaveProperty("surveyTitle");
      expect(alert).toHaveProperty("totalWorkers");
      expect(alert).toHaveProperty("completedSurveys");
      expect(alert).toHaveProperty("coverage");
      expect(alert).toHaveProperty("threshold");
      expect(alert).toHaveProperty("gap");
      expect(alert).toHaveProperty("priority");
      expect(alert).toHaveProperty("priorityColor");

      // Verificar que la cobertura esté por debajo del umbral
      expect(alert.coverage).toBeLessThan(alert.threshold);

      // Verificar que la brecha sea correcta
      const expectedGap =
        Math.round((alert.threshold - alert.coverage) * 100) / 100;
      expect(alert.gap).toBe(expectedGap);
    }
  });

  it("should assign correct priority based on coverage", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: "admin",
      },
    });

    const result = await caller.earlyWarnings.getSurveyCoverageAlerts();

    if (result.alerts.length > 0) {
      result.alerts.forEach((alert: any) => {
        if (alert.coverage < 50) {
          expect(alert.priority).toBe("high");
          expect(alert.priorityColor).toBe("red");
        } else if (alert.coverage < 65) {
          expect(alert.priority).toBe("medium");
          expect(alert.priorityColor).toBe("yellow");
        } else {
          expect(alert.priority).toBe("low");
          expect(alert.priorityColor).toBe("green");
        }
      });
    }
  });
});
