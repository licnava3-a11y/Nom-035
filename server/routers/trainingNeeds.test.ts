import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import type { Context } from "../_core/context";
import * as employeesDb from "../db-employees";
import { getDb } from "../db";
import { employees, trainingNeeds } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("trainingNeeds router", () => {
  let adminContext: Context;
  let testEmployeeId: number;
  let createdNeedId: number;
  const ts = Date.now();

  beforeAll(async () => {
    adminContext = await createContext({
      req: { headers: {}, cookies: {} } as any,
      res: {} as any,
    });
    adminContext.user = {
      id: 1,
      openId: "admin-test",
      name: "Admin Test",
      email: "admin@test.com",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create a test employee for training needs
    testEmployeeId = await employeesDb.createEmployee({
      firstName: "Training",
      lastName: "Test",
      email: `training-test-${ts}@test.com`,
      employeeNumber: `EMP-TN-${ts}`,
      hireDate: new Date("2024-01-01"),
      contractType: "permanent",
      reentryCount: 0,
      previousHireDates: null,
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (db) {
      // Cleanup training needs for test employee
      try {
        await db.delete(trainingNeeds).where(eq(trainingNeeds.employeeId, testEmployeeId));
      } catch (e) {
        console.warn("Cleanup trainingNeeds failed:", e);
      }
      // Cleanup test employee
      try {
        await db.delete(employees).where(eq(employees.id, testEmployeeId));
      } catch (e) {
        console.warn("Cleanup employee failed:", e);
      }
    }
  });

  describe("create", () => {
    it("should create a training need", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.trainingNeeds.create({
        employeeId: testEmployeeId,
        competencyName: "Gestión del estrés",
        competencyType: "tecnica",
        currentLevel: "basico",
        requiredLevel: "avanzado",
        gap: 2,
        priority: "alta",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
      createdNeedId = result.id;
    });
  });

  describe("list", () => {
    it("should list training needs", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.trainingNeeds.list({});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter training needs by employee", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.trainingNeeds.list({ employeeId: testEmployeeId });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getById", () => {
    it("should get training need by ID", async () => {
      if (!createdNeedId) return;
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.trainingNeeds.getById({ id: createdNeedId });

      expect(result).toBeDefined();
      expect(result.id).toBe(createdNeedId);
      expect(result.competencyName).toBe("Gestión del estrés");
    });
  });

  describe("update", () => {
    it("should update a training need", async () => {
      if (!createdNeedId) return;
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.trainingNeeds.update({
        id: createdNeedId,
        priority: "critica",
        status: "en_proceso",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("getCriticalGaps", () => {
    it("should get critical gaps with numeric fields", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.trainingNeeds.getCriticalGaps({});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // If there are results, verify they have numeric fields
      if (result.length > 0) {
        expect(typeof result[0].avgGap).toBe("number");
        expect(typeof result[0].affectedEmployees).toBe("number");
        expect(typeof result[0].criticalCount).toBe("number");
      }
    });
  });

  describe("generateFromSkillsMatrix", () => {
    it("should handle generateFromSkillsMatrix (may fail if no job profile)", async () => {
      const caller = appRouter.createCaller(adminContext);
      try {
        const result = await caller.trainingNeeds.generateFromSkillsMatrix({
          employeeId: testEmployeeId,
        });
        // If it succeeds, verify the result
        expect(result).toBeDefined();
        expect(typeof result.generated).toBe("number");
      } catch (error: any) {
        // If it fails because there's no job profile, that's expected
        expect(error.message).toMatch(/perfil|puesto|position|profile|no encontrado/i);
      }
    });
  });

  describe("delete", () => {
    it("should delete a training need", async () => {
      if (!createdNeedId) return;
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.trainingNeeds.delete({ id: createdNeedId });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      createdNeedId = 0; // Mark as deleted so afterAll doesn't try to delete again
    });
  });
});
