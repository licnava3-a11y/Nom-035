import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("Cases Debug - Crear caso con datos del formulario", () => {
  it("debería crear un caso con los datos exactos del formulario", async () => {
    // Simular contexto sin autenticación (publicProcedure)
    const ctx: Context = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    // Datos exactos del formulario de prueba
    const result = await caller.cases.create({
      reporterName: "Juan Pérez García",
      reporterEmail: "juan.perez@empresa.com",
      reporterPhone: "(555) 987-6543",
      isAnonymous: false,
      caseType: "stress",
      description: "Caso de prueba para verificar la creación desde el formulario. El empleado reporta altos niveles de estrés debido a sobrecarga de trabajo.",
    });

    console.log("✅ Resultado de creación:", result);
    expect(result.success).toBe(true);
    expect(result.caseNumber).toBeDefined();
    expect(result.caseNumber).toMatch(/^CASO-\d+$/);
  });

  it("debería crear un caso anónimo", async () => {
    const ctx: Context = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    const result = await caller.cases.create({
      isAnonymous: true,
      caseType: "mobbing",
      description: "Caso anónimo de mobbing laboral. Se reporta acoso por parte de un supervisor.",
    });

    console.log("✅ Resultado de creación anónima:", result);
    expect(result.success).toBe(true);
    expect(result.caseNumber).toBeDefined();
  });

  it("debería fallar si falta el tipo de caso", async () => {
    const ctx: Context = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.cases.create({
        reporterName: "Test User",
        reporterEmail: "test@example.com",
        isAnonymous: false,
        caseType: "" as any, // Tipo vacío
        description: "Descripción del caso",
      })
    ).rejects.toThrow();
  });

  it("debería fallar si la descripción es muy corta", async () => {
    const ctx: Context = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.cases.create({
        reporterName: "Test User",
        reporterEmail: "test@example.com",
        isAnonymous: false,
        caseType: "stress",
        description: "Corta", // Menos de 10 caracteres
      })
    ).rejects.toThrow();
  });
});
