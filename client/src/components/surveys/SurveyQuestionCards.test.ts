import { describe, expect, it } from "vitest";
import { parseSurveyOptions } from "./SurveyQuestionCards";

describe("opciones de preguntas de encuesta", () => {
  it("acepta arreglos y JSON válido sin propagar errores de parseo a la interfaz", () => {
    expect(parseSurveyOptions('["Siempre","Nunca"]')).toEqual(["Siempre", "Nunca"]);
    expect(parseSurveyOptions(["Sí", "No"])).toEqual(["Sí", "No"]);
    expect(parseSurveyOptions("{sin-json}")).toEqual([]);
  });
});
