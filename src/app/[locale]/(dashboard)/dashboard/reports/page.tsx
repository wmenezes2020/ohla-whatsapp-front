'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TH, TD, TR } from '@/components/ui/table';
import { MessageStatusBadge } from '@/components/status-badges';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useRealtime } from '@/lib/socket';
import type { MessageEventRow, MessageRow } from '@/lib/types';

const STATUSES = ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'];

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const tType = useTranslations('messageType');
  const locale = useLocale();
  const qc = useQueryClient();

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['messages', status, page],
    queryFn: async () =>
      (
        await api.get('/reports/messages', {
          params: { status: status || undefined, page, pageSize: 20 },
        })
      ).data as { items: MessageRow[]; total: number; page: number; totalPages: number },
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

  const data = list.data;
  const rows = data?.items || [];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
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
        }
      />

      <Card>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{t('noMessages')}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{t('to')}</TH>
                <TH>{t('type')}</TH>
                <TH>{tc('status')}</TH>
                <TH>{t('externalId')}</TH>
                <TH>{t('date')}</TH>
                <TH className="text-right">{tc('actions')}</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium text-slate-800">+{m.toNumber}</TD>
                  <TD>{tType(m.type)}</TD>
                  <TD>
                    <MessageStatusBadge status={m.status} />
                  </TD>
                  <TD className="text-slate-500">{m.externalId || '—'}</TD>
                  <TD className="text-slate-500">{formatDate(m.createdAt, locale)}</TD>
                  <TD className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setDetailId(m.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm text-slate-500">
          <span>
            {t('page')} {data.page} {t('of')} {data.totalPages}
          </span>
          <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

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
                      <span className="text-xs text-slate-400">
                        {formatDate(ev.createdAt, locale)}
                      </span>
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
