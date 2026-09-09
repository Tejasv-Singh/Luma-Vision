import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Badge } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { formatDuration } from '@/utils/format';
import { ACCENT, STATUS } from '@/utils/viz';
import { cn } from '@/utils/cn';
import { SHOT_LABELS, type TimelineEvent, type VideoMetadata } from '@/types';

interface VideoPlayerProps {
  video: VideoMetadata;
  timeline: TimelineEvent[];
  /** Match duration used when the video element has no source to measure. */
  fallbackDuration: number;
}

const EVENT_COLOR = {
  shot: ACCENT,
  point: STATUS.good,
  fault: STATUS.critical,
  'rally-start': 'rgba(255,255,255,0.35)',
  'rally-end': 'rgba(255,255,255,0.35)',
} as const;

/**
 * Video review surface: playback, an analysis overlay drawn from timeline
 * events, and a scrubber marking every shot and point in the match.
 *
 * When no playable source exists (a restored analysis, or a backend that does
 * not stream the original file) the player degrades to a timeline-only view
 * rather than showing a broken `<video>` element.
 */
export function VideoPlayer({ video, timeline, fallbackDuration }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration);
  const [playing, setPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const hasSource = Boolean(video.sourceUrl);
  const frameStep = 1 / Math.max(1, video.fps);

  // Only shots and points get markers; rally boundaries would swamp the track.
  const markers = useMemo(
    () => timeline.filter((event) => event.kind === 'shot' || event.kind === 'point' || event.kind === 'fault'),
    [timeline],
  );

  /** Events within a half-second of the playhead, drawn on the overlay. */
  const activeEvents = useMemo(
    () => timeline.filter((event) => Math.abs(event.t - currentTime) < 0.5),
    [currentTime, timeline],
  );

  const nearestEvent = useMemo(() => {
    let best: TimelineEvent | null = null;
    let bestDelta = Infinity;
    for (const event of markers) {
      const delta = Math.abs(event.t - currentTime);
      if (delta < bestDelta) {
        best = event;
        bestDelta = delta;
      }
    }
    return best;
  }, [currentTime, markers]);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), duration);
      setCurrentTime(clamped);
      if (videoRef.current && hasSource) videoRef.current.currentTime = clamped;
    },
    [duration, hasSource],
  );

  const togglePlay = useCallback(() => {
    const element = videoRef.current;
    if (!element || !hasSource) return;
    if (element.paused) void element.play();
    else element.pause();
  }, [hasSource]);

  // Keyboard transport: space toggles, arrows step a frame, shift+arrow 1 s.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        seek(currentTime - (event.shiftKey ? 1 : frameStep));
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        seek(currentTime + (event.shiftKey ? 1 : frameStep));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentTime, frameStep, seek, togglePlay]);

  return (
    <Panel
      title="Video review"
      subtitle={`${video.filename} · ${video.fps} fps`}
      actions={
        <button
          type="button"
          onClick={() => setShowOverlay((v) => !v)}
          aria-pressed={showOverlay}
          className={cn('btn-ghost !py-1.5 text-xs', showOverlay && 'border-gold-500/45 text-gold-500')}
        >
          Analysis overlay
        </button>
      }
    >
      {/* Frame ------------------------------------------------------------ */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-navy-950">
        <div className="relative aspect-video w-full">
          {hasSource ? (
            <video
              ref={videoRef}
              src={video.sourceUrl}
              className="h-full w-full object-contain"
              onLoadedMetadata={(event) => {
                const value = event.currentTarget.duration;
                if (Number.isFinite(value) && value > 0) setDuration(value);
              }}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              playsInline
            />
          ) : (
            <EmptyState
              icon="🎞️"
              title="No playable source for this analysis"
              description="Statistics were restored from the saved analysis, but the original video is not available in this session. Re-upload the file to review it frame by frame."
            />
          )}

          {/* Analysis overlay ------------------------------------------------ */}
          {showOverlay && hasSource && (
            <svg
              viewBox="0 0 100 56.25"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden
            >
              {activeEvents
                .filter((event) => event.position)
                .map((event) => (
                  <g key={event.id}>
                    <circle
                      cx={event.position!.x * 100}
                      cy={event.position!.y * 56.25}
                      r="2.4"
                      fill="none"
                      stroke={ACCENT}
                      strokeWidth="0.5"
                    />
                    <circle
                      cx={event.position!.x * 100}
                      cy={event.position!.y * 56.25}
                      r="0.7"
                      fill={ACCENT}
                    />
                    <text
                      x={event.position!.x * 100 + 3.4}
                      y={event.position!.y * 56.25 + 1}
                      fill={ACCENT}
                      fontSize="2.2"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {event.shotType ? SHOT_LABELS[event.shotType] : event.label}
                    </text>
                  </g>
                ))}
            </svg>
          )}

          {showOverlay && hasSource && nearestEvent && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-navy-950/85 px-3 py-2 backdrop-blur">
              <p className="font-mono text-[11px] tabular-nums text-gold-500">
                {formatDuration(currentTime)} · frame{' '}
                {Math.round(currentTime * video.fps)}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-ink-100">{nearestEvent.label}</p>
            </div>
          )}
        </div>
      </div>

      {/* Transport -------------------------------------------------------- */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!hasSource}
          className="btn-primary !px-3"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="3" height="10" rx="1" />
              <rect x="8" y="2" width="3" height="10" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
              <path d="M4 2.5l7 4.5-7 4.5z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => seek(currentTime - frameStep)}
          disabled={!hasSource}
          className="btn-ghost !py-1.5 font-mono text-xs"
          title="Previous frame (←)"
        >
          ◀ frame
        </button>
        <button
          type="button"
          onClick={() => seek(currentTime + frameStep)}
          disabled={!hasSource}
          className="btn-ghost !py-1.5 font-mono text-xs"
          title="Next frame (→)"
        >
          frame ▶
        </button>

        <span className="ml-auto font-mono text-xs tabular-nums text-ink-300">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      </div>

      {/* Scrubber --------------------------------------------------------- */}
      <div className="mt-4">
        <div className="relative h-12 rounded-xl border border-white/[0.07] bg-navy-950/70 px-1">
          {/* Event markers sit behind the range input so they stay visible. */}
          <div className="pointer-events-none absolute inset-x-1 inset-y-0">
            {markers.map((event) => (
              <span
                key={event.id}
                className="absolute top-2 h-4 w-[2px] rounded-full opacity-70"
                style={{
                  left: `${(event.t / Math.max(1, duration)) * 100}%`,
                  background: EVENT_COLOR[event.kind],
                }}
              />
            ))}
            <span
              className="absolute inset-y-1 w-[2px] rounded-full bg-gold-400"
              style={{ left: `${(currentTime / Math.max(1, duration)) * 100}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration}
            step={frameStep}
            value={currentTime}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Seek through the match"
            className="absolute inset-x-1 bottom-0 h-6 w-[calc(100%-0.5rem)] cursor-pointer appearance-none bg-transparent
                       [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold-500
                       [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-gold-500"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <LegendDot color={EVENT_COLOR.shot} label="Shot" />
          <LegendDot color={EVENT_COLOR.point} label="Point" />
          <LegendDot color={EVENT_COLOR.fault} label="Fault" />
          <span className="ml-auto text-[11px] text-ink-500">
            Space to play · ← → step one frame · Shift + ← → one second
          </span>
        </div>
      </div>

      {/* Nearby events ----------------------------------------------------- */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
        {markers
          .filter((event) => event.t >= currentTime - 6 && event.t <= currentTime + 6)
          .slice(0, 10)
          .map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => seek(event.t)}
              className="chip transition-colors hover:border-gold-500/50 hover:text-gold-500"
            >
              <span className="font-mono tabular-nums">{formatDuration(event.t)}</span>
              {event.label}
            </button>
          ))}
        {markers.length === 0 && <Badge>No timeline events detected</Badge>}
      </div>
    </Panel>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-ink-400">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
