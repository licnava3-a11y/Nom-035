import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const adminUser: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    name: "Admin Test",
    email: "admin@test.com",
    role: "admin",
    loginMethod: "oauth",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user: adminUser,
    req: {} as any,
    res: {} as any,
  };
}

describe("company.legalRepresentative.listActive", () => {
  const ctx = createAdminContext();
  const caller = appRouter.createCaller(ctx);

  it("should return only active representatives with digital signature", async () => {
    const result = await caller.company.legalRepresentative.listActive();

    // Verificar que el resultado es un array
    expect(Array.isArray(result)).toBe(true);

    // Verificar que todos los representantes retornados son activos
    result.forEach(rep => {
      expect(rep.activo).toBe(true);
      expect(rep.firmaUrl).toBeTruthy();
    });
  });

  it("should filter out inactive representatives", async () => {
    const allReps = await caller.company.legalRepresentative.list();
    const activeReps = await caller.company.legalRepresentative.listActive();

    // El número de representantes activos debe ser <= al total
    expect(activeReps.length).toBeLessThanOrEqual(allReps.length);
  });

  it("should filter out representatives without digital signature", async () => {
    const activeReps = await caller.company.legalRepresentative.listActive();

    // Todos deben tener firmaUrl
    activeReps.forEach(rep => {
      expect(rep.firmaUrl).not.toBeNull();
      expect(rep.firmaUrl).not.toBe("");
    });
  });
});
