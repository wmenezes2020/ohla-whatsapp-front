'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { MetricsDashboard } from '@/components/metrics/metrics-dashboard';

export default function AdminOverviewPage() {
  const t = useTranslations('overview');
  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <MetricsDashboard scope="admin" />
    </div>
  );
}
