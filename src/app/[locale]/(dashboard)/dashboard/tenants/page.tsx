'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Check, Ban } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { api, apiError } from '@/lib/api';
import type { TenantRow } from '@/lib/types';

export default function TenantsPage() {
  const t = useTranslations('tenants');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const tenants = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => (await api.get<TenantRow[]>('/tenants')).data,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post('/tenants', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      setOpen(false);
      setForm({ name: '', adminName: '', adminEmail: '', adminPassword: '' });
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  async function setStatus(id: string, path: 'activate' | 'suspend') {
    try {
      await api.post(`/tenants/${id}/${path}`);
      qc.invalidateQueries({ queryKey: ['tenants'] });
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  const rows = tenants.data || [];

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
        rowKey={(tn) => tn.id}
        emptyLabel={t('noTenants')}
        columns={[
          {
            key: 'name',
            header: tc('name'),
            sortable: true,
            searchable: true,
            accessor: (tn) => `${tn.name} ${tn.slug}`,
            render: (tn) => (
              <div>
                <p className="font-medium text-foreground">{tn.name}</p>
                <p className="text-xs text-muted-foreground">{tn.slug}</p>
              </div>
            ),
          },
          {
            key: 'userCount',
            header: t('users'),
            sortable: true,
            accessor: (tn) => tn.userCount,
          },
          {
            key: 'status',
            header: tc('status'),
            sortable: true,
            accessor: (tn) => tn.status,
            render: (tn) => (
              <Badge tone={tn.status === 'ACTIVE' ? 'success' : 'danger'}>{tn.status}</Badge>
            ),
          },
          {
            key: 'actions',
            header: tc('actions'),
            align: 'right',
            render: (tn) =>
              tn.status !== 'ACTIVE' ? (
                <Button size="sm" variant="ghost" onClick={() => setStatus(tn.id, 'activate')}>
                  <Check className="h-4 w-4 text-brand-600" /> {t('activate')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-500/10"
                  onClick={() => setStatus(tn.id, 'suspend')}
                >
                  <Ban className="h-4 w-4" /> {t('suspend')}
                </Button>
              ),
          },
        ] as Column<TenantRow>[]}
      />

      <Dialog open={open} onClose={() => setOpen(false)} title={t('create')}>
        <div className="space-y-4">
          <Input
            label={tc('name')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label={t('adminName')}
            value={form.adminName}
            onChange={(e) => setForm({ ...form, adminName: e.target.value })}
          />
          <Input
            type="email"
            label={t('adminEmail')}
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
          />
          <Input
            type="password"
            label={t('adminPassword')}
            minLength={8}
            value={form.adminPassword}
            onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              loading={createMut.isPending}
              disabled={
                !form.name || !form.adminName || !form.adminEmail || form.adminPassword.length < 8
              }
            >
              {tc('create')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
