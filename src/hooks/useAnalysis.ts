import { useCallback, useEffect, useRef, useState } from 'react';
import { analysisService } from '@/api/analysisService';
import { errorMessage } from '@/api/client';
import type { AnalysisJob, AnalysisResult, AnalysisSummary } from '@/types';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads a full analysis bundle for one video.
 *
 * Results are served from the service-level cache, so switching between
 * dashboard tabs or bouncing to history and back does not re-fetch.
 */
export function useAnalysis(videoId: string | null) {
  const [state, setState] = useState<AsyncState<AnalysisResult>>({
    data: null,
    loading: Boolean(videoId),
    error: null,
  });
  // Guards against a slow response for a previous video overwriting a newer one.
  const requestId = useRef(0);

  const load = useCallback(
    async (id: string, { force = false } = {}) => {
      const ticket = ++requestId.current;
      setState((s) => ({ ...s, loading: true, error: null }));
      if (force) analysisService.invalidate(id);

      try {
        const data = await analysisService.getAnalysis(id);
        if (ticket !== requestId.current) return;
        setState({ data, loading: false, error: null });
      } catch (error) {
        if (ticket !== requestId.current) return;
        setState({ data: null, loading: false, error: errorMessage(error) });
      }
    },
    [],
  );

  useEffect(() => {
    if (!videoId) {
      requestId.current += 1;
      setState({ data: null, loading: false, error: null });
      return;
    }
    void load(videoId);
  }, [load, videoId]);

  const refresh = useCallback(() => {
    if (videoId) void load(videoId, { force: true });
  }, [load, videoId]);

  return { ...state, refresh };
}

/**
 * Polls a running job until it reaches a terminal state.
 *
 * Polling stops on completion, failure or cancellation, and the interval is
 * cleared on unmount so a backgrounded dashboard makes no further requests.
 */
export function useJobPolling(
  videoId: string | null,
  enabled: boolean,
  intervalMs = 1000,
  onComplete?: (job: AnalysisJob) => void,
) {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (!videoId || !enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval>;

    const tick = async () => {
      try {
        const next = await analysisService.getJob(videoId);
        if (cancelled) return;
        setJob(next);
        if (next.status === 'complete' || next.status === 'failed' || next.status === 'cancelled') {
          clearInterval(timer);
          if (next.status === 'complete') completeRef.current?.(next);
        }
      } catch {
        // Transient poll failures are non-fatal; the next tick retries.
      }
    };

    void tick();
    timer = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, intervalMs, videoId]);

  return job;
}

/** The saved-analyses library backing history, search and compare. */
export function useAnalysisLibrary() {
  const [state, setState] = useState<AsyncState<AnalysisSummary[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await analysisService.listAnalyses();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(async (videoId: string) => {
    // Optimistic: the row disappears immediately, and is restored on failure.
    let previous: AnalysisSummary[] | null = null;
    setState((s) => {
      previous = s.data;
      return { ...s, data: s.data?.filter((item) => item.videoId !== videoId) ?? null };
    });

    try {
      await analysisService.deleteAnalysis(videoId);
    } catch (error) {
      setState((s) => ({ ...s, data: previous ?? s.data }));
      throw error;
    }
  }, []);

  return { ...state, refresh, remove };
}
