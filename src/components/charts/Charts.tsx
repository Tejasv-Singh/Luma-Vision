/**
 * Recharts-backed visualisations.
 *
 * This module is the only place Recharts is imported, so it compiles to a
 * single lazily-loaded chunk (see `./index.tsx`). Charts here follow the
 * project's viz rules: thin marks, hairline recessive chrome, one colour per
 * single-series chart with emphasis rather than a hue per category, selective
 * direct labels, and a legend whenever two or more series are on screen.
 */

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ACCENT, CHROME, MUTED, seriesColor } from '@/utils/viz';
import { SHOT_LABELS, type ShotBreakdown, type VelocitySample } from '@/types';
import { formatNumber } from '@/utils/format';

/* -------------------------------------------------------------------------- */
/* Shared chrome                                                               */
/* -------------------------------------------------------------------------- */

const AXIS_TICK = {
  fill: CHROME.inkMuted,
  fontSize: 11,
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
};

const GRID_PROPS = {
  stroke: CHROME.grid,
  strokeDasharray: '0', // solid hairlines only — dashes read as thresholds
  vertical: false,
} as const;

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-navy-950/95 px-3 py-2 shadow-panel backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-xs">
            {row.color && (
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
            )}
            <span className="text-ink-400">{row.label}</span>
            <span className="ml-auto font-mono font-semibold tabular-nums text-ink-100">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Legend swatch row. Rendered for every chart carrying 2+ series. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink-300">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Shot distribution — single series with emphasis                             */
/* -------------------------------------------------------------------------- */

interface ShotDistributionProps {
  breakdown: ShotBreakdown[];
  /** Shot type drawn in the accent colour; the rest are muted. */
  emphasis?: string;
  height?: number;
}

export function ShotDistributionChart({
  breakdown,
  emphasis,
  height = 280,
}: ShotDistributionProps) {
  const data = useMemo(
    () =>
      breakdown.map((item) => ({
        name: SHOT_LABELS[item.type],
        type: item.type,
        count: item.count,
        successRate: item.successRate,
        speed: item.averageSpeedKmh,
      })),
    [breakdown],
  );

  const peak = useMemo(() => data.reduce((a, b) => (b.count > a.count ? b : a), data[0]!), [data]);

  return (
    // Height includes the x-axis band so tick labels are never clipped.
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: -18 }} barCategoryGap="28%">
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CHROME.axis }}
          interval={0}
        />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
        <RTooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0]?.payload as (typeof data)[number] | undefined;
            if (!row) return null;
            return (
              <ChartTooltip
                title={row.name}
                rows={[
                  { label: 'Shots', value: formatNumber(row.count) },
                  { label: 'Success', value: `${row.successRate}%` },
                  { label: 'Avg speed', value: `${row.speed} km/h` },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((row) => (
            <Cell
              key={row.type}
              fill={!emphasis || row.type === emphasis ? ACCENT : MUTED}
              fillOpacity={!emphasis || row.type === emphasis ? 1 : 0.45}
            />
          ))}
        </Bar>
        {/* Selective direct label: only the peak bar carries its value. */}
        <ReferenceLine
          y={peak.count}
          stroke={CHROME.grid}
          label={{
            value: `peak ${formatNumber(peak.count)}`,
            position: 'right',
            fill: CHROME.inkMuted,
            fontSize: 10,
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Shuttle velocity over time — single series                                  */
/* -------------------------------------------------------------------------- */

export function VelocityChart({
  samples,
  average,
  height = 300,
}: {
  samples: VelocitySample[];
  average: number;
  height?: number;
}) {
  const data = useMemo(
    () =>
      samples.map((sample) => ({
        minute: Math.round(sample.t / 60),
        t: sample.t,
        velocity: sample.velocity,
        height: sample.height,
      })),
    [samples],
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: -18 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="minute"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CHROME.axis }}
          tickFormatter={(value: number) => `${value}m`}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={48}
          domain={[0, 'dataMax + 20']}
        />
        <RTooltip
          cursor={{ stroke: CHROME.axis, strokeWidth: 1 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0]?.payload as (typeof data)[number] | undefined;
            if (!row) return null;
            return (
              <ChartTooltip
                title={`Minute ${row.minute}`}
                rows={[
                  { label: 'Velocity', value: `${row.velocity} km/h`, color: ACCENT },
                  { label: 'Height', value: `${row.height} m` },
                ]}
              />
            );
          }}
        />
        <ReferenceLine
          y={average}
          stroke={MUTED}
          strokeWidth={1}
          label={{
            value: `avg ${Math.round(average)} km/h`,
            position: 'insideTopRight',
            fill: CHROME.inkMuted,
            fontSize: 10,
          }}
        />
        <Line
          type="monotone"
          dataKey="velocity"
          stroke={ACCENT}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: ACCENT, stroke: CHROME.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Comparison — grouped bars, up to three matches                              */
/* -------------------------------------------------------------------------- */

export interface ComparisonSeries {
  /** Stable entity id: colour follows this, never the row's position. */
  id: string;
  label: string;
}

export function ComparisonChart({
  metrics,
  series,
  height = 320,
}: {
  metrics: { metric: string; [seriesId: string]: string | number }[];
  series: ComparisonSeries[];
  height?: number;
}) {
  return (
    <div className="space-y-3">
      <ChartLegend
        items={series.map((s, i) => ({ label: s.label, color: seriesColor(i) }))}
      />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={metrics} margin={{ top: 8, right: 8, bottom: 4, left: -18 }} barGap={2}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="metric"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHROME.axis }}
            interval={0}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
          <RTooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <ChartTooltip
                  title={String(label)}
                  rows={payload.map((entry, i) => ({
                    label: series.find((s) => s.id === entry.dataKey)?.label ?? String(entry.dataKey),
                    value: formatNumber(Number(entry.value), 1),
                    color: seriesColor(i),
                  }))}
                />
              );
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.id}
              dataKey={s.id}
              fill={seriesColor(i)}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Forehand / backhand split — two series                                      */
/* -------------------------------------------------------------------------- */

export function StrokeSplitChart({
  forehand,
  backhand,
  height = 220,
}: {
  forehand: { count: number; accuracy: number };
  backhand: { count: number; accuracy: number };
  height?: number;
}) {
  const data = [
    { metric: 'Shots played', forehand: forehand.count, backhand: backhand.count },
    { metric: 'Accuracy %', forehand: forehand.accuracy, backhand: backhand.accuracy },
  ];

  return (
    <div className="space-y-3">
      <ChartLegend
        items={[
          { label: 'Forehand', color: seriesColor(0) },
          { label: 'Backhand', color: seriesColor(1) },
        ]}
      />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -18 }} barGap={2}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="metric"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHROME.axis }}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
          <RTooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <ChartTooltip
                  title={String(label)}
                  rows={[
                    {
                      label: 'Forehand',
                      value: formatNumber(Number(payload[0]?.value ?? 0), 1),
                      color: seriesColor(0),
                    },
                    {
                      label: 'Backhand',
                      value: formatNumber(Number(payload[1]?.value ?? 0), 1),
                      color: seriesColor(1),
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="forehand" fill={seriesColor(0)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="backhand" fill={seriesColor(1)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
