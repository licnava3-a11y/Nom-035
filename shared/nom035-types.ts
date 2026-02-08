/**
 * Tipos compartidos para evaluación NOM-035
 */

/**
 * Información de evaluación NOM-035
 */
export interface EvaluacionInfo {
  fecha: string; // Formato ISO 8601: "2024-01-15"
  periodo: string; // Ejemplo: "Q1-2024", "Enero 2024"
  version_nom: string; // Ejemplo: "NOM-035-STPS-2018"
}

/**
 * Estructura de empresa según formato JSON oficial
 */
export interface EmpresaInfo {
  id: string; // Ejemplo: "EMP001"
  nombre: string;
  trabajadores: number;
  giro: string;
}

/**
 * Dimensión con código oficial y puntuación
 */
export interface DimensionData {
  codigo: string; // Ejemplo: "G2-1", "G3-1"
  nombre: string; // Nombre descriptivo
  puntuacion: number;
  color: 'ROJO' | 'NARANJA' | 'AMARILLO' | 'VERDE' | 'AZUL';
  interpretacion: string;
}

/**
 * Resultado completo de evaluación NOM-035 en formato JSON oficial
 */
export interface ResultadoEvaluacionNOM035 {
  empresa: EmpresaInfo;
  evaluacion: EvaluacionInfo;
  dimensiones: {
    guia_II?: Record<string, DimensionData>;
    guia_III?: Record<string, DimensionData>;
  };
}
