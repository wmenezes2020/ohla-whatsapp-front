'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Trash2, Wifi } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TH, TD, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import type { EvolutionServer } from '@/lib/types';

export default function EvolutionServersPage() {
  const t = useTranslations('evolutionServers');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', baseUrl: '', apiKey: '' });

  const servers = useQuery({
    queryKey: ['evolution-servers'],
    queryFn: async () => (await api.get<EvolutionServer[]>('/evolution-servers')).data,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post('/evolution-servers', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evolution-servers'] });
      setOpen(false);
      setForm({ name: '', baseUrl: '', apiKey: '' });
    },
    onError: (e) => toast.error(apiError(e).message),
  });

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

      <Card>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{t('noServers')}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{tc('name')}</TH>
                <TH>{t('baseUrl')}</TH>
                <TH>{tc('status')}</TH>
                <TH className="text-right">{tc('actions')}</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium text-slate-800">{s.name}</TD>
                  <TD className="text-slate-500">{s.baseUrl}</TD>
                  <TD>
                    <Badge tone={s.enabled ? 'success' : 'neutral'}>
                      {s.enabled ? 'ON' : 'OFF'}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => test(s.id)}>
                        <Wifi className="h-4 w-4" /> {t('test')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => remove(s.id)}
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
