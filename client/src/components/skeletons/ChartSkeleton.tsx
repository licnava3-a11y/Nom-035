/**
 * ChartSkeleton - Skeleton loader para gráficos de Chart.js
 * Usado mientras se cargan datos para visualizaciones
 */

interface ChartSkeletonProps {
  type?: 'line' | 'bar' | 'pie' | 'doughnut';
  height?: string;
  title?: boolean;
}

export function ChartSkeleton({ 
  type = 'bar', 
  height = 'h-64',
  title = true 
}: ChartSkeletonProps) {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      {title && (
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
      )}
      
      <div className={`${height} flex items-end justify-around gap-2 animate-pulse`}>
        {type === 'bar' && (
          <>
            {[60, 80, 45, 90, 70, 55].map((height, i) => (
              <div 
                key={i}
                className="flex-1 bg-muted rounded-t"
                style={{ 
                  height: `${height}%`,
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </>
        )}
        
        {type === 'line' && (
          <div className="w-full h-full relative">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <path
                d="M 0 150 Q 50 120, 100 130 T 200 110 T 300 140 T 400 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted"
                opacity="0.3"
              />
              <circle cx="0" cy="150" r="4" className="fill-muted" />
              <circle cx="100" cy="130" r="4" className="fill-muted" />
              <circle cx="200" cy="110" r="4" className="fill-muted" />
              <circle cx="300" cy="140" r="4" className="fill-muted" />
              <circle cx="400" cy="100" r="4" className="fill-muted" />
            </svg>
          </div>
        )}
        
        {(type === 'pie' || type === 'doughnut') && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative">
              <div className="w-40 h-40 rounded-full bg-muted" />
              {type === 'doughnut' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-background" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Legend skeleton */}
      <div className="flex flex-wrap gap-4 justify-center">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse">
            <div className="w-4 h-4 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * DashboardChartsSkeleton - Skeleton para dashboard con múltiples gráficos
 */
export function DashboardChartsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton type="line" />
        <ChartSkeleton type="bar" />
      </div>
      <ChartSkeleton type="bar" height="h-80" />
    </div>
  );
}
