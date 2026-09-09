import { useEffect, useMemo, useState } from 'react';
import { Badge, Panel, StatTile } from '@/components/ui/Card';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ComparisonChart, type ComparisonSeries } from '@/components/charts';
import { useAnalysisLibrary } from '@/hooks/useAnalysis';
import { analysisService } from '@/api/analysisService';
import { errorMessage } from '@/api/client';
import { seriesColor } from '@/utils/viz';
import { formatDate, formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { AnalysisResult } from '@/types';

/** Comparing more than three at once makes the grouped bars unreadable. */
const MAX_SELECTION = 3;

interface MetricRow {
  key: string;
  label: string;
  /** Formatted for the table; the chart uses the raw number. */
  format: (value: number) => string;
  value: (result: AnalysisResult) => number;
  /** Whether a higher number is the better outcome. */
  higherIsBetter: boolean;
  /** Included in the normalised chart (all metrics are 0-100 there). */
  inChart?: boolean;
}

const METRICS: MetricRow[] = [
  { key: 'accuracy', label: 'Accuracy %', format: (v) => `${v.toFixed(1)}%`, value: (r) => r.overview.metrics.accuracyPercent, higherIsBetter: true, inChart: true },
  { key: 'coverage', label: 'Coverage %', format: (v) => `${v.toFixed(1)}%`, value: (r) => r.overview.metrics.courtCoveragePercent, higherIsBetter: true, inChart: true },
  { key: 'consistency', label: 'Consistency', format: (v) => `${v.toFixed(0)}/100`, value: (r) => r.shots.consistencyScore, higherIsBetter: true, inChart: true },
  { key: 'footwork', label: 'Footwork', format: (v) => `${v.toFixed(0)}/100`, value: (r) => r.pose.footworkRating, higherIsBetter: true, inChart: true },
  { key: 'landing', label: 'Landing acc. %', format: (v) => `${v.toFixed(1)}%`, value: (r) => r.shuttle.landingAccuracyPercent, higherIsBetter: true, inChart: true },
  { key: 'shots', label: 'Total shots', format: (v) => formatNumber(v), value: (r) => r.overview.metrics.totalShots, higherIsBetter: true },
  { key: 'rallies', label: 'Rallies', format: (v) => formatNumber(v), value: (r) => r.overview.metrics.totalRallies, higherIsBetter: true },
  { key: 'rally', label: 'Avg rally (s)', format: (v) => `${v.toFixed(1)}s`, value: (r) => r.overview.metrics.averageRallyDurationSeconds, higherIsBetter: true },
  { key: 'winners', label: 'Winning shots', format: (v) => formatNumber(v), value: (r) => r.overview.statistics.winningShots, higherIsBetter: true },
  { key: 'errors', label: 'Unforced errors', format: (v) => formatNumber(v), value: (r) => r.overview.statistics.unforcedErrors, higherIsBetter: false },
  { key: 'peak', label: 'Peak velocity', format: (v) => `${formatNumber(v)} km/h`, value: (r) => r.shuttle.peakVelocityKmh, higherIsBetter: true },
  { key: 'reaction', label: 'Avg reaction', format: (v) => `${formatNumber(v)} ms`, value: (r) => r.pose.averageReactionMs, higherIsBetter: false },
  { key: 'distance', label: 'Distance', format: (v) => `${formatNumber(v)} m`, value: (r) => r.overview.statistics.distanceCoveredMeters, higherIsBetter: true },
];

/** Side-by-side comparison of up to three saved analyses. */
export function ComparePage() {
  const library = useAnalysisLibrary();
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preselect the two most recent completed analyses so the page is useful
  // immediately rather than starting empty.
  useEffect(() => {
    if (selected.length > 0 || !library.data) return;
    const recent = library.data.filter((item) => item.status === 'complete').slice(0, 2);
    if (recent.length > 0) setSelected(recent.map((item) => item.videoId));
  }, [library.data, selected.length]);

  useEffect(() => {
    if (selected.length === 0) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(selected.map((id) => analysisService.getAnalysis(id)))
      .then((loaded) => {
        if (!cancelled) setResults(loaded);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const toggle = (videoId: string) => {
    setSelected((current) => {
      if (current.includes(videoId)) return current.filter((id) => id !== videoId);
      if (current.length >= MAX_SELECTION) return current;
      return [...current, videoId];
    });
  };

  const series: ComparisonSeries[] = useMemo(
    () => results.map((result) => ({ id: result.videoId, label: result.job.match.title })),
    [results],
  );

  const chartData = useMemo(
    () =>
      METRICS.filter((metric) => metric.inChart).map((metric) => {
        const row: { metric: string; [key: string]: string | number } = { metric: metric.label };
        for (const result of results) row[result.videoId] = Number(metric.value(result).toFixed(1));
        return row;
      }),
    [results],
  );

  /** Index of the best result per metric, for the winner highlight. */
  const bestIndex = (metric: MetricRow): number => {
    if (results.length < 2) return -1;
    let best = 0;
    for (let i = 1; i < results.length; i += 1) {
      const candidate = metric.value(results[i]!);
      const incumbent = metric.value(results[best]!);
      if (metric.higherIsBetter ? candidate > incumbent : candidate < incumbent) best = i;
    }
    return best;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-100">Compare matches</h1>
        <p className="mt-1 text-sm text-ink-400">
          Select up to {MAX_SELECTION} analyses to see their metrics side by side.
        </p>
      </div>

      {/* Selector ---------------------------------------------------------- */}
      <Panel
        title="Select analyses"
        subtitle={`${selected.length} of ${MAX_SELECTION} selected`}
        actions={
          selected.length > 0 && (
            <button type="button" onClick={() => setSelected([])} className="btn-ghost !py-1.5 text-xs">
              Clear
            </button>
          )
        }
      >
        {library.loading && <SkeletonRows rows={3} />}
        {library.error && <ErrorState message={library.error} onRetry={() => void library.refresh()} />}

        {library.data && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {library.data.map((item) => {
              const index = selected.indexOf(item.videoId);
              const isSelected = index >= 0;
              const atLimit = !isSelected && selected.length >= MAX_SELECTION;
              return (
                <button
                  key={item.videoId}
                  type="button"
                  onClick={() => toggle(item.videoId)}
                  disabled={atLimit}
                  aria-pressed={isSelected}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60',
                    isSelected
                      ? 'border-gold-500/50 bg-white/[0.05]'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15',
                    atLimit && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {isSelected && (
                      <span
                        aria-hidden
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: seriesColor(index) }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-100">{item.title}</p>
                      <p className="truncate text-xs text-ink-400">{item.tournament}</p>
                    </div>
                  </div>
                  <p className="mt-2 font-mono text-[11px] tabular-nums text-ink-400">
                    {item.accuracyPercent.toFixed(0)}% acc · {item.totalShots} shots ·{' '}
                    {formatDate(item.playedOn)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {loading && <SkeletonRows rows={5} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && results.length === 0 && (
        <div className="panel">
          <EmptyState
            icon="⚖️"
            title="Nothing selected yet"
            description="Pick at least one saved analysis above to start comparing."
          />
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <>
          {/* Headline cards ------------------------------------------------ */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((result, index) => (
              <Panel
                key={result.videoId}
                title={
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: seriesColor(index) }}
                    />
                    {result.job.match.title}
                  </span>
                }
                subtitle={`${result.job.match.tournament} · ${formatDate(result.job.match.playedOn)}`}
              >
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Accuracy" value={`${result.overview.metrics.accuracyPercent.toFixed(1)}%`} tone="gold" />
                  <StatTile label="Coverage" value={`${result.overview.metrics.courtCoveragePercent.toFixed(1)}%`} />
                  <StatTile label="Shots" value={formatNumber(result.overview.metrics.totalShots)} />
                  <StatTile label="Consistency" value={`${result.shots.consistencyScore}`} />
                </div>
              </Panel>
            ))}
          </div>

          {results.length >= 2 && (
            <Panel
              title="Normalised metrics"
              subtitle="All measures on a shared 0-100 scale so one axis is enough"
              hint="Only comparable 0-100 measures are charted. Raw counts and times live in the table below, where mixing scales is safe."
            >
              <ComparisonChart metrics={chartData} series={series} />
            </Panel>
          )}

          {/* Metric table -------------------------------------------------- */}
          <Panel title="Metric by metric" bodyClassName="p-3 sm:p-5">
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      Metric
                    </th>
                    {results.map((result, index) => (
                      <th
                        key={result.videoId}
                        scope="col"
                        className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-400"
                      >
                        <span className="flex items-center justify-end gap-1.5">
                          <span
                            aria-hidden
                            className="h-2 w-2 rounded-full"
                            style={{ background: seriesColor(index) }}
                          />
                          <span className="max-w-[10rem] truncate">{result.job.match.title}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((metric) => {
                    const best = bestIndex(metric);
                    return (
                      <tr key={metric.key} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                        <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink-200">
                          {metric.label}
                          {!metric.higherIsBetter && (
                            <span className="ml-1.5 text-[10px] text-ink-500">(lower is better)</span>
                          )}
                        </th>
                        {results.map((result, index) => (
                          <td
                            key={result.videoId}
                            className={cn(
                              'px-3 py-2.5 text-right font-mono tabular-nums',
                              index === best ? 'font-semibold text-gold-500' : 'text-ink-200',
                            )}
                          >
                            {metric.format(metric.value(result))}
                            {index === best && (
                              <span className="ml-1.5 text-[10px] uppercase tracking-wider">best</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {results.length < 2 && (
              <Badge className="mt-4">Select a second analysis to see the winner highlights</Badge>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
