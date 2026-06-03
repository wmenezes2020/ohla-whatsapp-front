'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Light mode' : 'Dark mode'}
      title={isDark ? 'Light' : 'Dark'}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:text-foreground hover:bg-muted"
    >
      <Sun className={`h-4 w-4 transition-all ${isDark ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} />
      <Moon
        className={`absolute h-4 w-4 transition-all ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`}
      />
    </button>
  );
}
