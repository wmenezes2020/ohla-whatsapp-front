'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Builds a compact page list with ellipsis, e.g. [1, '…', 4, 5, 6, '…', 20]. */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="prev"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pageList(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1.5 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'min-w-8 rounded-md px-2.5 py-1 text-sm font-medium transition',
              p === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="next"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
