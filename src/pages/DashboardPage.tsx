import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Panel } from '@/components/ui/Card';
import { Tabs, TabPanel, type TabDef } from '@/components/ui/Tabs';
import { SkeletonTab } from '@/components/ui/Skeleton';
import { EmptyState, ErrorBoundary, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { UploadQueue } from '@/components/upload/UploadQueue';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { OverviewTab } from '@/components/tabs/OverviewTab';
import { ShotAnalysisTab } from '@/components/tabs/ShotAnalysisTab';
import { CourtCoverageTab } from '@/components/tabs/CourtCoverageTab';
import { ShuttleDataTab } from '@/components/tabs/ShuttleDataTab';
import { PlayerPoseTab } from '@/components/tabs/PlayerPoseTab';
import { useAnalysis, useAnalysisLibrary } from '@/hooks/useAnalysis';
import { useUploads } from '@/hooks/useUploads';
import { exportAnalysisPdf } from '@/utils/pdf';
import { errorMessage } from '@/api/client';
import { formatDate, formatDurationLong, formatRelative } from '@/utils/format';

type TabId = 'overview' | 'shots' | 'coverage' | 'shuttle' | 'pose';

const TABS: readonly TabDef<TabId>[] = [
  { id: 'overview', label: 'Overview', icon: '◱' },
  { id: 'shots', label: 'Shot Analysis', icon: '⌁' },
  { id: 'coverage', label: 'Court Coverage', icon: '⊞' },
  { id: 'shuttle', label: 'Shuttle Data', icon: '➶' },
  { id: 'pose', label: 'Player Pose', icon: '⚇' },
] as const;

/**
 * The main workspace: upload hero at the top, then the five-tab analysis
 * dashboard for whichever video is selected.
 */
export function DashboardPage() {
  const { videoId: routeVideoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [exporting, setExporting] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const library = useAnalysisLibrary();

  // With no explicit route, fall back to the most recent completed analysis so
  // the dashboard is never empty on first load.
  const fallbackId = useMemo(
    () => library.data?.find((item) => item.status === 'complete')?.videoId ?? null,
    [library.data],
  );
  const selectedId = routeVideoId ?? fallbackId;

  const openAnalysis = useCallback(
    (videoId: string) => {
      navigate(`/analysis/${videoId}`);
      setActiveTab('overview');
      void library.refresh();
    },
    [library, navigate],
  );

  const uploads = useUploads({ onAnalysisComplete: openAnalysis });
  const { data: analysis, loading, error, refresh } = useAnalysis(selectedId);

  const handleExport = useCallback(async () => {
    if (!analysis) return;
    setExporting(true);
    try {
      await exportAnalysisPdf(analysis);
      toast.success('Report exported', 'The PDF has been saved to your downloads.');
    } catch (err) {
      toast.error('Export failed', errorMessage(err));
    } finally {
      setExporting(false);
    }
  }, [analysis, toast]);

  return (
    <div className="space-y-6">
      {/* Hero / upload ----------------------------------------------------- */}
      <section className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="panel h-full p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="gold">AI match analysis</Badge>
              {uploads.activeCount > 0 && (
                <Badge tone="caution">
                  {uploads.activeCount} job{uploads.activeCount === 1 ? '' : 's'} running
                </Badge>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-100 sm:text-3xl">
              Analyze a BWF match
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-400">
              Upload broadcast footage and Luma Vision runs shot classification, court-coverage
              mapping, TrackNetV3 shuttle tracking and pose estimation, then assembles the results
              into a single report.
            </p>

            <UploadDropzone className="mt-5" onFiles={uploads.addFiles} />
          </div>
        </div>

        <Panel
          title="Upload queue"
          subtitle="Live progress for uploads and analysis jobs"
          className="lg:col-span-2"
          actions={
            uploads.items.length > 0 && (
              <button type="button" onClick={uploads.clearFinished} className="btn-ghost !py-1.5 text-xs">
                Clear finished
              </button>
            )
          }
          bodyClassName="max-h-[26rem] overflow-y-auto"
        >
          <UploadQueue
            items={uploads.items}
            onCancel={uploads.cancel}
            onRetry={uploads.retry}
            onRemove={uploads.remove}
            onOpen={openAnalysis}
          />
        </Panel>
      </section>

      {/* Recent analyses --------------------------------------------------- */}
      {library.data && library.data.length > 0 && (
        <section aria-label="Recent analyses">
          <div className="flex items-center justify-between gap-3 pb-3">
            <h2 className="text-sm font-semibold text-ink-100">Recent analyses</h2>
            <button type="button" onClick={() => navigate('/history')} className="btn-ghost !py-1.5 text-xs">
              View all
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {library.data.slice(0, 8).map((item) => (
              <button
                key={item.videoId}
                type="button"
                onClick={() => openAnalysis(item.videoId)}
                className={`panel panel-hover w-64 shrink-0 p-4 text-left ${
                  item.videoId === selectedId ? 'border-gold-500/50 bg-navy-800/70' : ''
                }`}
              >
                <p className="truncate text-sm font-semibold text-ink-100" title={item.title}>
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-400">{item.tournament}</p>
                <p className="mt-3 flex items-center gap-2 font-mono text-[11px] tabular-nums text-ink-400">
                  <span className="text-gold-500">{item.accuracyPercent.toFixed(0)}%</span>
                  <span aria-hidden>·</span>
                  <span>{item.totalShots} shots</span>
                  <span aria-hidden>·</span>
                  <span>{formatDurationLong(item.durationSeconds)}</span>
                </p>
                <p className="mt-1 text-[11px] text-ink-500">{formatRelative(item.createdAt)}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Analysis dashboard ------------------------------------------------ */}
      <section aria-label="Analysis dashboard" className="space-y-4">
        {analysis && (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold tracking-tight text-ink-100">
                {analysis.job.match.title}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
                <span>{analysis.job.match.tournament}</span>
                <span aria-hidden>·</span>
                <span>{analysis.job.match.round}</span>
                <span aria-hidden>·</span>
                <span>{formatDate(analysis.job.match.playedOn)}</span>
                <span aria-hidden>·</span>
                <span className="font-mono tabular-nums">{analysis.job.match.scoreline}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPlayer((v) => !v)}
                aria-pressed={showPlayer}
                className="btn-ghost !py-2 text-xs"
              >
                {showPlayer ? 'Hide video' : 'Video review'}
              </button>
              <button type="button" onClick={refresh} className="btn-ghost !py-2 text-xs">
                Refresh
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="btn-primary !py-2 text-xs"
              >
                {exporting ? 'Preparing…' : 'Export PDF'}
              </button>
            </div>
          </div>
        )}

        {showPlayer && analysis && (
          <ErrorBoundary resetKey={analysis.videoId}>
            <VideoPlayer
              video={analysis.job.video}
              timeline={analysis.timeline}
              fallbackDuration={analysis.job.video.durationSeconds}
            />
          </ErrorBoundary>
        )}

        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {loading && <SkeletonTab label="Loading analysis results" />}

        {!loading && error && (
          <ErrorState message={error} onRetry={refresh} />
        )}

        {!loading && !error && !analysis && (
          <div className="panel">
            <EmptyState
              icon="🏸"
              title="No analysis selected"
              description="Upload a match video above, or pick one of your saved analyses, to see the full breakdown here."
            />
          </div>
        )}

        {!loading && !error && analysis && (
          <ErrorBoundary resetKey={`${analysis.videoId}:${activeTab}`}>
            <TabPanel id="overview" active={activeTab === 'overview'}>
              <OverviewTab analysis={analysis} />
            </TabPanel>
            <TabPanel id="shots" active={activeTab === 'shots'}>
              <ShotAnalysisTab shots={analysis.shots} />
            </TabPanel>
            <TabPanel id="coverage" active={activeTab === 'coverage'}>
              <CourtCoverageTab coverage={analysis.coverage} />
            </TabPanel>
            <TabPanel id="shuttle" active={activeTab === 'shuttle'}>
              <ShuttleDataTab shuttle={analysis.shuttle} />
            </TabPanel>
            <TabPanel id="pose" active={activeTab === 'pose'}>
              <PlayerPoseTab pose={analysis.pose} />
            </TabPanel>
          </ErrorBoundary>
        )}
      </section>
    </div>
  );
}
