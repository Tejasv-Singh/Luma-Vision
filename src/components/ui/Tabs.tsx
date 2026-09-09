import { useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TabDef<T extends string> {
  id: T;
  label: string;
  /** Short glyph shown before the label on wide screens. */
  icon?: ReactNode;
  badge?: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: readonly TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

/**
 * Roving-focus tab strip following the WAI-ARIA tabs pattern: arrows move
 * between tabs, Home/End jump to the ends, and only the active tab is tabbable.
 */
export function Tabs<T extends string>({ tabs, active, onChange, className }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((t) => t.id === active);
      if (currentIndex < 0) return;

      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;

      event.preventDefault();
      const next = tabs[nextIndex];
      if (!next) return;
      onChange(next.id);
      listRef.current?.querySelector<HTMLButtonElement>(`#tab-${next.id}`)?.focus();
    },
    [active, onChange, tabs],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Analysis sections"
      onKeyDown={onKeyDown}
      className={cn(
        'flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.07] bg-navy-900/60 p-1.5',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold',
              'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-gold-500/70',
              selected
                ? 'bg-gold-grad text-navy-950 shadow-glow'
                : 'text-ink-300 hover:bg-white/[0.05] hover:text-ink-100',
            )}
          >
            {tab.icon && <span aria-hidden className="text-base leading-none">{tab.icon}</span>}
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
                  selected ? 'bg-navy-950/20 text-navy-950' : 'bg-white/10 text-ink-300',
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return null;
  return (
    <div
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className="animate-fade-up focus-visible:outline-none"
    >
      {children}
    </div>
  );
}
