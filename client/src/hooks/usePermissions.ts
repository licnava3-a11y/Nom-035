import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Tipos de permisos granulares del sistema
 */
export type Permission =
  | "can_create" // Crear nuevos registros
  | "can_edit" // Editar registros existentes
  | "can_delete" // Eliminar registros
  | "can_view" // Ver detalles de registros
  | "can_export" // Exportar datos
  | "can_approve"; // Aprobar/rechazar solicitudes

/**
 * Matriz de permisos por rol
 * Define qué permisos tiene cada rol en el sistema
 */
const PERMISSIONS_MATRIX: Record<string, Permission[]> = {
  admin: [
    "can_create",
    "can_edit",
    "can_delete",
    "can_view",
    "can_export",
    "can_approve",
  ],
  user: ["can_view", "can_export"],
  instructor: ["can_create", "can_edit", "can_view", "can_export"],
  committee: ["can_view", "can_approve"],
  administrativo: ["can_view", "can_export", "can_approve"],
  gerente: [
    "can_create",
    "can_edit",
    "can_delete",
    "can_view",
    "can_export",
    "can_approve",
  ],
};

/**
 * Hook para verificar permisos del usuario actual
 *
 * @example
 * const { hasPermission, canCreate, canEdit, canDelete } = usePermissions();
 *
 * if (canCreate) {
 *   return <Button onClick={handleCreate}>Crear</Button>
 * }
 *
 * if (hasPermission('can_approve')) {
 *   return <Button onClick={handleApprove}>Aprobar</Button>
 * }
 */
export function usePermissions() {
  const { user } = useAuth();

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    const userRole = user.role || "user";
    const rolePermissions = PERMISSIONS_MATRIX[userRole] || [];

    return rolePermissions.includes(permission);
  };

  /**
   * Verifica si el usuario tiene TODOS los permisos especificados
   */
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  /**
   * Verifica si el usuario tiene AL MENOS UNO de los permisos especificados
   */
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  /**
   * Verifica si el usuario es administrador
   */
  const isAdmin = (): boolean => {
    return user?.role === "admin";
  };

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isAdmin,
    // Atajos para permisos comunes
    canCreate: hasPermission("can_create"),
    canEdit: hasPermission("can_edit"),
    canDelete: hasPermission("can_delete"),
    canView: hasPermission("can_view"),
    canExport: hasPermission("can_export"),
    canApprove: hasPermission("can_approve"),
  };
}
