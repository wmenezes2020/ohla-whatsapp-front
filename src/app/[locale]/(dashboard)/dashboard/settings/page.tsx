'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const tr = useTranslations('roles');
  const { user, setUser } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const errorMessage = (e: unknown) => {
    const { code } = apiError(e);
    const map: Record<string, string> = {
      'auth.email_taken': t('emailTaken'),
      'auth.current_password_invalid': t('currentPasswordInvalid'),
      'auth.current_password_required': t('currentPasswordInvalid'),
    };
    return map[code || ''] || tc('error');
  };

  const accountMut = useMutation({
    mutationFn: async () => (await api.patch('/auth/me', { fullName, email })).data,
    onSuccess: (data) => {
      setUser(data);
      toast.success(t('saved'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const passwordMut = useMutation({
    mutationFn: async () => (await api.patch('/auth/me', { currentPassword, newPassword })).data,
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      toast.success(t('passwordChanged'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const accountDirty =
    !!user && (fullName !== (user.fullName || '') || email !== (user.email || ''));

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account details */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">{t('account')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t('accountDesc')}</p>
          </CardHeader>
          <CardBody>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!accountDirty) return toast.info(t('noChanges'));
                accountMut.mutate();
              }}
            >
              <Input
                label={t('fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={120}
                required
              />
              <Input
                type="email"
                label={t('email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input label={t('role')} value={user ? tr(user.role) : ''} disabled />
              <div className="flex justify-end">
                <Button type="submit" loading={accountMut.isPending} disabled={!accountDirty}>
                  {tc('save')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">{t('password')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t('passwordDesc')}</p>
          </CardHeader>
          <CardBody>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                passwordMut.mutate();
              }}
            >
              <Input
                type="password"
                label={t('currentPassword')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <Input
                type="password"
                label={t('newPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={passwordMut.isPending}
                  disabled={!currentPassword || newPassword.length < 8}
                >
                  {t('changePassword')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Language */}
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
