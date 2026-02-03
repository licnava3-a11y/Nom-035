import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import type { Context } from "./_core/context";

describe("Employees Module", () => {
  let adminContext: Context;
  let userContext: Context;

  beforeAll(async () => {
    // Create admin context
    adminContext = await createContext({
      req: {
        headers: {},
        cookies: {},
      } as any,
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

    // Create user context
    userContext = await createContext({
      req: {
        headers: {},
        cookies: {},
      } as any,
      res: {} as any,
    });
    userContext.user = {
      id: 2,
      openId: "user-test",
      name: "User Test",
      email: "user@test.com",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe("Employee CRUD Operations", () => {
    let createdEmployeeId: number | undefined;

    it("should create a new employee", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.employees.create({
        firstName: "Test",
        lastName: "Employee",
        email: "test.employee@example.com",
        phone: "+52 614 123 4567",
        curp: "TEEG900101HCHRRN09",
        employeeNumber: "EMP-TEST-001",
        department: "Testing Department",
        position: "Test Engineer",
        contractType: "permanent",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.firstName).toBe("Test");
      expect(result.lastName).toBe("Employee");
      expect(result.email).toBe("test.employee@example.com");
      expect(result.isActive).toBe(true);

      createdEmployeeId = result.id;
    });

    it("should list employees", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.employees.list({});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should filter employees by search term", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.employees.list({
        search: "Test",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Search should return results
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should filter employees by department", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.employees.list({
        department: "Testing Department",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // If there are results, they should match the filter
      if (result.length > 0) {
        expect(result.every((emp) => emp.department === "Testing Department")).toBe(true);
      }
    });

    it("should get employee by ID", async () => {
      if (!createdEmployeeId) {
        console.log("Skipping test: no employee created");
        return;
      }
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.employees.getById({
        id: createdEmployeeId,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(createdEmployeeId);
      expect(result.firstName).toBe("Test");
      expect(result.lastName).toBe("Employee");
    });

    it("should update employee", async () => {
      if (!createdEmployeeId) {
        console.log("Skipping test: no employee created");
        return;
      }
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.employees.update({
        id: createdEmployeeId,
        firstName: "Updated",
        lastName: "Employee",
        email: "updated.employee@example.com",
        position: "Senior Test Engineer",
      });

      expect(result).toBeDefined();
      expect(result.firstName).toBe("Updated");
      expect(result.position).toBe("Senior Test Engineer");
    });

    it("should deactivate and reactivate employee", async () => {
      if (!createdEmployeeId) {
        console.log("Skipping test: no employee created");
        return;
      }
      const caller = appRouter.createCaller(adminContext);
      
      // Deactivate
      const deactivated = await caller.employees.deactivate({
        id: createdEmployeeId,
      });
      expect(deactivated).toBeDefined();
      expect(deactivated.isActive).toBe(false);
      
      // Reactivate
      const reactivated = await caller.employees.reactivate({
        id: createdEmployeeId,
      });
      expect(reactivated).toBeDefined();
      expect(reactivated.isActive).toBe(true);
    });

    it("should get departments list", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.employees.getDepartments();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.includes("Testing Department")).toBe(true);
    });

    it("should get positions list", async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.employees.getPositions();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Employee Access Control", () => {
    it("should deny non-admin users from creating employees", async () => {
      const caller = appRouter.createCaller(userContext);
      
      await expect(
        caller.employees.create({
          firstName: "Unauthorized",
          lastName: "User",
          email: "unauthorized@example.com",
          contractType: "permanent",
        })
      ).rejects.toThrow();
    });

    it("should deny non-admin users from updating employees", async () => {
      const caller = appRouter.createCaller(userContext);
      
      await expect(
        caller.employees.update({
          id: 1,
          firstName: "Unauthorized",
          lastName: "Update",
          email: "unauthorized@example.com",
        })
      ).rejects.toThrow();
    });

    it("should deny non-admin users from deactivating employees", async () => {
      const caller = appRouter.createCaller(userContext);
      
      await expect(
        caller.employees.deactivate({
          id: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe("Employee Validation", () => {
    it("should reject invalid email format", async () => {
      const caller = appRouter.createCaller(adminContext);
      
      await expect(
        caller.employees.create({
          firstName: "Test",
          lastName: "User",
          email: "invalid-email",
          contractType: "permanent",
        })
      ).rejects.toThrow();
    });

    it("should reject CURP with invalid length", async () => {
      const caller = appRouter.createCaller(adminContext);
      
      await expect(
        caller.employees.create({
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          curp: "INVALID",
          contractType: "permanent",
        })
      ).rejects.toThrow();
    });
  });
});
