'use client';
import { useEffect } from 'react';
import { Braces, Brackets, Columns3, RotateCcw, Settings2, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { IDENTITY } from '@/lib/matrix';
import type { Workspace } from '@/hooks/use-matrix-workspace';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { IconButton, WithTooltip } from './icon-button';
import { MatrixInput, type CellLayout } from './matrix-input';
import { StatusLine } from './status-line';

type Layout = CellLayout | 'text';

const LAYOUTS: { value: Layout; label: string; icon: typeof Braces }[] = [
  { value: 'bracket', label: 'Bracket', icon: Brackets },
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'columns', label: 'Column vectors', icon: Columns3 },
  { value: 'text', label: 'Text', icon: Braces },
];

const LEGACY_TAB = 'matrix-space:editor-tab';

type Props = {
  ws: Workspace;
  highlight: number | null;
  onHighlight: (column: number | null) => void;
};

export function MatrixEditor({ ws, highlight, onHighlight }: Props) {
  const [stored, setLayout] = usePersistedState('matrix-space:matrix-layout', '');
  const { active } = ws;

  // One-time migration from the old Grid/Text tabs.
  useEffect(() => {
    try {
      if (localStorage.getItem('matrix-space:matrix-layout') !== null) return;
      const legacy = localStorage.getItem(LEGACY_TAB);
      localStorage.removeItem(LEGACY_TAB);
      if (legacy === '"text"') setLayout('text');
    } catch {
      /* Storage blocked. */
    }
  }, [setLayout]);

  const layout: Layout = LAYOUTS.some((l) => l.value === stored)
    ? (stored as Layout)
    : 'bracket';

  if (!active)
    return (
      <p className="rounded-md border border-dashed px-3 py-4 text-center text-label font-normal text-muted-foreground">
        No matrix selected. Select one to edit it.
      </p>
    );

  return (
    <section aria-label={`Edit matrix ${active.name}`} className="flex flex-col gap-2">
      {layout === 'text' ? (
        <Textarea
          aria-label={`${active.name} as text`}
          aria-invalid={!!active.error}
          spellCheck={false}
          value={active.source}
          onChange={(e) => ws.editText(e.target.value)}
          placeholder="1 0 0; 0 1 0; 0 0 1"
          className="min-h-28 resize-none font-mono text-[13px] leading-6"
        />
      ) : (
        <MatrixInput
          name={active.name}
          cells={active.cells}
          layout={layout}
          highlight={highlight}
          onHighlight={onHighlight}
          onCellChange={ws.editCell}
          onPaste={ws.pasteMatrix}
        />
      )}

      <div className="flex items-start gap-2">
        <StatusLine
          error={active.error && `${active.error} Showing the last valid matrix.`}
          className="flex-1 pt-1.5"
        />
        <div className="ml-auto flex items-center gap-0.5 text-muted-foreground">
          <Popover>
            <WithTooltip label="Input layout">
              <PopoverTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Input layout" />
                }
              >
                <Settings2 />
              </PopoverTrigger>
            </WithTooltip>
            <PopoverContent align="end" className="w-48 gap-1.5 p-1.5">
              <PopoverTitle className="px-1.5 pt-1 text-label text-muted-foreground">
                Input layout
              </PopoverTitle>
              <ToggleGroup
                aria-label="Input layout"
                orientation="vertical"
                spacing={0}
                value={[layout]}
                onValueChange={(v) => v[0] && setLayout(v[0] as Layout)}
                className="w-full gap-0.5"
              >
                {LAYOUTS.map(({ value, label, icon: Icon }) => (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    size="sm"
                    className="justify-start rounded-md! text-muted-foreground data-pressed:bg-accent data-pressed:text-foreground"
                  >
                    <Icon /> {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="px-1.5 pb-1 text-label leading-4 font-normal text-muted-foreground">
                Cells take expressions like 1/2 or sqrt(2). Paste a whole matrix
                into any cell.
              </p>
            </PopoverContent>
          </Popover>
          <IconButton
            label="Reset to identity"
            onClick={() => ws.apply(IDENTITY, 'Identity')}
          >
            <RotateCcw />
          </IconButton>
        </div>
      </div>
    </section>
  );
}
