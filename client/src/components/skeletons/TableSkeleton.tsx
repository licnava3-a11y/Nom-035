/**
 * TableSkeleton - Skeleton loader para tablas de datos
 * Usado mientras se cargan listas de registros
 */

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function TableSkeleton({ 
  rows = 10, 
  columns = 5,
  showHeader = true 
}: TableSkeletonProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          {showHeader && (
            <thead className="bg-muted/50">
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="p-4">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="p-4">
                    <div 
                      className="h-4 bg-muted rounded animate-pulse" 
                      style={{ 
                        width: colIndex === 0 ? '80%' : '60%',
                        animationDelay: `${(rowIndex * 50 + colIndex * 20)}ms`
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * ListSkeleton - Skeleton para listas con cards (no tablas)
 * Usado en vistas de lista con diseño de cards
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div 
          key={i} 
          className="border rounded-lg p-4 space-y-3 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </div>
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
