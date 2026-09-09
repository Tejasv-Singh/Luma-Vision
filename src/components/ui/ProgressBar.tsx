import { cn } from '@/utils/cn';
import { clamp } from '@/utils/format';

export type ProgressTone = 'gold' | 'positive' | 'caution' | 'negative' | 'neutral';

const TONE_CLASSES: Record<ProgressTone, string> = {
  gold: 'bg-gold-grad',
  positive: 'bg-gradient-to-r from-positive/70 to-positive',
  caution: 'bg-gradient-to-r from-caution/70 to-caution',
  negative: 'bg-gradient-to-r from-negative/70 to-negative',
  neutral: 'bg-gradient-to-r from-navy-600 to-navy-500',
};

interface ProgressBarProps {
  /** Current value in the same units as `max`. */
  value: number;
  max?: number;
  tone?: ProgressTone;
  /** Height of the track. */
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
  /** Marching stripes for indeterminate-feeling work (upload/analysis). */
  striped?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'gold',
  size = 'md',
  label,
  showValue = false,
  striped = false,
  className,
}: ProgressBarProps) {
  const pct = clamp(max === 0 ? 0 : (value / max) * 100, 0, 100);
  const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' } as const;

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="text-xs font-medium text-ink-400">{label}</span>}
          {showValue && (
            <span className="font-mono text-xs font-semibold tabular-nums text-ink-200">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className={cn('w-full overflow-hidden rounded-full bg-white/[0.06]', heights[size])}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            TONE_CLASSES[tone],
            striped &&
              'bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.22)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.22)_75%,transparent_75%,transparent)]',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Circular gauge used for single headline scores (consistency, footwork). */
export function ScoreRing({
  value,
  max = 100,
  size = 132,
  label,
  suffix = '',
  tone = 'gold',
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  suffix?: string;
  tone?: ProgressTone;
}) {
  const pct = clamp(max === 0 ? 0 : value / max, 0, 1);
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeColors: Record<ProgressTone, string> = {
    gold: 'url(#ring-gold)',
    positive: '#3ddc97',
    caution: '#ffb300',
    negative: '#ff5d6c',
    neutral: '#2f3b7d',
  };

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffc107" />
            <stop offset="100%" stopColor="#ff9800" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColors[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <span className="font-mono text-2xl font-semibold tabular-nums text-ink-100">
          {Math.round(value)}
          {suffix}
        </span>
        {label && <span className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-400">{label}</span>}
      </div>
    </div>
  );
}
