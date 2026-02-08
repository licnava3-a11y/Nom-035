/**
 * Componente PermissionGuard
 * Protege rutas y componentes según permisos del usuario
 */

import { ReactNode } from 'react';
import { useHasPermission, Module, Action } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  module: Module;
  action: Action;
  fallback?: ReactNode;
}

export default function PermissionGuard({ children, module, action, fallback }: PermissionGuardProps) {
  const hasPermission = useHasPermission(module, action);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            No tienes permisos para {action === 'view' ? 'ver' : action === 'create' ? 'crear' : action === 'edit' ? 'editar' : 'eliminar'} este módulo.
            Contacta al administrador si necesitas acceso.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
