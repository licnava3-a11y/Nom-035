import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { getLoginUrl } from '@/const';

interface DashboardLayoutSkeletonProps {
  onRetry?: () => void;
}

export function DashboardLayoutSkeleton({ onRetry }: DashboardLayoutSkeletonProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Después de 10 segundos, mostrar pantalla de acción con botón de login
  if (elapsed >= 10) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-5 max-w-sm px-6">
          {/* Logo */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground">Plataforma NOM-035</h2>
            <p className="text-sm text-muted-foreground mt-1">
              El servidor está iniciando. Esto ocurre en el primer acceso del día.
            </p>
          </div>

          {/* Botón principal: Login OAuth */}
          <button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow hover:bg-primary/90 transition-colors"
          >
            Iniciar sesión
          </button>

          {/* Botón secundario: Reintentar sin redirigir */}
          <button
            onClick={() => {
              if (onRetry) {
                onRetry();
              } else {
                window.location.reload();
              }
            }}
            className="w-full py-2.5 px-4 border border-border text-muted-foreground rounded-xl text-sm hover:bg-muted transition-colors"
          >
            Reintentar conexión
          </button>

          <p className="text-xs text-muted-foreground/60">
            Si el problema persiste, intenta recargar la página.
          </p>
        </div>
      </div>
    );
  }

  // Mensaje progresivo según el tiempo transcurrido
  const statusMessage =
    elapsed >= 6 ? 'Iniciando servidor, por favor espera...' :
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
          <Skeleton key="a" className="h-48 rounded-xl" />
          <Skeleton key="b" className="h-48 rounded-xl" />
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
