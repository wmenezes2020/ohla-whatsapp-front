'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data);
      router.replace('/dashboard');
    } catch (err) {
      const { code } = apiError(err);
      const map: Record<string, string> = {
        'auth.invalid_credentials': t('invalidCredentials'),
        'auth.account_pending': t('accountPending'),
        'auth.account_suspended': t('accountSuspended'),
      };
      toast.error(map[code || ''] || t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">{t('loginTitle')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('loginSubtitle')}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Input
          id="email"
          type="email"
          label={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          id="password"
          type="password"
          label={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Button type="submit" className="w-full" loading={loading}>
          {t('login')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          {t('signUp')}
        </Link>
      </p>
    </div>
  );
}
