import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, MetricCard, Panel, StatTile } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonCard, SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAnalysisLibrary } from '@/hooks/useAnalysis';
import { analysisService } from '@/api/analysisService';
import { buildMockProfile } from '@/api/mockData';
import { errorMessage } from '@/api/client';
import { SHOT_LABELS, type AnalysisResult, type PlayerProfile } from '@/types';
import { formatDate, formatNumber } from '@/utils/format';

/**
 * Aggregate view across every analysed match for the focus player.
 *
 * The profile is derived client-side from the loaded analyses rather than
 * fetched, so it stays correct as matches are added or deleted.
 */
export function PlayerProfilePage() {
  const navigate = useNavigate();
  const library = useAnalysisLibrary();
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!library.data) return;
    const completed = library.data.filter((item) => item.status === 'complete').slice(0, 12);
    if (completed.length === 0) {
      setResults([]);
      setProfile(null);
      return;
    }

    let cancelled = false;
    Promise.all(completed.map((item) => analysisService.getAnalysis(item.videoId)))
      .then((loaded) => {
        if (cancelled) return;
        setResults(loaded);
        setProfile(buildMockProfile(loaded));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [library.data]);

  if (library.loading || (!results && !error)) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonRows rows={5} />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={() => void library.refresh()} />;

  if (!profile || !results || results.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon="👤"
          title="No player data yet"
          description="Analyse at least one match to build a player profile."
          action={
            <button type="button" onClick={() => navigate('/')} className="btn-primary">
              Go to dashboard
            </button>
          }
        />
      </div>
    );
  }

  const totalShots = results.reduce((sum, r) => sum + r.overview.metrics.totalShots, 0);
  const totalDistance = results.reduce((sum, r) => sum + r.overview.statistics.distanceCoveredMeters, 0);
  const avgFootwork =
    results.reduce((sum, r) => sum + r.pose.footworkRating, 0) / Math.max(1, results.length);
  const avgConsistency =
    results.reduce((sum, r) => sum + r.shots.consistencyScore, 0) / Math.max(1, results.length);
  const peakVelocity = Math.max(...results.map((r) => r.shuttle.peakVelocityKmh));

  return (
    <div className="space-y-5">
      {/* Identity ---------------------------------------------------------- */}
      <Panel bodyClassName="p-6">
        <div className="flex flex-wrap items-center gap-5">
          <span
            aria-hidden
            className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gold-grad text-2xl font-bold text-navy-950"
          >
            {profile.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink-100">{profile.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-400">
              <span>{profile.country}</span>
              <span aria-hidden>·</span>
              <span>World #{profile.worldRank}</span>
              <span aria-hidden>·</span>
              <span>{profile.handedness}-handed</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="gold">{profile.matchesAnalyzed} matches analysed</Badge>
              <Badge>Signature shot: {SHOT_LABELS[profile.signatureShot]}</Badge>
            </div>
          </div>
        </div>
      </Panel>

      {/* Career averages --------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Average accuracy"
          value={profile.averageAccuracy.toFixed(1)}
          unit="%"
          progress={profile.averageAccuracy}
          tone={profile.averageAccuracy >= 80 ? 'positive' : 'gold'}
          caption={`Across ${profile.matchesAnalyzed} analysed matches`}
        />
        <MetricCard
          label="Average coverage"
          value={profile.averageCoverage.toFixed(1)}
          unit="%"
          progress={profile.averageCoverage}
          caption={`${formatNumber(totalDistance)} m covered in total`}
        />
        <MetricCard
          label="Average footwork"
          value={avgFootwork.toFixed(0)}
          unit="/100"
          progress={avgFootwork}
          tone={avgFootwork >= 80 ? 'positive' : 'gold'}
          caption="Mean of the per-match footwork ratings"
        />
        <MetricCard
          label="Peak velocity"
          value={formatNumber(peakVelocity)}
          unit="km/h"
          progress={peakVelocity}
          progressMax={350}
          caption="Fastest shuttle recorded across all matches"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Match log ------------------------------------------------------- */}
        <Panel title="Analysed matches" className="lg:col-span-2" bodyClassName="p-3 sm:p-5">
          <ul className="space-y-2">
            {results.map((result) => (
              <li key={result.videoId}>
                <button
                  type="button"
                  onClick={() => navigate(`/analysis/${result.videoId}`)}
                  className="flex w-full items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3
                             text-left transition-colors hover:border-gold-500/30 hover:bg-white/[0.04]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-100">
                      {result.job.match.title}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {result.job.match.tournament} · {result.job.match.round} ·{' '}
                      {formatDate(result.job.match.playedOn)}
                    </p>
                  </div>
                  <div className="hidden w-28 shrink-0 sm:block">
                    <ProgressBar
                      value={result.overview.metrics.accuracyPercent}
                      size="sm"
                      tone="gold"
                      label="Accuracy"
                      showValue
                    />
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-ink-400">
                    {formatNumber(result.overview.metrics.totalShots)} shots
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Aggregate stats -------------------------------------------------- */}
        <Panel title="Career totals">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Matches" value={profile.matchesAnalyzed} tone="gold" />
            <StatTile label="Total shots" value={formatNumber(totalShots)} />
            <StatTile label="Distance" value={`${formatNumber(totalDistance)} m`} />
            <StatTile label="Avg consistency" value={avgConsistency.toFixed(0)} />
          </div>

          <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-5">
            <ProgressBar label="Average accuracy" value={profile.averageAccuracy} tone="gold" showValue />
            <ProgressBar label="Average coverage" value={profile.averageCoverage} tone="gold" showValue />
            <ProgressBar label="Average footwork" value={avgFootwork} tone="gold" showValue />
            <ProgressBar label="Average consistency" value={avgConsistency} tone="gold" showValue />
          </div>
        </Panel>
      </div>
    </div>
  );
}
