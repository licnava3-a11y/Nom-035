import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermissions, Permission } from "@/hooks/usePermissions";
import { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

interface ProtectedButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean; // Si es true, requiere TODOS los permisos. Si es false, requiere AL MENOS UNO
  fallbackMessage?: string;
  hideIfNoPermission?: boolean; // Si es true, oculta el botón. Si es false, lo deshabilita
}

/**
 * Botón protegido que verifica permisos antes de mostrarse o habilitarse
 *
 * @param requiredPermission - Permiso único requerido
 * @param requiredPermissions - Array de permisos requeridos
 * @param requireAll - Si es true, requiere TODOS los permisos. Si es false, requiere AL MENOS UNO (por defecto false)
 * @param fallbackMessage - Mensaje a mostrar en tooltip cuando no tiene permisos
 * @param hideIfNoPermission - Si es true, oculta el botón. Si es false, lo deshabilita (por defecto false)
 *
 * @example
 * // Botón que requiere permiso de crear
 * <ProtectedButton requiredPermission="can_create" onClick={handleCreate}>
 *   Crear Nuevo
 * </ProtectedButton>
 *
 * @example
 * // Botón que requiere permiso de editar o eliminar (al menos uno)
 * <ProtectedButton
 *   requiredPermissions={["can_edit", "can_delete"]}
 *   onClick={handleAction}
 * >
 *   Modificar
 * </ProtectedButton>
 *
 * @example
 * // Botón que se oculta si no tiene permisos
 * <ProtectedButton
 *   requiredPermission="can_delete"
 *   hideIfNoPermission
 *   onClick={handleDelete}
 * >
 *   Eliminar
 * </ProtectedButton>
 */
export default function ProtectedButton({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallbackMessage = "No tienes permisos para realizar esta acción",
  hideIfNoPermission = false,
  ...buttonProps
}: ProtectedButtonProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } =
    usePermissions();

  // Determinar si el usuario tiene los permisos necesarios
  let hasRequiredPermissions = true;

  if (requiredPermission) {
    hasRequiredPermissions = hasPermission(requiredPermission);
  } else if (requiredPermissions && requiredPermissions.length > 0) {
    hasRequiredPermissions = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
  }

  // Si no tiene permisos y debe ocultarse, no renderizar nada
  if (!hasRequiredPermissions && hideIfNoPermission) {
    return null;
  }

  // Si no tiene permisos, mostrar botón deshabilitado con tooltip
  if (!hasRequiredPermissions) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button {...buttonProps} disabled>
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{fallbackMessage}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Si tiene permisos, mostrar botón normal
  return <Button {...buttonProps}>{children}</Button>;
}
