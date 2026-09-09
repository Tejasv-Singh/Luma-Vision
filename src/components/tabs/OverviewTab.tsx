import { Badge, MetricCard, Panel, StatTile } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDurationLong, formatNumber, formatBytes, formatDate } from '@/utils/format';
import type { AnalysisResult } from '@/types';

/**
 * Tab 1 — the at-a-glance read on the match: four headline metrics, the full
 * statistics grid, a generated performance summary and the video metadata.
 */
export function OverviewTab({ analysis }: { analysis: AnalysisResult }) {
  const { metrics, statistics, summary, highlights } = analysis.overview;
  const { video, match } = analysis.job;

  const pointTotal = statistics.pointsWon + statistics.pointsLost;
  const winRate = pointTotal > 0 ? (statistics.pointsWon / pointTotal) * 100 : 0;
  const errorTotal = statistics.unforcedErrors + statistics.forcedErrors;

  return (
    <div className="space-y-5">
      {/* Headline metrics ------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total shots"
          value={formatNumber(metrics.totalShots)}
          progress={metrics.totalShots}
          progressMax={1200}
          caption={`Across ${formatNumber(metrics.totalRallies)} rallies`}
          hint="Every stroke the classifier detected for the focus player, including serves and returns."
          icon={<GlyphShuttle />}
        />
        <MetricCard
          label="Avg rally duration"
          value={metrics.averageRallyDurationSeconds.toFixed(1)}
          unit="s"
          progress={metrics.averageRallyDurationSeconds}
          progressMax={15}
          caption={`Longest rally ${metrics.longestRallySeconds.toFixed(1)}s`}
          hint="Mean time between the serve and the point ending. Elite singles rallies typically run 5-9 seconds."
          icon={<GlyphClock />}
        />
        <MetricCard
          label="Court coverage"
          value={metrics.courtCoveragePercent.toFixed(1)}
          unit="%"
          progress={metrics.courtCoveragePercent}
          tone={metrics.courtCoveragePercent >= 75 ? 'positive' : 'gold'}
          caption={`${formatNumber(statistics.distanceCoveredMeters)} m covered`}
          hint="Share of the 16 court zones the player occupied for a meaningful dwell time. Higher means the whole court was defended."
          icon={<GlyphCourt />}
        />
        <MetricCard
          label="Shot accuracy"
          value={metrics.accuracyPercent.toFixed(1)}
          unit="%"
          progress={metrics.accuracyPercent}
          tone={metrics.accuracyPercent >= 80 ? 'positive' : metrics.accuracyPercent >= 70 ? 'gold' : 'caution'}
          caption={`${formatNumber(statistics.winningShots)} winning shots`}
          hint="Shots that landed in play and achieved their intended target zone, as judged by the shot classifier."
          icon={<GlyphTarget />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Statistics grid ------------------------------------------------ */}
        <Panel
          title="Match statistics"
          subtitle={match.scoreline}
          className="lg:col-span-2"
          actions={
            <Badge tone={winRate >= 50 ? 'positive' : 'neutral'}>
              {winRate.toFixed(0)}% points won
            </Badge>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <StatTile label="Points won" value={statistics.pointsWon} tone="positive" />
            <StatTile label="Points lost" value={statistics.pointsLost} />
            <StatTile
              label="Unforced errors"
              value={statistics.unforcedErrors}
              tone="negative"
              hint="Errors made with no pressure from the opponent — the clearest coaching signal in this grid."
            />
            <StatTile label="Forced errors" value={statistics.forcedErrors} />
            <StatTile label="Winning shots" value={statistics.winningShots} tone="gold" />
            <StatTile
              label="Recovery shots"
              value={statistics.recoveryShots}
              hint="Defensive returns played from a stretched or off-balance position."
            />
            <StatTile label="Net kills" value={statistics.netKills} tone="gold" />
            <StatTile label="Faults" value={statistics.faults} />
            <StatTile label="Longest streak" value={statistics.longestStreak} />
            <StatTile
              label="Distance"
              value={`${formatNumber(statistics.distanceCoveredMeters)} m`}
            />
            <StatTile label="Rallies" value={formatNumber(metrics.totalRallies)} />
            <StatTile
              label="Active play"
              value={formatDurationLong(metrics.activePlaySeconds)}
              hint="Time the shuttle was actually in play, excluding breaks between rallies."
            />
          </div>

          <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-5">
            <ProgressBar
              label="Points won vs lost"
              value={statistics.pointsWon}
              max={Math.max(1, pointTotal)}
              tone={winRate >= 50 ? 'positive' : 'caution'}
              showValue
            />
            <ProgressBar
              label="Winning shots vs errors"
              value={statistics.winningShots}
              max={Math.max(1, statistics.winningShots + errorTotal)}
              tone="gold"
              showValue
            />
            <ProgressBar
              label="Active play vs match duration"
              value={metrics.activePlaySeconds}
              max={Math.max(1, metrics.matchDurationSeconds)}
              tone="neutral"
              showValue
            />
          </div>
        </Panel>

        {/* Summary + metadata --------------------------------------------- */}
        <div className="space-y-5">
          <Panel title="Performance summary" hint="Generated from the aggregated module outputs.">
            <p className="text-sm leading-relaxed text-ink-300">{summary}</p>
            <ul className="mt-4 space-y-2">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 text-xs text-ink-300">
                  <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                  <span className="leading-relaxed">{highlight}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Video & match metadata">
            <dl className="space-y-2.5 text-sm">
              <MetaRow label="Match" value={match.title} />
              <MetaRow label="Tournament" value={`${match.tournament} · ${match.round}`} />
              <MetaRow label="Played" value={formatDate(match.playedOn)} />
              <MetaRow label="File" value={video.filename} mono />
              <MetaRow label="Duration" value={formatDurationLong(video.durationSeconds)} mono />
              <MetaRow label="Resolution" value={`${video.width} × ${video.height}`} mono />
              <MetaRow label="Frame rate" value={`${video.fps} fps`} mono />
              <MetaRow label="Codec" value={video.codec} mono />
              <MetaRow label="Size" value={formatBytes(video.sizeBytes)} mono />
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
      <dt className="shrink-0 text-xs text-ink-400">{label}</dt>
      <dd
        className={`min-w-0 truncate text-right text-xs text-ink-200 ${mono ? 'font-mono tabular-nums' : 'font-medium'}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

/* Inline glyphs keep the icon set dependency-free. */
function GlyphShuttle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="11" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 8.6L4.6 2.5M8 8.6l3.4-6.1M8 8.6V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GlyphClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.6V8l2.4 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GlyphCourt() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="2" width="11" height="12" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 8h11M8 2v12" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}

function GlyphTarget() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}
