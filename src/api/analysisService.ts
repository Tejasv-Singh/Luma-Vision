/**
 * The single seam between the UI and the backend.
 *
 * Components only ever import from here. Whether calls are served by the real
 * HTTP API or the in-browser mock is decided once, by `VITE_USE_MOCK_API`.
 *
 * Endpoints mirrored:
 *   POST   /api/upload
 *   GET    /api/analysis/:id
 *   GET    /api/analysis/:id/shots
 *   GET    /api/analysis/:id/coverage
 *   GET    /api/analysis/:id/shuttle
 *   GET    /api/analysis/:id/pose
 *   GET    /api/analysis/:id/status
 *   GET    /api/analyses
 *   DELETE /api/analysis/:id
 */

import { http } from './client';
import { mockServer } from './mockServer';
import { cacheInvalidate, cached } from '@/utils/cache';
import { config } from '@/utils/config';
import type {
  AnalysisJob,
  AnalysisResult,
  AnalysisSummary,
  CourtCoverage,
  PoseAnalysis,
  ShotAnalysis,
  ShuttleData,
  UploadResponse,
} from '@/types';

const useMock = config.useMockApi;

const KEYS = {
  analysis: (id: string) => `analysis:${id}`,
  shots: (id: string) => `analysis:${id}:shots`,
  coverage: (id: string) => `analysis:${id}:coverage`,
  shuttle: (id: string) => `analysis:${id}:shuttle`,
  pose: (id: string) => `analysis:${id}:pose`,
  list: 'analyses:list',
};

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export const analysisService = {
  /** POST /api/upload — multipart, with byte-wise progress and abort support. */
  async upload(file: File, options: UploadOptions = {}): Promise<UploadResponse> {
    const report = options.onProgress ?? (() => undefined);

    if (useMock) {
      const response = await mockServer.upload(file, report, options.signal);
      cacheInvalidate(KEYS.list);
      return response;
    }

    const form = new FormData();
    form.append('video', file, file.name);

    const { data } = await http.post<UploadResponse>('/upload', form, {
      timeout: 0, // large files: rely on abort, not a wall-clock timeout
      headers: { 'Content-Type': 'multipart/form-data' },
      ...(options.signal ? { signal: options.signal } : {}),
      onUploadProgress: (event) => {
        const total = event.total ?? file.size;
        if (total > 0) report(Math.round((event.loaded / total) * 100));
      },
    });

    cacheInvalidate(KEYS.list);
    return data;
  },

  /** GET /api/analysis/:id/status — polled while a job is running, never cached. */
  async getJob(videoId: string): Promise<AnalysisJob> {
    if (useMock) return mockServer.getJob(videoId);
    const { data } = await http.get<AnalysisJob>(`/analysis/${videoId}/status`);
    return data;
  },

  /** GET /api/analysis/:id — the full result bundle. */
  async getAnalysis(videoId: string): Promise<AnalysisResult> {
    return cached(KEYS.analysis(videoId), async () => {
      if (useMock) return mockServer.getAnalysis(videoId);
      const { data } = await http.get<AnalysisResult>(`/analysis/${videoId}`);
      return data;
    });
  },

  /** GET /api/analysis/:id/shots */
  async getShots(videoId: string): Promise<ShotAnalysis> {
    return cached(KEYS.shots(videoId), async () => {
      if (useMock) return (await mockServer.getAnalysis(videoId)).shots;
      const { data } = await http.get<ShotAnalysis>(`/analysis/${videoId}/shots`);
      return data;
    });
  },

  /** GET /api/analysis/:id/coverage */
  async getCoverage(videoId: string): Promise<CourtCoverage> {
    return cached(KEYS.coverage(videoId), async () => {
      if (useMock) return (await mockServer.getAnalysis(videoId)).coverage;
      const { data } = await http.get<CourtCoverage>(`/analysis/${videoId}/coverage`);
      return data;
    });
  },

  /** GET /api/analysis/:id/shuttle */
  async getShuttle(videoId: string): Promise<ShuttleData> {
    return cached(KEYS.shuttle(videoId), async () => {
      if (useMock) return (await mockServer.getAnalysis(videoId)).shuttle;
      const { data } = await http.get<ShuttleData>(`/analysis/${videoId}/shuttle`);
      return data;
    });
  },

  /** GET /api/analysis/:id/pose */
  async getPose(videoId: string): Promise<PoseAnalysis> {
    return cached(KEYS.pose(videoId), async () => {
      if (useMock) return (await mockServer.getAnalysis(videoId)).pose;
      const { data } = await http.get<PoseAnalysis>(`/analysis/${videoId}/pose`);
      return data;
    });
  },

  /** GET /api/analyses — history list. Short TTL: new uploads land here. */
  async listAnalyses(): Promise<AnalysisSummary[]> {
    return cached(
      KEYS.list,
      async () => {
        if (useMock) return mockServer.list();
        const { data } = await http.get<AnalysisSummary[]>('/analyses');
        return data;
      },
      30_000,
    );
  },

  /** DELETE /api/analysis/:id */
  async deleteAnalysis(videoId: string): Promise<void> {
    if (useMock) {
      await mockServer.remove(videoId);
    } else {
      await http.delete(`/analysis/${videoId}`);
    }
    cacheInvalidate(`analysis:${videoId}`, true);
    cacheInvalidate(KEYS.list);
  },

  /** POST /api/analysis/:id/cancel */
  async cancelAnalysis(videoId: string): Promise<void> {
    if (useMock) {
      await mockServer.cancel(videoId);
      return;
    }
    await http.post(`/analysis/${videoId}/cancel`);
  },

  /** POST /api/analysis/:id/retry */
  async retryAnalysis(videoId: string): Promise<void> {
    cacheInvalidate(`analysis:${videoId}`, true);
    if (useMock) {
      await mockServer.retry(videoId);
      return;
    }
    await http.post(`/analysis/${videoId}/retry`);
  },

  /** Drops every cached payload for one video (used after retry/refresh). */
  invalidate(videoId: string): void {
    cacheInvalidate(`analysis:${videoId}`, true);
    cacheInvalidate(KEYS.list);
  },
};
