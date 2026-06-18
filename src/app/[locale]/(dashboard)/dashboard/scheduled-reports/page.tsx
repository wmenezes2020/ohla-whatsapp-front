'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Send, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { api, apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Channel, ReportSchedule } from '@/lib/types';

const STATUSES = ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'];
const REPEATS = ['none', 'daily', 'weekly', 'monthly'] as const;

const EMPTY = {
  subject: '',
  recipients: '',
  status: '',
  channelId: '',
  replyTo: '',
  search: '',
  scheduledDate: '',
  scheduledTime: '09:00',
  repeat: 'none' as ReportSchedule['repeat'],
  enabled: true,
};

export default function ScheduledReportsPage() {
  const t = useTranslations('scheduledReports');
  const tc = useTranslations('common');
  const tr = useTranslations('reports');
  const locale = useLocale();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const list = useQuery({
    queryKey: ['report-schedules'],
    queryFn: async () => (await api.get<ReportSchedule[]>('/report-schedules')).data,
  });
  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: async () => (await api.get<Channel[]>('/channels')).data,
  });
  const replyLines = useQuery({
    queryKey: ['reply-lines'],
    queryFn: async () => (await api.get<string[]>('/reports/reply-lines')).data,
  });

  function payload() {
    return {
      subject: form.subject,
      recipients: form.recipients,
      filters: {
        status: form.status || undefined,
        channelId: form.channelId || undefined,
        replyTo: form.replyTo || undefined,
        search: form.search || undefined,
      },
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      repeat: form.repeat,
      enabled: form.enabled,
    };
  }

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY });
    setOpen(true);
  }
  function openEdit(s: ReportSchedule) {
    setEditId(s.id);
    setForm({
      subject: s.subject,
      recipients: s.recipients,
      status: s.filters?.status || '',
      channelId: s.filters?.channelId || '',
      replyTo: s.filters?.replyTo || '',
      search: s.filters?.search || '',
      scheduledDate: s.scheduledDate?.slice(0, 10) || '',
      scheduledTime: s.scheduledTime || '09:00',
      repeat: s.repeat,
      enabled: s.enabled,
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () =>
      editId
        ? (await api.patch(`/report-schedules/${editId}`, payload())).data
        : (await api.post('/report-schedules', payload())).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
      setOpen(false);
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  const [testing, setTesting] = useState(false);
  async function testNow() {
    if (!form.subject || !form.recipients) {
      toast.error(t('needSubjectRecipients'));
      return;
    }
    setTesting(true);
    try {
      const { data } = await api.post('/report-schedules/test', {
        subject: form.subject,
        recipients: form.recipients,
        filters: payload().filters,
      });
      toast.success(t('testSent', { count: data?.count ?? 0 }));
    } catch (e) {
      toast.error(apiError(e).message);
    } finally {
      setTesting(false);
    }
  }

  async function runNow(s: ReportSchedule) {
    try {
      const { data } = await api.post(`/report-schedules/${s.id}/run-now`);
      toast.success(t('testSent', { count: data?.count ?? 0 }));
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }
  async function remove(id: string) {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/report-schedules/${id}`);
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> {t('new')}
          </Button>
        }
      />

      <DataTable
        data={list.data || []}
        rowKey={(s) => s.id}
        emptyLabel={t('empty')}
        columns={
          [
            {
              key: 'subject',
              header: t('subject'),
              searchable: true,
              accessor: (s) => s.subject,
              render: (s) => (
                <div>
                  <p className="font-medium text-foreground">{s.subject}</p>
                  <p className="text-xs text-muted-foreground">{s.recipients}</p>
                </div>
              ),
            },
            {
              key: 'schedule',
              header: t('when'),
              render: (s) => (
                <span className="text-muted-foreground">
                  {s.scheduledDate?.slice(0, 10)} {s.scheduledTime} · {t(`repeat_${s.repeat}`)}
                </span>
              ),
            },
            {
              key: 'nextRunAt',
              header: t('nextRun'),
              render: (s) => (
                <span className="text-muted-foreground">
                  {s.nextRunAt ? formatDate(s.nextRunAt, locale) : '—'}
                </span>
              ),
            },
            {
              key: 'enabled',
              header: tc('status'),
              render: (s) => (
                <Badge tone={s.enabled ? 'success' : 'neutral'}>
                  {s.enabled ? t('active') : t('paused')}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: tc('actions'),
              align: 'right',
              render: (s) => (
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => runNow(s)} title={t('runNow')}>
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title={tc('edit')}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-500/10"
                    onClick={() => remove(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ] as Column<ReportSchedule>[]
        }
      />

      <Dialog open={open} onClose={() => setOpen(false)} title={editId ? t('edit') : t('new')}>
        <div className="space-y-4">
          <Input
            label={t('subject')}
            value={form.subject}
            onChange={(e) => set('subject', e.target.value)}
          />
          <Input
            label={t('recipients')}
            hint={t('recipientsHint')}
            placeholder="ana@empresa.com, juan@empresa.com"
            value={form.recipients}
            onChange={(e) => set('recipients', e.target.value)}
          />

          <p className="text-sm font-medium text-foreground">{t('filters')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label={tc('status')} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="">{tc('all')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select label={tr('channel')} value={form.channelId} onChange={(e) => set('channelId', e.target.value)}>
              <option value="">{tc('all')}</option>
              {(channels.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label={tr('replyLines')} value={form.replyTo} onChange={(e) => set('replyTo', e.target.value)}>
              <option value="">{tc('all')}</option>
              {(replyLines.data || []).map((n) => (
                <option key={n} value={n}>
                  +{n}
                </option>
              ))}
            </Select>
            <Input label={tc('search')} value={form.search} onChange={(e) => set('search', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input type="date" label={t('date')} value={form.scheduledDate} onChange={(e) => set('scheduledDate', e.target.value)} />
            <Input type="time" label={t('time')} value={form.scheduledTime} onChange={(e) => set('scheduledTime', e.target.value)} />
            <Select label={t('repeat')} value={form.repeat} onChange={(e) => set('repeat', e.target.value)}>
              {REPEATS.map((r) => (
                <option key={r} value={r}>
                  {t(`repeat_${r}`)}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{t('tzNote')}</p>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <Switch checked={form.enabled} onChange={(v) => set('enabled', v)} label={t('enabled')} />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="outline" onClick={testNow} loading={testing}>
              <Send className="h-4 w-4" /> {t('generateNow')}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={() => saveMut.mutate()}
                loading={saveMut.isPending}
                disabled={!form.subject || !form.recipients || !form.scheduledDate}
              >
                {tc('save')}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
