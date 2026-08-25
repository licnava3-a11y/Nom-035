import { describe, it, expect } from "vitest";
import * as calculator from "./nom035-calculator";

describe("NOM-035 Calculator", () => {
  describe("calculateAnswerScore", () => {
    it("should calculate normal scoring correctly", () => {
      expect(calculator.calculateAnswerScore("Siempre", false, "guia_ii")).toBe(
        0
      );
      expect(
        calculator.calculateAnswerScore("Casi siempre", false, "guia_ii")
      ).toBe(1);
      expect(
        calculator.calculateAnswerScore("Algunas veces", false, "guia_ii")
      ).toBe(2);
      expect(
        calculator.calculateAnswerScore("Casi nunca", false, "guia_ii")
      ).toBe(3);
      expect(calculator.calculateAnswerScore("Nunca", false, "guia_ii")).toBe(
        4
      );
    });

    it("should calculate inverse scoring correctly", () => {
      expect(calculator.calculateAnswerScore("Siempre", true, "guia_ii")).toBe(
        4
      );
      expect(
        calculator.calculateAnswerScore("Casi siempre", true, "guia_ii")
      ).toBe(3);
      expect(
        calculator.calculateAnswerScore("Algunas veces", true, "guia_ii")
      ).toBe(2);
      expect(
        calculator.calculateAnswerScore("Casi nunca", true, "guia_ii")
      ).toBe(1);
      expect(calculator.calculateAnswerScore("Nunca", true, "guia_ii")).toBe(0);
    });
  });

  describe("determineRiskLevel - Guía II", () => {
    it("should determine nulo risk level", () => {
      const result = calculator.determineRiskLevel(15, "guia_ii");
      expect(result.level).toBe("nulo");
      expect(result.color).toBe("blue");
      expect(result.label).toBe("Nulo o despreciable");
    });

    it("should determine bajo risk level", () => {
      const result = calculator.determineRiskLevel(30, "guia_ii");
      expect(result.level).toBe("bajo");
      expect(result.color).toBe("green");
    });

    it("should determine medio risk level", () => {
      const result = calculator.determineRiskLevel(55, "guia_ii");
      expect(result.level).toBe("medio");
      expect(result.color).toBe("yellow");
    });

    it("should determine alto risk level", () => {
      const result = calculator.determineRiskLevel(80, "guia_ii");
      expect(result.level).toBe("alto");
      expect(result.color).toBe("orange");
    });

    it("should determine muy_alto risk level", () => {
      const result = calculator.determineRiskLevel(95, "guia_ii");
      expect(result.level).toBe("muy_alto");
      expect(result.color).toBe("red");
    });
  });

  describe("determineRiskLevel - Guía III", () => {
    it("should determine nulo risk level", () => {
      const result = calculator.determineRiskLevel(40, "guia_iii");
      expect(result.level).toBe("nulo");
      expect(result.color).toBe("blue");
    });

    it("should determine bajo risk level", () => {
      const result = calculator.determineRiskLevel(60, "guia_iii");
      expect(result.level).toBe("bajo");
      expect(result.color).toBe("green");
    });

    it("should determine medio risk level", () => {
      const result = calculator.determineRiskLevel(85, "guia_iii");
      expect(result.level).toBe("medio");
      expect(result.color).toBe("yellow");
    });

    it("should determine alto risk level", () => {
      const result = calculator.determineRiskLevel(120, "guia_iii");
      expect(result.level).toBe("alto");
      expect(result.color).toBe("orange");
    });

    it("should determine muy_alto risk level", () => {
      const result = calculator.determineRiskLevel(150, "guia_iii");
      expect(result.level).toBe("muy_alto");
      expect(result.color).toBe("red");
    });
  });

  describe("calculateFinalScore", () => {
    it("should calculate final score with mixed normal and inverse answers", () => {
      const answers = [
        { questionId: 1, answer: "Siempre", isReverseScored: true }, // 4
        { questionId: 2, answer: "Nunca", isReverseScored: true }, // 0
        { questionId: 3, answer: "Siempre", isReverseScored: false }, // 0
        { questionId: 4, answer: "Nunca", isReverseScored: false }, // 4
        { questionId: 5, answer: "Algunas veces", isReverseScored: true }, // 2
      ];

      const score = calculator.calculateFinalScore(answers, "guia_ii");
      expect(score).toBe(10); // 4 + 0 + 0 + 4 + 2 = 10
    });
  });

  describe("calculateCategoryScore", () => {
    it("should calculate category score correctly", () => {
      const answers = [
        {
          questionId: 1,
          answer: "Siempre",
          isReverseScored: true,
          category: "Ambiente de trabajo",
        },
        {
          questionId: 2,
          answer: "Nunca",
          isReverseScored: false,
          category: "Ambiente de trabajo",
        },
        {
          questionId: 3,
          answer: "Casi siempre",
          isReverseScored: true,
          category: "Factores propios de la actividad",
        },
      ];

      const result = calculator.calculateCategoryScore(
        answers,
        "Ambiente de trabajo",
        "guia_ii"
      );
      expect(result.category).toBe("Ambiente de trabajo");
      expect(result.score).toBe(8); // 4 (Siempre inverso) + 4 (Nunca normal) = 8
    });
  });

  describe("calculateSurveyResult", () => {
    it("should calculate complete survey result", () => {
      const answers = [
        {
          questionId: 1,
          answer: "Siempre",
          isReverseScored: true,
          category: "Ambiente de trabajo",
          domain: "Condiciones en el ambiente de trabajo",
          dimension: null,
        },
        {
          questionId: 2,
          answer: "Nunca",
          isReverseScored: false,
          category: "Ambiente de trabajo",
          domain: "Condiciones en el ambiente de trabajo",
          dimension: null,
        },
        {
          questionId: 3,
          answer: "Algunas veces",
          isReverseScored: true,
          category: "Factores propios de la actividad",
          domain: "Carga de trabajo",
          dimension: null,
        },
      ];

      const result = calculator.calculateSurveyResult(answers, "guia_ii");

      expect(result.finalScore).toBe(10); // 4 + 4 + 2 = 10
      expect(result.finalRiskLevel).toBe("nulo");
      expect(result.finalRiskColor).toBe("blue");
      expect(result.categories).toHaveLength(2);
      expect(result.domains).toHaveLength(2);
      expect(result.recommendedActions).toBeDefined();
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe("calculateCoverage", () => {
    it("should calculate coverage percentage correctly", () => {
      expect(calculator.calculateCoverage(100, 80)).toBe(80);
      expect(calculator.calculateCoverage(50, 25)).toBe(50);
      expect(calculator.calculateCoverage(200, 150)).toBe(75);
    });

    it("should handle zero total workers", () => {
      expect(calculator.calculateCoverage(0, 0)).toBe(0);
    });

    it("should handle 100% coverage", () => {
      expect(calculator.calculateCoverage(100, 100)).toBe(100);
    });
  });

  describe("getRecommendedActions", () => {
    it("should return actions for nulo risk level", () => {
      const actions = calculator.getRecommendedActions("nulo", "guia_ii");
      expect(actions).toHaveLength(1);
      expect(actions[0]).toContain("despreciable");
    });

    it("should return actions for muy_alto risk level", () => {
      const actions = calculator.getRecommendedActions("muy_alto", "guia_ii");
      expect(actions.length).toBeGreaterThan(1);
      expect(actions.join(" ")).toContain("inmediata");
    });
  });

  describe("getRiskColorHex", () => {
    it("should return correct hex colors", () => {
      expect(calculator.getRiskColorHex("blue")).toBe("#3B82F6");
      expect(calculator.getRiskColorHex("green")).toBe("#10B981");
      expect(calculator.getRiskColorHex("yellow")).toBe("#F59E0B");
      expect(calculator.getRiskColorHex("orange")).toBe("#F97316");
      expect(calculator.getRiskColorHex("red")).toBe("#EF4444");
    });
  });

  describe("getRiskLevelLabel", () => {
    it("should return correct Spanish labels", () => {
      expect(calculator.getRiskLevelLabel("nulo")).toBe("Nulo o despreciable");
      expect(calculator.getRiskLevelLabel("bajo")).toBe("Bajo");
      expect(calculator.getRiskLevelLabel("medio")).toBe("Medio");
      expect(calculator.getRiskLevelLabel("alto")).toBe("Alto");
      expect(calculator.getRiskLevelLabel("muy_alto")).toBe("Muy alto");
    });
  });
});
