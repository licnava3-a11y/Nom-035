/**
 * AlertError - Componente para mostrar errores contextuales
 * Muestra título, descripción y acción sugerida
 */

import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/lib/errorMessages';

interface AlertErrorProps {
  error: ErrorMessage;
  onAction?: () => void;
  className?: string;
}

export function AlertError({ error, onAction, className }: AlertErrorProps) {
  const Icon = error.severity === 'error' ? XCircle : 
               error.severity === 'warning' ? AlertTriangle : 
               Info;

  const variant = error.severity === 'error' ? 'destructive' : 'default';

  return (
    <Alert variant={variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{error.description}</p>
        {error.action && onAction && (
          <Button 
            variant={error.severity === 'error' ? 'destructive' : 'default'}
            size="sm"
            onClick={onAction}
          >
            {error.action}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * ErrorBoundaryFallback - Componente de fallback para errores no capturados
 */
interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorBoundaryFallback({ error, resetError }: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Alert variant="destructive" className="max-w-2xl">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg">Algo salió mal</AlertTitle>
        <AlertDescription className="mt-3 space-y-3">
          <p>
            Ocurrió un error inesperado al cargar esta página. Tus datos están seguros.
          </p>
          <details className="text-sm opacity-75">
            <summary className="cursor-pointer hover:opacity-100">
              Detalles técnicos
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
          <div className="flex gap-2">
            <Button onClick={resetError} size="sm">
              Reintentar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/'}
            >
              Ir al inicio
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
