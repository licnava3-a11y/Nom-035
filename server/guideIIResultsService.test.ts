import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("servicio de resultados Guía II", () => {
  it("mantiene la consulta en lote fuera del router tRPC", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers/surveys.ts"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "server/services/guideIIResults.ts"), "utf8");

    expect(router).toContain("calculateAndPersistGuideIIResult(db, input.responseId)");
    expect(service).toContain("questionOrder: surveyQuestions.order");
    expect(service).toContain("innerJoin(surveyQuestions");
  });
});
