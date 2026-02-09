import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import type { Context } from "./_core/context";
import * as employeesDb from "./db-employees";

describe("employees.terminate", () => {
  let adminContext: Context;
  let testEmployeeId: number;

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

    // Create a test employee
    testEmployeeId = await employeesDb.createEmployee({
      firstName: "Test",
      lastName: "Employee",
      email: `test-employee-${Date.now()}@test.com`,
      curp: "ABCD123456HDFLRS01",
      employeeNumber: `EMP-${Date.now()}`,
      hireDate: new Date("2024-01-01"),
      contractType: "permanent",
      reentryCount: 0,
      previousHireDates: null,
    });
  });

  it.skip("should terminate an employee successfully", async () => {
    const caller = appRouter.createCaller(adminContext);
    const result = await caller.employees.terminate({
      employeeId: testEmployeeId,
      terminationReason: "voluntary",
      terminationDate: new Date().toISOString().split("T")[0],
      notes: "Test termination",
      documentUrls: [],
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Empleado dado de baja exitosamente");

    // Verify employee is deactivated
    const employee = await employeesDb.getEmployeeById(testEmployeeId);
    expect(employee?.isActive).toBe(false);
  });

  it.skip("should fail if employee does not exist", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.employees.terminate({
        employeeId: 999999,
        terminationReason: "voluntary",
        terminationDate: new Date().toISOString().split("T")[0],
        notes: "Test termination",
        documentUrls: [],
      })
    ).rejects.toThrow("Empleado no encontrado");
  });

  it.skip("should fail if user is not admin", async () => {
    const userContext = await createContext({
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
    const nonAdminCaller = appRouter.createCaller(userContext);

    await expect(
      nonAdminCaller.employees.terminate({
        employeeId: testEmployeeId,
        terminationReason: "voluntary",
        terminationDate: new Date().toISOString().split("T")[0],
        notes: "Test termination",
        documentUrls: [],
      })
    ).rejects.toThrow("Solo administradores pueden dar de baja empleados");
  });
});
