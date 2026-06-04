'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Trash2, Flame, Play, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ChannelStatusBadge } from '@/components/status-badges';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { WarmupChannel, WarmupParticipant } from '@/lib/types';

export default function WarmupPage() {
  const t = useTranslations('warmup');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'TENANT_ADMIN';

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const participants = useQuery({
    queryKey: ['warmup-participants'],
    queryFn: async () => (await api.get<WarmupParticipant[]>('/warmup/participants')).data,
  });

  const channels = useQuery({
    queryKey: ['warmup-channels'],
    queryFn: async () => (await api.get<WarmupChannel[]>('/warmup/channels')).data,
    refetchInterval: 20000,
  });

  const createMut = useMutation({
    mutationFn: async () =>
      (await api.post('/warmup/participants', { name, phoneNumber: phone })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warmup-participants'] });
      setCreateOpen(false);
      setName('');
      setPhone('');
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  const toggleMut = useMutation({
    mutationFn: async (p: WarmupParticipant) =>
      (await api.patch(`/warmup/participants/${p.id}`, { active: !p.active })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warmup-participants'] }),
    onError: (e) => toast.error(apiError(e).message),
  });

  const runMut = useMutation({
    mutationFn: async () => (await api.post('/warmup/run')).data,
    onSuccess: (data: { channels: number; sent: number }) => {
      toast.success(t('runDone', { channels: data.channels, sent: data.sent }));
      qc.invalidateQueries({ queryKey: ['warmup-channels'] });
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  async function remove(p: WarmupParticipant) {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/warmup/participants/${p.id}`);
      qc.invalidateQueries({ queryKey: ['warmup-participants'] });
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  const warmingChannels = channels.data || [];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          isAdmin ? (
            <Button
              variant="outline"
              onClick={() => runMut.mutate()}
              loading={runMut.isPending}
              disabled={warmingChannels.length === 0}
            >
              <Play className="h-4 w-4" /> {t('runNow')}
            </Button>
          ) : undefined
        }
      />

      {/* Lines in warm-up with graduation progress */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Flame className="h-4 w-4 text-amber-500" /> {t('linesTitle')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('linesDesc')}</p>
        </CardHeader>
        <CardBody>
          {warmingChannels.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('noLines')}</p>
          ) : (
            <div className="space-y-4">
              {warmingChannels.map((c) => {
                const pct = Math.min(100, Math.round((c.warmupInteractions / c.target) * 100));
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        {c.name}
                        <ChannelStatusBadge status={c.status} />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.warmupInteractions}/{c.target} {t('interactions')}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Participants */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">{t('participantsTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('participantsDesc')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> {t('addParticipant')}
        </Button>
      </div>

      <DataTable
        data={participants.data || []}
        rowKey={(p) => p.id}
        emptyLabel={t('noParticipants')}
        columns={[
          {
            key: 'name',
            header: tc('name'),
            sortable: true,
            searchable: true,
            accessor: (p) => `${p.name} ${p.phoneNumber}`,
            render: (p) => <span className="font-medium text-foreground">{p.name}</span>,
          },
          {
            key: 'phone',
            header: t('phone'),
            sortable: true,
            searchable: true,
            accessor: (p) => p.phoneNumber,
            render: (p) => (
              <span className="flex items-center gap-1 text-foreground">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />+{p.phoneNumber}
              </span>
            ),
          },
          {
            key: 'received',
            header: t('received'),
            sortable: true,
            accessor: (p) => p.totalReceived,
            render: (p) => <span className="text-foreground">{p.totalReceived}</span>,
          },
          {
            key: 'active',
            header: t('active'),
            align: 'center',
            render: (p) => (
              <div className="flex justify-center">
                <Switch checked={p.active} onChange={() => toggleMut.mutate(p)} />
              </div>
            ),
          },
          {
            key: 'actions',
            header: tc('actions'),
            align: 'right',
            render: (p) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(p)}
                  className="text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ] as Column<WarmupParticipant>[]}
      />

      {/* Create participant dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t('addParticipant')}>
        <div className="space-y-4">
          <Input
            label={tc('name')}
            value={name}
            placeholder={t('namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label={t('phone')}
            value={phone}
            placeholder={t('phonePlaceholder')}
            hint={t('phoneHint')}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              loading={createMut.isPending}
              disabled={!name || !phone}
            >
              {tc('create')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
