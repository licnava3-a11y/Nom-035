import React from "react";
import { usePermissions, Permission } from "@/hooks/usePermissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProtectedActionProps {
  children: React.ReactElement;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  fallbackMessage?: string;
  hideIfNoPermission?: boolean;
}

/**
 * ProtectedAction - Componente para proteger enlaces, acciones y elementos no-botón según permisos del usuario
 * 
 * @param children - Elemento hijo a proteger (Link, <a>, div con onClick, etc.)
 * @param requiredPermission - Permiso único requerido
 * @param requiredPermissions - Array de permisos requeridos
 * @param requireAll - Si es true, requiere TODOS los permisos. Si es false, requiere AL MENOS UNO (por defecto false)
 * @param fallbackMessage - Mensaje en tooltip cuando no tiene permisos
 * @param hideIfNoPermission - Si es true, oculta el elemento. Si es false, lo deshabilita (por defecto false)
 * 
 * @example
 * // Ocultar enlace si no tiene permisos
 * <ProtectedAction
 *   requiredPermission="can_create"
 *   fallbackMessage="Solo administradores pueden crear"
 *   hideIfNoPermission
 * >
 *   <Link href="/create">Crear</Link>
 * </ProtectedAction>
 * 
 * @example
 * // Deshabilitar enlace con tooltip si no tiene permisos
 * <ProtectedAction
 *   requiredPermission="can_edit"
 *   fallbackMessage="No tienes permisos para editar"
 * >
 *   <a href="/edit">Editar</a>
 * </ProtectedAction>
 */
export default function ProtectedAction({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallbackMessage = "No tienes permisos para realizar esta acción",
  hideIfNoPermission = false,
}: ProtectedActionProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  // Determinar si tiene permisos
  let hasRequiredPermission = true;

  if (requiredPermission) {
    hasRequiredPermission = hasPermission(requiredPermission);
  } else if (requiredPermissions && requiredPermissions.length > 0) {
    hasRequiredPermission = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
  }

  // Si no tiene permisos y debe ocultarse, no renderizar nada
  if (!hasRequiredPermission && hideIfNoPermission) {
    return null;
  }

  // Si tiene permisos, renderizar el elemento hijo normalmente
  if (hasRequiredPermission) {
    return children;
  }

  // Si no tiene permisos y NO debe ocultarse, deshabilitar y mostrar tooltip
  const childProps = children.props as any;
  const disabledChild = React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    style: {
      ...childProps.style,
      opacity: 0.5,
      cursor: "not-allowed",
      pointerEvents: "auto",
    },
    "aria-disabled": true,
  } as any);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {disabledChild}
        </TooltipTrigger>
        <TooltipContent>
          <p>{fallbackMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
