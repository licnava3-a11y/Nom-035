import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { employees, employeeCompetencies, jobProfiles, jobPositions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@test.com",
    name: "Admin User",
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

describe("CompetenciesStats Router", () => {

  it("should get overall statistics", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.competenciesStats.getOverallStats();

    expect(stats).toBeDefined();
    expect(stats.totalEmployees).toBeGreaterThanOrEqual(0);
    expect(stats.totalCompetencies).toBeGreaterThanOrEqual(0);
    expect(stats.avgCompetencyLevel).toBeGreaterThanOrEqual(0);
    expect(stats.avgCompetencyLevel).toBeLessThanOrEqual(4);
  });

  it("should get statistics by department", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.competenciesStats.getByDepartment();

    expect(stats).toBeDefined();
    expect(Array.isArray(stats)).toBe(true);

    // Verify structure of department stats
    if (stats.length > 0) {
      const firstDept = stats[0];
      expect(firstDept.department).toBeDefined();
      expect(firstDept.employeeCount).toBeGreaterThan(0);
      expect(firstDept.avgCompetencyLevel).toBeGreaterThanOrEqual(0);
      expect(firstDept.criticalGaps).toBeGreaterThanOrEqual(0);
    }
  });

  it("should get statistics by competency type", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.competenciesStats.getByType();

    expect(stats).toBeDefined();
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBe(3); // tecnica, transversal, conocimiento

    const tecnica = stats.find((s) => s.type === "Técnica");
    expect(tecnica).toBeDefined();
    if (tecnica) {
      expect(tecnica.count).toBeGreaterThanOrEqual(0);
      expect(tecnica.avgLevel).toBeGreaterThanOrEqual(0);
    }
  });

  it("should get top competency gaps", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const gaps = await caller.competenciesStats.getTopGaps({ limit: 5 });

    expect(gaps).toBeDefined();
    expect(Array.isArray(gaps)).toBe(true);
    expect(gaps.length).toBeLessThanOrEqual(5);

    if (gaps.length > 0) {
      const firstGap = gaps[0];
      expect(firstGap.competencyName).toBeDefined();
      expect(firstGap.totalGap).toBeGreaterThan(0);
      expect(firstGap.employeesAffected).toBeGreaterThan(0);
    }
  });

  it("should calculate gaps correctly", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const gaps = await caller.competenciesStats.getTopGaps({ limit: 10 });

    // Verify gap structure
    if (gaps.length > 0) {
      const firstGap = gaps[0];
      expect(firstGap.totalGap).toBeGreaterThan(0);
      expect(firstGap.employeesAffected).toBeGreaterThan(0);
      expect(firstGap.criticalCount).toBeGreaterThanOrEqual(0);
    }
  });
});
