'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Activity, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ChannelStatusBadge } from '@/components/status-badges';
import { api } from '@/lib/api';
import { useRealtime } from '@/lib/socket';
import type { ChannelUsage, Summary } from '@/lib/types';

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`rounded-xl p-3 ${tone}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function OverviewPage() {
  const t = useTranslations('overview');

  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: async () => (await api.get<Summary>('/reports/summary')).data,
  });
  const usage = useQuery({
    queryKey: ['channel-usage'],
    queryFn: async () => (await api.get<ChannelUsage[]>('/reports/channels/usage')).data,
  });

  useRealtime({
    'message.status': () => {
      summary.refetch();
      usage.refetch();
    },
    'channel.status': () => usage.refetch(),
  });

  const s = summary.data;

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t('sentToday')}
          value={s?.sentToday ?? 0}
          icon={CheckCircle2}
          tone="bg-brand-50 text-brand-600"
        />
        <Stat
          label={t('queued')}
          value={s?.queued ?? 0}
          icon={Clock}
          tone="bg-sky-50 text-sky-600"
        />
        <Stat
          label={t('failedToday')}
          value={s?.failedToday ?? 0}
          icon={XCircle}
          tone="bg-red-50 text-red-600"
        />
        <Stat
          label={t('totalMessages')}
          value={s?.total ?? 0}
          icon={Activity}
          tone="bg-slate-100 text-slate-600"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-semibold text-slate-900">{t('channelUsage')}</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {(usage.data || []).map((c) => {
            const pct = Math.min(100, (c.sentToday / Math.max(1, c.rateLimitPerMinute * 60)) * 100);
            return (
              <div key={c.channelId} className="flex items-center gap-4">
                <div className="w-40 shrink-0">
                  <p className="truncate text-sm font-medium text-slate-700">{c.name}</p>
                  <ChannelStatusBadge status={c.status} />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="w-16 text-right text-sm text-slate-500">{c.sentToday}</p>
              </div>
            );
          })}
          {usage.data && usage.data.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">{t('connectedChannels')}: 0</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
