import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CollapsibleProps {
  title: ReactNode;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  /** Right-aligned summary shown while collapsed (e.g. a count). */
  meta?: ReactNode;
}

/** Disclosure section used for long tables and secondary detail. */
export function Collapsible({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className,
  meta,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section className={cn('panel overflow-hidden', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500/60"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {meta && <span className="text-xs text-ink-400">{meta}</span>}
          <span
            aria-hidden
            className={cn(
              'grid h-6 w-6 place-items-center rounded-md border border-white/10 text-ink-300 transition-transform duration-200',
              open && 'rotate-180 border-gold-500/40 text-gold-500',
            )}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 4.5L6 8l3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </button>
      {open && (
        <div id={id} className="animate-fade-up border-t border-white/[0.06] p-5">
          {children}
        </div>
      )}
    </section>
  );
}
