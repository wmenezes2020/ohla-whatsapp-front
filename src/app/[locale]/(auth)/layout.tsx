import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/language-switcher';
import { MessageCircle } from 'lucide-react';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Ohla';
const COMPANY_NAME = 'Ohla';
const COMPANY_URL = 'https://ohla.ai';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('authHero');

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <MessageCircle className="h-6 w-6" />
          {APP_NAME}
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">{t('title')}</h1>
          <p className="mt-4 max-w-md text-brand-100">{t('subtitle')}</p>
        </div>
        <a
          href={COMPANY_URL}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand-200 transition hover:text-white"
        >
          © {COMPANY_NAME}
        </a>
      </div>

      {/* Form panel */}
      <div className="flex flex-col">
        <div className="flex justify-end p-6">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
