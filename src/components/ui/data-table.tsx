'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react';
import { Table, THead, TH, TD, TR } from './table';
import { Pagination } from './pagination';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  searchable?: boolean;
  align?: 'left' | 'right';
  className?: string;
  accessor?: (row: T) => string | number | null;
  render?: (row: T) => ReactNode;
}

export interface ServerState {
  total: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  search?: string;
  loading?: boolean;
  onChange: (s: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
    search?: string;
  }) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  toolbar?: ReactNode;
  server?: ServerState;
}

const normalize = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchPlaceholder,
  emptyLabel,
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 10,
  toolbar,
  server,
}: DataTableProps<T>) {
  const t = useTranslations('table');
  const isServer = !!server;

  // ----- local (client mode) state -----
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // local immediate search value (debounced into server.onChange)
  const [searchInput, setSearchInput] = useState(server?.search ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function onSearchChange(value: string) {
    setSearchInput(value);
    if (isServer) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        server!.onChange({ ...serverSnapshot(), page: 1, search: value || undefined });
      }, 300);
    } else {
      setSearch(value);
      setPage(1);
    }
  }

  const serverSnapshot = () => ({
    page: server!.page,
    pageSize: server!.pageSize,
    sortBy: server!.sortBy,
    sortDir: server!.sortDir,
    search: server!.search,
  });

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (isServer) {
      const dir: 'ASC' | 'DESC' =
        server!.sortBy === col.key && server!.sortDir === 'ASC' ? 'DESC' : 'ASC';
      server!.onChange({ ...serverSnapshot(), page: 1, sortBy: col.key, sortDir: dir });
      return;
    }
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  }

  // ----- client-mode derived data -----
  const processed = useMemo(() => {
    if (isServer) return data;
    let rows = data;
    if (search) {
      const q = normalize(search);
      const cols = columns.filter((c) => c.searchable);
      rows = rows.filter((row) =>
        cols.some((c) => {
          const v = c.accessor ? c.accessor(row) : (row as any)[c.key];
          return v != null && normalize(String(v)).includes(q);
        }),
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      rows = [...rows].sort((a, b) => {
        const av = col?.accessor ? col.accessor(a) : (a as any)[sortKey];
        const bv = col?.accessor ? col.accessor(b) : (b as any)[sortKey];
        let cmp = 0;
        if (av == null && bv == null) cmp = 0;
        else if (av == null) cmp = -1;
        else if (bv == null) cmp = 1;
        else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
        else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [isServer, data, search, sortKey, sortDir, columns]);

  const total = isServer ? server!.total : processed.length;
  const curPage = isServer ? server!.page : page;
  const curSize = isServer ? server!.pageSize : pageSize;

  // clamp client page if out of range (e.g. after toolbar filter changes)
  useEffect(() => {
    if (isServer) return;
    const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
    if (page > totalPages) setPage(1);
  }, [processed.length, pageSize, page, isServer]);

  const pageRows = isServer
    ? data
    : processed.slice((curPage - 1) * curSize, curPage * curSize);

  function setSize(size: number) {
    if (isServer) server!.onChange({ ...serverSnapshot(), page: 1, pageSize: size });
    else {
      setPageSize(size);
      setPage(1);
    }
  }
  function goPage(p: number) {
    if (isServer) server!.onChange({ ...serverSnapshot(), page: p });
    else setPage(p);
  }

  const activeSortKey = isServer ? server!.sortBy : sortKey;
  const activeSortDir = isServer ? (server!.sortDir === 'DESC' ? 'desc' : 'asc') : sortDir;

  const from = total === 0 ? 0 : (curPage - 1) * curSize + 1;
  const to = Math.min(curPage * curSize, total);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="datatable-search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder || t('search')}
            className="input-base w-64 pl-9"
          />
        </div>
        {toolbar}
      </div>

      <div className="card overflow-hidden">
        <Table>
          <THead>
            <tr>
              {columns.map((c) => (
                <TH
                  key={c.key}
                  className={cn(c.align === 'right' && 'text-right', c.sortable && 'cursor-pointer select-none', c.className)}
                  onClick={() => toggleSort(c)}
                >
                  <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                    {c.header}
                    {c.sortable &&
                      (activeSortKey === c.key ? (
                        activeSortDir === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-brand-600" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-brand-600" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                      ))}
                  </span>
                </TH>
              ))}
            </tr>
          </THead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <TD colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                  {emptyLabel || t('noResults')}
                </TD>
              </tr>
            ) : (
              pageRows.map((row) => (
                <TR key={rowKey(row)}>
                  {columns.map((c) => (
                    <TD key={c.key} className={cn(c.align === 'right' && 'text-right', c.className)}>
                      {c.render ? c.render(row) : ((c.accessor ? c.accessor(row) : (row as any)[c.key]) ?? '—')}
                    </TD>
                  ))}
                </TR>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{t('perPage')}:</span>
          <select
            value={curSize}
            onChange={(e) => setSize(Number(e.target.value))}
            className="rounded-lg border border-input bg-card px-2 py-1 text-sm outline-none focus:border-brand-500"
          >
            {pageSizeOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <span className="ml-2">
            {t('showing')} {from}–{to} {t('of')} {total}
          </span>
        </div>
        <Pagination page={curPage} pageSize={curSize} total={total} onPage={goPage} />
      </div>
    </div>
  );
}
