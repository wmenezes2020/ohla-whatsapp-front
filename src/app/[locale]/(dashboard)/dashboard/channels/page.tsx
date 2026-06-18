'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Plus,
  QrCode,
  Power,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ChannelStatusBadge } from '@/components/status-badges';
import { Flame } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useRealtime } from '@/lib/socket';
import { useDebouncedCallback } from '@/lib/use-debounced';
import type { Channel } from '@/lib/types';

export default function ChannelsPage() {
  const t = useTranslations('channels');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [rate, setRate] = useState(10);
  const [rateDay, setRateDay] = useState(25);
  const [warmup, setWarmup] = useState(false);

  const [qrChannel, setQrChannel] = useState<Channel | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  // Connection method chosen at connect time: QR or pairing code (by number).
  const [connectMode, setConnectMode] = useState<'qr' | 'code'>('qr');
  const [pairingNumber, setPairingNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState('');

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: async () => (await api.get<Channel[]>('/channels')).data,
    refetchInterval: 20000,
  });

  // Coalesce realtime bursts (reconcile can update many channels at once).
  const invalidateChannels = useDebouncedCallback(
    () => qc.invalidateQueries({ queryKey: ['channels'] }),
    2000,
  );
  useRealtime({
    'channel.status': (p) => {
      invalidateChannels();
      if (qrChannel && p.channelId === qrChannel.id && p.status === 'CONNECTED') {
        setConnected(true);
        setQrImage(null);
        setTimeout(() => setQrChannel(null), 1800);
      }
    },
    'channel.qr': (p) => {
      if (qrChannel && p.channelId === qrChannel.id) setQrImage(p.qrCode);
    },
  });

  const createMut = useMutation({
    mutationFn: async () =>
      (
        await api.post<Channel>('/channels', {
          name,
          rateLimitPerMinute: rate,
          rateLimitPerDay: rateDay,
          warmup,
        })
      ).data,
    onSuccess: (channel) => {
      qc.invalidateQueries({ queryKey: ['channels'] });
      setCreateOpen(false);
      setName('');
      setWarmup(false);
      openQr(channel);
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  // QR mode: poll every 5s (Fonewhats pattern) for a FRESH QR + connection detection.
  useEffect(() => {
    if (!qrChannel || connectMode !== 'qr') return;
    const id = qrChannel.id;
    let stopped = false;
    let busy = false;

    const poll = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const { data } = await api.get(`/channels/${id}/qr/poll`);
        if (stopped) return;
        if (data.connected) {
          stopped = true;
          setConnected(true);
          setQrImage(null);
          qc.invalidateQueries({ queryKey: ['channels'] });
          setTimeout(() => setQrChannel(null), 1800);
        } else if (data.qrCode) {
          setQrImage(data.qrCode);
        }
      } catch {
        /* keep polling */
      } finally {
        busy = false;
      }
    };

    poll(); // immediate
    const interval = setInterval(poll, 5000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [qrChannel, connectMode, qc]);

  // Code mode: after a pairing code is shown, poll the connection STATE (does not
  // regenerate the QR/pairing) every 4s until connected.
  useEffect(() => {
    if (!qrChannel || connectMode !== 'code' || !pairingCode) return;
    const id = qrChannel.id;
    let stopped = false;
    const poll = async () => {
      try {
        const { data } = await api.get(`/channels/${id}/state`);
        if (stopped) return;
        if (data.status === 'CONNECTED') {
          stopped = true;
          setConnected(true);
          qc.invalidateQueries({ queryKey: ['channels'] });
          setTimeout(() => setQrChannel(null), 1800);
        }
      } catch {
        /* keep polling */
      }
    };
    const interval = setInterval(poll, 4000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [qrChannel, connectMode, pairingCode, qc]);

  async function requestPairing() {
    if (!qrChannel) return;
    setPairingLoading(true);
    setPairingError('');
    try {
      const { data } = await api.post(`/channels/${qrChannel.id}/pairing-code`, {
        number: pairingNumber.replace(/\D/g, ''),
      });
      if (data.alreadyConnected) {
        setConnected(true);
        setTimeout(() => setQrChannel(null), 1800);
        return;
      }
      if (data.pairingCode) setPairingCode(data.pairingCode);
      else setPairingError(t('pairingFailed'));
    } catch (e) {
      setPairingError(apiError(e).message);
    } finally {
      setPairingLoading(false);
    }
  }

  function openQr(channel: Channel) {
    setConnected(false);
    setQrImage(null);
    setConnectMode('qr');
    setPairingCode(null);
    setPairingError('');
    setPairingNumber(channel.phoneNumber || '');
    setQrChannel(channel);
  }

  async function action(id: string, path: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await api.post(`/channels/${id}/${path}`);
      qc.invalidateQueries({ queryKey: ['channels'] });
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/channels/${id}`);
      qc.invalidateQueries({ queryKey: ['channels'] });
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  const rows = channels.data || [];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t('new')}
          </Button>
        }
      />

      <DataTable
        data={rows}
        rowKey={(c) => c.id}
        emptyLabel={t('noChannels')}
        columns={[
          {
            key: 'name',
            header: tc('name'),
            sortable: true,
            searchable: true,
            accessor: (c) => `${c.name} ${c.instanceName} ${c.phoneNumber || ''}`,
            render: (c) => (
              <div>
                <p className="flex items-center gap-2 font-medium text-foreground">
                  {c.name}
                  {c.warmup && (
                    <Badge tone="warning">
                      <Flame className="h-3 w-3" /> {t('warmupBadge')} {c.warmupInteractions}/
                      {c.warmupTarget ?? 50}
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{c.instanceName}</p>
              </div>
            ),
          },
          {
            key: 'status',
            header: tc('status'),
            sortable: true,
            accessor: (c) => c.status,
            render: (c) => <ChannelStatusBadge status={c.status} />,
          },
          {
            key: 'phone',
            header: t('phone'),
            sortable: true,
            searchable: true,
            accessor: (c) => c.phoneNumber || '',
            render: (c) =>
              c.phoneNumber ? (
                <span className="flex items-center gap-1 text-foreground">
                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />+{c.phoneNumber}
                </span>
              ) : (
                '—'
              ),
          },
          {
            key: 'rate',
            header: t('rateLimit'),
            sortable: true,
            accessor: (c) => c.rateLimitPerMinute,
            render: (c) => (
              <>
                <span className="text-foreground">{c.rateLimitPerMinute}/min</span>
                {c.rateLimitPerDay ? (
                  <span className="block text-xs text-muted-foreground">{c.rateLimitPerDay}/día</span>
                ) : null}
              </>
            ),
          },
          {
            key: 'actions',
            header: tc('actions'),
            align: 'right',
            render: (c) => (
              <div className="flex items-center justify-end gap-1">
                {c.status !== 'CONNECTED' && (
                  <Button size="sm" variant="outline" onClick={() => openQr(c)}>
                    <QrCode className="h-4 w-4" /> {t('connect')}
                  </Button>
                )}
                {c.status === 'CONNECTED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => action(c.id, 'logout')}
                    title={t('disconnect')}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => action(c.id, 'restart')} title={t('restart')}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(c.id)}
                  className="text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ] as Column<Channel>[]}
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t('create')}>
        <div className="space-y-4">
          <Input
            label={tc('name')}
            value={name}
            placeholder={t('namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label={t('rateLimit')}
              value={rate}
              min={1}
              onChange={(e) => setRate(Number(e.target.value))}
            />
            <Input
              type="number"
              label={t('rateLimitDay')}
              value={rateDay}
              min={1}
              onChange={(e) => setRateDay(Number(e.target.value))}
            />
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <Switch
              checked={warmup}
              onChange={setWarmup}
              label={t('warmupToggle')}
              description={t('warmupToggleDesc')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} disabled={!name}>
              {tc('create')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Connect dialog — QR or pairing code (user chooses) */}
      <Dialog open={!!qrChannel} onClose={() => setQrChannel(null)} title={qrChannel?.name}>
        {connected ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-brand-500" />
            <p className="mt-4 font-medium text-foreground">{t('connected')}</p>
          </div>
        ) : (
          <div>
            {/* Method tabs */}
            <div className="mb-4 flex rounded-lg bg-muted p-1 text-sm font-medium">
              <button
                onClick={() => setConnectMode('qr')}
                className={`flex-1 rounded-md px-3 py-1.5 transition ${
                  connectMode === 'qr'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('methodQr')}
              </button>
              <button
                onClick={() => setConnectMode('code')}
                className={`flex-1 rounded-md px-3 py-1.5 transition ${
                  connectMode === 'code'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('methodCode')}
              </button>
            </div>

            {connectMode === 'qr' ? (
              <div className="flex flex-col items-center text-center">
                <p className="mb-1 font-medium text-foreground">{t('qrTitle')}</p>
                <p className="mb-4 text-xs text-muted-foreground">{t('qrSubtitle')}</p>
                <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-border bg-white p-3 shadow-sm">
                  {qrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrImage} alt="QR" className="h-full w-full object-contain" />
                  ) : (
                    <p className="animate-pulse text-sm text-slate-400">{t('qrWaiting')}</p>
                  )}
                </div>
              </div>
            ) : pairingCode ? (
              <div className="flex flex-col items-center text-center">
                <p className="mb-1 font-medium text-foreground">{t('pairingCodeTitle')}</p>
                <div className="my-3 rounded-2xl border border-border bg-muted/40 px-6 py-4 font-mono text-3xl font-bold tracking-[0.3em] text-foreground">
                  {pairingCode.length === 8 ? `${pairingCode.slice(0, 4)} ${pairingCode.slice(4)}` : pairingCode}
                </div>
                <p className="mb-2 text-xs text-muted-foreground">{t('pairingSteps')}</p>
                <p className="animate-pulse text-sm text-brand-600">{t('pairingWaiting')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-xs text-muted-foreground">{t('pairingSubtitle')}</p>
                <Input
                  label={t('pairingNumberLabel')}
                  value={pairingNumber}
                  onChange={(e) => setPairingNumber(e.target.value)}
                  placeholder={t('pairingNumberPlaceholder')}
                  hint={t('pairingHint')}
                  inputMode="tel"
                />
                {pairingError && <p className="text-xs text-red-600">{pairingError}</p>}
                <Button
                  onClick={requestPairing}
                  loading={pairingLoading}
                  disabled={pairingNumber.replace(/\D/g, '').length < 10}
                  className="w-full"
                >
                  {t('generateCode')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
