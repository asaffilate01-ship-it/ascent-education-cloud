export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="surface-card p-5">
            <div className="h-3 w-20 bg-muted rounded mb-3" />
            <div className="h-7 w-16 bg-muted rounded mb-2" />
            <div className="h-2.5 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 surface-card p-5">
          <div className="h-4 w-32 bg-muted rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-muted rounded mb-1.5" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="surface-card p-5">
          <div className="h-4 w-28 bg-muted rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="surface-card p-5">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="surface-card p-5 animate-pulse">
      <div className="h-3 w-20 bg-muted rounded mb-3" />
      <div className="h-7 w-16 bg-muted rounded mb-2" />
      <div className="h-2.5 w-24 bg-muted rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="surface-card overflow-hidden animate-pulse">
      <div className="h-10 bg-muted/50" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 border-t border-border/30 flex items-center px-4 gap-4">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="flex-1" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
