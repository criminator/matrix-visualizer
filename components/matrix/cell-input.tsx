'use client';
import type { ComponentProps, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

// Borderless numeric cell shared by every matrix layout and the point rows.
// Cells inside one [data-cell-scope] are addressed by data-cell="row-column".
export function CellInput({
  row,
  column,
  value,
  className,
  readOnly,
  ...props
}: ComponentProps<'input'> & { row: number; column: number; value: string }) {
  return (
    <input
      data-cell={`${row}-${column}`}
      value={value}
      readOnly={readOnly}
      tabIndex={readOnly ? -1 : undefined}
      spellCheck={false}
      autoComplete="off"
      className={cn(
        'h-8 w-full min-w-0 rounded-md bg-transparent px-1 text-center font-mono text-[13px] transition-colors outline-none',
        'hover:bg-muted/70 focus:bg-muted focus-visible:ring-1 focus-visible:ring-ring',
        'aria-invalid:text-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/60',
        readOnly && 'cursor-default hover:bg-transparent',
        value.length > 7 && 'px-0.5 text-[11px] tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

// Arrow keys move between cells (left/right only from the text edges).
// Enter walks down a column ('column') or along a row ('row').
export function moveFocus(
  e: KeyboardEvent<HTMLInputElement>,
  [row, column]: [number, number],
  [rows, columns]: [number, number],
  enter: 'column' | 'row' = 'column',
) {
  const input = e.currentTarget;
  const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
  const atEnd = input.selectionStart === input.value.length;
  let next: [number, number] | null = null;
  if (e.key === 'ArrowUp') next = [row - 1, column];
  else if (e.key === 'ArrowDown') next = [row + 1, column];
  else if (e.key === 'ArrowLeft' && atStart) next = [row, column - 1];
  else if (e.key === 'ArrowRight' && atEnd) next = [row, column + 1];
  else if (e.key === 'Enter')
    next =
      enter === 'column'
        ? row < rows - 1 ? [row + 1, column] : [0, column + 1]
        : column < columns - 1 ? [row, column + 1] : [row + 1, 0];
  if (!next) return;
  e.preventDefault();
  const target = input
    .closest('[data-cell-scope]')
    ?.querySelector<HTMLInputElement>(`[data-cell="${next[0]}-${next[1]}"]`);
  if (target) {
    target.focus();
    target.select();
  }
}
