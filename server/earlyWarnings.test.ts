import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("earlyWarnings router", () => {
  const mockContext: Context = {
    user: {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const caller = appRouter.createCaller(mockContext);

  describe("getSummary", () => {
    it("should return summary of all early warnings", async () => {
      const result = await caller.earlyWarnings.getSummary();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("casesAboutToExpire");
      expect(result).toHaveProperty("pendingSurveys");
      expect(result).toHaveProperty("actionsWithoutFollowUp");
      expect(result).toHaveProperty("totalAlerts");

      expect(typeof result.casesAboutToExpire).toBe("number");
      expect(typeof result.pendingSurveys).toBe("number");
      expect(typeof result.actionsWithoutFollowUp).toBe("number");
      expect(typeof result.totalAlerts).toBe("number");

      // Total alerts should be sum of all categories
      expect(result.totalAlerts).toBe(
        result.casesAboutToExpire +
          result.pendingSurveys +
          result.actionsWithoutFollowUp
      );
    });
  });

  describe("getCasesAboutToExpire", () => {
    it("should return cases with priority classification", async () => {
      const result = await caller.earlyWarnings.getCasesAboutToExpire();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("cases");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("highPriority");
      expect(result).toHaveProperty("mediumPriority");
      expect(result).toHaveProperty("lowPriority");

      expect(Array.isArray(result.cases)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(typeof result.highPriority).toBe("number");
      expect(typeof result.mediumPriority).toBe("number");
      expect(typeof result.lowPriority).toBe("number");

      // Sum of priorities should equal total
      expect(result.total).toBe(
        result.highPriority + result.mediumPriority + result.lowPriority
      );

      // Each case should have required fields
      result.cases.forEach(caso => {
        expect(caso).toHaveProperty("id");
        expect(caso).toHaveProperty("folio");
        expect(caso).toHaveProperty("employeeName");
        expect(caso).toHaveProperty("riskLevel");
        expect(caso).toHaveProperty("deadline");
        expect(caso).toHaveProperty("daysRemaining");
        expect(caso).toHaveProperty("priority");
        expect(caso).toHaveProperty("priorityColor");

        // Priority should be one of: high, medium, low
        expect(["high", "medium", "low"]).toContain(caso.priority);

        // Priority color should be one of: red, yellow, green
        expect(["red", "yellow", "green"]).toContain(caso.priorityColor);

        // Days remaining should be <= 30
        expect(caso.daysRemaining).toBeLessThanOrEqual(30);
      });
    });
  });

  describe("getPendingSurveys", () => {
    it("should return pending surveys with completion rate", async () => {
      const result = await caller.earlyWarnings.getPendingSurveys();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("surveys");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("highPriority");
      expect(result).toHaveProperty("mediumPriority");
      expect(result).toHaveProperty("lowPriority");

      expect(Array.isArray(result.surveys)).toBe(true);
      expect(typeof result.total).toBe("number");

      // Sum of priorities should equal total
      expect(result.total).toBe(
        result.highPriority + result.mediumPriority + result.lowPriority
      );

      // Each survey should have required fields
      result.surveys.forEach(survey => {
        expect(survey).toHaveProperty("id");
        expect(survey).toHaveProperty("title");
        expect(survey).toHaveProperty("type");
        expect(survey).toHaveProperty("daysOverdue");
        expect(survey).toHaveProperty("completionRate");
        expect(survey).toHaveProperty("priority");
        expect(survey).toHaveProperty("priorityColor");

        // Completion rate should be between 0 and 100
        expect(survey.completionRate).toBeGreaterThanOrEqual(0);
        expect(survey.completionRate).toBeLessThanOrEqual(100);

        // Priority should be one of: high, medium, low
        expect(["high", "medium", "low"]).toContain(survey.priority);

        // Priority color should be one of: red, yellow, green
        expect(["red", "yellow", "green"]).toContain(survey.priorityColor);

        // Days overdue should be positive (since these are pending surveys)
        expect(survey.daysOverdue).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("getActionsWithoutFollowUp", () => {
    it("should return actions without recent updates", async () => {
      const result = await caller.earlyWarnings.getActionsWithoutFollowUp();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("actions");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("highPriority");
      expect(result).toHaveProperty("mediumPriority");
      expect(result).toHaveProperty("lowPriority");

      expect(Array.isArray(result.actions)).toBe(true);
      expect(typeof result.total).toBe("number");

      // Sum of priorities should equal total
      expect(result.total).toBe(
        result.highPriority + result.mediumPriority + result.lowPriority
      );

      // Each action should have required fields
      result.actions.forEach(action => {
        expect(action).toHaveProperty("id");
        expect(action).toHaveProperty("description");
        expect(action).toHaveProperty("status");
        expect(action).toHaveProperty("daysSinceUpdate");
        expect(action).toHaveProperty("alertPriority");
        expect(action).toHaveProperty("priorityColor");

        // Priority should be one of: high, medium, low
        expect(["high", "medium", "low"]).toContain(action.alertPriority);

        // Priority color should be one of: red, yellow, green
        expect(["red", "yellow", "green"]).toContain(action.priorityColor);

        // Days since update should be >= 30 (since these are actions without follow-up)
        expect(action.daysSinceUpdate).toBeGreaterThanOrEqual(30);
      });
    });
  });
});
