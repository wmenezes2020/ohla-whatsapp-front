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
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, THead, TH, TD, TR } from '@/components/ui/table';
import { ChannelStatusBadge } from '@/components/status-badges';
import { api, apiError } from '@/lib/api';
import { useRealtime } from '@/lib/socket';
import type { Channel } from '@/lib/types';

export default function ChannelsPage() {
  const t = useTranslations('channels');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [rate, setRate] = useState(10);
  const [rateDay, setRateDay] = useState(25);

  const [qrChannel, setQrChannel] = useState<Channel | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: async () => (await api.get<Channel[]>('/channels')).data,
    refetchInterval: 15000,
  });

  useRealtime({
    'channel.status': (p) => {
      qc.invalidateQueries({ queryKey: ['channels'] });
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
        })
      ).data,
    onSuccess: (channel) => {
      qc.invalidateQueries({ queryKey: ['channels'] });
      setCreateOpen(false);
      setName('');
      openQr(channel);
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  // While the QR dialog is open, poll the live state so connection confirms even
  // if Evolution does not deliver the connection.update webhook (Fonewhats pattern).
  useEffect(() => {
    if (!qrChannel || connected) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/channels/${qrChannel.id}/state`);
        if (data.status === 'CONNECTED') {
          setConnected(true);
          setQrImage(null);
          qc.invalidateQueries({ queryKey: ['channels'] });
          setTimeout(() => setQrChannel(null), 1800);
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrChannel, connected, qc]);

  function openQr(channel: Channel) {
    setConnected(false);
    setQrImage(null);
    setQrChannel(channel);
    // Trigger a fresh connect/QR.
    api
      .post(`/channels/${channel.id}/connect`)
      .then(({ data }) => setQrImage(data.qrCode ?? null))
      .catch((e) => toast.error(apiError(e).message));
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

      <Card>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{t('noChannels')}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{tc('name')}</TH>
                <TH>{tc('status')}</TH>
                <TH>{t('phone')}</TH>
                <TH>{t('rateLimit')}</TH>
                <TH className="text-right">{tc('actions')}</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <p className="font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.instanceName}</p>
                  </TD>
                  <TD>
                    <ChannelStatusBadge status={c.status} />
                  </TD>
                  <TD>
                    {c.phoneNumber ? (
                      <span className="flex items-center gap-1 text-slate-700">
                        <Smartphone className="h-3.5 w-3.5 text-slate-400" />+{c.phoneNumber}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TD>
                  <TD>
                    <span className="text-slate-700">{c.rateLimitPerMinute}/min</span>
                    {c.rateLimitPerDay ? (
                      <span className="block text-xs text-slate-400">{c.rateLimitPerDay}/día</span>
                    ) : null}
                  </TD>
                  <TD>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => action(c.id, 'restart')}
                        title={t('restart')}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(c.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

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

      {/* QR dialog */}
      <Dialog open={!!qrChannel} onClose={() => setQrChannel(null)} title={qrChannel?.name}>
        <div className="flex flex-col items-center text-center">
          {connected ? (
            <div className="py-10">
              <CheckCircle2 className="mx-auto h-16 w-16 text-brand-500" />
              <p className="mt-4 font-medium text-slate-800">{t('connected')}</p>
            </div>
          ) : (
            <>
              <p className="mb-1 font-medium text-slate-800">{t('qrTitle')}</p>
              <p className="mb-4 text-xs text-slate-500">{t('qrSubtitle')}</p>
              <div className="flex h-64 w-64 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
                {qrImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrImage} alt="QR" className="h-full w-full object-contain" />
                ) : (
                  <p className="animate-pulse text-sm text-slate-400">{t('qrWaiting')}</p>
                )}
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
