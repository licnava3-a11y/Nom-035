/**
 * Hook para gestionar permisos del usuario actual
 */

import { trpc } from '@/lib/trpc';

export type Module = 
  | 'employees'
  | 'surveys'
  | 'cases'
  | 'courses'
  | 'reports'
  | 'committee'
  | 'company'
  | 'admin';

export type Action = 'view' | 'create' | 'edit' | 'delete';

export interface Permission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ModulePermissions {
  [module: string]: Permission;
}

/**
 * Hook principal para obtener permisos del usuario actual
 */
export function usePermissions() {
  const { data, isLoading, error } = trpc.roles.getMyPermissions.useQuery();

  return {
    permissions: data?.permissions || {},
    role: data?.role,
    roleDisplayName: data?.roleDisplayName,
    isLoading,
    error,
  };
}

/**
 * Hook para verificar si el usuario tiene un permiso específico
 */
export function useHasPermission(module: Module, action: Action): boolean {
  const { permissions, isLoading } = usePermissions();

  if (isLoading || !permissions[module]) {
    return false;
  }

  const modulePerms = permissions[module];

  switch (action) {
    case 'view':
      return modulePerms.canView;
    case 'create':
      return modulePerms.canCreate;
    case 'edit':
      return modulePerms.canEdit;
    case 'delete':
      return modulePerms.canDelete;
    default:
      return false;
  }
}

/**
 * Hook para verificar si el usuario es admin o director
 */
export function useIsAdmin(): boolean {
  const { role, isLoading } = usePermissions();

  if (isLoading) {
    return false;
  }

  return role === 'admin' || role === 'director';
}
