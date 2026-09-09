import { Suspense, lazy, type ComponentProps, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import type * as ChartModule from './Charts';

/**
 * Lazy chart boundary.
 *
 * Recharts (plus its d3 dependencies) is ~180 kB gzipped and is not needed for
 * the upload flow or the overview cards, so it loads only when a chart first
 * renders. All charts share one chunk, so the second chart is free.
 *
 * Each chart gets an explicit wrapper rather than a generic higher-order
 * helper: spreading a generic prop bag into a lazy component does not typecheck
 * cleanly, and four small wrappers read better than the workaround.
 */
const load = () => import('./Charts');

const LazyShotDistribution = lazy(() => load().then((m) => ({ default: m.ShotDistributionChart })));
const LazyVelocity = lazy(() => load().then((m) => ({ default: m.VelocityChart })));
const LazyComparison = lazy(() => load().then((m) => ({ default: m.ComparisonChart })));
const LazyStrokeSplit = lazy(() => load().then((m) => ({ default: m.StrokeSplitChart })));

/** Placeholder sized to the real chart, so loading causes no layout shift. */
function ChartBoundary({ height, children }: { height: number; children: ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="w-full rounded-xl" style={{ height }} />}>
      {children}
    </Suspense>
  );
}

export function ShotDistributionChart(
  props: ComponentProps<typeof ChartModule.ShotDistributionChart>,
) {
  return (
    <ChartBoundary height={props.height ?? 280}>
      <LazyShotDistribution {...props} />
    </ChartBoundary>
  );
}

export function VelocityChart(props: ComponentProps<typeof ChartModule.VelocityChart>) {
  return (
    <ChartBoundary height={props.height ?? 300}>
      <LazyVelocity {...props} />
    </ChartBoundary>
  );
}

export function ComparisonChart(props: ComponentProps<typeof ChartModule.ComparisonChart>) {
  return (
    <ChartBoundary height={props.height ?? 320}>
      <LazyComparison {...props} />
    </ChartBoundary>
  );
}

export function StrokeSplitChart(props: ComponentProps<typeof ChartModule.StrokeSplitChart>) {
  return (
    <ChartBoundary height={props.height ?? 220}>
      <LazyStrokeSplit {...props} />
    </ChartBoundary>
  );
}

export type { ComparisonSeries } from './Charts';
