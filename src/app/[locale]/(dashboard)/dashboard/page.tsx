'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { MetricsDashboard } from '@/components/metrics/metrics-dashboard';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function OverviewPage() {
  const t = useTranslations('overview');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Super Admins use the global admin dashboard.
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') router.replace('/dashboard/admin');
  }, [user, router]);

  if (user?.role === 'SUPER_ADMIN') return null;

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <MetricsDashboard scope="tenant" />
    </div>
  );
}
