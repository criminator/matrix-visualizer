'use client';
import type { ClipboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CellInput, moveFocus } from './cell-input';

export type CellLayout = 'bracket' | 'table' | 'columns';

// Column j is where the j-th unit vector lands, so columns take axis colors.
// Dotless i and j with a drawn hat; a combining circumflex on k misaligns.
const HATS = ['ı', 'ȷ', 'k'];
const AXIS_TEXT = ['text-axis-x', 'text-axis-y', 'text-axis-z'];
const AXIS_BG = ['bg-axis-x/10', 'bg-axis-y/10', 'bg-axis-z/10'];
const AXIS_BORDER = ['border-axis-x/50', 'border-axis-y/50', 'border-axis-z/50'];

type Props = {
  name: string;
  cells: string[][];
  layout?: CellLayout;
  highlight?: number | null;
  onHighlight?: (column: number | null) => void;
  onCellChange?: (row: number, column: number, value: string) => void;
  onPaste?: (text: string) => void;
  className?: string;
};

// 3×3 matrix input. Read-only when onCellChange is omitted.
export function MatrixInput({
  name,
  cells,
  layout = 'bracket',
  highlight = null,
  onHighlight,
  onCellChange,
  onPaste,
  className,
}: Props) {
  const readOnly = !onCellChange;

  const cell = (r: number, c: number, cellClass?: string) => (
    <CellInput
      key={`${r}-${c}`}
      row={r}
      column={c}
      value={cells[r][c]}
      readOnly={readOnly}
      aria-label={`${name} row ${r + 1}, column ${c + 1}`}
      className={cn(highlight === c && !readOnly && AXIS_BG[c], cellClass)}
      onFocus={() => onHighlight?.(c)}
      onBlur={() => onHighlight?.(null)}
      onChange={(e) => onCellChange?.(r, c, e.target.value)}
      onKeyDown={readOnly ? undefined : (e) => moveFocus(e, [r, c], [3, 3])}
      onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData('text');
        if (onPaste && /[\t\n;[\]]/.test(text)) {
          e.preventDefault();
          onPaste(text);
        }
      }}
    />
  );

  const hat = (c: number, extra?: string) => (
    <span
      key={c}
      title={`Column ${c + 1}: where the ${'xyz'[c]} unit vector lands`}
      className={cn(
        'text-center font-math text-sm italic opacity-70 transition-opacity',
        AXIS_TEXT[c],
        highlight === c && 'font-semibold opacity-100',
        extra,
      )}
    >
      <span className="relative inline-block">
        {HATS[c]}
        <span
          aria-hidden
          className="absolute -top-[0.45em] left-1/2 -translate-x-[35%] text-[0.85em] not-italic"
        >
          ˆ
        </span>
      </span>
    </span>
  );

  // Hats sit in a header row so the name centers on the cells alone.
  let header: ReactNode = null;
  let body: ReactNode;
  if (layout === 'table') {
    body = (
      <div className="grid grid-cols-[1.25rem_repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded-md border bg-border [&>*]:bg-card">
        <span />
        {[0, 1, 2].map((c) => hat(c, 'py-1'))}
        {cells.map((row, r) => [
          <span
            key={`row-${r}`}
            className="grid place-items-center font-math text-xs text-muted-foreground italic"
          >
            {'xyz'[r]}
          </span>,
          ...row.map((_, c) => cell(r, c, 'h-9 rounded-none')),
        ])}
      </div>
    );
  } else if (layout === 'columns') {
    header = <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((c) => hat(c))}</div>;
    body = (
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((c) => (
          <div
            key={c}
            className={cn(
              'flex flex-col gap-0.5 rounded-md border-x-[1.5px] px-1 py-0.5',
              AXIS_BORDER[c],
            )}
          >
            {[0, 1, 2].map((r) => cell(r, c))}
          </div>
        ))}
      </div>
    );
  } else {
    header = <div className="grid grid-cols-3 px-2.5">{[0, 1, 2].map((c) => hat(c))}</div>;
    body = (
      <div className="relative px-2.5">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1.5 border-y-[1.5px] border-l-[1.5px] border-muted-foreground/60"
        />
        <span
          aria-hidden
          className="absolute inset-y-0 right-0 w-1.5 border-y-[1.5px] border-r-[1.5px] border-muted-foreground/60"
        />
        <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 py-1">
          {cells.flatMap((row, r) => row.map((_, c) => cell(r, c)))}
        </div>
      </div>
    );
  }

  return (
    <div
      data-cell-scope
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1',
        className,
      )}
    >
      {header && (
        <>
          <span />
          {header}
        </>
      )}
      <span
        className="max-w-24 truncate font-math text-lg text-muted-foreground italic"
        title={`${name} =`}
      >
        {name} =
      </span>
      {body}
    </div>
  );
}
