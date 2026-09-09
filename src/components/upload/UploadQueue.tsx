import { Badge } from '@/components/ui/Card';
import { ProgressBar, type ProgressTone } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/States';
import { formatBytes, formatRelative } from '@/utils/format';
import type { UploadItem } from '@/hooks/useUploads';
import type { AnalysisStatus } from '@/types';
import { cn } from '@/utils/cn';

const STATUS_META: Record<
  AnalysisStatus,
  { label: string; tone: 'neutral' | 'gold' | 'positive' | 'caution' | 'negative'; bar: ProgressTone }
> = {
  pending: { label: 'Waiting', tone: 'neutral', bar: 'neutral' },
  uploading: { label: 'Uploading', tone: 'gold', bar: 'gold' },
  queued: { label: 'Queued', tone: 'caution', bar: 'neutral' },
  analyzing: { label: 'Analyzing', tone: 'gold', bar: 'gold' },
  complete: { label: 'Complete', tone: 'positive', bar: 'positive' },
  failed: { label: 'Failed', tone: 'negative', bar: 'negative' },
  cancelled: { label: 'Cancelled', tone: 'neutral', bar: 'neutral' },
};

const IN_FLIGHT: AnalysisStatus[] = ['uploading', 'analyzing', 'queued', 'pending'];

interface UploadQueueProps {
  items: UploadItem[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (videoId: string) => void;
}

/** Live list of in-flight and recently finished uploads. */
export function UploadQueue({ items, onCancel, onRetry, onRemove, onOpen }: UploadQueueProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon="🎬"
        title="No uploads yet"
        description="Drop a BWF match video above to run it through the analysis pipeline. Progress and results appear here."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const meta = STATUS_META[item.status];
        const inFlight = IN_FLIGHT.includes(item.status);
        const indeterminate = item.status === 'queued';

        return (
          <li
            key={item.id}
            className="animate-fade-up rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-white/12"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-100" title={item.name}>
                  {item.name}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-400">
                  <span className="font-mono tabular-nums">{formatBytes(item.sizeBytes)}</span>
                  <span aria-hidden>·</span>
                  <span>{item.stage}</span>
                  <span aria-hidden>·</span>
                  <span>{formatRelative(item.startedAt)}</span>
                </p>
              </div>
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>

            {(inFlight || item.status === 'complete') && (
              <ProgressBar
                className="mt-3"
                value={indeterminate ? 100 : item.progress}
                tone={meta.bar}
                size="sm"
                striped={inFlight}
              />
            )}

            {item.error && (
              <p role="alert" className="mt-2 text-xs leading-relaxed text-negative">
                {item.error}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {inFlight && (
                <button type="button" onClick={() => onCancel(item.id)} className="btn-ghost !py-1.5 text-xs">
                  Cancel
                </button>
              )}
              {(item.status === 'failed' || item.status === 'cancelled') && (
                <button type="button" onClick={() => onRetry(item.id)} className="btn-primary !py-1.5 text-xs">
                  Retry
                </button>
              )}
              {item.status === 'complete' && item.videoId && (
                <button
                  type="button"
                  onClick={() => onOpen(item.videoId!)}
                  className="btn-primary !py-1.5 text-xs"
                >
                  View analysis
                </button>
              )}
              {!inFlight && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className={cn('btn-ghost !py-1.5 text-xs', 'text-ink-400')}
                >
                  Dismiss
                </button>
              )}
              <span className="ml-auto font-mono text-xs tabular-nums text-ink-500">
                {inFlight && !indeterminate ? `${item.progress}%` : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
