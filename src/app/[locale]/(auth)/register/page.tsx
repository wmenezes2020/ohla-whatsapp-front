'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, apiError } from '@/lib/api';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', tenantName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      toast.success(t('pendingActivation'), { duration: 8000 });
      router.replace('/login');
    } catch (err) {
      const { code } = apiError(err);
      toast.error(code === 'auth.email_taken' ? 'Email already registered' : t('pendingActivation'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">{t('registerTitle')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('registerSubtitle')}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Input
          id="fullName"
          label={t('fullName')}
          value={form.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          required
        />
        <Input
          id="tenantName"
          label={t('organization')}
          value={form.tenantName}
          onChange={(e) => update('tenantName', e.target.value)}
        />
        <Input
          id="email"
          type="email"
          label={t('email')}
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          id="password"
          type="password"
          label={t('password')}
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" loading={loading}>
          {t('register')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t('hasAccount')}{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}
