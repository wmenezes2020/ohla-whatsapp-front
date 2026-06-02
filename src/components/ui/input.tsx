'use client';

import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldProps
>(({ className, label, hint, id, ...props }, ref) => (
  <div>
    {label && (
      <label htmlFor={id} className="label-base">
        {label}
      </label>
    )}
    <input ref={ref} id={id} className={cn('input-base', className)} {...props} />
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
));
Input.displayName = 'Input';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(({ className, label, hint, id, children, ...props }, ref) => (
  <div>
    {label && (
      <label htmlFor={id} className="label-base">
        {label}
      </label>
    )}
    <select ref={ref} id={id} className={cn('input-base', className)} {...props}>
      {children}
    </select>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
));
Select.displayName = 'Select';
