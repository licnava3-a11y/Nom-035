/**
 * Estados vacíos predefinidos para secciones comunes del sistema
 * Importar y usar directamente en componentes
 */

import { 
  Calendar,
  FileText,
  Users,
  ClipboardList,
  Target,
  BarChart3,
  FileSignature,
  AlertCircle
} from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

interface EmptyStateConfig {
  icon: any;
  title: string;
  description: string;
}

/**
 * Configuraciones de estados vacíos por sección
 */
export const EMPTY_STATES: Record<string, EmptyStateConfig> = {
  // Calendario de Deadlines
  calendar_no_deadlines: {
    icon: Calendar,
    title: 'No hay deadlines programados',
    description: 'Comienza asignando fechas límite a las aprobaciones pendientes para visualizarlas en el calendario y recibir recordatorios automáticos.',
  },

  // Dashboard de Cumplimiento
  compliance_no_data: {
    icon: BarChart3,
    title: 'Sin datos históricos',
    description: 'Aún no hay suficientes datos para generar métricas de cumplimiento. Los datos aparecerán una vez que se completen aprobaciones con deadlines asignados.',
  },

  // Bases de Funcionamiento
  operating_rules_empty: {
    icon: FileText,
    title: 'No hay bases de funcionamiento',
    description: 'Crea la primera base de funcionamiento del comité para establecer las reglas y procedimientos de operación según la NOM-035.',
  },

  // Auditoría de Firmas
  audit_no_records: {
    icon: FileSignature,
    title: 'Sin registros de auditoría',
    description: 'El historial de firmas digitales aparecerá aquí una vez que se realicen aprobaciones de documentos con firma electrónica.',
  },

  // Acuerdos sin Seguimiento
  agreements_no_tracking: {
    icon: Target,
    title: 'No hay acuerdos en seguimiento',
    description: 'Los acuerdos del comité con seguimiento activo aparecerán aquí. Crea un nuevo acuerdo para comenzar a dar seguimiento a compromisos.',
  },

  // Trabajadores
  workers_empty: {
    icon: Users,
    title: 'No hay trabajadores registrados',
    description: 'Registra a los trabajadores de la organización para poder asignarles cuestionarios, dar seguimiento a casos y generar reportes de cumplimiento.',
  },

  // Cuestionarios sin Respuestas
  questionnaires_no_responses: {
    icon: ClipboardList,
    title: 'Sin respuestas registradas',
    description: 'Las respuestas de los cuestionarios NOM-035 aparecerán aquí una vez que los trabajadores completen las evaluaciones asignadas.',
  },

  // Encuestas sin Configuración
  surveys_not_configured: {
    icon: ClipboardList,
    title: 'Encuesta no configurada',
    description: 'Configura los parámetros de la encuesta, define el período de aplicación y selecciona los trabajadores que participarán.',
  },

  // Casos sin Registros
  cases_empty: {
    icon: AlertCircle,
    title: 'No hay casos registrados',
    description: 'Los casos de atención psicosocial aparecerán aquí cuando se identifiquen situaciones que requieran seguimiento según los resultados de las evaluaciones.',
  },

  // Reportes sin Historial
  reports_no_history: {
    icon: FileText,
    title: 'Sin reportes generados',
    description: 'El historial de reportes generados aparecerá aquí. Genera tu primer reporte para comenzar a llevar un registro de las evaluaciones.',
  },
};

/**
 * Hook para obtener configuración de estado vacío
 */
export function useEmptyState(key: keyof typeof EMPTY_STATES) {
  return EMPTY_STATES[key];
}
