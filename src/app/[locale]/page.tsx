'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function IndexPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    router.replace(token ? '/dashboard' : '/login');
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">…</div>
  );
}
