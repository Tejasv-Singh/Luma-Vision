import { useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface TooltipProps {
  /** Explanatory copy — what the metric means, not just its name. */
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const SIDE_CLASSES: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

/**
 * Hover/focus tooltip. Opens on pointer *and* keyboard focus so the metric
 * definitions stay reachable without a mouse, and closes on Escape.
 */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 80);
  };

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined} tabIndex={0} className="outline-none">
        {children}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 w-max max-w-[16rem] animate-fade-up rounded-lg',
            'border border-white/10 bg-navy-950/95 px-3 py-2 text-xs font-medium leading-relaxed',
            'text-ink-200 shadow-panel backdrop-blur',
            SIDE_CLASSES[side],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/** The small circled "i" that opens a metric definition. */
export function InfoHint({ content }: { content: ReactNode }) {
  return (
    <Tooltip content={content}>
      <span
        aria-label="What does this mean?"
        className="grid h-4 w-4 cursor-help place-items-center rounded-full border border-white/15
                   text-[9px] font-bold text-ink-400 transition-colors hover:border-gold-500/60 hover:text-gold-500"
      >
        i
      </span>
    </Tooltip>
  );
}
