'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

export function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} card max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
