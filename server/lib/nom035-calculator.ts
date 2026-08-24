/**
 * Sistema de Cálculo NOM-035-STPS-2018
 *
 * Este módulo implementa todas las fórmulas y tablas oficiales para el cálculo
 * de calificaciones de las encuestas de factores de riesgo psicosocial.
 */

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

export type RiskLevel = "nulo" | "bajo" | "medio" | "alto" | "muy_alto";
export type RiskColor = "blue" | "green" | "yellow" | "orange" | "red";

export interface RiskResult {
  level: RiskLevel;
  color: RiskColor;
  score: number;
  label: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  riskLevel: RiskLevel;
  riskColor: RiskColor;
}

export interface DomainScore {
  domain: string;
  score: number;
  riskLevel: RiskLevel;
  riskColor: RiskColor;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  riskLevel: RiskLevel;
  riskColor: RiskColor;
}

export interface SurveyResult {
  finalScore: number;
  finalRiskLevel: RiskLevel;
  finalRiskColor: RiskColor;
  categories: CategoryScore[];
  domains: DomainScore[];
  dimensions: DimensionScore[];
  recommendedActions: string[];
}

// ============================================================================
// TABLAS DE CALIFICACIÓN OFICIAL
// ============================================================================

/**
 * Tabla 2: Valor de las opciones de respuesta en Guía II
 * Ítems 18-33: Calificación NORMAL (Siempre=0, Nunca=4)
 * Ítems 1-17, 34-46: Calificación INVERSA (Siempre=4, Nunca=0)
 */
const GUIDE_II_SCORING = {
  normal: {
    Siempre: 0,
    "Casi siempre": 1,
    "Algunas veces": 2,
    "Casi nunca": 3,
    Nunca: 4,
  },
  inverse: {
    Siempre: 4,
    "Casi siempre": 3,
    "Algunas veces": 2,
    "Casi nunca": 1,
    Nunca: 0,
  },
};

/**
 * Tabla 5: Valor de las opciones de respuesta en Guía III
 * Ítems 1, 4, 23-28, 30-57: Calificación NORMAL
 * Ítems 2-3, 5-22, 29, 54, 58-72: Calificación INVERSA
 */
const GUIDE_III_SCORING = {
  normal: {
    Siempre: 0,
    "Casi siempre": 1,
    "Algunas veces": 2,
    "Casi nunca": 3,
    Nunca: 4,
  },
  inverse: {
    Siempre: 4,
    "Casi siempre": 3,
    "Algunas veces": 2,
    "Casi nunca": 1,
    Nunca: 0,
  },
};

/**
 * Tabla 3: Rangos de calificación final para Guía II (16-50 trabajadores)
 */
const GUIDE_II_FINAL_RANGES = {
  nulo: {
    min: 0,
    max: 19,
    color: "blue" as RiskColor,
    label: "Nulo o despreciable",
  },
  bajo: { min: 20, max: 44, color: "green" as RiskColor, label: "Bajo" },
  medio: { min: 45, max: 69, color: "yellow" as RiskColor, label: "Medio" },
  alto: { min: 70, max: 89, color: "orange" as RiskColor, label: "Alto" },
  muy_alto: {
    min: 90,
    max: Infinity,
    color: "red" as RiskColor,
    label: "Muy alto",
  },
};

/**
 * Tabla 6: Rangos de calificación final para Guía III (51+ trabajadores)
 */
const GUIDE_III_FINAL_RANGES = {
  nulo: {
    min: 0,
    max: 49,
    color: "blue" as RiskColor,
    label: "Nulo o despreciable",
  },
  bajo: { min: 50, max: 74, color: "green" as RiskColor, label: "Bajo" },
  medio: { min: 75, max: 98, color: "yellow" as RiskColor, label: "Medio" },
  alto: { min: 99, max: 139, color: "orange" as RiskColor, label: "Alto" },
  muy_alto: {
    min: 140,
    max: Infinity,
    color: "red" as RiskColor,
    label: "Muy alto",
  },
};

/**
 * Tabla 4: Criterios para la toma de acciones (Guía II)
 */
const GUIDE_II_ACTIONS = {
  nulo: [
    "El riesgo resulta despreciable por lo que no se requiere medidas adicionales.",
  ],
  bajo: [
    "Es necesario una mayor difusión de la política de prevención de riesgos psicosociales y revisar que la misma se esté aplicando.",
  ],
  medio: [
    "Se requiere revisar la política de prevención de riesgos psicosociales y las acciones que se derivan de ésta, así como reforzarlas y/o modificarlas para el control del factor de riesgo.",
    "Establecer las acciones de intervención en un plazo no mayor a 90 días naturales.",
  ],
  alto: [
    "Se requiere realizar un análisis de cada categoría y dominio para establecer las acciones de intervención a través de un Programa de intervención que deberá contener:",
    "- Evaluaciones específicas",
    "- Planificación de acciones con metas específicas",
    "- Seguimiento a las acciones establecidas",
    "Establecer las acciones de intervención en un plazo no mayor a 90 días naturales.",
  ],
  muy_alto: [
    "Se requiere realizar un análisis de cada categoría, dominio y dimensión para establecer las acciones de intervención a través de un Programa de intervención que deberá contener:",
    "- Evaluaciones específicas",
    "- Planificación de acciones con metas específicas, responsables y fechas de cumplimiento",
    "- Seguimiento a las acciones establecidas",
    "- Evaluación de las acciones",
    "Establecer las acciones de intervención de forma inmediata.",
  ],
};

/**
 * Tabla 7: Criterios para la toma de acciones (Guía III)
 */
const GUIDE_III_ACTIONS = {
  nulo: [
    "El riesgo resulta despreciable por lo que no se requiere medidas adicionales.",
  ],
  bajo: [
    "Es necesario una mayor difusión de la política de prevención de riesgos psicosociales y revisar que la misma se esté aplicando.",
  ],
  medio: [
    "Se requiere revisar la política de prevención de riesgos psicosociales y las acciones que se derivan de ésta, así como reforzarlas y/o modificarlas para el control del factor de riesgo.",
    "Establecer las acciones de intervención en un plazo no mayor a 90 días naturales.",
  ],
  alto: [
    "Se requiere realizar un análisis de cada categoría y dominio para establecer las acciones de intervención a través de un Programa de intervención que deberá contener:",
    "- Evaluaciones específicas",
    "- Planificación de acciones con metas específicas",
    "- Seguimiento a las acciones establecidas",
    "Establecer las acciones de intervención en un plazo no mayor a 90 días naturales.",
  ],
  muy_alto: [
    "Se requiere realizar un análisis de cada categoría, dominio y dimensión para establecer las acciones de intervención a través de un Programa de intervención que deberá contener:",
    "- Evaluaciones específicas",
    "- Planificación de acciones con metas específicas, responsables y fechas de cumplimiento",
    "- Seguimiento a las acciones establecidas",
    "- Evaluación de las acciones",
    "Establecer las acciones de intervención de forma inmediata.",
  ],
};

// ============================================================================
// FUNCIONES DE CÁLCULO
// ============================================================================

/**
 * Calcula el puntaje de una respuesta individual considerando si es inversa o no
 */
export function calculateAnswerScore(
  answer: string,
  isReverse: boolean,
  guideType: "guia_ii" | "guia_iii"
): number {
  const scoringTable =
    guideType === "guia_ii" ? GUIDE_II_SCORING : GUIDE_III_SCORING;
  const scoreMap = isReverse ? scoringTable.inverse : scoringTable.normal;
  return scoreMap[answer as keyof typeof scoreMap] || 0;
}

/**
 * Determina el nivel de riesgo basado en el puntaje y la guía
 */
export function determineRiskLevel(
  score: number,
  guideType: "guia_ii" | "guia_iii"
): RiskResult {
  const ranges =
    guideType === "guia_ii" ? GUIDE_II_FINAL_RANGES : GUIDE_III_FINAL_RANGES;

  for (const [level, range] of Object.entries(ranges)) {
    if (score >= range.min && score <= range.max) {
      return {
        level: level as RiskLevel,
        color: range.color,
        score,
        label: range.label,
      };
    }
  }

  // Fallback (no debería ocurrir)
  return {
    level: "muy_alto",
    color: "red",
    score,
    label: "Muy alto",
  };
}

/**
 * Obtiene las acciones recomendadas según el nivel de riesgo
 */
export function getRecommendedActions(
  riskLevel: RiskLevel,
  guideType: "guia_ii" | "guia_iii"
): string[] {
  const actions =
    guideType === "guia_ii" ? GUIDE_II_ACTIONS : GUIDE_III_ACTIONS;
  return actions[riskLevel] || [];
}

/**
 * Calcula la calificación final (Cfinal) de una encuesta
 */
export function calculateFinalScore(
  answers: Array<{
    questionId: number;
    answer: string;
    isReverseScored: boolean;
  }>,
  guideType: "guia_ii" | "guia_iii"
): number {
  let totalScore = 0;

  for (const { answer, isReverseScored } of answers) {
    totalScore += calculateAnswerScore(answer, isReverseScored, guideType);
  }

  return totalScore;
}

/**
 * Calcula la calificación por categoría (Ccat)
 */
export function calculateCategoryScore(
  answers: Array<{
    questionId: number;
    answer: string;
    isReverseScored: boolean;
    category: string;
  }>,
  category: string,
  guideType: "guia_ii" | "guia_iii"
): CategoryScore {
  const categoryAnswers = answers.filter(a => a.category === category);
  let score = 0;

  for (const { answer, isReverseScored } of categoryAnswers) {
    score += calculateAnswerScore(answer, isReverseScored, guideType);
  }

  const riskResult = determineRiskLevel(score, guideType);

  return {
    category,
    score,
    riskLevel: riskResult.level,
    riskColor: riskResult.color,
  };
}

/**
 * Calcula la calificación por dominio (Cdom)
 */
export function calculateDomainScore(
  answers: Array<{
    questionId: number;
    answer: string;
    isReverseScored: boolean;
    domain: string;
  }>,
  domain: string,
  guideType: "guia_ii" | "guia_iii"
): DomainScore {
  const domainAnswers = answers.filter(a => a.domain === domain);
  let score = 0;

  for (const { answer, isReverseScored } of domainAnswers) {
    score += calculateAnswerScore(answer, isReverseScored, guideType);
  }

  const riskResult = determineRiskLevel(score, guideType);

  return {
    domain,
    score,
    riskLevel: riskResult.level,
    riskColor: riskResult.color,
  };
}

/**
 * Calcula la calificación por dimensión (Cdim) - solo para Guía III
 */
export function calculateDimensionScore(
  answers: Array<{
    questionId: number;
    answer: string;
    isReverseScored: boolean;
    dimension: string | null;
  }>,
  dimension: string,
  guideType: "guia_ii" | "guia_iii"
): DimensionScore {
  const dimensionAnswers = answers.filter(a => a.dimension === dimension);
  let score = 0;

  for (const { answer, isReverseScored } of dimensionAnswers) {
    score += calculateAnswerScore(answer, isReverseScored, guideType);
  }

  const riskResult = determineRiskLevel(score, guideType);

  return {
    dimension,
    score,
    riskLevel: riskResult.level,
    riskColor: riskResult.color,
  };
}

/**
 * Calcula el resultado completo de una encuesta
 */
export function calculateSurveyResult(
  answers: Array<{
    questionId: number;
    answer: string;
    isReverseScored: boolean;
    category: string;
    domain: string;
    dimension: string | null;
  }>,
  guideType: "guia_ii" | "guia_iii"
): SurveyResult {
  // Calificación final
  const finalScore = calculateFinalScore(answers, guideType);
  const finalRisk = determineRiskLevel(finalScore, guideType);

  // Calificaciones por categoría
  const categories = Array.from(new Set(answers.map(a => a.category)));
  const categoryScores = categories.map(cat =>
    calculateCategoryScore(answers, cat, guideType)
  );

  // Calificaciones por dominio
  const domains = Array.from(new Set(answers.map(a => a.domain)));
  const domainScores = domains.map(dom =>
    calculateDomainScore(answers, dom, guideType)
  );

  // Calificaciones por dimensión (solo si existen)
  const dimensions = Array.from(
    new Set(answers.map(a => a.dimension).filter(d => d !== null))
  ) as string[];
  const dimensionScores = dimensions.map(dim =>
    calculateDimensionScore(answers, dim, guideType)
  );

  // Acciones recomendadas
  const recommendedActions = getRecommendedActions(finalRisk.level, guideType);

  return {
    finalScore,
    finalRiskLevel: finalRisk.level,
    finalRiskColor: finalRisk.color,
    categories: categoryScores,
    domains: domainScores,
    dimensions: dimensionScores,
    recommendedActions,
  };
}

/**
 * Calcula la fórmula de cobertura (Ecuación 1)
 * Cobertura = (Trabajadores que respondieron / Total de trabajadores) * 100
 */
export function calculateCoverage(
  totalWorkers: number,
  respondedWorkers: number
): number {
  if (totalWorkers === 0) return 0;
  return (respondedWorkers / totalWorkers) * 100;
}

/**
 * Obtiene el color hexadecimal según el nivel de riesgo
 */
export function getRiskColorHex(color: RiskColor): string {
  const colorMap = {
    blue: "#3B82F6", // Azul
    green: "#10B981", // Verde
    yellow: "#F59E0B", // Amarillo
    orange: "#F97316", // Naranja
    red: "#EF4444", // Rojo
  };
  return colorMap[color];
}

/**
 * Obtiene el label en español del nivel de riesgo
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  const labels = {
    nulo: "Nulo o despreciable",
    bajo: "Bajo",
    medio: "Medio",
    alto: "Alto",
    muy_alto: "Muy alto",
  };
  return labels[level];
}
