'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Radio,
  KeyRound,
  Users,
  BarChart3,
  Settings,
  Server,
  Building2,
  LogOut,
  MessageCircle,
  Flame,
  Menu,
  X,
} from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Ohla';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, setUser, clear } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data);
        setReady(true);
      })
      .catch(() => {
        clear();
        router.replace('/login');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function logout() {
    clear();
    router.replace('/login');
  }

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t('platform')}…
      </div>
    );
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isAdmin = user.role === 'TENANT_ADMIN';

  const platformNav: NavItem[] = [
    { href: '/dashboard', label: t('overview'), icon: LayoutDashboard },
    { href: '/dashboard/channels', label: t('channels'), icon: Radio },
    { href: '/dashboard/warmup', label: t('warmup'), icon: Flame },
    { href: '/dashboard/api-keys', label: t('apiKeys'), icon: KeyRound },
    ...(isAdmin ? [{ href: '/dashboard/users', label: t('users'), icon: Users }] : []),
    { href: '/dashboard/reports', label: t('reports'), icon: BarChart3 },
    { href: '/dashboard/settings', label: t('settings'), icon: Settings },
  ];

  const adminNav: NavItem[] = [
    { href: '/dashboard/admin', label: t('overview'), icon: LayoutDashboard },
    { href: '/dashboard/evolution-servers', label: t('evolutionServers'), icon: Server },
    { href: '/dashboard/tenants', label: t('tenants'), icon: Building2 },
    { href: '/dashboard/admin-users', label: t('users'), icon: Users },
  ];

  const isActive = (href: string) =>
    href === '/dashboard' || href === '/dashboard/admin'
      ? pathname === href
      : pathname.startsWith(href);

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          active
            ? 'bg-sidebar-accent text-primary'
            : 'text-sidebar-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <Icon className={cn('h-[18px] w-[18px] transition', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
        {item.label}
      </Link>
    );
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
          <MessageCircle className="h-5 w-5" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">{APP_NAME}</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {!isSuperAdmin && (
          <>
            <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">
              {t('platform')}
            </p>
            {platformNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}
        {isSuperAdmin && (
          <>
            <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">
              {t('administration')}
            </p>
            {adminNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 px-3 py-1">
          <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-sidebar">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md lg:px-8">
          <button
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
