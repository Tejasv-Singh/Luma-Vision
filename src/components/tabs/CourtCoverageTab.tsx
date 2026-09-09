import { useMemo, useState } from 'react';
import { Panel, StatTile } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Collapsible } from '@/components/ui/Collapsible';
import { HEAT_RAMP, heatColor } from '@/utils/viz';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { CourtCoverage, CourtZone } from '@/types';

/**
 * Tab 3 — where the player actually spent the match.
 *
 * The heatmap is a 4x4 grid of court zones coloured by dwell share using a
 * validated single-hue ordinal ramp (magnitude, so one hue light→dark — never a
 * rainbow). A scale legend accompanies it, and the same numbers are repeated in
 * the zone table so the reading never depends on colour alone.
 */
export function CourtCoverageTab({ coverage }: { coverage: CourtCoverage }) {
  const [activeZone, setActiveZone] = useState<CourtZone | null>(null);
  const [showTrajectory, setShowTrajectory] = useState(true);

  const maxUsage = useMemo(
    () => Math.max(...coverage.zones.map((zone) => zone.usagePercent), 0.001),
    [coverage.zones],
  );

  const columns: Column<CourtZone>[] = [
    {
      key: 'label',
      header: 'Zone',
      render: (row) => (
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: heatColor(row.usagePercent / maxUsage) }}
          />
          <span className="font-medium text-ink-100">{row.label}</span>
        </span>
      ),
      sortValue: (row) => row.label,
    },
    {
      key: 'usage',
      header: 'Usage',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-mono tabular-nums">{row.usagePercent.toFixed(1)}%</span>
          <ProgressBar className="w-14" value={row.usagePercent} max={maxUsage} size="sm" tone="gold" />
        </div>
      ),
      sortValue: (row) => row.usagePercent,
    },
    {
      key: 'visits',
      header: 'Visits',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="font-mono tabular-nums">{formatNumber(row.visits)}</span>,
      sortValue: (row) => row.visits,
    },
    {
      key: 'dwell',
      header: 'Avg dwell',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono tabular-nums text-ink-300">{row.averageDwellSeconds.toFixed(1)}s</span>
      ),
      sortValue: (row) => row.averageDwellSeconds,
    },
    {
      key: 'shots',
      header: 'Shots',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="font-mono tabular-nums">{formatNumber(row.shotsPlayed)}</span>,
      sortValue: (row) => row.shotsPlayed,
    },
    {
      key: 'intensity',
      header: 'Intensity',
      align: 'right',
      render: (row) => (
        <span className="font-medium capitalize text-ink-300">{row.intensity}</span>
      ),
      sortValue: (row) => row.usagePercent,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Heatmap ---------------------------------------------------------- */}
        <Panel
          title="Movement heatmap"
          subtitle="16 zones · hover or focus a zone for detail"
          className="lg:col-span-3"
          hint="Each cell is the share of in-play time spent in that court zone. One hue, light to dark — darker means less time."
          actions={
            <button
              type="button"
              onClick={() => setShowTrajectory((v) => !v)}
              aria-pressed={showTrajectory}
              className={cn('btn-ghost !py-1.5 text-xs', showTrajectory && 'border-gold-500/45 text-gold-500')}
            >
              Trajectory
            </button>
          }
        >
          <div className="relative mx-auto w-full max-w-md">
            {/* Court aspect ratio is roughly 13.4m x 6.1m per half-court. */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-navy-950">
              <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-[2px] p-[2px]">
                {coverage.zones.map((zone) => {
                  const normalised = zone.usagePercent / maxUsage;
                  const isActive = activeZone?.id === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onMouseEnter={() => setActiveZone(zone)}
                      onMouseLeave={() => setActiveZone(null)}
                      onFocus={() => setActiveZone(zone)}
                      onBlur={() => setActiveZone(null)}
                      aria-label={`${zone.label}: ${zone.usagePercent.toFixed(1)} percent of play, ${zone.visits} visits`}
                      className={cn(
                        'group relative rounded-[3px] transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-1 focus-visible:ring-offset-navy-950',
                        isActive && 'z-10 scale-[1.04] ring-2 ring-gold-400',
                      )}
                      style={{ background: heatColor(normalised) }}
                    >
                      <span className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-[10px] font-semibold tabular-nums text-navy-950/85">
                        {zone.usagePercent.toFixed(1)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Court markings drawn over the heat cells. */}
              <svg
                viewBox="0 0 100 133"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden
              >
                <rect x="1" y="1" width="98" height="131" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8" />
                <line x1="1" y1="99" x2="99" y2="99" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
                <line x1="1" y1="33" x2="99" y2="33" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
                <line x1="50" y1="33" x2="50" y2="132" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
                <line x1="1" y1="132" x2="99" y2="132" stroke="#ffc107" strokeWidth="1.4" opacity="0.55" />

                {showTrajectory && (
                  <>
                    <polyline
                      points={coverage.trajectory
                        .map((point) => `${point.x * 98 + 1},${(1 - point.y) * 129 + 2}`)
                        .join(' ')}
                      fill="none"
                      stroke="#f4f6ff"
                      strokeWidth="0.5"
                      strokeOpacity="0.5"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Base position: the mean of the trace. */}
                    <circle
                      cx={
                        (coverage.trajectory.reduce((s, p) => s + p.x, 0) /
                          Math.max(1, coverage.trajectory.length)) *
                          98 +
                        1
                      }
                      cy={
                        (1 -
                          coverage.trajectory.reduce((s, p) => s + p.y, 0) /
                            Math.max(1, coverage.trajectory.length)) *
                          129 +
                        2
                      }
                      r="2.2"
                      fill="#ffc107"
                      stroke="#0a0e27"
                      strokeWidth="0.8"
                    />
                  </>
                )}
              </svg>

              <span className="pointer-events-none absolute left-2 top-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                Backcourt
              </span>
              <span className="pointer-events-none absolute bottom-2 left-2 text-[10px] font-semibold uppercase tracking-wider text-gold-500/80">
                Net
              </span>
            </div>

            {/* Scale legend — required for any sequential encoding. */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[11px] text-ink-400">Low</span>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full">
                {HEAT_RAMP.map((step) => (
                  <span key={step} className="flex-1" style={{ background: step }} />
                ))}
              </div>
              <span className="text-[11px] text-ink-400">High</span>
              <span className="font-mono text-[11px] tabular-nums text-ink-500">
                0–{maxUsage.toFixed(1)}%
              </span>
            </div>

            {/* Hover read-out sits below the grid so it never occludes cells. */}
            <div className="mt-3 min-h-[3.5rem] rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              {activeZone ? (
                <div className="animate-fade-up">
                  <p className="text-sm font-semibold text-ink-100">{activeZone.label}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-ink-400">
                    <span>{activeZone.usagePercent.toFixed(1)}% of play</span>
                    <span aria-hidden>·</span>
                    <span>{formatNumber(activeZone.visits)} visits</span>
                    <span aria-hidden>·</span>
                    <span>{activeZone.averageDwellSeconds.toFixed(1)}s avg dwell</span>
                    <span aria-hidden>·</span>
                    <span>{formatNumber(activeZone.shotsPlayed)} shots</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-ink-500">
                  Hover or tab through the grid to inspect a zone.
                </p>
              )}
            </div>
          </div>
        </Panel>

        {/* Court thirds + movement stats ----------------------------------- */}
        <div className="space-y-5 lg:col-span-2">
          <Panel
            title="Court usage by third"
            hint="Time share across the frontcourt, midcourt and backcourt bands."
          >
            <div className="space-y-4">
              <ProgressBar
                label="Frontcourt (net)"
                value={coverage.frontcourtPercent}
                tone="gold"
                showValue
                size="lg"
              />
              <ProgressBar
                label="Midcourt (base)"
                value={coverage.midcourtPercent}
                tone="gold"
                showValue
                size="lg"
              />
              <ProgressBar
                label="Backcourt (rear)"
                value={coverage.backcourtPercent}
                tone="gold"
                showValue
                size="lg"
              />
            </div>
            <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-ink-400">
              {coverage.midcourtPercent > 45
                ? 'A midcourt-heavy profile: the player returns to base efficiently between shots, which is the pattern you want in singles.'
                : coverage.backcourtPercent > 30
                  ? 'Time skews to the rear court, which usually means the opponent is winning the length exchange.'
                  : 'Play is weighted toward the net, suggesting an aggressive forecourt game.'}
            </p>
          </Panel>

          <Panel title="Movement">
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Distance"
                value={`${formatNumber(coverage.totalDistanceMeters)} m`}
                tone="gold"
              />
              <StatTile
                label="Avg speed"
                value={`${coverage.averageSpeedMps.toFixed(2)} m/s`}
                hint="Mean movement speed while the shuttle is in play."
              />
              <StatTile
                label="Zones used"
                value={coverage.zones.filter((z) => z.usagePercent >= 2).length}
                hint="Zones with at least 2% dwell share — a proxy for how much of the court is genuinely defended."
              />
              <StatTile
                label="Hot zones"
                value={coverage.zones.filter((z) => z.intensity === 'high').length}
                tone="negative"
                hint="Zones the player occupied heavily. Many hot zones can indicate being pulled out of position."
              />
            </div>
          </Panel>
        </div>
      </div>

      <Collapsible
        title="Zone-by-zone breakdown"
        subtitle="Every court zone with dwell, visits and shots played"
        meta={`${coverage.zones.length} zones`}
      >
        <DataTable
          columns={columns}
          rows={coverage.zones}
          rowKey={(row) => String(row.id)}
          initialSort={{ key: 'usage', direction: 'desc' }}
          highlightKey={activeZone ? String(activeZone.id) : null}
          onRowClick={(row) => setActiveZone(row.id === activeZone?.id ? null : row)}
        />
      </Collapsible>
    </div>
  );
}
