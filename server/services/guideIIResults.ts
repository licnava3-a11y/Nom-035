import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { surveyAnswers, surveyQuestions, surveyResponses } from "../../drizzle/schema";
import { calculateGuideIIResults, validateGuideIIAnswers } from "../guideIICalculator";
import type { getDb } from "../db";

type SurveyDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Calcula y persiste el resultado Guía II sin acoplar la lógica al router tRPC. */
export async function calculateAndPersistGuideIIResult(db: SurveyDatabase, responseId: number) {
  const [response] = await db
    .select()
    .from(surveyResponses)
    .where(eq(surveyResponses.id, responseId));

  if (!response) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Respuesta de encuesta no encontrada" });
  }

  const answers = await db
    .select({
      answerValue: surveyAnswers.answerValue,
      questionOrder: surveyQuestions.order,
    })
    .from(surveyAnswers)
    .innerJoin(surveyQuestions, eq(surveyAnswers.questionId, surveyQuestions.id))
    .where(eq(surveyAnswers.responseId, responseId));

  if (answers.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No se encontraron respuestas para calcular" });
  }

  const answersMap: Record<number, string> = {};
  for (const answer of answers) {
    answersMap[answer.questionOrder] = answer.answerValue;
  }

  const validation = validateGuideIIAnswers(answersMap);
  if (!validation.valid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Respuestas inválidas: ${validation.errors.join(", ")}`,
    });
  }

  const results = calculateGuideIIResults(answersMap);
  await db
    .update(surveyResponses)
    .set({ results: JSON.stringify(results) } as any)
    .where(eq(surveyResponses.id, responseId));

  return results;
}
