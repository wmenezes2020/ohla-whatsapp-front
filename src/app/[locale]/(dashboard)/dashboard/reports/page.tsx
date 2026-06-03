'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { MessageStatusBadge } from '@/components/status-badges';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useRealtime } from '@/lib/socket';
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
  const [sortBy, setSortBy] = useState<'createdAt' | 'status' | 'toNumber'>('createdAt');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [channelId, setChannelId] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: async () => (await api.get<Channel[]>('/channels')).data,
  });

  const list = useQuery({
    queryKey: ['messages', page, pageSize, sortBy, sortDir, search, status, channelId],
    queryFn: async () =>
      (
        await api.get('/reports/messages', {
          params: {
            page,
            pageSize,
            sortBy,
            sortDir,
            search: search || undefined,
            status: status || undefined,
            channelId: channelId || undefined,
          },
        })
      ).data as { items: MessageRow[]; total: number; page: number },
  });

  const detail = useQuery({
    queryKey: ['message-detail', detailId],
    enabled: !!detailId,
    queryFn: async () =>
      (await api.get(`/reports/messages/${detailId}`)).data as {
        message: MessageRow;
        events: MessageEventRow[];
      },
  });

  useRealtime({
    'message.status': () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

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
          </>
        }
        columns={[
          {
            key: 'toNumber',
            header: t('to'),
            sortable: true,
            render: (m) => <span className="font-medium text-slate-800">+{m.toNumber}</span>,
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
            key: 'externalId',
            header: t('externalId'),
            render: (m) => <span className="text-slate-500">{m.externalId || '—'}</span>,
          },
          {
            key: 'createdAt',
            header: t('date'),
            sortable: true,
            render: (m) => <span className="text-slate-500">{formatDate(m.createdAt, locale)}</span>,
          },
          {
            key: 'actions',
            header: tc('actions'),
            align: 'right',
            render: (m) => (
              <Button size="sm" variant="ghost" onClick={() => setDetailId(m.id)}>
                <Eye className="h-4 w-4" />
              </Button>
            ),
          },
        ] as Column<MessageRow>[]}
      />

      <Dialog open={!!detailId} onClose={() => setDetailId(null)} title={t('detail')}>
        {detail.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-400">{t('to')}</p>
                <p className="font-medium">+{detail.data.message.toNumber}</p>
              </div>
              <div>
                <p className="text-slate-400">{tc('status')}</p>
                <MessageStatusBadge status={detail.data.message.status} />
              </div>
            </div>
            {detail.data.message.text && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {detail.data.message.text}
              </div>
            )}
            {detail.data.message.error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {JSON.stringify(detail.data.message.error)}
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">{t('timeline')}</p>
              <ol className="space-y-2 border-l-2 border-slate-100 pl-4">
                {detail.data.events.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[1.30rem] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
                    <div className="flex items-center justify-between">
                      <MessageStatusBadge status={ev.status} />
                      <span className="text-xs text-slate-400">{formatDate(ev.createdAt, locale)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
