'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Download, Eye, Send, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { MessageStatusBadge } from '@/components/status-badges';
import { api, apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useRealtime } from '@/lib/socket';
import { useDebouncedCallback } from '@/lib/use-debounced';
import type { Channel, MessageEventRow, MessageRow } from '@/lib/types';

const STATUSES = ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'];

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const tType = useTranslations('messageType');
  const locale = useLocale();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<'createdAt' | 'status' | 'toNumber' | 'replyTo'>('createdAt');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [channelId, setChannelId] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<MessageRow | null>(null);
  const [editForm, setEditForm] = useState({ toNumber: '', text: '', replyTo: '' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: async () => (await api.get<Channel[]>('/channels')).data,
  });

  const replyLines = useQuery({
    queryKey: ['reply-lines'],
    queryFn: async () => (await api.get<string[]>('/reports/reply-lines')).data,
  });

  const filters = {
    sortBy,
    sortDir,
    search: search || undefined,
    status: status || undefined,
    channelId: channelId || undefined,
    replyTo: replyTo || undefined,
    // Interpreted in Bogotá time so the day boundaries match the dashboard.
    from: dateFrom ? `${dateFrom}T00:00:00-05:00` : undefined,
    to: dateTo ? `${dateTo}T23:59:59-05:00` : undefined,
  };

  const list = useQuery({
    queryKey: [
      'messages',
      page,
      pageSize,
      sortBy,
      sortDir,
      search,
      status,
      channelId,
      replyTo,
      dateFrom,
      dateTo,
    ],
    queryFn: async () =>
      (await api.get('/reports/messages', { params: { page, pageSize, ...filters } })).data as {
        items: MessageRow[];
        total: number;
        page: number;
      },
  });

  async function exportCsv() {
    setExporting(true);
    try {
      const rows = (await api.get<MessageRow[]>('/reports/messages/export', { params: filters })).data;
      const head = ['Destinatario', 'Tipo', 'Estado', 'Linea de respuesta', 'ID externo', 'Fecha'];
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const body = rows.map((m) =>
        [
          `+${m.toNumber}`,
          m.type,
          m.status,
          m.replyTo ? `+${m.replyTo}` : '',
          m.externalId ?? '',
          formatDate(m.createdAt, locale),
        ]
          .map(esc)
          .join(','),
      );
      // BOM so Excel detects UTF-8 correctly.
      const csv = '﻿' + [head.map(esc).join(','), ...body].join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `reportes-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const detail = useQuery({
    queryKey: ['message-detail', detailId],
    enabled: !!detailId,
    queryFn: async () =>
      (await api.get(`/reports/messages/${detailId}`)).data as {
        message: MessageRow;
        events: MessageEventRow[];
      },
  });

  // Coalesce realtime bursts during active dispatch into one invalidate.
  const invalidateMessages = useDebouncedCallback(
    () => qc.invalidateQueries({ queryKey: ['messages'] }),
    2000,
  );
  useRealtime({
    'message.status': invalidateMessages,
  });

  const isDelivered = (s: string) => ['SENT', 'DELIVERED', 'READ'].includes(s);

  async function resend(m: MessageRow) {
    setBusyId(m.id);
    try {
      await api.post(`/reports/messages/${m.id}/resend`);
      toast.success(t('resent'));
      qc.invalidateQueries({ queryKey: ['messages'] });
    } catch (e) {
      toast.error(apiError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeRow(m: MessageRow) {
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusyId(m.id);
    try {
      await api.delete(`/reports/messages/${m.id}`);
      qc.invalidateQueries({ queryKey: ['messages'] });
    } catch (e) {
      toast.error(apiError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(m: MessageRow) {
    setEditRow(m);
    setEditForm({ toNumber: m.toNumber, text: m.text || '', replyTo: m.replyTo || '' });
  }

  async function saveEdit() {
    if (!editRow) return;
    setBusyId(editRow.id);
    try {
      await api.patch(`/reports/messages/${editRow.id}`, {
        toNumber: editForm.toNumber,
        text: editForm.text,
        replyTo: editForm.replyTo || null,
      });
      setEditRow(null);
      qc.invalidateQueries({ queryKey: ['messages'] });
    } catch (e) {
      toast.error(apiError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button variant="outline" onClick={exportCsv} loading={exporting}>
            <Download className="h-4 w-4" /> {t('export')}
          </Button>
        }
      />

      <DataTable
        data={list.data?.items || []}
        rowKey={(m) => m.id}
        emptyLabel={t('noMessages')}
        server={{
          total: list.data?.total || 0,
          page,
          pageSize,
          sortBy,
          sortDir,
          search,
          loading: list.isFetching,
          onChange: (s) => {
            setPage(s.page);
            setPageSize(s.pageSize);
            setSortBy((s.sortBy as any) || 'createdAt');
            setSortDir(s.sortDir || 'DESC');
            setSearch(s.search || '');
          },
        }}
        toolbar={
          <>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-44"
            >
              <option value="">{tc('all')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              value={channelId}
              onChange={(e) => {
                setChannelId(e.target.value);
                setPage(1);
              }}
              className="w-48"
            >
              <option value="">{t('channel')}</option>
              {(channels.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              value={replyTo}
              onChange={(e) => {
                setReplyTo(e.target.value);
                setPage(1);
              }}
              className="w-48"
            >
              <option value="">{t('replyLines')}</option>
              {(replyLines.data || []).map((n) => (
                <option key={n} value={n}>
                  +{n}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              aria-label={t('dateFrom')}
              title={t('dateFrom')}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
            <Input
              type="date"
              aria-label={t('dateTo')}
              title={t('dateTo')}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
          </>
        }
        columns={[
          {
            key: 'toNumber',
            header: t('to'),
            sortable: true,
            render: (m) => <span className="font-medium text-foreground">+{m.toNumber}</span>,
          },
          {
            key: 'type',
            header: t('type'),
            render: (m) => tType(m.type),
          },
          {
            key: 'status',
            header: tc('status'),
            sortable: true,
            render: (m) => <MessageStatusBadge status={m.status} />,
          },
          {
            key: 'replyTo',
            header: t('replyLine'),
            sortable: true,
            render: (m) =>
              m.replyTo ? (
                <span className="text-foreground">+{m.replyTo}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: 'externalId',
            header: t('externalId'),
            render: (m) => <span className="text-muted-foreground">{m.externalId || '—'}</span>,
          },
          {
            key: 'createdAt',
            header: t('date'),
            sortable: true,
            render: (m) => <span className="text-muted-foreground">{formatDate(m.createdAt, locale)}</span>,
          },
          {
            key: 'actions',
            header: tc('actions'),
            align: 'right',
            render: (m) => (
              <div className="flex items-center justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setDetailId(m.id)} title={t('view')}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resend(m)}
                  disabled={busyId === m.id}
                  title={t('resend')}
                >
                  <Send className="h-4 w-4" />
                </Button>
                {!isDelivered(m.status) && (
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)} title={tc('edit')}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-500/10"
                  onClick={() => removeRow(m)}
                  disabled={busyId === m.id}
                  title={tc('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ] as Column<MessageRow>[]}
      />

      <Dialog open={!!detailId} onClose={() => setDetailId(null)} title={t('detail')}>
        {detail.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t('to')}</p>
                <p className="font-medium">+{detail.data.message.toNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{tc('status')}</p>
                <MessageStatusBadge status={detail.data.message.status} />
              </div>
            </div>
            {detail.data.message.text && (
              <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
                {detail.data.message.text}
              </div>
            )}
            {detail.data.message.error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-300">
                {JSON.stringify(detail.data.message.error)}
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">{t('timeline')}</p>
              <ol className="space-y-2 border-l-2 border-border pl-4">
                {detail.data.events.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[1.30rem] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
                    <div className="flex items-center justify-between">
                      <MessageStatusBadge status={ev.status} />
                      <span className="text-xs text-muted-foreground">{formatDate(ev.createdAt, locale)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!editRow} onClose={() => setEditRow(null)} title={t('editTitle')}>
        <div className="space-y-4">
          <Input
            label={t('to')}
            value={editForm.toNumber}
            onChange={(e) => setEditForm({ ...editForm, toNumber: e.target.value })}
          />
          <Input
            label={t('replyLine')}
            value={editForm.replyTo}
            onChange={(e) => setEditForm({ ...editForm, replyTo: e.target.value })}
          />
          <Textarea
            label={t('text')}
            rows={5}
            value={editForm.text}
            onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditRow(null)}>
              {tc('cancel')}
            </Button>
            <Button onClick={saveEdit} loading={busyId === editRow?.id}>
              {tc('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
