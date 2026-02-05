/**
 * Calculadora de Tamaño de Muestra para Guía III NOM-035
 * 
 * Según la NOM-035-STPS-2018, para la aplicación de la Guía III
 * (Cuestionario para identificar a los trabajadores que fueron sujetos
 * a acontecimientos traumáticos severos), se debe aplicar a una muestra
 * representativa de la población trabajadora.
 * 
 * Fórmula para población finita:
 * n = (N * Z² * p * q) / (d² * (N-1) + Z² * p * q)
 * 
 * Donde:
 * - N = Tamaño de la población (total de trabajadores)
 * - Z = Nivel de confianza (1.96 para 95% de confianza)
 * - p = Probabilidad de éxito (0.5 para máxima variabilidad)
 * - q = Probabilidad de fracaso (1 - p = 0.5)
 * - d = Margen de error (0.05 para 5% de error)
 * - n = Tamaño de la muestra
 */

export interface SampleSizeResult {
  totalWorkers: number;
  sampleSize: number;
  confidenceLevel: number;
  marginOfError: number;
  percentage: number;
}

/**
 * Calcula el tamaño de muestra requerido para Guía III
 * @param totalWorkers - Total de trabajadores en la organización
 * @param confidenceLevel - Nivel de confianza (default: 95%)
 * @param marginOfError - Margen de error (default: 5%)
 * @returns Resultado del cálculo con tamaño de muestra requerido
 */
export function calculateSampleSize(
  totalWorkers: number,
  confidenceLevel: number = 95,
  marginOfError: number = 5
): SampleSizeResult {
  // Validar entrada
  if (totalWorkers <= 0) {
    throw new Error('El total de trabajadores debe ser mayor a 0');
  }

  // Si la población es muy pequeña (< 50), aplicar a todos
  if (totalWorkers < 50) {
    return {
      totalWorkers,
      sampleSize: totalWorkers,
      confidenceLevel,
      marginOfError,
      percentage: 100,
    };
  }

  // Convertir nivel de confianza a valor Z
  const zScores: Record<number, number> = {
    90: 1.645,
    95: 1.96,
    99: 2.576,
  };
  const Z = zScores[confidenceLevel] || 1.96;

  // Convertir margen de error a decimal
  const d = marginOfError / 100;

  // Probabilidades (máxima variabilidad)
  const p = 0.5;
  const q = 0.5;

  // Calcular tamaño de muestra
  const numerator = totalWorkers * Math.pow(Z, 2) * p * q;
  const denominator = Math.pow(d, 2) * (totalWorkers - 1) + Math.pow(Z, 2) * p * q;
  const sampleSize = Math.ceil(numerator / denominator);

  return {
    totalWorkers,
    sampleSize,
    confidenceLevel,
    marginOfError,
    percentage: Math.round((sampleSize / totalWorkers) * 100 * 100) / 100,
  };
}

/**
 * Tabla de referencia rápida de tamaños de muestra según NOM-035
 * Basada en nivel de confianza 95% y margen de error 5%
 */
export const SAMPLE_SIZE_REFERENCE: Record<string, number> = {
  '15-50': 50,      // Población pequeña: aplicar a todos
  '51-100': 80,
  '101-200': 132,
  '201-300': 169,
  '301-400': 196,
  '401-500': 217,
  '501-750': 254,
  '751-1000': 278,
  '1001-2000': 322,
  '2001-5000': 357,
  '5001-10000': 370,
  '10001+': 384,    // Población muy grande
};

/**
 * Obtiene el tamaño de muestra de la tabla de referencia
 * @param totalWorkers - Total de trabajadores
 * @returns Tamaño de muestra según tabla de referencia
 */
export function getSampleSizeFromTable(totalWorkers: number): number {
  if (totalWorkers <= 50) return totalWorkers;
  if (totalWorkers <= 100) return 80;
  if (totalWorkers <= 200) return 132;
  if (totalWorkers <= 300) return 169;
  if (totalWorkers <= 400) return 196;
  if (totalWorkers <= 500) return 217;
  if (totalWorkers <= 750) return 254;
  if (totalWorkers <= 1000) return 278;
  if (totalWorkers <= 2000) return 322;
  if (totalWorkers <= 5000) return 357;
  if (totalWorkers <= 10000) return 370;
  return 384; // Población muy grande
}
