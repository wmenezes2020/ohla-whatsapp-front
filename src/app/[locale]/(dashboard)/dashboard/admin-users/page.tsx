'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Check, Ban } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { UserStatusBadge } from '@/components/status-badges';
import { api, apiError } from '@/lib/api';
import type { AdminUserRow, TenantRow } from '@/lib/types';

export default function AdminUsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tr = useTranslations('roles');
  const tm = useTranslations('metrics');
  const qc = useQueryClient();

  const [tenantFilter, setTenantFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'OPERATOR',
    tenantId: '',
  });

  const tenants = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => (await api.get<TenantRow[]>('/tenants')).data,
  });

  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () =>
      (await api.get('/admin/users', { params: { pageSize: 1000 } })).data as {
        items: AdminUserRow[];
        total: number;
      },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role,
      };
      if (form.role !== 'SUPER_ADMIN') payload.tenantId = form.tenantId;
      return (await api.post('/admin/users', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setOpen(false);
      setForm({ fullName: '', email: '', password: '', role: 'OPERATOR', tenantId: '' });
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  async function setStatus(id: string, path: 'activate' | 'suspend') {
    try {
      await api.post(`/admin/users/${id}/${path}`);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  const isSuper = form.role === 'SUPER_ADMIN';
  const allRows = users.data?.items || [];
  const rows = useMemo(
    () => (tenantFilter ? allRows.filter((u) => u.tenantId === tenantFilter) : allRows),
    [allRows, tenantFilter],
  );

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
        rowKey={(u) => u.id}
        emptyLabel={t('noUsers')}
        toolbar={
          <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="w-52">
            <option value="">{tm('allCompanies')}</option>
            {(tenants.data || []).map((tn) => (
              <option key={tn.id} value={tn.id}>
                {tn.name}
              </option>
            ))}
          </Select>
        }
        columns={[
          {
            key: 'name',
            header: tc('name'),
            sortable: true,
            searchable: true,
            accessor: (u) => `${u.fullName} ${u.email}`,
            render: (u) => (
              <div>
                <p className="font-medium text-foreground">{u.fullName}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
            ),
          },
          {
            key: 'company',
            header: tm('company'),
            sortable: true,
            searchable: true,
            accessor: (u) => (u.role === 'SUPER_ADMIN' ? 'Super Admin' : u.tenantName || ''),
            render: (u) =>
              u.role === 'SUPER_ADMIN' ? (
                <Badge tone="warning">Super Admin</Badge>
              ) : (
                <span className="text-muted-foreground">{u.tenantName || '—'}</span>
              ),
          },
          {
            key: 'role',
            header: t('role'),
            sortable: true,
            accessor: (u) => u.role,
            render: (u) => <Badge tone="info">{tr(u.role)}</Badge>,
          },
          {
            key: 'status',
            header: tc('status'),
            sortable: true,
            accessor: (u) => u.status,
            render: (u) => <UserStatusBadge status={u.status} />,
          },
          {
            key: 'actions',
            header: tc('actions'),
            align: 'right',
            render: (u) =>
              u.status !== 'ACTIVE' ? (
                <Button size="sm" variant="ghost" onClick={() => setStatus(u.id, 'activate')}>
                  <Check className="h-4 w-4 text-brand-600" /> {t('activate')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-500/10"
                  onClick={() => setStatus(u.id, 'suspend')}
                >
                  <Ban className="h-4 w-4" /> {t('suspend')}
                </Button>
              ),
          },
        ] as Column<AdminUserRow>[]}
      />

      <Dialog open={open} onClose={() => setOpen(false)} title={t('create')}>
        <div className="space-y-4">
          <Input
            label={tc('name')}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <Input
            type="email"
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            type="password"
            label="Password"
            value={form.password}
            minLength={8}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Select
            label={t('role')}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="OPERATOR">{tr('OPERATOR')}</option>
            <option value="VIEWER">{tr('VIEWER')}</option>
            <option value="TENANT_ADMIN">{tr('TENANT_ADMIN')}</option>
            <option value="SUPER_ADMIN">{tr('SUPER_ADMIN')}</option>
          </Select>
          {!isSuper && (
            <Select
              label={tm('company')}
              value={form.tenantId}
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            >
              <option value="">—</option>
              {(tenants.data || []).map((tn) => (
                <option key={tn.id} value={tn.id}>
                  {tn.name}
                </option>
              ))}
            </Select>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              loading={createMut.isPending}
              disabled={
                !form.fullName ||
                !form.email ||
                form.password.length < 8 ||
                (!isSuper && !form.tenantId)
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
