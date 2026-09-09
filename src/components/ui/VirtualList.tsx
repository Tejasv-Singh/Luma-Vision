import { useCallback, useMemo, useRef, useState, type ReactNode, type UIEvent } from 'react';
import { cn } from '@/utils/cn';

interface VirtualListProps<T> {
  items: T[];
  /** Fixed row height in px — required for the windowing maths. */
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  itemKey: (item: T, index: number) => string;
  /** Rows rendered above/below the viewport to hide scroll tearing. */
  overscan?: number;
  className?: string;
  /** Rendered instead of the list when `items` is empty. */
  empty?: ReactNode;
}

/**
 * Minimal fixed-height windowing list.
 *
 * A finished match yields several thousand timeline events; rendering them all
 * as DOM nodes stalls the main thread on tab switch. Below the threshold the
 * component just renders everything, so short lists pay no overhead.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  itemKey,
  overscan = 6,
  className,
  empty,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const frame = useRef<number>();

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const { scrollTop: next } = event.currentTarget;
    // Coalesce scroll updates to one state write per animation frame.
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setScrollTop(next));
  }, []);

  const { startIndex, visible, offsetY } = useMemo(() => {
    const visibleCount = Math.ceil(height / itemHeight);
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    return {
      startIndex: start,
      visible: items.slice(start, end),
      offsetY: start * itemHeight,
    };
  }, [height, itemHeight, items, overscan, scrollTop]);

  if (items.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div
      onScroll={onScroll}
      style={{ height }}
      className={cn('relative overflow-y-auto', className)}
      role="list"
    >
      <div style={{ height: items.length * itemHeight }} className="relative">
        <div style={{ transform: `translateY(${offsetY}px)` }} className="absolute inset-x-0 top-0">
          {visible.map((item, i) => {
            const index = startIndex + i;
            return (
              <div key={itemKey(item, index)} role="listitem" style={{ height: itemHeight }}>
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
