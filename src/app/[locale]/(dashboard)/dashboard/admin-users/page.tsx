'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Check, Ban, Search } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TH, TD, TR } from '@/components/ui/table';
import { UserStatusBadge } from '@/components/status-badges';
import { api, apiError } from '@/lib/api';
import type { AdminUserRow, TenantRow } from '@/lib/types';

export default function AdminUsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tr = useTranslations('roles');
  const tm = useTranslations('metrics');
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
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
    queryKey: ['admin-users', search, tenantFilter],
    queryFn: async () =>
      (
        await api.get('/admin/users', {
          params: { q: search || undefined, tenantId: tenantFilter || undefined, pageSize: 100 },
        })
      ).data as { items: AdminUserRow[]; total: number },
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
    onError: (e) => {
      const { code } = apiError(e);
      const map: Record<string, string> = {
        'auth.email_taken': tc('error'),
        'user.tenant_required': tm('company'),
      };
      toast.error(map[code || ''] || tc('error'));
    },
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
  const rows = users.data?.items || [];

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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input-base w-64 pl-9"
            placeholder={tc('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="w-52">
          <option value="">{tm('allCompanies')}</option>
          {(tenants.data || []).map((tn) => (
            <option key={tn.id} value={tn.id}>
              {tn.name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{t('noUsers')}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{tc('name')}</TH>
                <TH>{tm('company')}</TH>
                <TH>{t('role')}</TH>
                <TH>{tc('status')}</TH>
                <TH className="text-right">{tc('actions')}</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <p className="font-medium text-slate-800">{u.fullName}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </TD>
                  <TD className="text-slate-600">
                    {u.role === 'SUPER_ADMIN' ? (
                      <Badge tone="warning">Super Admin</Badge>
                    ) : (
                      u.tenantName || '—'
                    )}
                  </TD>
                  <TD>
                    <Badge tone="info">{tr(u.role)}</Badge>
                  </TD>
                  <TD>
                    <UserStatusBadge status={u.status} />
                  </TD>
                  <TD className="text-right">
                    {u.status !== 'ACTIVE' ? (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(u.id, 'activate')}>
                        <Check className="h-4 w-4 text-brand-600" /> {t('activate')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setStatus(u.id, 'suspend')}
                      >
                        <Ban className="h-4 w-4" /> {t('suspend')}
                      </Button>
                    )}
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
