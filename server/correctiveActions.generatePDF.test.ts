import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";

describe("correctiveActions.generatePDF", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testActionId: number;

  beforeAll(async () => {
    // Create a test caller with mock user context
    caller = appRouter.createCaller({
      user: {
        id: 1,
        email: "test@nom035.com",
        name: "Test User",
        role: "admin",
      },
    } as any);

    // Create a test corrective action
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { correctiveActions } = await import("../drizzle/schema");

    const [action] = await db
      .insert(correctiveActions)
      .values({
        description: "Acción correctiva de prueba para generación de PDF",
        riskLevel: "medio",
        category: "Riesgos Psicosociales",
        departamento: "Recursos Humanos",
        status: "pendiente",
        dueDate: new Date("2026-12-31"),
        responsibleUserId: 1,
        observations: "Observaciones de prueba para el PDF",
      })
      .$returningId();

    testActionId = action.id;
  });

  afterAll(async () => {
    // Clean up test data
    const db = await getDb();
    if (!db) return;

    const { correctiveActions } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    await db
      .delete(correctiveActions)
      .where(eq(correctiveActions.id, testActionId));
  });

  it("should generate PDF for corrective action", async () => {
    const result = await caller.correctiveActions.generatePDF({
      id: testActionId,
    });

    expect(result).toBeDefined();
    expect(result.pdfUrl).toBeDefined();
    expect(typeof result.pdfUrl).toBe("string");
    expect(result.pdfUrl).toMatch(/^https?:\/\//); // Should be a valid URL
  });

  it("should fail with invalid action ID", async () => {
    await expect(
      caller.correctiveActions.generatePDF({ id: 999999 })
    ).rejects.toThrow();
  });

  it("should update action with pdfUrl after generation", async () => {
    // Generate PDF
    const result = await caller.correctiveActions.generatePDF({
      id: testActionId,
    });

    // Verify action was updated
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { correctiveActions } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const [action] = await db
      .select()
      .from(correctiveActions)
      .where(eq(correctiveActions.id, testActionId));

    expect(action).toBeDefined();
    expect(action.pdfUrl).toBe(result.pdfUrl);
    expect(action.pdfUrl).toMatch(/^https?:\/\//);
  });
});
