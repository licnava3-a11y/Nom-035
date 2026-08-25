/**
 * CalendarSkeleton - Skeleton loader para vista de calendario
 * Usado mientras se cargan eventos del calendario
 */

export function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-muted rounded" />
          <div className="h-10 w-10 bg-muted rounded" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Days header */}
        <div className="grid grid-cols-7 bg-muted/30">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day: any) => (
            <div key={day} className="p-2 text-center border-r last:border-r-0">
              <div className="h-4 w-8 bg-muted rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[100px] border-r border-b last:border-r-0 p-2 space-y-1"
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <div className="h-4 w-6 bg-muted rounded" />
              {i % 3 === 0 && (
                <>
                  <div className="h-6 bg-muted rounded" />
                  {i % 5 === 0 && <div className="h-6 bg-muted rounded" />}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming deadlines sidebar skeleton */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="h-6 w-48 bg-muted rounded" />
        {[1, 2, 3].map((i: any) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="h-10 w-10 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
