import { useState } from 'react';
import { Badge, Panel, StatTile } from '@/components/ui/Card';
import { ProgressBar, ScoreRing } from '@/components/ui/ProgressBar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Collapsible } from '@/components/ui/Collapsible';
import { ShotDistributionChart } from '@/components/charts';
import { SHOT_LABELS, type ShotAnalysis, type ShotBreakdown, type ShotType } from '@/types';
import { formatNumber, scoreTone } from '@/utils/format';
import { cn } from '@/utils/cn';

const SHOT_DESCRIPTIONS: Record<ShotType, string> = {
  smash: 'Steep, high-velocity attacking shot hit from above the shoulder.',
  clear: 'Deep defensive or attacking shot to the opponent’s rear court.',
  drop: 'Soft shot played just over the net into the forecourt.',
  drive: 'Flat, fast shot travelling parallel to the ground.',
  net: 'Delicate shot played tight to the net tape from the forecourt.',
  serve: 'The opening stroke of each rally, low or flick.',
};

/**
 * Tab 2 — how the player's shots break down by type, which ones work, and
 * where consistency is leaking.
 */
export function ShotAnalysisTab({ shots }: { shots: ShotAnalysis }) {
  // Emphasis lets the reader isolate one shot type in the single-series chart
  // without recolouring the others — colour never encodes rank here.
  const [emphasis, setEmphasis] = useState<ShotType | undefined>(shots.mostUsed);

  const mostUsed = shots.breakdown.find((s) => s.type === shots.mostUsed);
  const mostEffective = shots.breakdown.find((s) => s.type === shots.mostEffective);
  const tone = scoreTone(shots.consistencyScore);

  const columns: Column<ShotBreakdown>[] = [
    {
      key: 'type',
      header: 'Shot type',
      render: (row) => <span className="font-medium text-ink-100">{SHOT_LABELS[row.type]}</span>,
      sortValue: (row) => SHOT_LABELS[row.type],
    },
    {
      key: 'count',
      header: 'Count',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums">{formatNumber(row.count)}</span>,
      sortValue: (row) => row.count,
    },
    {
      key: 'share',
      header: 'Share',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono tabular-nums text-ink-400">
          {((row.count / Math.max(1, shots.totalShots)) * 100).toFixed(1)}%
        </span>
      ),
      sortValue: (row) => row.count / Math.max(1, shots.totalShots),
    },
    {
      key: 'successRate',
      header: 'Success',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-mono tabular-nums">{row.successRate.toFixed(1)}%</span>
          <ProgressBar className="w-16" value={row.successRate} size="sm" tone={scoreTone(row.successRate)} />
        </div>
      ),
      sortValue: (row) => row.successRate,
    },
    {
      key: 'speed',
      header: 'Avg speed',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono tabular-nums text-ink-300">{row.averageSpeedKmh} km/h</span>
      ),
      sortValue: (row) => row.averageSpeedKmh,
    },
    {
      key: 'winners',
      header: 'Winners',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="font-mono tabular-nums text-positive">{row.winners}</span>,
      sortValue: (row) => row.winners,
    },
    {
      key: 'errors',
      header: 'Errors',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="font-mono tabular-nums text-negative">{row.errors}</span>,
      sortValue: (row) => row.errors,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Shot type grid --------------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {shots.breakdown.map((shot) => {
          const selected = emphasis === shot.type;
          const share = (shot.count / Math.max(1, shots.totalShots)) * 100;
          return (
            <button
              key={shot.type}
              type="button"
              onClick={() => setEmphasis(selected ? undefined : shot.type)}
              aria-pressed={selected}
              title={SHOT_DESCRIPTIONS[shot.type]}
              className={cn(
                'panel panel-hover animate-fade-up p-4 text-left transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60',
                selected && 'border-gold-500/50 bg-navy-800/70',
              )}
            >
              <span className="stat-label block">{SHOT_LABELS[shot.type]}</span>
              <span className="stat-value mt-2 block !text-2xl">{formatNumber(shot.count)}</span>
              <ProgressBar
                className="mt-3"
                value={share}
                max={40}
                size="sm"
                tone={selected ? 'gold' : 'neutral'}
              />
              <span className="mt-2 block font-mono text-[11px] tabular-nums text-ink-400">
                {share.toFixed(1)}% · {shot.successRate.toFixed(0)}% success
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Distribution chart --------------------------------------------- */}
        <Panel
          title="Shot distribution"
          subtitle={
            emphasis
              ? `Highlighting ${SHOT_LABELS[emphasis]} — select a card above to change focus`
              : 'Select a shot card above to highlight it'
          }
          className="lg:col-span-2"
          hint="Counts per shot type across the whole match. One series, so a single colour: the highlighted bar is the one you selected, not the largest."
        >
          <ShotDistributionChart breakdown={shots.breakdown} {...(emphasis ? { emphasis } : {})} />
        </Panel>

        {/* Consistency ----------------------------------------------------- */}
        <Panel title="Shot consistency" hint="A blended score over shot success rate, error clustering and speed variance.">
          <div className="flex flex-col items-center gap-4">
            <ScoreRing
              value={shots.consistencyScore}
              label="Consistency"
              tone={tone === 'positive' ? 'positive' : tone === 'caution' ? 'caution' : 'negative'}
            />
            <Badge tone={tone === 'positive' ? 'positive' : tone === 'caution' ? 'caution' : 'negative'}>
              {tone === 'positive' ? 'Strong' : tone === 'caution' ? 'Developing' : 'Needs work'}
            </Badge>
          </div>

          <ul className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
            {shots.consistencyTips.map((tip) => (
              <li key={tip} className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-300">
                <span
                  aria-hidden
                  className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gold-500/15 text-[9px] font-bold text-gold-500"
                >
                  ↗
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Highlights ------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Most used shot">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="stat-value">{SHOT_LABELS[shots.mostUsed]}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">
                {SHOT_DESCRIPTIONS[shots.mostUsed]}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-2xl font-semibold tabular-nums text-gold-500">
                {formatNumber(mostUsed?.count ?? 0)}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-ink-400">shots</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatTile label="Success" value={`${mostUsed?.successRate.toFixed(0) ?? 0}%`} />
            <StatTile label="Winners" value={mostUsed?.winners ?? 0} tone="positive" />
            <StatTile label="Errors" value={mostUsed?.errors ?? 0} tone="negative" />
          </div>
        </Panel>

        <Panel title="Most effective shot">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="stat-value">{SHOT_LABELS[shots.mostEffective]}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">
                {SHOT_DESCRIPTIONS[shots.mostEffective]}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-2xl font-semibold tabular-nums text-positive">
                {mostEffective?.successRate.toFixed(1) ?? 0}%
              </p>
              <p className="text-[11px] uppercase tracking-wider text-ink-400">success</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatTile label="Played" value={formatNumber(mostEffective?.count ?? 0)} />
            <StatTile label="Winners" value={mostEffective?.winners ?? 0} tone="positive" />
            <StatTile label="Avg speed" value={`${mostEffective?.averageSpeedKmh ?? 0}`} />
          </div>
        </Panel>
      </div>

      {/* Table view (also the accessible fallback for the chart) ----------- */}
      <Collapsible
        title="Shot-by-shot breakdown"
        subtitle="Sortable table view of every shot type"
        meta={`${shots.breakdown.length} types · ${formatNumber(shots.totalShots)} shots`}
        defaultOpen
      >
        <DataTable
          columns={columns}
          rows={shots.breakdown}
          rowKey={(row) => row.type}
          initialSort={{ key: 'count', direction: 'desc' }}
          highlightKey={emphasis ?? null}
          onRowClick={(row) => setEmphasis(row.type === emphasis ? undefined : row.type)}
        />
      </Collapsible>
    </div>
  );
}
