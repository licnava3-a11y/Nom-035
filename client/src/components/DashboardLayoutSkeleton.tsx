import { Skeleton } from './ui/skeleton';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

interface DashboardLayoutSkeletonProps {
  onRetry?: () => void;
}

export function DashboardLayoutSkeleton({ onRetry }: DashboardLayoutSkeletonProps) {
  const [elapsed, setElapsed] = useState(0);
  const utils = trpc.useUtils();

  // Incrementar el contador cada segundo para mostrar mensajes progresivos
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    // Invalidar la cache de auth.me para forzar un nuevo fetch
    utils.auth.me.invalidate();
    if (onRetry) onRetry();
    else window.location.reload();
  };

  // Después de 8 segundos, mostrar pantalla de reintento
  if (elapsed >= 8) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="w-16 h-16 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Iniciando sesión...</h2>
          <p className="text-sm text-muted-foreground">
            El servidor está iniciando. Esto puede tardar unos segundos en el primer acceso del día.
          </p>
          <button
            onClick={handleRetry}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Reintentar conexión
          </button>
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            className="w-full py-2 px-4 border border-border text-muted-foreground rounded-lg text-sm hover:bg-muted transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Mensaje progresivo según el tiempo transcurrido
  const statusMessage =
    elapsed >= 5 ? 'Iniciando servidor, por favor espera...' :
    elapsed >= 3 ? 'Verificando sesión...' :
    'Cargando...';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="w-[280px] border-r border-border bg-background p-4 space-y-6 flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2 px-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        {/* Mensaje de estado */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">{statusMessage}</span>
        </div>
      </div>
    </div>
  );
}
