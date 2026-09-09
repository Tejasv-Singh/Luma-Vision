import type { CSSProperties } from 'react';
import { cn } from '@/utils/cn';

/** Shimmering placeholder block. */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        'relative overflow-hidden rounded-lg bg-white/[0.045]',
        'after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r',
        'after:from-transparent after:via-white/[0.07] after:to-transparent after:content-[""]',
        className,
      )}
    />
  );
}

/** Card-shaped skeleton matching the metric card footprint. */
export function SkeletonCard() {
  return (
    <div className="panel p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-9 w-32" />
      <Skeleton className="mt-4 h-1.5 w-full" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}

/** Full-tab loading state used while an analysis payload is in flight. */
export function SkeletonTab({ label = 'Loading analysis' }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-5 h-56 w-full" />
        </div>
        <div className="panel space-y-3 p-5">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
