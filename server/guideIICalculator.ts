/**
 * Calculadora de Guía II NOM-035-STPS-2018
 * 
 * Implementa el algoritmo oficial de calificación para empresas de 16-50 trabajadores.
 * Basado en la Guía de Referencia II oficial de la NOM-035-STPS-2018.
 * 
 * Fuente: https://kaanval.com/wp-content/uploads/2022/09/GUIA-DE-REFERENCIA-II-NOM-035.pdf
 */

/**
 * Mapeo de ítems a sus valores de calificación según Tabla 2
 * 
 * Ítems 18-33: Siempre=0, Casi siempre=1, Algunas veces=2, Casi nunca=3, Nunca=4
 * Ítems 1-17, 34-43: Siempre=4, Casi siempre=3, Algunas veces=2, Casi nunca=1, Nunca=0
 */
const REVERSE_SCORING_ITEMS = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];

/**
 * Agrupación de ítems por dominio según Tabla 3
 */
const DOMAINS = {
  condicionesAmbiente: [1, 2, 3],
  cargaTrabajo: [4, 5, 6, 7, 8, 9, 41, 42, 43],
  faltaControl: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
  jornadasTrabajo: [14, 15],
  interferenciaFamilia: [16, 17],
  liderazgo: [23, 24, 25, 28, 29],
  relacionesTrabajo: [30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46],
  violencia: [39, 40]
};

/**
 * Agrupación de ítems por categoría según Tabla 3
 */
const CATEGORIES = {
  ambienteTrabajo: [1, 2, 3],
  factoresPropios: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 41, 42, 43],
  organizacionTiempo: [14, 15, 16, 17],
  liderazgoRelaciones: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 44, 45, 46]
};

/**
 * Tablas de clasificación de nivel de riesgo según página 6 del documento oficial
 */
const RISK_LEVELS = {
  final: [
    { level: 'Nulo o despreciable', min: 0, max: 19 },
    { level: 'Bajo', min: 20, max: 44 },
    { level: 'Medio', min: 45, max: 69 },
    { level: 'Alto', min: 70, max: 89 },
    { level: 'Muy alto', min: 90, max: Infinity }
  ],
  categories: {
    ambienteTrabajo: [
      { level: 'Nulo o despreciable', min: 0, max: 2 },
      { level: 'Bajo', min: 3, max: 4 },
      { level: 'Medio', min: 5, max: 6 },
      { level: 'Alto', min: 7, max: 8 },
      { level: 'Muy alto', min: 9, max: Infinity }
    ],
    factoresPropios: [
      { level: 'Nulo o despreciable', min: 0, max: 9 },
      { level: 'Bajo', min: 10, max: 19 },
      { level: 'Medio', min: 20, max: 29 },
      { level: 'Alto', min: 30, max: 39 },
      { level: 'Muy alto', min: 40, max: Infinity }
    ],
    organizacionTiempo: [
      { level: 'Nulo o despreciable', min: 0, max: 3 },
      { level: 'Bajo', min: 4, max: 5 },
      { level: 'Medio', min: 6, max: 8 },
      { level: 'Alto', min: 9, max: 11 },
      { level: 'Muy alto', min: 12, max: Infinity }
    ],
    liderazgoRelaciones: [
      { level: 'Nulo o despreciable', min: 0, max: 9 },
      { level: 'Bajo', min: 10, max: 17 },
      { level: 'Medio', min: 18, max: 27 },
      { level: 'Alto', min: 28, max: 37 },
      { level: 'Muy alto', min: 38, max: Infinity }
    ]
  },
  domains: {
    condicionesAmbiente: [
      { level: 'Nulo o despreciable', min: 0, max: 2 },
      { level: 'Bajo', min: 3, max: 4 },
      { level: 'Medio', min: 5, max: 6 },
      { level: 'Alto', min: 7, max: 8 },
      { level: 'Muy alto', min: 9, max: Infinity }
    ],
    cargaTrabajo: [
      { level: 'Nulo o despreciable', min: 0, max: 11 },
      { level: 'Bajo', min: 12, max: 15 },
      { level: 'Medio', min: 16, max: 19 },
      { level: 'Alto', min: 20, max: 23 },
      { level: 'Muy alto', min: 24, max: Infinity }
    ],
    faltaControl: [
      { level: 'Nulo o despreciable', min: 0, max: 4 },
      { level: 'Bajo', min: 5, max: 7 },
      { level: 'Medio', min: 8, max: 10 },
      { level: 'Alto', min: 11, max: 13 },
      { level: 'Muy alto', min: 14, max: Infinity }
    ],
    jornadasTrabajo: [
      { level: 'Nulo o despreciable', min: 0, max: 0 },
      { level: 'Bajo', min: 1, max: 1 },
      { level: 'Medio', min: 2, max: 3 },
      { level: 'Alto', min: 4, max: 5 },
      { level: 'Muy alto', min: 6, max: Infinity }
    ],
    interferenciaFamilia: [
      { level: 'Nulo o despreciable', min: 0, max: 0 },
      { level: 'Bajo', min: 1, max: 1 },
      { level: 'Medio', min: 2, max: 3 },
      { level: 'Alto', min: 4, max: 5 },
      { level: 'Muy alto', min: 6, max: Infinity }
    ],
    liderazgo: [
      { level: 'Nulo o despreciable', min: 0, max: 2 },
      { level: 'Bajo', min: 3, max: 4 },
      { level: 'Medio', min: 5, max: 7 },
      { level: 'Alto', min: 8, max: 10 },
      { level: 'Muy alto', min: 11, max: Infinity }
    ],
    relacionesTrabajo: [
      { level: 'Nulo o despreciable', min: 0, max: 4 },
      { level: 'Bajo', min: 5, max: 7 },
      { level: 'Medio', min: 8, max: 10 },
      { level: 'Alto', min: 11, max: 13 },
      { level: 'Muy alto', min: 14, max: Infinity }
    ],
    violencia: [
      { level: 'Nulo o despreciable', min: 0, max: 6 },
      { level: 'Bajo', min: 7, max: 9 },
      { level: 'Medio', min: 10, max: 12 },
      { level: 'Alto', min: 13, max: 15 },
      { level: 'Muy alto', min: 16, max: Infinity }
    ]
  }
};

/**
 * Convierte respuesta de escala Likert a valor numérico
 */
function convertAnswerToScore(itemNumber: number, answer: string): number {
  const likertMap: Record<string, number> = {
    'Siempre': 0,
    'Casi siempre': 1,
    'Algunas veces': 2,
    'Casi nunca': 3,
    'Nunca': 4
  };

  const baseScore = likertMap[answer] ?? 0;

  // Ítems con calificación inversa
  if (REVERSE_SCORING_ITEMS.includes(itemNumber)) {
    return baseScore;
  }

  // Ítems con calificación normal (invertir valores)
  return 4 - baseScore;
}

/**
 * Clasifica el nivel de riesgo según el puntaje
 */
function classifyRiskLevel(score: number, riskTable: Array<{ level: string; min: number; max: number }>): string {
  const match = riskTable.find(range => score >= range.min && score <= range.max);
  return match?.level ?? 'No clasificado';
}

/**
 * Calcula los resultados de Guía II según el algoritmo oficial
 */
export function calculateGuideIIResults(answers: Record<number, string>) {
  // Validar que se tengan las 46 respuestas
  const totalQuestions = 46;
  const answeredQuestions = Object.keys(answers).length;

  if (answeredQuestions < totalQuestions) {
    throw new Error(`Faltan respuestas. Se requieren ${totalQuestions} respuestas, se recibieron ${answeredQuestions}.`);
  }

  // Calcular puntajes por dominio
  const domainScores: Record<string, number> = {};
  for (const [domainKey, items] of Object.entries(DOMAINS)) {
    domainScores[domainKey] = items.reduce((sum: any, itemNum: any) => {
      return sum + convertAnswerToScore(itemNum, answers[itemNum]);
    }, 0);
  }

  // Calcular puntajes por categoría
  const categoryScores: Record<string, number> = {};
  for (const [categoryKey, items] of Object.entries(CATEGORIES)) {
    categoryScores[categoryKey] = items.reduce((sum: any, itemNum: any) => {
      return sum + convertAnswerToScore(itemNum, answers[itemNum]);
    }, 0);
  }

  // Calcular puntaje final (suma de todos los ítems)
  const finalScore = Object.values(answers).reduce((sum: any, answer: any, index: number) => {
    const itemNumber = index + 1;
    return sum + convertAnswerToScore(itemNumber, answer);
  }, 0);

  // Clasificar niveles de riesgo
  const domainRiskLevels: Record<string, string> = {};
  for (const [domainKey, score] of Object.entries(domainScores)) {
    domainRiskLevels[domainKey] = classifyRiskLevel(
      score,
      RISK_LEVELS.domains[domainKey as keyof typeof RISK_LEVELS.domains]
    );
  }

  const categoryRiskLevels: Record<string, string> = {};
  for (const [categoryKey, score] of Object.entries(categoryScores)) {
    categoryRiskLevels[categoryKey] = classifyRiskLevel(
      score,
      RISK_LEVELS.categories[categoryKey as keyof typeof RISK_LEVELS.categories]
    );
  }

  const finalRiskLevel = classifyRiskLevel(finalScore, RISK_LEVELS.final);

  // Generar recomendaciones
  const recommendations = generateRecommendations(finalRiskLevel, domainRiskLevels, categoryRiskLevels);

  return {
    finalScore,
    finalRiskLevel,
    domainScores,
    domainRiskLevels,
    categoryScores,
    categoryRiskLevels,
    recommendations,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Genera recomendaciones automáticas según nivel de riesgo
 */
function generateRecommendations(
  finalRiskLevel: string,
  domainRiskLevels: Record<string, string>,
  categoryRiskLevels: Record<string, string>
): string[] {
  const recommendations: string[] = [];

  // Recomendaciones generales según nivel de riesgo final
  switch (finalRiskLevel) {
    case 'Muy alto':
      recommendations.push('🚨 ACCIÓN INMEDIATA REQUERIDA: Se detectó un nivel de riesgo psicosocial MUY ALTO. Es necesario implementar medidas correctivas urgentes.');
      recommendations.push('Realizar evaluación clínica especializada a los trabajadores afectados.');
      recommendations.push('Implementar programa de intervención inmediata con seguimiento semanal.');
      break;
    case 'Alto':
      recommendations.push('⚠️ ATENCIÓN PRIORITARIA: Se detectó un nivel de riesgo psicosocial ALTO. Se requieren acciones correctivas en el corto plazo.');
      recommendations.push('Diseñar e implementar plan de acción correctivo con responsables y fechas límite.');
      recommendations.push('Realizar seguimiento mensual de la evolución del riesgo.');
      break;
    case 'Medio':
      recommendations.push('⚡ ACCIÓN PREVENTIVA: Se detectó un nivel de riesgo psicosocial MEDIO. Se recomienda implementar acciones preventivas.');
      recommendations.push('Reforzar programas de bienestar y clima laboral.');
      recommendations.push('Realizar seguimiento trimestral de indicadores.');
      break;
    case 'Bajo':
      recommendations.push('✅ MANTENER CONDICIONES: Se detectó un nivel de riesgo psicosocial BAJO. Continuar con las prácticas actuales.');
      recommendations.push('Implementar acciones de mejora continua.');
      break;
    case 'Nulo o despreciable':
      recommendations.push('✅ EXCELENTE: No se detectaron factores de riesgo psicosocial significativos.');
      recommendations.push('Mantener las buenas prácticas actuales y compartir experiencias con otras áreas.');
      break;
  }

  // Recomendaciones específicas por dominio
  if (domainRiskLevels.condicionesAmbiente === 'Alto' || domainRiskLevels.condicionesAmbiente === 'Muy alto') {
    recommendations.push('🏭 AMBIENTE DE TRABAJO: Realizar inspección de seguridad e higiene. Mejorar condiciones físicas del lugar de trabajo (iluminación, ventilación, ruido, temperatura).');
  }

  if (domainRiskLevels.cargaTrabajo === 'Alto' || domainRiskLevels.cargaTrabajo === 'Muy alto') {
    recommendations.push('📊 CARGA DE TRABAJO: Redistribuir cargas de trabajo. Implementar pausas activas. Revisar procesos para eliminar actividades innecesarias.');
  }

  if (domainRiskLevels.faltaControl === 'Alto' || domainRiskLevels.faltaControl === 'Muy alto') {
    recommendations.push('🎯 CONTROL SOBRE EL TRABAJO: Aumentar autonomía de los trabajadores. Implementar esquemas de trabajo flexible. Promover la participación en la toma de decisiones.');
  }

  if (domainRiskLevels.jornadasTrabajo === 'Alto' || domainRiskLevels.jornadasTrabajo === 'Muy alto') {
    recommendations.push('⏰ JORNADAS DE TRABAJO: Reducir horas extras. Respetar días de descanso. Implementar esquemas de trabajo que permitan balance vida-trabajo.');
  }

  if (domainRiskLevels.interferenciaFamilia === 'Alto' || domainRiskLevels.interferenciaFamilia === 'Muy alto') {
    recommendations.push('👨‍👩‍👧‍👦 BALANCE TRABAJO-FAMILIA: Implementar políticas de flexibilidad laboral. Ofrecer apoyo para cuidado de dependientes. Respetar horarios de salida.');
  }

  if (domainRiskLevels.liderazgo === 'Alto' || domainRiskLevels.liderazgo === 'Muy alto') {
    recommendations.push('👔 LIDERAZGO: Capacitar a líderes en habilidades de comunicación y gestión de equipos. Implementar evaluación 360° de líderes. Fomentar liderazgo participativo.');
  }

  if (domainRiskLevels.relacionesTrabajo === 'Alto' || domainRiskLevels.relacionesTrabajo === 'Muy alto') {
    recommendations.push('🤝 RELACIONES EN EL TRABAJO: Implementar actividades de integración y trabajo en equipo. Establecer canales de comunicación efectivos. Promover cultura de respeto y colaboración.');
  }

  if (domainRiskLevels.violencia === 'Alto' || domainRiskLevels.violencia === 'Muy alto') {
    recommendations.push('🚨 VIOLENCIA LABORAL: ACCIÓN URGENTE - Activar protocolo de atención a violencia laboral. Realizar investigación inmediata. Implementar medidas de protección a víctimas. Capacitar en prevención de violencia.');
  }

  return recommendations;
}

/**
 * Valida que las respuestas tengan el formato correcto
 */
export function validateGuideIIAnswers(answers: Record<number, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validAnswers = ['Siempre', 'Casi siempre', 'Algunas veces', 'Casi nunca', 'Nunca'];

  // Validar que existan las 46 respuestas
  for (let i = 1; i <= 46; i++) {
    if (!answers[i]) {
      errors.push(`Falta respuesta para la pregunta ${i}`);
    } else if (!validAnswers.includes(answers[i])) {
      errors.push(`Respuesta inválida para la pregunta ${i}: "${answers[i]}". Debe ser una de: ${validAnswers.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
