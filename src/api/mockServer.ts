/**
 * In-browser stand-in for the analysis backend.
 *
 * It models the real thing closely enough that swapping `VITE_USE_MOCK_API` to
 * `false` requires no component changes: uploads report byte-wise progress and
 * are abortable, jobs move through the same status machine, and completed
 * analyses persist across reloads via localStorage.
 *
 * Video blobs are deliberately *not* persisted — object URLs die with the page
 * — so a restored job keeps its stats but loses the playable source.
 */

import {
  buildMockAnalysis,
  buildSeedLibrary,
  toSummary,
  type MockAnalysisOptions,
} from './mockData';
import { config } from '@/utils/config';
import { makeId } from '@/utils/format';
import type {
  AnalysisJob,
  AnalysisResult,
  AnalysisSummary,
  ApiError,
  UploadResponse,
} from '@/types';

const STORAGE_KEY = 'luma-vision:library:v1';

const PIPELINE_STAGES = [
  'Decoding video stream',
  'Detecting court homography',
  'Tracking shuttle (TrackNetV3)',
  'Estimating player pose',
  'Classifying shot types',
  'Aggregating match statistics',
] as const;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function apiError(code: string, message: string, status?: number): ApiError {
  return status === undefined ? { code, message } : { code, message, status };
}

class MockServer {
  private analyses = new Map<string, AnalysisResult>();
  private jobs = new Map<string, AnalysisJob>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  constructor() {
    this.restore();
  }

  /* ---------------------------------------------------------------- state */

  private restore(): void {
    let ids: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) ids = JSON.parse(raw) as string[];
    } catch {
      // Corrupt or unavailable storage (private mode) just means no history.
      ids = [];
    }

    if (ids.length === 0) {
      for (const seed of buildSeedLibrary()) {
        this.analyses.set(seed.videoId, seed);
        this.jobs.set(seed.videoId, seed.job);
      }
      this.persist();
      return;
    }

    for (const id of ids) {
      // Payloads are regenerated rather than stored: the seeded PRNG makes them
      // identical, and it keeps localStorage tiny instead of megabytes of JSON.
      const result = buildMockAnalysis(id, { filename: `${id}.mp4` });
      this.analyses.set(id, result);
      this.jobs.set(id, result.job);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.analyses.keys()]));
    } catch {
      // Storage full or blocked — the session still works in memory.
    }
  }

  private clearTimer(videoId: string): void {
    const timer = this.timers.get(videoId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(videoId);
    }
  }

  /* --------------------------------------------------------------- upload */

  /**
   * Simulates a chunked upload. `signal` aborts it the way axios would, and
   * `onProgress` receives 0-100 so the UI code is identical for real uploads.
   */
  async upload(
    file: File,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<UploadResponse> {
    if (signal?.aborted) throw apiError('CANCELLED', 'Upload cancelled.');

    const videoId = makeId('lv');
    const ticks = 40;
    const perTick = Math.max(18, (file.size / (12 * 1024 * 1024)) * 10);

    for (let i = 1; i <= ticks; i += 1) {
      if (signal?.aborted) throw apiError('CANCELLED', 'Upload cancelled.');
      await delay(Math.min(perTick, 90));
      onProgress(Math.round((i / ticks) * 100));
    }

    const options: MockAnalysisOptions = {
      filename: file.name,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
    };

    let sourceUrl: string | undefined;
    try {
      sourceUrl = URL.createObjectURL(file);
    } catch {
      sourceUrl = undefined;
    }
    if (sourceUrl) options.sourceUrl = sourceUrl;

    const result = buildMockAnalysis(videoId, options);
    const job: AnalysisJob = {
      ...result.job,
      status: 'queued',
      progress: 0,
      stage: 'Queued for analysis',
    };
    delete (job as Partial<AnalysisJob>).completedAt;

    this.analyses.set(videoId, { ...result, job });
    this.jobs.set(videoId, job);
    this.startPipeline(videoId);

    return { videoId, status: 'queued', message: 'Upload complete. Analysis queued.' };
  }

  /** Drives a queued job through the analysis stages to completion. */
  private startPipeline(videoId: string): void {
    this.clearTimer(videoId);
    const totalMs = config.mockAnalysisSeconds * 1000;
    const tickMs = 250;
    const increment = (100 / totalMs) * tickMs;
    let progress = 0;

    const timer = setInterval(() => {
      const job = this.jobs.get(videoId);
      if (!job || job.status === 'cancelled') {
        this.clearTimer(videoId);
        return;
      }

      progress = Math.min(100, progress + increment);
      const stageIndex = Math.min(
        PIPELINE_STAGES.length - 1,
        Math.floor((progress / 100) * PIPELINE_STAGES.length),
      );

      if (progress >= 100) {
        this.clearTimer(videoId);
        const completed: AnalysisJob = {
          ...job,
          status: 'complete',
          progress: 100,
          stage: 'Analysis complete',
          completedAt: new Date().toISOString(),
        };
        this.jobs.set(videoId, completed);
        const analysis = this.analyses.get(videoId);
        if (analysis) this.analyses.set(videoId, { ...analysis, job: completed });
        this.persist();
        return;
      }

      this.jobs.set(videoId, {
        ...job,
        status: 'analyzing',
        progress: Math.round(progress),
        stage: PIPELINE_STAGES[stageIndex]!,
      });
    }, tickMs);

    this.timers.set(videoId, timer);
  }

  /* --------------------------------------------------------------- reads  */

  async getJob(videoId: string): Promise<AnalysisJob> {
    await delay(80);
    const job = this.jobs.get(videoId);
    if (!job) throw apiError('NOT_FOUND', 'That analysis no longer exists.', 404);
    return job;
  }

  async getAnalysis(videoId: string): Promise<AnalysisResult> {
    await delay(config.mockLatencyMs);
    const analysis = this.analyses.get(videoId);
    const job = this.jobs.get(videoId);
    if (!analysis || !job) throw apiError('NOT_FOUND', 'That analysis no longer exists.', 404);
    if (job.status !== 'complete') {
      throw apiError('NOT_READY', 'Analysis is still running for this video.', 409);
    }
    return { ...analysis, job };
  }

  async list(): Promise<AnalysisSummary[]> {
    await delay(Math.min(config.mockLatencyMs, 400));
    return [...this.analyses.values()]
      .map((result) => {
        const job = this.jobs.get(result.videoId) ?? result.job;
        return toSummary({ ...result, job });
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /* -------------------------------------------------------------- mutate  */

  async cancel(videoId: string): Promise<void> {
    this.clearTimer(videoId);
    const job = this.jobs.get(videoId);
    if (job) {
      this.jobs.set(videoId, { ...job, status: 'cancelled', stage: 'Cancelled by user' });
    }
  }

  async retry(videoId: string): Promise<void> {
    const job = this.jobs.get(videoId);
    if (!job) throw apiError('NOT_FOUND', 'That analysis no longer exists.', 404);
    this.jobs.set(videoId, { ...job, status: 'queued', progress: 0, stage: 'Queued for analysis' });
    this.startPipeline(videoId);
  }

  async remove(videoId: string): Promise<void> {
    await delay(220);
    this.clearTimer(videoId);
    const analysis = this.analyses.get(videoId);
    const source = analysis?.job.video.sourceUrl;
    if (source?.startsWith('blob:')) URL.revokeObjectURL(source);

    if (!this.analyses.delete(videoId)) {
      throw apiError('NOT_FOUND', 'That analysis no longer exists.', 404);
    }
    this.jobs.delete(videoId);
    this.persist();
  }
}

export const mockServer = new MockServer();
