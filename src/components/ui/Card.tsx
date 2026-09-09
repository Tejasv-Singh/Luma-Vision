import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { ProgressBar, type ProgressTone } from './ProgressBar';
import { InfoHint } from './Tooltip';

/* -------------------------------------------------------------------------- */
/* Panel — the base surface every block sits on                                */
/* -------------------------------------------------------------------------- */

interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Rendered top-right: filters, legends, actions. */
  actions?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  subtitle,
  actions,
  hint,
  children,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section className={cn('panel flex flex-col', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                <span className="truncate">{title}</span>
                {hint && <InfoHint content={hint} />}
              </h3>
            )}
            {subtitle && <p className="mt-1 text-xs text-ink-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('flex-1 p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* MetricCard — the headline number with a progress track                      */
/* -------------------------------------------------------------------------- */

interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Progress track value; omit to hide the bar. */
  progress?: number;
  progressMax?: number;
  tone?: ProgressTone;
  caption?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** Signed change vs. the comparison match, in percentage points. */
  delta?: number;
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  progress,
  progressMax = 100,
  tone = 'gold',
  caption,
  hint,
  icon,
  delta,
  className,
}: MetricCardProps) {
  return (
    <article className={cn('panel panel-hover group animate-fade-up p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="stat-label flex items-center gap-1.5">
          {label}
          {hint && <InfoHint content={hint} />}
        </span>
        {icon && (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.05] text-gold-500 transition-colors group-hover:bg-gold-500/15">
            {icon}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="stat-value">{value}</span>
        {unit && <span className="text-sm font-medium text-ink-400">{unit}</span>}
        {delta !== undefined && Number.isFinite(delta) && (
          <span
            className={cn(
              'ml-1 font-mono text-xs font-semibold tabular-nums',
              delta > 0 ? 'text-positive' : delta < 0 ? 'text-negative' : 'text-ink-400',
            )}
          >
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta).toFixed(1)}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <ProgressBar className="mt-4" value={progress} max={progressMax} tone={tone} />
      )}

      {caption && <p className="mt-3 text-xs leading-relaxed text-ink-400">{caption}</p>}
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* StatTile — dense label/value pair for statistics grids                      */
/* -------------------------------------------------------------------------- */

export function StatTile({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'positive' | 'negative' | 'gold';
  hint?: ReactNode;
}) {
  const toneClass = {
    neutral: 'text-ink-100',
    positive: 'text-positive',
    negative: 'text-negative',
    gold: 'text-gold-500',
  }[tone];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-gold-500/25 hover:bg-white/[0.04]">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">{label}</span>
        {hint && <InfoHint content={hint} />}
      </div>
      <div className={cn('mt-1 font-mono text-xl font-semibold tabular-nums', toneClass)}>{value}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'gold' | 'positive' | 'caution' | 'negative';
  className?: string;
}) {
  const tones = {
    neutral: 'border-white/10 bg-white/[0.04] text-ink-300',
    gold: 'border-gold-500/40 bg-gold-500/12 text-gold-500',
    positive: 'border-positive/40 bg-positive/12 text-positive',
    caution: 'border-caution/40 bg-caution/12 text-caution',
    negative: 'border-negative/40 bg-negative/12 text-negative',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
        tones,
        className,
      )}
    >
      {children}
    </span>
  );
}
