/**
 * Traducciones de Enums del Sistema
 * 
 * Este archivo centraliza todas las traducciones de valores de enum
 * del backend (en inglés) al frontend (en español).
 * 
 * Convención:
 * - Backend: Siempre usar valores en inglés (snake_case o camelCase)
 * - Frontend: Usar este archivo para mostrar etiquetas en español
 */

// ============================================================================
// CASOS (CASES)
// ============================================================================

export const CASE_TYPE_LABELS = {
  harassment: 'Acoso',
  discrimination: 'Discriminación',
  violence: 'Violencia',
  stress: 'Estrés',
  workload: 'Carga de Trabajo',
  other: 'Otro',
} as const;

export const CASE_PRIORITY_LABELS = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
} as const;

export const CASE_STATUS_LABELS = {
  open: 'Abierto',
  investigating: 'En Investigación',
  resolved: 'Resuelto',
  closed: 'Cerrado',
} as const;

// ============================================================================
// EMPLEADOS (EMPLOYEES)
// ============================================================================

export const GENDER_LABELS = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
  prefer_not_to_say: 'Prefiero no decir',
} as const;

export const EMPLOYMENT_STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  terminated: 'Terminado',
} as const;

// ============================================================================
// BASES DE FUNCIONAMIENTO (OPERATING RULES)
// ============================================================================

export const OPERATING_RULES_STATUS_LABELS = {
  draft: 'Borrador',
  pending_approval: 'Pendiente de Aprobación',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  archived: 'Archivado',
} as const;

export const APPROVAL_STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
} as const;

// ============================================================================
// ENCUESTAS (SURVEYS)
// ============================================================================

export const SURVEY_STATUS_LABELS = {
  draft: 'Borrador',
  active: 'Activa',
  closed: 'Cerrada',
  archived: 'Archivada',
} as const;

export const RISK_LEVEL_LABELS = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  critical: 'Crítico',
} as const;

// ============================================================================
// CURSOS (COURSES)
// ============================================================================

export const COURSE_STATUS_LABELS = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
} as const;

export const COURSE_MODALITY_LABELS = {
  online: 'En Línea',
  in_person: 'Presencial',
  hybrid: 'Híbrido',
} as const;

// ============================================================================
// RECONOCIMIENTOS (RECOGNITIONS)
// ============================================================================

export const RECOGNITION_TYPE_LABELS = {
  achievement: 'Logro',
  anniversary: 'Aniversario',
  excellence: 'Excelencia',
  teamwork: 'Trabajo en Equipo',
  innovation: 'Innovación',
  other: 'Otro',
} as const;

// ============================================================================
// CUMPLIMIENTO (COMPLIANCE)
// ============================================================================

export const COMPLIANCE_STATUS_LABELS = {
  compliant: 'Cumple',
  partial: 'Cumple Parcialmente',
  non_compliant: 'No Cumple',
} as const;

// ============================================================================
// EVIDENCIAS (EVIDENCE)
// ============================================================================

export const EVIDENCE_TYPE_LABELS = {
  survey: 'Encuesta',
  training: 'Capacitación',
  medical: 'Médico',
  other: 'Otro',
} as const;

// ============================================================================
// PREGUNTAS DE ENCUESTA (SURVEY QUESTIONS)
// ============================================================================

export const QUESTION_TYPE_LABELS = {
  likert: 'Escala Likert',
  multiple_choice: 'Opción Múltiple',
  open_ended: 'Respuesta Abierta',
} as const;

export const QUESTION_CATEGORY_LABELS = {
  leadership: 'Liderazgo',
  communication: 'Comunicación',
  work_environment: 'Ambiente de Trabajo',
  benefits: 'Beneficios',
  growth: 'Crecimiento',
} as const;

// ============================================================================
// HITOS DE CARRERA (CAREER MILESTONES)
// ============================================================================

export const MILESTONE_STATUS_LABELS = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
} as const;

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtiene la etiqueta en español para un valor de enum
 * @param enumLabels Objeto de etiquetas (ej: CASE_STATUS_LABELS)
 * @param value Valor del enum en inglés
 * @returns Etiqueta en español o el valor original si no se encuentra
 */
export function getEnumLabel<T extends Record<string, string>>(
  enumLabels: T,
  value: string
): string {
  return enumLabels[value as keyof T] || value;
}

/**
 * Obtiene todas las opciones de un enum como array de {value, label}
 * @param enumLabels Objeto de etiquetas
 * @returns Array de opciones para Select components
 */
export function getEnumOptions<T extends Record<string, string>>(
  enumLabels: T
): Array<{ value: keyof T; label: string }> {
  return Object.entries(enumLabels).map(([value, label]) => ({
    value: value as keyof T,
    label,
  }));
}

// ============================================================================
// TIPOS DE TYPESCRIPT
// ============================================================================

export type CaseType = keyof typeof CASE_TYPE_LABELS;
export type CasePriority = keyof typeof CASE_PRIORITY_LABELS;
export type CaseStatus = keyof typeof CASE_STATUS_LABELS;
export type Gender = keyof typeof GENDER_LABELS;
export type EmploymentStatus = keyof typeof EMPLOYMENT_STATUS_LABELS;
export type OperatingRulesStatus = keyof typeof OPERATING_RULES_STATUS_LABELS;
export type ApprovalStatus = keyof typeof APPROVAL_STATUS_LABELS;
export type SurveyStatus = keyof typeof SURVEY_STATUS_LABELS;
export type RiskLevel = keyof typeof RISK_LEVEL_LABELS;
export type CourseStatus = keyof typeof COURSE_STATUS_LABELS;
export type CourseModality = keyof typeof COURSE_MODALITY_LABELS;
export type RecognitionType = keyof typeof RECOGNITION_TYPE_LABELS;
export type ComplianceStatus = keyof typeof COMPLIANCE_STATUS_LABELS;
export type EvidenceType = keyof typeof EVIDENCE_TYPE_LABELS;
export type QuestionType = keyof typeof QUESTION_TYPE_LABELS;
export type QuestionCategory = keyof typeof QUESTION_CATEGORY_LABELS;
export type MilestoneStatus = keyof typeof MILESTONE_STATUS_LABELS;
