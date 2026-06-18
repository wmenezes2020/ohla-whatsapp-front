'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CheckCircle2, Plus, Power, Trash2, Wifi } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { api, apiError } from '@/lib/api';
import type { EvolutionServer } from '@/lib/types';

export default function EvolutionServersPage() {
  const t = useTranslations('evolutionServers');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    baseUrl: string;
    apiKey: string;
    engine: 'node' | 'go';
  }>({ name: '', baseUrl: '', apiKey: '', engine: 'node' });

  const servers = useQuery({
    queryKey: ['evolution-servers'],
    queryFn: async () => (await api.get<EvolutionServer[]>('/evolution-servers')).data,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post('/evolution-servers', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evolution-servers'] });
      setOpen(false);
      setForm({ name: '', baseUrl: '', apiKey: '', engine: 'node' });
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  async function activate(s: EvolutionServer) {
    if (s.isActive) return;
    if (!window.confirm(t('activateConfirm'))) return;
    try {
      await api.post(`/evolution-servers/${s.id}/activate`);
      qc.invalidateQueries({ queryKey: ['evolution-servers'] });
      toast.success(t('activated'));
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  async function test(id: string) {
    try {
      const { data } = await api.post(`/evolution-servers/${id}/test`);
      data.ok ? toast.success(t('reachable')) : toast.error(t('unreachable'));
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/evolution-servers/${id}`);
      qc.invalidateQueries({ queryKey: ['evolution-servers'] });
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  const rows = servers.data || [];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('new')}
          </Button>
        }
      />

      <DataTable
        data={rows}
        rowKey={(s) => s.id}
        emptyLabel={t('noServers')}
        columns={[
          {
            key: 'name',
            header: tc('name'),
            sortable: true,
            searchable: true,
            accessor: (s) => s.name,
            render: (s) => <span className="font-medium text-foreground">{s.name}</span>,
          },
          {
            key: 'baseUrl',
            header: t('baseUrl'),
            sortable: true,
            searchable: true,
            accessor: (s) => s.baseUrl,
            render: (s) => <span className="text-muted-foreground">{s.baseUrl}</span>,
          },
          {
            key: 'engine',
            header: t('engine'),
            sortable: true,
            accessor: (s) => s.engine,
            render: (s) => (
              <Badge tone={s.engine === 'go' ? 'info' : 'neutral'}>
                {s.engine === 'go' ? 'evolution-go' : 'Evolution'}
              </Badge>
            ),
          },
          {
            key: 'active',
            header: t('active'),
            sortable: true,
            accessor: (s) => (s.isActive ? 1 : 0),
            render: (s) =>
              s.isActive ? (
                <Badge tone="success">
                  <CheckCircle2 className="h-3 w-3" /> {t('activeBadge')}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: 'actions',
            header: tc('actions'),
            align: 'right',
            render: (s) => (
              <div className="flex items-center justify-end gap-1">
                {!s.isActive && (
                  <Button size="sm" variant="outline" onClick={() => activate(s)}>
                    <Power className="h-4 w-4" /> {t('activate')}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => test(s.id)}>
                  <Wifi className="h-4 w-4" /> {t('test')}
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
        ] as Column<EvolutionServer>[]}
      />

      <Dialog open={open} onClose={() => setOpen(false)} title={t('create')}>
        <div className="space-y-4">
          <Input
            label={tc('name')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label={t('baseUrl')}
            placeholder="https://evo.tu-dominio.com"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
          <Select
            label={t('engine')}
            hint={t('engineHint')}
            value={form.engine}
            onChange={(e) => setForm({ ...form, engine: e.target.value as 'node' | 'go' })}
          >
            <option value="node">Evolution (Node / Baileys)</option>
            <option value="go">evolution-go (Go / whatsmeow)</option>
          </Select>
          <Input
            label={t('apiKey')}
            type="password"
            hint={t('tokenHint')}
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              loading={createMut.isPending}
              disabled={!form.name || !form.baseUrl || !form.apiKey}
            >
              {tc('create')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
