import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("interventionImpact router", () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  it("should create a new intervention analysis", async () => {
    const result = await caller.interventionImpact.create({
      interventionType: "training",
      interventionName: "Test Intervention - Automated Test",
      description: "Test description for automated testing",
      implementationDate: "2026-01-15",
      measurementPeriodMonths: 3,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  it("should list interventions with filters", async () => {
    const result = await caller.interventionImpact.list({
      status: "active",
      interventionType: "training",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should get intervention by ID", async () => {
    // Primero crear una intervención para probar
    const created = await caller.interventionImpact.create({
      interventionType: "policy_change",
      interventionName: "Test Get By ID",
      description: "Test",
      implementationDate: "2026-01-15",
      measurementPeriodMonths: 3,
    });

    const result = await caller.interventionImpact.getById({ id: created.id });

    expect(result).toBeDefined();
    if (result) {
      expect(result.id).toBe(created.id);
    }
  });

  it("should calculate metrics for intervention", async () => {
    // Primero crear una intervención para probar
    const created = await caller.interventionImpact.create({
      interventionType: "corrective_action",
      interventionName: "Test Calculate Metrics",
      description: "Test",
      implementationDate: "2026-01-15",
      measurementPeriodMonths: 3,
    });

    const result = await caller.interventionImpact.calculateMetrics({ id: created.id });

    expect(result).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.metrics.casesBeforeCount).toBeGreaterThanOrEqual(0);
    expect(result.metrics.casesAfterCount).toBeGreaterThanOrEqual(0);
    expect(result.metrics.effectivenessScore).toBeGreaterThanOrEqual(0);
    expect(result.metrics.effectivenessScore).toBeLessThanOrEqual(100);
  });

  it("should generate insights with AI", async () => {
    // Primero crear una intervención para probar
    const created = await caller.interventionImpact.create({
      interventionType: "awareness_campaign",
      interventionName: "Test Generate Insights",
      description: "Test",
      implementationDate: "2026-01-15",
      measurementPeriodMonths: 3,
    });

    const result = await caller.interventionImpact.generateInsights({ id: created.id });

    expect(result).toBeDefined();
    expect(result.insights).toBeDefined();
    expect(result.insights.successFactors).toBeDefined();
    expect(Array.isArray(result.insights.successFactors)).toBe(true);
    expect(result.insights.challenges).toBeDefined();
    expect(Array.isArray(result.insights.challenges)).toBe(true);
    expect(result.insights.recommendations).toBeDefined();
    expect(Array.isArray(result.insights.recommendations)).toBe(true);
    expect(result.insights.predictedImpact).toBeDefined();
    expect(typeof result.insights.predictedImpact).toBe("string");
  }, 15000);

  it("should get dashboard data", async () => {
    const result = await caller.interventionImpact.getDashboard();

    expect(result).toBeDefined();
    expect(result.totalInterventions).toBeGreaterThan(0);
    expect(Number(result.avgEffectiveness)).toBeGreaterThanOrEqual(0);
    expect(Number(result.totalCasesAvoided)).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.topInterventions)).toBe(true);
  });
});
