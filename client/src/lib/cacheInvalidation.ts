/**
 * Helper de Invalidación Inteligente de Caché para tRPC
 * 
 * Este módulo proporciona funciones reutilizables para invalidar el caché de queries tRPC
 * de manera inteligente, reduciendo llamadas innecesarias al servidor.
 */

import { trpc } from "./trpc";

/**
 * Configuración de niveles de caché según tipo de dato
 */
export const CACHE_CONFIG = {
  // Datos muy dinámicos (actualización constante)
  DYNAMIC: {
    staleTime: 0, // Siempre refetch
    gcTime: 1 * 60 * 1000, // 1 minuto en cache
  },
  // Datos semi-estáticos (actualización frecuente)
  SEMI_STATIC: {
    staleTime: 2 * 60 * 1000, // 2 minutos frescos
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  },
  // Datos estáticos (actualización ocasional)
  STATIC: {
    staleTime: 15 * 60 * 1000, // 15 minutos frescos
    gcTime: 30 * 60 * 1000, // 30 minutos en cache
  },
  // Datos muy estáticos (actualización rara)
  VERY_STATIC: {
    staleTime: 60 * 60 * 1000, // 1 hora frescos
    gcTime: 2 * 60 * 60 * 1000, // 2 horas en cache
  },
} as const;

/**
 * Invalida caché de queries relacionadas con casos
 */
export function invalidateCasesCache() {
  const utils = trpc.useUtils();
  
  // Invalidar queries de casos
  utils.casesManagement.listCases.invalidate();
  utils.casesPaginated.list.invalidate();
  utils.casesManagement.getCaseById.invalidate();
  utils.casesManagement.getCaseMetrics.invalidate();
  
  // Invalidar dashboard que depende de casos
  utils.dashboard.getCasesOverview.invalidate();
  utils.executiveDashboard.getAll.invalidate();
}

/**
 * Invalida caché de queries relacionadas con usuarios
 */
export function invalidateUsersCache() {
  const utils = trpc.useUtils();
  
  // Invalidar queries de usuarios
  utils.usersPaginated.list.invalidate();
  utils.rolesPermissions.listUsers.invalidate();
  utils.employees.list.invalidate();
  
  // Invalidar dashboard que depende de usuarios
  utils.dashboard.getUsersOverview.invalidate();
}

/**
 * Invalida caché de queries relacionadas con encuestas
 */
export function invalidateSurveysCache() {
  const utils = trpc.useUtils();
  
  // Invalidar queries de encuestas
  utils.surveysPaginated.list.invalidate();
  utils.surveys.list.invalidate();
  utils.surveys.getById.invalidate();
  
  // Invalidar resultados de encuestas
  utils.surveyResults.list.invalidate();
  utils.predictiveAnalytics.getRiskPredictions.invalidate();
}

/**
 * Invalida caché de queries relacionadas con comité
 */
export function invalidateCommitteeCache() {
  const utils = trpc.useUtils();
  
  // Invalidar queries de comité
  utils.committeeMinutes.list.invalidate();
  utils.committeeMinutes.getById.invalidate();
  utils.committeeMembers.list.invalidate();
}

/**
 * Invalida caché de queries relacionadas con cumplimiento
 */
export function invalidateComplianceCache() {
  const utils = trpc.useUtils();
  
  // Invalidar queries de cumplimiento
  utils.complianceNOM035.getComplianceByNumeral.invalidate();
  utils.complianceNOM035.getGlobalStats.invalidate();
  utils.evidencesFolder.getEvidences.invalidate();
}

/**
 * Invalida caché de queries relacionadas con reportes
 */
export function invalidateReportsCache() {
  const utils = trpc.useUtils();
  
  // Invalidar queries de reportes
  utils.reports.generateCasesPDF.invalidate();
  utils.reports.generateCompliancePDF.invalidate();
}

/**
 * Invalida todo el caché (usar con precaución)
 */
export function invalidateAllCache() {
  const utils = trpc.useUtils();
  utils.invalidate();
}

/**
 * Hook personalizado para invalidación optimista
 * 
 * Ejemplo de uso:
 * ```tsx
 * const { invalidateOnSuccess } = useOptimisticInvalidation();
 * 
 * const createCase = trpc.casesManagement.create.useMutation({
 *   onSuccess: invalidateOnSuccess(invalidateCasesCache)
 * });
 * ```
 */
export function useOptimisticInvalidation() {
  return {
    invalidateOnSuccess: (invalidateFn: () => void) => {
      return () => {
        // Esperar un tick para que la mutación se complete
        setTimeout(invalidateFn, 0);
      };
    },
  };
}
