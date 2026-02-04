/**
 * Tablas de calificación oficial NOM-035-STPS-2018
 * 
 * Este archivo contiene las tablas de calificación y niveles de riesgo
 * según lo establecido en la norma oficial mexicana.
 */

// Niveles de riesgo
export type RiskLevel = 'Nulo' | 'Bajo' | 'Medio' | 'Alto' | 'Muy alto';

// Mapeo de respuestas a puntajes
export const RESPONSE_SCORES = {
  // Guía I (Sí/No)
  'Sí': 1,
  'No': 0,
  
  // Guías II y III (Escala Likert)
  'Siempre': 4,
  'Casi siempre': 3,
  'Algunas veces': 2,
  'Casi nunca': 1,
  'Nunca': 0,
};

// Tabla de calificación Guía I - Acontecimientos Traumáticos Severos
// Si alguna respuesta es "Sí", se detecta ATS
export function calculateGuideIResult(answers: { questionId: number; answerValue: string }[]): {
  atsDetected: boolean;
  score: number;
  riskLevel: RiskLevel;
} {
  const yesCount = answers.filter(a => a.answerValue === 'Sí').length;
  
  return {
    atsDetected: yesCount > 0,
    score: yesCount,
    riskLevel: yesCount > 0 ? 'Muy alto' : 'Nulo',
  };
}

// Tabla de calificación Guía II - Empresas de 16 a 50 trabajadores
// Basada en la tabla oficial de la NOM-035
export function calculateGuideIIResult(totalScore: number): {
  riskLevel: RiskLevel;
  category: string;
} {
  if (totalScore < 20) {
    return { riskLevel: 'Nulo', category: 'Nulo o despreciable' };
  } else if (totalScore >= 20 && totalScore < 45) {
    return { riskLevel: 'Bajo', category: 'Bajo' };
  } else if (totalScore >= 45 && totalScore < 70) {
    return { riskLevel: 'Medio', category: 'Medio' };
  } else if (totalScore >= 70 && totalScore < 90) {
    return { riskLevel: 'Alto', category: 'Alto' };
  } else {
    return { riskLevel: 'Muy alto', category: 'Muy alto' };
  }
}

// Tabla de calificación Guía III - Empresas de más de 50 trabajadores
// Basada en la tabla oficial de la NOM-035
export function calculateGuideIIIResult(totalScore: number): {
  riskLevel: RiskLevel;
  category: string;
} {
  if (totalScore < 50) {
    return { riskLevel: 'Nulo', category: 'Nulo o despreciable' };
  } else if (totalScore >= 50 && totalScore < 75) {
    return { riskLevel: 'Bajo', category: 'Bajo' };
  } else if (totalScore >= 75 && totalScore < 99) {
    return { riskLevel: 'Medio', category: 'Medio' };
  } else if (totalScore >= 99 && totalScore < 140) {
    return { riskLevel: 'Alto', category: 'Alto' };
  } else {
    return { riskLevel: 'Muy alto', category: 'Muy alto' };
  }
}

// Calificación por categoría para Guía II
export const GUIDE_II_CATEGORIES = {
  'Ambiente de trabajo': { min: 0, max: 16 },
  'Factores propios de la actividad': { min: 0, max: 24 },
  'Organización del tiempo de trabajo': { min: 0, max: 12 },
  'Liderazgo y relaciones en el trabajo': { min: 0, max: 44 },
  'Entorno organizacional': { min: 0, max: 8 },
};

// Calificación por categoría para Guía III
export const GUIDE_III_CATEGORIES = {
  'Ambiente de trabajo': { min: 0, max: 8 },
  'Factores propios de la actividad': { min: 0, max: 28 },
  'Organización del tiempo de trabajo': { min: 0, max: 16 },
  'Liderazgo y relaciones en el trabajo': { min: 0, max: 52 },
  'Entorno organizacional': { min: 0, max: 40 },
};

// Dominios de la Guía III
export const GUIDE_III_DOMAINS = {
  'Condiciones en el ambiente de trabajo': [
    'Condiciones peligrosas e inseguras',
    'Condiciones deficientes e insalubres',
  ],
  'Carga de trabajo': [
    'Cargas cuantitativas',
    'Ritmos de trabajo acelerado',
    'Carga mental',
    'Cargas psicológicas emocionales',
  ],
  'Falta de control sobre el trabajo': [
    'Falta de control y autonomía sobre el trabajo',
    'Limitada o nula posibilidad de desarrollo',
    'Insuficiente participación y manejo del cambio',
  ],
  'Jornada de trabajo': [
    'Jornadas de trabajo extensas',
    'Interferencia en la relación trabajo-familia',
  ],
  'Liderazgo negativo y relaciones negativas en el trabajo': [
    'Liderazgo negativo',
    'Relaciones negativas',
  ],
  'Violencia': [
    'Violencia laboral',
  ],
  'Reconocimiento del desempeño': [
    'Escasa o nula retroalimentación del desempeño',
    'Escaso o nulo reconocimiento y compensación',
  ],
  'Insuficiente sentido de pertenencia e inestabilidad': [
    'Limitado sentido de pertenencia',
    'Inestabilidad laboral',
  ],
};

// Recomendaciones según nivel de riesgo
export function getRecommendations(riskLevel: RiskLevel, surveyType: 'guia_i' | 'guia_ii' | 'guia_iii'): string[] {
  const recommendations: Record<RiskLevel, string[]> = {
    'Nulo': [
      'El nivel de riesgo psicosocial es nulo o despreciable.',
      'Se recomienda mantener las condiciones actuales de trabajo.',
      'Continuar con las medidas preventivas implementadas.',
      'Realizar evaluaciones periódicas para monitorear el ambiente laboral.',
    ],
    'Bajo': [
      'El nivel de riesgo psicosocial es bajo.',
      'Se sugiere implementar acciones de mejora continua.',
      'Reforzar la comunicación entre trabajadores y directivos.',
      'Promover actividades de integración y trabajo en equipo.',
      'Realizar evaluaciones cada 2 años o cuando cambien las condiciones.',
    ],
    'Medio': [
      'El nivel de riesgo psicosocial es medio.',
      'Se requiere implementar acciones correctivas en un plazo de 1 año.',
      'Realizar análisis específicos de las áreas con mayor riesgo.',
      'Implementar programas de capacitación en manejo del estrés.',
      'Mejorar los canales de comunicación organizacional.',
      'Evaluar la carga de trabajo y redistribuir tareas si es necesario.',
    ],
    'Alto': [
      'El nivel de riesgo psicosocial es alto.',
      'Se deben implementar acciones correctivas de manera urgente.',
      'Realizar exámenes médicos específicos a los trabajadores afectados.',
      'Implementar programas de intervención psicológica.',
      'Revisar y modificar las condiciones de trabajo identificadas como riesgosas.',
      'Capacitar a líderes en gestión del estrés y relaciones laborales.',
      'Establecer un plan de seguimiento mensual.',
    ],
    'Muy alto': [
      'El nivel de riesgo psicosocial es muy alto.',
      'Se requiere intervención inmediata del comité de seguridad y salud.',
      'Implementar acciones correctivas de forma prioritaria.',
      'Proporcionar atención psicológica inmediata a los trabajadores afectados.',
      'Realizar modificaciones sustanciales en la organización del trabajo.',
      'Implementar medidas de prevención de violencia laboral.',
      'Establecer un plan de seguimiento semanal con el comité.',
      'Considerar la reubicación temporal de trabajadores en riesgo.',
    ],
  };

  const baseRecommendations = recommendations[riskLevel];
  
  if (surveyType === 'guia_i' && riskLevel === 'Muy alto') {
    return [
      'Se ha detectado un Acontecimiento Traumático Severo (ATS).',
      'El comité de seguridad y salud debe ser notificado de inmediato.',
      'Se debe proporcionar atención psicológica especializada al trabajador.',
      'Realizar una investigación del acontecimiento reportado.',
      'Implementar medidas preventivas para evitar la recurrencia.',
      'Dar seguimiento continuo al estado del trabajador afectado.',
    ];
  }
  
  return baseRecommendations;
}

// Calcular puntaje total de respuestas
export function calculateTotalScore(
  answers: { questionId: number; answerValue: string }[],
  questions: { id: number; isReverseScored: boolean }[]
): number {
  let totalScore = 0;
  
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) continue;
    
    const baseScore = RESPONSE_SCORES[answer.answerValue as keyof typeof RESPONSE_SCORES] || 0;
    
    // Si la pregunta tiene calificación inversa, invertir el puntaje
    if (question.isReverseScored) {
      totalScore += (4 - baseScore);
    } else {
      totalScore += baseScore;
    }
  }
  
  return totalScore;
}

// Calcular puntajes por categoría
export function calculateCategoryScores(
  answers: { questionId: number; answerValue: string }[],
  questions: { id: number; category: string | null; isReverseScored: boolean }[]
): Record<string, number> {
  const categoryScores: Record<string, number> = {};
  
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question || !question.category) continue;
    
    const baseScore = RESPONSE_SCORES[answer.answerValue as keyof typeof RESPONSE_SCORES] || 0;
    const score = question.isReverseScored ? (4 - baseScore) : baseScore;
    
    if (!categoryScores[question.category]) {
      categoryScores[question.category] = 0;
    }
    categoryScores[question.category] += score;
  }
  
  return categoryScores;
}

// Calcular puntajes por dominio
export function calculateDomainScores(
  answers: { questionId: number; answerValue: string }[],
  questions: { id: number; domain: string | null; isReverseScored: boolean }[]
): Record<string, number> {
  const domainScores: Record<string, number> = {};
  
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question || !question.domain) continue;
    
    const baseScore = RESPONSE_SCORES[answer.answerValue as keyof typeof RESPONSE_SCORES] || 0;
    const score = question.isReverseScored ? (4 - baseScore) : baseScore;
    
    if (!domainScores[question.domain]) {
      domainScores[question.domain] = 0;
    }
    domainScores[question.domain] += score;
  }
  
  return domainScores;
}
