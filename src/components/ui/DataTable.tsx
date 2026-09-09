import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Cell renderer. */
  render: (row: T) => ReactNode;
  /** Value used for sorting; omit to make the column unsortable. */
  sortValue?: (row: T) => number | string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Hidden below `sm` so narrow screens keep the essential columns. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Column key to sort by initially. */
  initialSort?: { key: string; direction: 'asc' | 'desc' };
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  /** Highlights a row (e.g. the hovered heatmap zone). */
  highlightKey?: string | null;
}

/**
 * Responsive, sortable table. Sorting is client-side over the provided rows —
 * these breakdowns are bounded (16 zones, 6 shot types), so there is no need to
 * push ordering to the server.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  initialSort,
  onRowClick,
  emptyMessage = 'No rows to show.',
  className,
  highlightKey = null,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    initialSort ?? null,
  );

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort.direction === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [columns, rows, sort]);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'desc' };
      return { key, direction: current.direction === 'desc' ? 'asc' : 'desc' };
    });
  };

  const alignClass = (align: Column<T>['align']) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  if (rows.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-ink-400">{emptyMessage}</p>;
  }

  return (
    <div className={cn('-mx-1 overflow-x-auto px-1', className)}>
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/[0.08]">
            {columns.map((column) => {
              const sortable = Boolean(column.sortValue);
              const isActive = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={isActive ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400',
                    alignClass(column.align),
                    column.hideOnMobile && 'hidden sm:table-cell',
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded transition-colors hover:text-gold-500',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60',
                        isActive && 'text-gold-500',
                      )}
                    >
                      {column.header}
                      <span aria-hidden className="text-[9px]">
                        {isActive ? (sort!.direction === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-white/[0.04] transition-colors last:border-0',
                  onRowClick && 'cursor-pointer',
                  highlightKey === key ? 'bg-gold-500/10' : 'hover:bg-white/[0.03]',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2.5 text-ink-200',
                      alignClass(column.align),
                      column.hideOnMobile && 'hidden sm:table-cell',
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
