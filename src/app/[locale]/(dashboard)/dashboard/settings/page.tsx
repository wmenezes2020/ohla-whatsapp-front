'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useAuthStore } from '@/lib/auth-store';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tr = useTranslations('roles');
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">{t('organization')}</h2>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row label="Email" value={user?.email} />
            <Row label={t('title')} value={user?.fullName} />
            <Row label="Rol" value={user ? tr(user.role) : '—'} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">{t('language')}</h2>
          </CardHeader>
          <CardBody>
            <LanguageSwitcher />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b border-slate-50 pb-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-800">{value || '—'}</span>
    </div>
  );
}
