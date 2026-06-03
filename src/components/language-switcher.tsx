'use client';

import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';

const labels: Record<string, string> = {
  es: 'Español',
  en: 'English',
  'pt-BR': 'Português',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="relative inline-flex items-center">
      <Globe className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" />
      <select
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
        className="h-9 cursor-pointer rounded-lg border border-input bg-card pl-8 pr-3 text-sm outline-none focus:border-brand-500"
        aria-label="Language"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {labels[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
