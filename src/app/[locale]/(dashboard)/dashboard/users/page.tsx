'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Check, Ban } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Table, THead, TH, TD, TR } from '@/components/ui/table';
import { UserStatusBadge } from '@/components/status-badges';
import { Badge } from '@/components/ui/badge';
import { api, apiError } from '@/lib/api';
import type { UserRow } from '@/lib/types';

export default function UsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tr = useTranslations('roles');
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'OPERATOR',
  });

  const users = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<UserRow[]>('/users')).data,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post('/users', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setForm({ fullName: '', email: '', password: '', role: 'OPERATOR' });
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  async function setStatus(id: string, path: 'activate' | 'suspend') {
    try {
      await api.post(`/users/${id}/${path}`);
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  const rows = users.data || [];

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
          <div className="p-10 text-center text-sm text-slate-400">{t('noUsers')}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{tc('name')}</TH>
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
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              loading={createMut.isPending}
              disabled={!form.fullName || !form.email || form.password.length < 8}
            >
              {tc('create')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
