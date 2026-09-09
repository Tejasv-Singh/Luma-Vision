import { useCallback, useEffect, useRef, useState } from 'react';
import { analysisService } from '@/api/analysisService';
import { errorMessage } from '@/api/client';
import { useToast } from '@/components/ui/Toast';
import { config, ACCEPTED_EXTENSIONS, isAcceptedVideo } from '@/utils/config';
import { formatBytes, makeId } from '@/utils/format';
import type { AnalysisStatus } from '@/types';

export interface UploadItem {
  /** Client-side id; stable for the lifetime of the row. */
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  status: AnalysisStatus;
  /** 0-100: upload bytes while uploading, pipeline progress while analyzing. */
  progress: number;
  stage: string;
  /** Assigned by the backend once the upload lands. */
  videoId?: string;
  error?: string;
  startedAt: string;
}

const TERMINAL: AnalysisStatus[] = ['complete', 'failed', 'cancelled'];

export interface ValidationResult {
  accepted: File[];
  rejected: { file: File; reason: string }[];
}

/** Type and size checks, applied before anything touches the network. */
export function validateFiles(files: File[]): ValidationResult {
  const accepted: File[] = [];
  const rejected: { file: File; reason: string }[] = [];

  for (const file of files) {
    if (!isAcceptedVideo(file)) {
      rejected.push({
        file,
        reason: `Unsupported format. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`,
      });
      continue;
    }
    if (file.size === 0) {
      rejected.push({ file, reason: 'File is empty.' });
      continue;
    }
    if (file.size > config.maxUploadBytes) {
      rejected.push({
        file,
        reason: `Exceeds the ${formatBytes(config.maxUploadBytes, 0)} limit (file is ${formatBytes(file.size)}).`,
      });
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected };
}

interface UseUploadsOptions {
  /** Fired once a job finishes analysis, so the dashboard can switch to it. */
  onAnalysisComplete?: (videoId: string) => void;
}

/**
 * Upload + analysis queue.
 *
 * Each item owns an AbortController so a single upload can be cancelled without
 * touching its neighbours, and a poll timer that stops as soon as the job
 * reaches a terminal state.
 */
export function useUploads({ onAnalysisComplete }: UseUploadsOptions = {}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const pollers = useRef(new Map<string, ReturnType<typeof setInterval>>());
  const toast = useToast();

  const completeRef = useRef(onAnalysisComplete);
  completeRef.current = onAnalysisComplete;

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const stopPolling = useCallback((id: string) => {
    const timer = pollers.current.get(id);
    if (timer) {
      clearInterval(timer);
      pollers.current.delete(id);
    }
  }, []);

  /** Follows a queued job through the analysis pipeline to a terminal state. */
  const pollJob = useCallback(
    (id: string, videoId: string) => {
      stopPolling(id);
      const timer = setInterval(async () => {
        try {
          const job = await analysisService.getJob(videoId);
          patch(id, { status: job.status, progress: job.progress, stage: job.stage });

          if (TERMINAL.includes(job.status)) {
            stopPolling(id);
            if (job.status === 'complete') {
              analysisService.invalidate(videoId);
              toast.success('Analysis complete', job.match.title);
              completeRef.current?.(videoId);
            } else if (job.status === 'failed') {
              patch(id, { error: job.error ?? 'The analysis pipeline failed.' });
              toast.error('Analysis failed', job.error ?? 'The pipeline could not process this video.');
            }
          }
        } catch (error) {
          stopPolling(id);
          patch(id, { status: 'failed', error: errorMessage(error) });
        }
      }, 900);
      pollers.current.set(id, timer);
    },
    [patch, stopPolling, toast],
  );

  const startUpload = useCallback(
    async (item: UploadItem) => {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      patch(item.id, { status: 'uploading', progress: 0, stage: 'Uploading', error: undefined });

      try {
        const response = await analysisService.upload(item.file, {
          signal: controller.signal,
          onProgress: (percent) => patch(item.id, { progress: percent }),
        });

        patch(item.id, {
          videoId: response.videoId,
          status: 'queued',
          progress: 0,
          stage: 'Queued for analysis',
        });
        toast.info('Upload complete', `${item.name} is queued for analysis.`);
        pollJob(item.id, response.videoId);
      } catch (error) {
        const message = errorMessage(error);
        const cancelled = message.toLowerCase().includes('cancel');
        patch(item.id, {
          status: cancelled ? 'cancelled' : 'failed',
          stage: cancelled ? 'Cancelled' : 'Upload failed',
          ...(cancelled ? {} : { error: message }),
        });
        if (!cancelled) toast.error('Upload failed', message);
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [patch, pollJob, toast],
  );

  /** Validates, enqueues and starts uploads for a batch of dropped files. */
  const addFiles = useCallback(
    (files: File[]) => {
      const { accepted, rejected } = validateFiles(files);

      for (const { file, reason } of rejected) {
        toast.error(`Cannot upload ${file.name}`, reason);
      }
      if (accepted.length === 0) return;

      const queued: UploadItem[] = accepted.map((file) => ({
        id: makeId('up'),
        file,
        name: file.name,
        sizeBytes: file.size,
        status: 'pending',
        progress: 0,
        stage: 'Waiting',
        startedAt: new Date().toISOString(),
      }));

      setItems((current) => [...queued, ...current]);
      for (const item of queued) void startUpload(item);
    },
    [startUpload, toast],
  );

  const cancel = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      controllers.current.get(id)?.abort();
      stopPolling(id);

      if (item?.videoId && (item.status === 'queued' || item.status === 'analyzing')) {
        try {
          await analysisService.cancelAnalysis(item.videoId);
        } catch {
          // Best effort — the row is marked cancelled regardless.
        }
      }
      patch(id, { status: 'cancelled', stage: 'Cancelled' });
      toast.info('Cancelled', item?.name);
    },
    [items, patch, stopPolling, toast],
  );

  const retry = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      // A job that already uploaded can be re-run server-side; otherwise the
      // file has to go up again.
      if (item.videoId) {
        try {
          await analysisService.retryAnalysis(item.videoId);
          patch(id, { status: 'queued', progress: 0, stage: 'Queued for analysis', error: undefined });
          pollJob(id, item.videoId);
          return;
        } catch (error) {
          toast.error('Retry failed', errorMessage(error));
          return;
        }
      }
      void startUpload(item);
    },
    [items, patch, pollJob, startUpload, toast],
  );

  const remove = useCallback(
    (id: string) => {
      controllers.current.get(id)?.abort();
      controllers.current.delete(id);
      stopPolling(id);
      setItems((current) => current.filter((item) => item.id !== id));
    },
    [stopPolling],
  );

  const clearFinished = useCallback(() => {
    setItems((current) => current.filter((item) => !TERMINAL.includes(item.status)));
  }, []);

  // Abort everything in flight if the dashboard unmounts.
  useEffect(() => {
    const activeControllers = controllers.current;
    const activePollers = pollers.current;
    return () => {
      for (const controller of activeControllers.values()) controller.abort();
      for (const timer of activePollers.values()) clearInterval(timer);
      activeControllers.clear();
      activePollers.clear();
    };
  }, []);

  const activeCount = items.filter((item) => !TERMINAL.includes(item.status)).length;

  return { items, addFiles, cancel, retry, remove, clearFinished, activeCount };
}
