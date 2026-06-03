'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  Activity,
  CheckCircle2,
  Clock,
  Radio,
  Server,
  Timer,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { ChannelStatusBadge } from '@/components/status-badges';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRealtime } from '@/lib/socket';
import type { Metrics } from '@/lib/types';

type Period = '24h' | '7d' | '30d';

function periodToRange(period: Period) {
  const to = new Date();
  const hours = period === '24h' ? 24 : period === '7d' ? 24 * 7 : 24 * 30;
  const from = new Date(to.getTime() - hours * 3600 * 1000);
  const groupBy: 'hour' | 'day' = period === '24h' ? 'hour' : 'day';
  return { from: from.toISOString(), to: to.toISOString(), groupBy };
}

const COLORS = { sent: '#1bb463', failed: '#ef4444', pending: '#f59e0b' };

export function MetricsDashboard({ scope }: { scope: 'tenant' | 'admin' }) {
  const t = useTranslations('metrics');
  const tStatus = useTranslations('channelStatus');
  const locale = useLocale();

  const [period, setPeriod] = useState<Period>('7d');
  const [tenantId, setTenantId] = useState('');
  const [channelId, setChannelId] = useState('');

  const range = useMemo(() => periodToRange(period), [period]);

  const query = useQuery({
    queryKey: ['metrics', scope, period, tenantId, channelId],
    queryFn: async () => {
      const path = scope === 'admin' ? '/admin/metrics' : '/reports/metrics';
      const params: Record<string, string> = {
        from: range.from,
        to: range.to,
        groupBy: range.groupBy,
      };
      if (channelId) params.channelId = channelId;
      if (scope === 'admin' && tenantId) params.tenantId = tenantId;
      return (await api.get<Metrics>(path, { params })).data;
    },
    refetchInterval: 30000,
  });

  useRealtime({
    'message.status': () => query.refetch(),
    'channel.status': () => query.refetch(),
  });

  const data = query.data;
  const s = data?.summary;

  const fmtBucket = (iso: string) => {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale, {
      ...(range.groupBy === 'hour' ? { hour: '2-digit' } : { day: '2-digit', month: '2-digit' }),
    }).format(d);
  };

  const tsData = (data?.timeseries || []).map((p) => ({ ...p, label: fmtBucket(p.bucket) }));
  const donut = s
    ? [
        { name: t('sent'), value: s.sent, color: COLORS.sent },
        { name: t('pending'), value: s.pending, color: COLORS.pending },
        { name: t('failed'), value: s.failed, color: COLORS.failed },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(['24h', '7d', '30d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {t(p === '24h' ? 'last24h' : p === '7d' ? 'last7d' : 'last30d')}
            </button>
          ))}
        </div>

        {scope === 'admin' && (
          <Select
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              setChannelId('');
            }}
            className="w-52"
          >
            <option value="">{t('allCompanies')}</option>
            {(data?.tenants || []).map((tn) => (
              <option key={tn.id} value={tn.id}>
                {tn.name}
              </option>
            ))}
          </Select>
        )}

        <Select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="w-52">
          <option value="">{t('allChannels')}</option>
          {(data?.channels || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label={t('sent')} value={s?.sent ?? 0} icon={CheckCircle2} tone="bg-brand-50 text-brand-600" />
        <Stat label={t('pending')} value={s?.pending ?? 0} icon={Clock} tone="bg-amber-50 text-amber-600" />
        <Stat label={t('failed')} value={s?.failed ?? 0} icon={XCircle} tone="bg-red-50 text-red-600" />
        <Stat
          label={t('connectedChannels')}
          value={`${s?.connectedChannels ?? 0}/${s?.totalChannels ?? 0}`}
          icon={Radio}
          tone="bg-sky-50 text-sky-600"
        />
        <Stat
          label={t('avgResponse')}
          value={s?.avgLatencyMs != null ? `${s.avgLatencyMs} ms` : '—'}
          icon={Timer}
          tone="bg-violet-50 text-violet-600"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{t('messagesOverTime')}</h3>
          </CardHeader>
          <CardBody>
            {tsData.length === 0 ? (
              <Empty label={t('noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={tsData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    {(['sent', 'pending', 'failed'] as const).map((k) => (
                      <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[k]} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={COLORS[k]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="sent" name={t('sent')} stroke={COLORS.sent} fill="url(#g-sent)" />
                  <Area type="monotone" dataKey="pending" name={t('pending')} stroke={COLORS.pending} fill="url(#g-pending)" />
                  <Area type="monotone" dataKey="failed" name={t('failed')} stroke={COLORS.failed} fill="url(#g-failed)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{t('byStatus')}</h3>
          </CardHeader>
          <CardBody>
            {donut.length === 0 ? (
              <Empty label={t('noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Channel states */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">{t('channelStates')}</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(data?.channelsByStatus || {})
              .filter(([, n]) => n > 0)
              .map(([status, n]) => (
                <div key={status} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
                  <ChannelStatusBadge status={status as any} />
                  <span className="text-sm font-semibold text-slate-700">{n}</span>
                </div>
              ))}
            {!data?.channels?.length && <Empty label={t('noData')} />}
          </div>
          {!!data?.channels?.length && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.channels.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="truncate text-sm font-medium text-slate-700">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{c.sent}</span>
                    <ChannelStatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Evolution status (admin only) */}
      {scope === 'admin' && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{t('evolutionStatus')}</h3>
          </CardHeader>
          <CardBody>
            {!data?.evolutionServers?.length ? (
              <Empty label={t('noData')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.evolutionServers.map((srv) => (
                  <div key={srv.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <Server className="h-4 w-4 text-slate-400" />
                        {srv.name}
                      </span>
                      <Badge tone={!srv.enabled ? 'neutral' : srv.reachable ? 'success' : 'danger'}>
                        {!srv.enabled ? t('disabled') : srv.reachable ? t('reachable') : t('unreachable')}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-slate-400">{srv.baseUrl}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {t('connectedChannels')}: <span className="font-semibold">{srv.connectedChannels}</span> /{' '}
                      {srv.totalChannels}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

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
      <CardBody className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
      <Activity className="mr-2 h-4 w-4" />
      {label}
    </div>
  );
}
