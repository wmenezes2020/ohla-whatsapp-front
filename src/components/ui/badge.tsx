import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  success:
    'bg-brand-100 text-brand-700 ring-1 ring-inset ring-brand-200/60 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-400/20',
  warning:
    'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200/60 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/20',
  danger:
    'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200/60 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/20',
  info: 'bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200/60 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/20',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
