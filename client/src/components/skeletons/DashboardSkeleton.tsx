/**
 * DashboardSkeleton - Skeleton loader para dashboard con cards de métricas
 * Usado mientras se cargan datos de procedures tRPC
 */

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-4 w-96 bg-muted rounded" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i: any) => (
          <div key={i} className="border rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded" />
            </div>
            <div className="h-8 w-24 bg-muted rounded" />
            <div className="h-3 w-40 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Chart section skeleton */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded" />
      </div>
    </div>
  );
}

/**
 * MetricsCardsSkeleton - Skeleton para grid de cards de métricas
 * Usado en dashboards que solo muestran cards sin gráficos
 */
export function MetricsCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-8 w-8 bg-muted rounded-full" />
          </div>
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="h-3 w-40 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
