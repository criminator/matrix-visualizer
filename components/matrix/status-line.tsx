'use client';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

// Inline error under an input; renders nothing while the input is valid.
export function StatusLine({
  error,
  className,
}: {
  error?: string;
  className?: string;
}) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className={cn('flex items-start gap-1.5 text-label leading-4 font-normal text-destructive', className)}
    >
      <CircleAlert className="mt-px size-3.5 shrink-0" />
      {error}
    </p>
  );
}
