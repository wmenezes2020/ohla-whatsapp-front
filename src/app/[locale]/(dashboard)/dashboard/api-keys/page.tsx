'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Copy, Check, Ban } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { IntegrationDocs } from '@/components/integration-docs';
import { ApiPlayground } from '@/components/api-playground';
import { api, apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { ApiKey } from '@/lib/types';
import { useLocale } from 'next-intl';

export default function ApiKeysPage() {
  const t = useTranslations('apiKeys');
  const tc = useTranslations('common');
  const tp = useTranslations('playground');
  const locale = useLocale();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [testKey, setTestKey] = useState('');

  const keys = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await api.get<ApiKey[]>('/api-keys')).data,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post<ApiKey>('/api-keys', { name })).data,
    onSuccess: (key) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setCreateOpen(false);
      setName('');
      setSecret(key.secret ?? null);
    },
    onError: (e) => toast.error(apiError(e).message),
  });

  async function revoke(id: string) {
    if (!window.confirm(t('revokeConfirm'))) return;
    try {
      await api.post(`/api-keys/${id}/revoke`);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  function copy(value: string) {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const rows = keys.data || [];

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
        rowKey={(k) => k.id}
        emptyLabel={t('noKeys')}
        columns={[
          {
            key: 'name',
            header: tc('name'),
            sortable: true,
            searchable: true,
            accessor: (k) => k.name,
            render: (k) => <span className="font-medium text-foreground">{k.name}</span>,
          },
          {
            key: 'prefix',
            header: t('prefix'),
            searchable: true,
            accessor: (k) => k.prefix,
            render: (k) => (
              <code className="rounded bg-muted px-2 py-0.5 text-xs">{k.prefix}…</code>
            ),
          },
          {
            key: 'status',
            header: tc('status'),
            sortable: true,
            accessor: (k) => k.status,
            render: (k) => (
              <Badge tone={k.status === 'ACTIVE' ? 'success' : 'danger'}>{k.status}</Badge>
            ),
          },
          {
            key: 'lastUsed',
            header: t('lastUsed'),
            sortable: true,
            accessor: (k) => k.lastUsedAt ?? '',
            render: (k) => (
              <span className="text-muted-foreground">
                {k.lastUsedAt ? formatDate(k.lastUsedAt, locale) : t('never')}
              </span>
            ),
          },
          {
            key: 'actions',
            header: tc('actions'),
            align: 'right',
            render: (k) =>
              k.status === 'ACTIVE' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-500/10"
                  onClick={() => revoke(k.id)}
                >
                  <Ban className="h-4 w-4" /> {t('revoke')}
                </Button>
              ),
          },
        ] as Column<ApiKey>[]}
      />

      {/* Integration documentation */}
      <IntegrationDocs />

      {/* Interactive test form */}
      <ApiPlayground apiKey={testKey} onApiKeyChange={setTestKey} />

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t('create')}>
        <div className="space-y-4">
          <Input
            label={tc('name')}
            value={name}
            placeholder={t('namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
          />
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

      {/* Secret reveal dialog */}
      <Dialog open={!!secret} onClose={() => setSecret(null)} title={t('secretTitle')}>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
            {t('secretWarning')}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-slate-900 px-3 py-2 text-xs text-brand-300">
              {secret}
            </code>
            <Button variant="outline" size="icon" onClick={() => secret && copy(secret)}>
              {copied ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (secret) setTestKey(secret);
                setSecret(null);
              }}
            >
              {tp('useCreatedKey')}
            </Button>
            <Button onClick={() => setSecret(null)}>{tc('close')}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
