/**
 * Sistema de Mensajes de Error Contextuales
 * Proporciona mensajes descriptivos con causa, impacto y acción sugerida
 */

export interface ErrorMessage {
  title: string;
  description: string;
  action?: string;
  severity: "error" | "warning" | "info";
}

/**
 * Mapeo de códigos de error a mensajes contextuales
 */
export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // Errores de Red
  NETWORK_TIMEOUT: {
    title: "Tiempo de espera agotado",
    description:
      "El servidor tardó demasiado en responder. Verifica tu conexión a internet e intenta nuevamente.",
    action: "Reintentar",
    severity: "warning",
  },
  NETWORK_ERROR: {
    title: "Error de conexión",
    description:
      "No se pudo establecer conexión con el servidor. Verifica tu conexión a internet.",
    action: "Verificar conexión",
    severity: "error",
  },
  SERVER_UNAVAILABLE: {
    title: "Servidor no disponible",
    description:
      "El servidor está temporalmente fuera de servicio. Por favor intenta más tarde.",
    action: "Intentar más tarde",
    severity: "error",
  },

  // Errores de Validación
  VALIDATION_REQUIRED_FIELD: {
    title: "Campos requeridos faltantes",
    description:
      "Por favor completa todos los campos marcados con asterisco (*) antes de continuar.",
    action: "Revisar formulario",
    severity: "warning",
  },
  VALIDATION_INVALID_FORMAT: {
    title: "Formato inválido",
    description:
      "Uno o más campos no tienen el formato correcto. Revisa los campos marcados en rojo.",
    action: "Corregir formato",
    severity: "warning",
  },
  VALIDATION_DUPLICATE: {
    title: "Registro duplicado",
    description:
      "Ya existe un registro con estos datos. Por favor verifica la información ingresada.",
    action: "Verificar datos",
    severity: "warning",
  },
  VALIDATION_INVALID_EMAIL: {
    title: "Correo electrónico inválido",
    description:
      "El formato del correo electrónico no es válido. Ejemplo: usuario@ejemplo.com",
    action: "Corregir email",
    severity: "warning",
  },
  VALIDATION_INVALID_DATE: {
    title: "Fecha inválida",
    description:
      "La fecha ingresada no es válida o está fuera del rango permitido.",
    action: "Corregir fecha",
    severity: "warning",
  },

  // Errores de Permisos
  UNAUTHORIZED: {
    title: "Sin autorización",
    description:
      "No tienes permisos para realizar esta acción. Contacta al administrador si necesitas acceso.",
    action: "Contactar administrador",
    severity: "error",
  },
  SESSION_EXPIRED: {
    title: "Sesión expirada",
    description:
      "Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.",
    action: "Iniciar sesión",
    severity: "warning",
  },
  FORBIDDEN: {
    title: "Acceso denegado",
    description:
      "No tienes los permisos necesarios para acceder a este recurso.",
    action: "Volver atrás",
    severity: "error",
  },

  // Errores de Negocio
  BUSINESS_RULE_VIOLATION: {
    title: "Regla de negocio violada",
    description:
      "La operación no se puede completar porque viola una regla del sistema.",
    action: "Revisar datos",
    severity: "error",
  },
  INCONSISTENT_STATE: {
    title: "Estado inconsistente",
    description:
      "El estado actual del registro no permite esta operación. Por favor recarga la página.",
    action: "Recargar página",
    severity: "warning",
  },
  DEADLINE_EXPIRED: {
    title: "Fecha límite vencida",
    description:
      "No se puede realizar esta acción porque la fecha límite ha expirado.",
    action: "Contactar responsable",
    severity: "error",
  },
  APPROVAL_ALREADY_EXISTS: {
    title: "Aprobación ya solicitada",
    description:
      "Ya existe una solicitud de aprobación pendiente para este documento.",
    action: "Ver aprobaciones",
    severity: "warning",
  },
  DOCUMENT_ALREADY_APPROVED: {
    title: "Documento ya aprobado",
    description: "Este documento ya fue aprobado y no puede ser modificado.",
    action: "Ver historial",
    severity: "info",
  },
  CANNOT_DELETE_ACTIVE: {
    title: "No se puede eliminar",
    description:
      "No se pueden eliminar registros activos. Primero debes desactivarlos o archivarlos.",
    action: "Desactivar primero",
    severity: "warning",
  },

  // Errores de Datos
  NOT_FOUND: {
    title: "Registro no encontrado",
    description: "El registro que buscas no existe o fue eliminado.",
    action: "Volver al listado",
    severity: "warning",
  },
  DATABASE_ERROR: {
    title: "Error de base de datos",
    description:
      "Ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente.",
    action: "Reintentar",
    severity: "error",
  },
  FILE_TOO_LARGE: {
    title: "Archivo demasiado grande",
    description:
      "El archivo excede el tamaño máximo permitido de 10MB. Por favor selecciona un archivo más pequeño.",
    action: "Seleccionar otro archivo",
    severity: "warning",
  },
  INVALID_FILE_TYPE: {
    title: "Tipo de archivo no permitido",
    description:
      "El tipo de archivo seleccionado no está permitido. Solo se aceptan: PDF, DOCX, XLSX, PNG, JPG.",
    action: "Seleccionar archivo válido",
    severity: "warning",
  },

  // Error genérico
  UNKNOWN_ERROR: {
    title: "Error inesperado",
    description:
      "Ocurrió un error inesperado. Por favor intenta nuevamente o contacta al soporte técnico.",
    action: "Reintentar",
    severity: "error",
  },
};

/**
 * Obtiene un mensaje de error contextual basado en el código de error
 * @param errorCode - Código de error del servidor o cliente
 * @param defaultMessage - Mensaje por defecto si no se encuentra el código
 * @returns Mensaje de error estructurado
 */
export function getErrorMessage(
  errorCode: string,
  defaultMessage?: string
): ErrorMessage {
  // Buscar mensaje específico
  if (ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  // Intentar extraer código de mensaje de error de tRPC
  const match = errorCode.match(/\[([A-Z_]+)\]/);
  if (match && ERROR_MESSAGES[match[1]]) {
    return ERROR_MESSAGES[match[1]];
  }

  // Mensaje genérico
  return {
    title: "Error",
    description: defaultMessage || errorCode || "Ocurrió un error inesperado.",
    action: "Reintentar",
    severity: "error",
  };
}

/**
 * Convierte un error de tRPC a un mensaje contextual
 * @param error - Error de tRPC
 * @returns Mensaje de error estructurado
 */
export function parseTRPCError(error: any): ErrorMessage {
  // Extraer código de error de tRPC
  const code = error?.data?.code || error?.code;

  // Mapear códigos de tRPC a nuestros códigos
  const codeMap: Record<string, string> = {
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    TIMEOUT: "NETWORK_TIMEOUT",
    BAD_REQUEST: "VALIDATION_REQUIRED_FIELD",
    INTERNAL_SERVER_ERROR: "DATABASE_ERROR",
  };

  const mappedCode = codeMap[code] || "UNKNOWN_ERROR";

  // Intentar extraer mensaje personalizado del servidor
  const serverMessage = error?.message;
  if (serverMessage && ERROR_MESSAGES[serverMessage]) {
    return ERROR_MESSAGES[serverMessage];
  }

  return getErrorMessage(mappedCode, serverMessage);
}
