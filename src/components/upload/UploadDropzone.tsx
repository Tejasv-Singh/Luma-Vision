import { useCallback, useRef, useState, type DragEvent } from 'react';
import { cn } from '@/utils/cn';
import { ACCEPTED_EXTENSIONS, config } from '@/utils/config';
import { formatBytes } from '@/utils/format';
import { useDebouncedCallback } from '@/hooks/useDebounce';

interface UploadDropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Drag-and-drop + click-to-browse video intake.
 *
 * The submit path is debounced because a drop and the resulting `change` event
 * can both fire for the same selection in some browsers, and because holding a
 * file over the zone produces a burst of dragenter/dragleave pairs.
 */
export function UploadDropzone({ onFiles, disabled = false, className }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Drag events bubble from child nodes; counting enter/leave avoids flicker.
  const dragDepth = useRef(0);

  const submit = useDebouncedCallback((files: File[]) => {
    if (files.length > 0) onFiles(files);
  }, 150);

  const onDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (disabled) return;
      submit(Array.from(event.dataTransfer.files));
    },
    [disabled, submit],
  );

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn('relative', className)}
    >
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_EXTENSIONS, 'video/*'].join(',')}
        multiple
        className="sr-only"
        onChange={(event) => {
          submit(Array.from(event.target.files ?? []));
          // Reset so re-selecting the same file fires `change` again.
          event.target.value = '';
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label="Upload match video: drag and drop a file here, or click to browse"
        className={cn(
          'group flex w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed',
          'px-6 py-12 text-center transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70',
          disabled && 'cursor-not-allowed opacity-50',
          dragging
            ? 'border-gold-500 bg-gold-500/[0.08] shadow-glow'
            : 'border-white/12 bg-white/[0.02] hover:border-gold-500/45 hover:bg-white/[0.04]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'grid h-16 w-16 place-items-center rounded-2xl transition-all duration-200',
            dragging
              ? 'scale-110 bg-gold-500/20 text-gold-500'
              : 'bg-white/[0.05] text-ink-300 group-hover:text-gold-500',
          )}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <span className="space-y-1.5">
          <span className="block text-base font-semibold text-ink-100">
            {dragging ? 'Drop to start analysis' : 'Drop a match video here'}
          </span>
          <span className="block text-sm text-ink-400">
            or <span className="font-semibold text-gold-500">browse your files</span>
          </span>
        </span>

        <span className="flex flex-wrap items-center justify-center gap-2">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span key={ext} className="chip">
              {ext.replace('.', '')}
            </span>
          ))}
          <span className="chip">max {formatBytes(config.maxUploadBytes, 0)}</span>
        </span>
      </button>
    </div>
  );
}
