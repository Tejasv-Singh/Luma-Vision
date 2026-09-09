import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Panel } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAnalysisLibrary } from '@/hooks/useAnalysis';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { errorMessage } from '@/api/client';
import { formatDate, formatDurationLong, formatNumber, formatRelative } from '@/utils/format';
import type { AnalysisSummary } from '@/types';

type SortKey = 'createdAt' | 'playedOn' | 'accuracy' | 'coverage' | 'shots' | 'title';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'createdAt', label: 'Recently analyzed' },
  { key: 'playedOn', label: 'Match date' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'coverage', label: 'Coverage' },
  { key: 'shots', label: 'Total shots' },
  { key: 'title', label: 'Title (A-Z)' },
];

/** Saved analyses with search, sort and delete. */
export function HistoryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refresh, remove } = useAnalysisLibrary();

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // Debounced so typing does not re-filter the list on every keystroke.
  const debouncedQuery = useDebouncedValue(query, 200);

  const rows = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    const filtered = (data ?? []).filter(
      (item) =>
        term.length === 0 ||
        item.title.toLowerCase().includes(term) ||
        item.tournament.toLowerCase().includes(term),
    );

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'accuracy':
          return b.accuracyPercent - a.accuracyPercent;
        case 'coverage':
          return b.coveragePercent - a.coveragePercent;
        case 'shots':
          return b.totalShots - a.totalShots;
        case 'playedOn':
          return new Date(b.playedOn).getTime() - new Date(a.playedOn).getTime();
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return sorted;
  }, [data, debouncedQuery, sortKey]);

  const handleDelete = async (item: AnalysisSummary) => {
    // Two-step delete: the first click arms, the second confirms.
    if (pendingDelete !== item.videoId) {
      setPendingDelete(item.videoId);
      setTimeout(() => setPendingDelete((current) => (current === item.videoId ? null : current)), 4000);
      return;
    }
    setPendingDelete(null);
    try {
      await remove(item.videoId);
      toast.success('Analysis deleted', item.title);
    } catch (err) {
      toast.error('Delete failed', errorMessage(err));
    }
  };

  const columns: Column<AnalysisSummary>[] = [
    {
      key: 'title',
      header: 'Match',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-100">{row.title}</p>
          <p className="truncate text-xs text-ink-400">
            {row.tournament} · {formatDate(row.playedOn)}
          </p>
        </div>
      ),
      sortValue: (row) => row.title,
    },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      render: (row) => (
        <Badge tone={row.status === 'complete' ? 'positive' : 'caution'}>{row.status}</Badge>
      ),
      sortValue: (row) => row.status,
    },
    {
      key: 'shots',
      header: 'Shots',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="font-mono tabular-nums">{formatNumber(row.totalShots)}</span>,
      sortValue: (row) => row.totalShots,
    },
    {
      key: 'accuracy',
      header: 'Accuracy',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-mono tabular-nums">{row.accuracyPercent.toFixed(1)}%</span>
          <ProgressBar className="w-14" value={row.accuracyPercent} size="sm" tone="gold" />
        </div>
      ),
      sortValue: (row) => row.accuracyPercent,
    },
    {
      key: 'coverage',
      header: 'Coverage',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono tabular-nums text-ink-300">{row.coveragePercent.toFixed(1)}%</span>
      ),
      sortValue: (row) => row.coveragePercent,
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono tabular-nums text-ink-300">
          {formatDurationLong(row.durationSeconds)}
        </span>
      ),
      sortValue: (row) => row.durationSeconds,
    },
    {
      key: 'created',
      header: 'Analyzed',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-ink-400">{formatRelative(row.createdAt)}</span>,
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/analysis/${row.videoId}`);
            }}
            className="btn-ghost !px-2.5 !py-1 text-xs"
          >
            Open
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleDelete(row);
            }}
            className="btn-danger !px-2.5 !py-1 text-xs"
          >
            {pendingDelete === row.videoId ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">Match history</h1>
          <p className="mt-1 text-sm text-ink-400">
            Every analysis saved to this workspace. Search, sort, reopen or delete.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} className="btn-ghost !py-2 text-xs">
          Refresh
        </button>
      </div>

      <Panel
        title={`Saved analyses${data ? ` (${rows.length})` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="history-search">
              Search analyses
            </label>
            <input
              id="history-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search match or tournament…"
              className="field !w-52 !py-1.5 text-xs"
            />
            <label className="sr-only" htmlFor="history-sort">
              Sort analyses
            </label>
            <select
              id="history-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="field !w-44 !py-1.5 text-xs"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key} className="bg-navy-900">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        }
        bodyClassName="p-3 sm:p-5"
      >
        {loading && <SkeletonRows rows={6} />}

        {!loading && error && <ErrorState message={error} onRetry={() => void refresh()} />}

        {!loading && !error && rows.length === 0 && (
          <EmptyState
            icon="🔍"
            title={query ? 'No matches for that search' : 'No saved analyses yet'}
            description={
              query
                ? 'Try a different match name or tournament.'
                : 'Upload a match video from the dashboard to build your history.'
            }
            action={
              <button type="button" onClick={() => navigate('/')} className="btn-primary">
                Go to dashboard
              </button>
            }
          />
        )}

        {!loading && !error && rows.length > 0 && (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.videoId}
            onRowClick={(row) => navigate(`/analysis/${row.videoId}`)}
          />
        )}
      </Panel>
    </div>
  );
}
