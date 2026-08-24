import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers/surveys.ts"), "utf8");
const formSource = readFileSync(resolve(process.cwd(), "client/src/components/SurveyForm.tsx"), "utf8");
const savePartialSource = routerSource.slice(
  routerSource.indexOf("savePartialResponse:"),
  routerSource.indexOf("// Enviar respuesta de encuesta"),
);
const aggregateRiskSource = routerSource.slice(
  routerSource.indexOf("getRiskStatistics:"),
  routerSource.indexOf("// Obtener cobertura por departamento"),
);

describe("seguridad y continuidad de respuestas de encuesta", () => {
  it("obtiene la identidad autenticada desde la sesión durante el autoguardado", () => {
    expect(savePartialSource).toContain(".mutation(async ({ input, ctx }) => {");
    expect(savePartialSource).toContain("const userId = ctx.user?.id;");
    expect(savePartialSource).toContain("Debes iniciar sesión para guardar respuestas");
    expect(savePartialSource).not.toContain("userId: z.number().optional()");
    expect(formSource).toContain("token: anonymousToken,");
  });

  it("crea el caso ATS sin desreferenciar un usuario inexistente en una respuesta anónima", () => {
    expect(routerSource).toContain('const caseNumber = `ATS-${Date.now()}-${actor?.id ?? "anonimo"}`;');
    expect(routerSource).toContain("isAnonymous: !actor,");
    expect(routerSource).toContain("respuesta anónima de la Guía I");
    expect(routerSource).not.toContain("ctx.user!.id");
  });

  it("agrupa respuestas por lote para evitar consultas N+1 en métricas y reportes agregados", () => {
    expect(routerSource).toContain("async function getScoringAnswersByResponseId");
    expect(routerSource).toContain("inArray(surveyAnswers.responseId, responseIds)");
    expect(aggregateRiskSource).toContain("getScoringAnswersByResponseId(db, responses.map(response => response.id))");
    expect(aggregateRiskSource).not.toContain("eq(surveyAnswers.responseId, response.id)");
  });
});
