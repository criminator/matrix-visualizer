'use client';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

const SUBSCRIPTS = ['₁', '₂', '₃'];

type Props = {
  name: string;
  cells: string[][];
  highlight?: number | null;
  onHighlight?: (column: number | null) => void;
  onCellChange?: (row: number, column: number, value: string) => void;
  onPaste?: (text: string) => void;
  className?: string;
};

// 3×3 matrix in brackets. Editable when onCellChange is given.
export function MatrixGrid({
  name,
  cells,
  highlight = null,
  onHighlight,
  onCellChange,
  onPaste,
  className,
}: Props) {
  const readOnly = !onCellChange;

  const focusCell = (from: HTMLElement, index: number) => {
    const inputs = from
      .closest('[data-matrix-cells]')
      ?.querySelectorAll('input');
    const target = inputs?.[index];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const input = e.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length;
    let next: [number, number] | null = null;
    if (e.key === 'ArrowUp') next = [r - 1, c];
    else if (e.key === 'ArrowDown') next = [r + 1, c];
    else if (e.key === 'ArrowLeft' && atStart) next = [r, c - 1];
    else if (e.key === 'ArrowRight' && atEnd) next = [r, c + 1];
    // Enter walks down each column, then on to the next; stops at the end.
    else if (e.key === 'Enter') next = r < 2 ? [r + 1, c] : [0, c + 1];
    if (!next) return;
    e.preventDefault();
    const [nr, nc] = next;
    if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) focusCell(input, nr * 3 + nc);
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className="max-w-24 truncate font-math text-xl text-muted-foreground italic"
        title={`${name} =`}
      >
        {name} =
      </span>
      <div className="relative flex-1 px-2.5 before:absolute before:inset-y-0 before:top-6 before:left-0 before:w-1.5 before:border-y-[1.5px] before:border-l-[1.5px] before:border-muted-foreground/70 after:absolute after:inset-y-0 after:top-6 after:right-0 after:w-1.5 after:border-y-[1.5px] after:border-r-[1.5px] after:border-muted-foreground/70">
        <div className="mb-2 grid grid-cols-3 text-center text-xs text-muted-foreground">
          {SUBSCRIPTS.map((s, c) => (
            <span
              key={s}
              className={cn(
                'truncate font-math italic',
                highlight === c && 'font-semibold text-foreground',
              )}
              title={`Column ${c + 1}: where the ${'xyz'[c]} unit vector lands`}
            >
              {name}
              {s}
            </span>
          ))}
        </div>
        <div data-matrix-cells className="grid grid-cols-3 gap-1.5">
          {cells.flatMap((row, r) =>
            row.map((value, c) => (
              <input
                key={`${r}-${c}`}
                aria-label={`${name} row ${r + 1}, column ${c + 1}`}
                value={value}
                readOnly={readOnly}
                tabIndex={readOnly ? -1 : undefined}
                className={cn(
                  'h-10 w-full min-w-0 rounded-md border border-input bg-input/30 text-center font-mono text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
                  highlight === c &&
                    'border-primary/70 bg-primary/10 font-semibold',
                  readOnly && 'cursor-default bg-transparent',
                  value.length > 7 && 'px-0.5 text-[11px] tracking-tight',
                )}
                onFocus={() => onHighlight?.(c)}
                onBlur={() => onHighlight?.(null)}
                onChange={(e) => onCellChange?.(r, c, e.target.value)}
                onKeyDown={readOnly ? undefined : (e) => onKeyDown(e, r, c)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (onPaste && /[\t\n;[\]]/.test(text)) {
                    e.preventDefault();
                    onPaste(text);
                  }
                }}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}
