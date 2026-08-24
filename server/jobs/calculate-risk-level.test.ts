/**
 * Tests unitarios para el algoritmo de cálculo de riesgo NOM-035
 *
 * Cubre:
 * - Determinación correcta de niveles de riesgo según porcentajes
 * - Generación de recomendaciones apropiadas
 * - Cálculo de scores por categoría
 * - Manejo de casos edge (0%, 100%, valores límite)
 */

import { describe, it, expect } from "vitest";

// Tipos extraídos del job original
interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface Answer {
  questionId: number;
  answerValue: string | number;
}

/**
 * Función pura extraída del job para calcular nivel de riesgo
 * Basada en la metodología oficial NOM-035 STPS
 */
export function calculateRiskLevelFromScore(
  scorePercentage: number
): "low" | "medium" | "high" | "very_high" {
  if (scorePercentage <= 20) {
    return "low";
  } else if (scorePercentage <= 45) {
    return "medium";
  } else if (scorePercentage <= 70) {
    return "high";
  } else {
    return "very_high";
  }
}

/**
 * Función pura para generar recomendaciones según nivel de riesgo
 */
export function generateRecommendations(
  riskLevel: "low" | "medium" | "high" | "very_high"
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === "very_high") {
    recommendations.push("Intervención inmediata requerida");
    recommendations.push("Evaluación psicológica individual");
    recommendations.push("Plan de acción correctiva urgente");
  } else if (riskLevel === "high") {
    recommendations.push("Monitoreo cercano recomendado");
    recommendations.push("Evaluación de factores de riesgo específicos");
    recommendations.push("Implementar acciones preventivas");
  } else if (riskLevel === "medium") {
    recommendations.push("Seguimiento periódico");
    recommendations.push("Reforzar medidas preventivas");
  } else {
    recommendations.push("Mantener condiciones actuales");
    recommendations.push("Evaluación anual de seguimiento");
  }

  return recommendations;
}

/**
 * Función pura para calcular puntaje total de respuestas
 */
export function calculateTotalScore(answers: Answer[]): {
  totalScore: number;
  maxPossibleScore: number;
  scorePercentage: number;
} {
  const totalScore = answers.reduce((sum, answer) => {
    const value =
      typeof answer.answerValue === "string"
        ? parseInt(answer.answerValue, 10)
        : Number(answer.answerValue);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  const maxPossibleScore = answers.length * 4; // Escala 0-4
  const scorePercentage =
    maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

  return { totalScore, maxPossibleScore, scorePercentage };
}

/**
 * Función pura para calcular scores por categoría NOM-035
 */
export function calculateCategoryScores(
  totalScore: number,
  maxPossibleScore: number,
  scorePercentage: number
): CategoryScore[] {
  return [
    {
      category: "Ambiente de trabajo",
      score: Math.floor(totalScore * 0.2),
      maxScore: Math.floor(maxPossibleScore * 0.2),
      percentage: scorePercentage,
    },
    {
      category: "Factores propios de la actividad",
      score: Math.floor(totalScore * 0.25),
      maxScore: Math.floor(maxPossibleScore * 0.25),
      percentage: scorePercentage,
    },
    {
      category: "Organización del tiempo",
      score: Math.floor(totalScore * 0.15),
      maxScore: Math.floor(maxPossibleScore * 0.15),
      percentage: scorePercentage,
    },
    {
      category: "Liderazgo y relaciones",
      score: Math.floor(totalScore * 0.25),
      maxScore: Math.floor(maxPossibleScore * 0.25),
      percentage: scorePercentage,
    },
    {
      category: "Entorno organizacional",
      score: Math.floor(totalScore * 0.15),
      maxScore: Math.floor(maxPossibleScore * 0.15),
      percentage: scorePercentage,
    },
  ];
}

describe("Cálculo de Nivel de Riesgo NOM-035", () => {
  describe("calculateRiskLevelFromScore", () => {
    it('debe retornar "low" para porcentajes 0-20%', () => {
      expect(calculateRiskLevelFromScore(0)).toBe("low");
      expect(calculateRiskLevelFromScore(10)).toBe("low");
      expect(calculateRiskLevelFromScore(20)).toBe("low");
    });

    it('debe retornar "medium" para porcentajes 21-45%', () => {
      expect(calculateRiskLevelFromScore(21)).toBe("medium");
      expect(calculateRiskLevelFromScore(30)).toBe("medium");
      expect(calculateRiskLevelFromScore(45)).toBe("medium");
    });

    it('debe retornar "high" para porcentajes 46-70%', () => {
      expect(calculateRiskLevelFromScore(46)).toBe("high");
      expect(calculateRiskLevelFromScore(60)).toBe("high");
      expect(calculateRiskLevelFromScore(70)).toBe("high");
    });

    it('debe retornar "very_high" para porcentajes >70%', () => {
      expect(calculateRiskLevelFromScore(71)).toBe("very_high");
      expect(calculateRiskLevelFromScore(85)).toBe("very_high");
      expect(calculateRiskLevelFromScore(100)).toBe("very_high");
    });

    it("debe manejar correctamente los valores límite", () => {
      expect(calculateRiskLevelFromScore(20.0)).toBe("low");
      expect(calculateRiskLevelFromScore(20.1)).toBe("medium");
      expect(calculateRiskLevelFromScore(45.0)).toBe("medium");
      expect(calculateRiskLevelFromScore(45.1)).toBe("high");
      expect(calculateRiskLevelFromScore(70.0)).toBe("high");
      expect(calculateRiskLevelFromScore(70.1)).toBe("very_high");
    });
  });

  describe("generateRecommendations", () => {
    it("debe generar 2 recomendaciones para riesgo bajo", () => {
      const recommendations = generateRecommendations("low");
      expect(recommendations).toHaveLength(2);
      expect(recommendations).toContain("Mantener condiciones actuales");
      expect(recommendations).toContain("Evaluación anual de seguimiento");
    });

    it("debe generar 2 recomendaciones para riesgo medio", () => {
      const recommendations = generateRecommendations("medium");
      expect(recommendations).toHaveLength(2);
      expect(recommendations).toContain("Seguimiento periódico");
      expect(recommendations).toContain("Reforzar medidas preventivas");
    });

    it("debe generar 3 recomendaciones para riesgo alto", () => {
      const recommendations = generateRecommendations("high");
      expect(recommendations).toHaveLength(3);
      expect(recommendations).toContain("Monitoreo cercano recomendado");
      expect(recommendations).toContain(
        "Evaluación de factores de riesgo específicos"
      );
      expect(recommendations).toContain("Implementar acciones preventivas");
    });

    it("debe generar 3 recomendaciones para riesgo muy alto", () => {
      const recommendations = generateRecommendations("very_high");
      expect(recommendations).toHaveLength(3);
      expect(recommendations).toContain("Intervención inmediata requerida");
      expect(recommendations).toContain("Evaluación psicológica individual");
      expect(recommendations).toContain("Plan de acción correctiva urgente");
    });
  });

  describe("calculateTotalScore", () => {
    it("debe calcular correctamente el puntaje total con respuestas numéricas", () => {
      const answers: Answer[] = [
        { questionId: 1, answerValue: 2 },
        { questionId: 2, answerValue: 3 },
        { questionId: 3, answerValue: 1 },
        { questionId: 4, answerValue: 4 },
      ];

      const result = calculateTotalScore(answers);

      expect(result.totalScore).toBe(10);
      expect(result.maxPossibleScore).toBe(16);
      expect(result.scorePercentage).toBeCloseTo(62.5, 1);
    });

    it("debe calcular correctamente el puntaje con respuestas string", () => {
      const answers: Answer[] = [
        { questionId: 1, answerValue: "2" },
        { questionId: 2, answerValue: "3" },
        { questionId: 3, answerValue: "0" },
      ];

      const result = calculateTotalScore(answers);

      expect(result.totalScore).toBe(5);
      expect(result.maxPossibleScore).toBe(12);
      expect(result.scorePercentage).toBeCloseTo(41.67, 1);
    });

    it("debe manejar respuestas vacías retornando 0%", () => {
      const answers: Answer[] = [];

      const result = calculateTotalScore(answers);

      expect(result.totalScore).toBe(0);
      expect(result.maxPossibleScore).toBe(0);
      expect(result.scorePercentage).toBe(0);
    });

    it("debe ignorar valores no numéricos (NaN)", () => {
      const answers: Answer[] = [
        { questionId: 1, answerValue: "2" },
        { questionId: 2, answerValue: "invalid" },
        { questionId: 3, answerValue: "3" },
      ];

      const result = calculateTotalScore(answers);

      expect(result.totalScore).toBe(5);
      expect(result.maxPossibleScore).toBe(12);
    });

    it("debe calcular correctamente caso de riesgo muy alto (>70%)", () => {
      const answers: Answer[] = [
        { questionId: 1, answerValue: 4 },
        { questionId: 2, answerValue: 4 },
        { questionId: 3, answerValue: 4 },
        { questionId: 4, answerValue: 4 },
        { questionId: 5, answerValue: 3 },
      ];

      const result = calculateTotalScore(answers);

      expect(result.totalScore).toBe(19);
      expect(result.maxPossibleScore).toBe(20);
      expect(result.scorePercentage).toBe(95);
      expect(calculateRiskLevelFromScore(result.scorePercentage)).toBe(
        "very_high"
      );
    });

    it("debe calcular correctamente caso de riesgo bajo (<20%)", () => {
      const answers: Answer[] = [
        { questionId: 1, answerValue: 0 },
        { questionId: 2, answerValue: 1 },
        { questionId: 3, answerValue: 0 },
        { questionId: 4, answerValue: 1 },
        { questionId: 5, answerValue: 0 },
      ];

      const result = calculateTotalScore(answers);

      expect(result.totalScore).toBe(2);
      expect(result.maxPossibleScore).toBe(20);
      expect(result.scorePercentage).toBe(10);
      expect(calculateRiskLevelFromScore(result.scorePercentage)).toBe("low");
    });
  });

  describe("calculateCategoryScores", () => {
    it("debe calcular correctamente los scores de 5 categorías", () => {
      const totalScore = 50;
      const maxPossibleScore = 100;
      const scorePercentage = 50;

      const categories = calculateCategoryScores(
        totalScore,
        maxPossibleScore,
        scorePercentage
      );

      expect(categories).toHaveLength(5);
      expect(categories[0].category).toBe("Ambiente de trabajo");
      expect(categories[1].category).toBe("Factores propios de la actividad");
      expect(categories[2].category).toBe("Organización del tiempo");
      expect(categories[3].category).toBe("Liderazgo y relaciones");
      expect(categories[4].category).toBe("Entorno organizacional");
    });

    it("debe distribuir correctamente los pesos (20%, 25%, 15%, 25%, 15%)", () => {
      const totalScore = 100;
      const maxPossibleScore = 200;
      const scorePercentage = 50;

      const categories = calculateCategoryScores(
        totalScore,
        maxPossibleScore,
        scorePercentage
      );

      expect(categories[0].score).toBe(20);
      expect(categories[1].score).toBe(25);
      expect(categories[2].score).toBe(15);
      expect(categories[3].score).toBe(25);
      expect(categories[4].score).toBe(15);
    });

    it("debe asignar el mismo porcentaje a todas las categorías", () => {
      const totalScore = 60;
      const maxPossibleScore = 120;
      const scorePercentage = 50;

      const categories = calculateCategoryScores(
        totalScore,
        maxPossibleScore,
        scorePercentage
      );

      categories.forEach((category: any) => {
        expect(category.percentage).toBe(50);
      });
    });

    it("debe manejar correctamente valores de 0", () => {
      const totalScore = 0;
      const maxPossibleScore = 0;
      const scorePercentage = 0;

      const categories = calculateCategoryScores(
        totalScore,
        maxPossibleScore,
        scorePercentage
      );

      expect(categories).toHaveLength(5);
      categories.forEach((category: any) => {
        expect(category.score).toBe(0);
        expect(category.maxScore).toBe(0);
        expect(category.percentage).toBe(0);
      });
    });
  });

  describe("Integración: Flujo completo de cálculo de riesgo", () => {
    it("debe procesar correctamente una encuesta completa de riesgo medio", () => {
      const answers: Answer[] = Array.from({ length: 20 }, (_, i) => ({
        questionId: i + 1,
        answerValue: i % 3,
      }));

      const { totalScore, maxPossibleScore, scorePercentage } =
        calculateTotalScore(answers);
      const riskLevel = calculateRiskLevelFromScore(scorePercentage);
      const recommendations = generateRecommendations(riskLevel);
      const categories = calculateCategoryScores(
        totalScore,
        maxPossibleScore,
        scorePercentage
      );

      expect(totalScore).toBeGreaterThan(0);
      expect(maxPossibleScore).toBe(80);
      expect(scorePercentage).toBeGreaterThan(0);
      expect(scorePercentage).toBeLessThan(100);
      expect(["low", "medium", "high", "very_high"]).toContain(riskLevel);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(categories).toHaveLength(5);
    });

    it("debe identificar correctamente un caso crítico (muy alto riesgo)", () => {
      const answers: Answer[] = Array.from({ length: 15 }, (_, i) => ({
        questionId: i + 1,
        answerValue: 4,
      }));

      const { scorePercentage } = calculateTotalScore(answers);
      const riskLevel = calculateRiskLevelFromScore(scorePercentage);
      const recommendations = generateRecommendations(riskLevel);

      expect(scorePercentage).toBe(100);
      expect(riskLevel).toBe("very_high");
      expect(recommendations).toContain("Intervención inmediata requerida");
      expect(recommendations).toContain("Evaluación psicológica individual");
    });

    it("debe identificar correctamente un caso sin riesgo", () => {
      const answers: Answer[] = Array.from({ length: 10 }, (_, i) => ({
        questionId: i + 1,
        answerValue: 0,
      }));

      const { scorePercentage } = calculateTotalScore(answers);
      const riskLevel = calculateRiskLevelFromScore(scorePercentage);
      const recommendations = generateRecommendations(riskLevel);

      expect(scorePercentage).toBe(0);
      expect(riskLevel).toBe("low");
      expect(recommendations).toContain("Mantener condiciones actuales");
    });
  });
});
