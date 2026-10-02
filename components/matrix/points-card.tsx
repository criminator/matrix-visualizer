'use client';
import { Braces, Check, ChevronRight, Info, List, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MAX_POINTS } from '@/lib/matrix';
import { cn } from '@/lib/utils';
import type { Points } from '@/hooks/use-points';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { IconButton } from './icon-button';

// Several values in one paste (a row or a list) go to the point parser.
const isMultiValue = (text: string) =>
  /[\t\n;,[\]]/.test(text) || /\S\s+\S/.test(text.trim());

// Opening the card turns plotting of the points on.
export function PointsCard({ points }: { points: Points }) {
  const [tab, setTab] = usePersistedState('matrix-space:points-tab', 'rows');
  const rowError = points.rows.map((r) => r.nameError || r.error).find(Boolean);
  const error = tab === 'text' ? points.textError : rowError;
  const colors = [...new Set(points.rows.map((r) => r.color))];

  return (
    <Collapsible
      open={points.show}
      onOpenChange={points.setShow}
      className="rounded-lg border bg-card"
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
        Points
        <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          {points.show && (
            <span aria-hidden className="flex -space-x-0.5">
              {colors.slice(0, 4).map((color) => (
                <span
                  key={color}
                  className="size-2 rounded-full ring-1 ring-card"
                  style={{ background: color }}
                />
              ))}
            </span>
          )}
          {points.show
            ? `${points.rows.length} plotted`
            : 'Place reference points'}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 px-3 pb-3">
        <p className="text-xs leading-5 text-muted-foreground">
          Fixed markers in space. Matrices leave them in place, so they work as
          landmarks in every display mode. Name and color each one.
        </p>
        <Tabs value={tab} onValueChange={(v: string) => setTab(v)}>
          <TabsList className="w-full">
            <TabsTrigger value="rows">
              <List /> Rows
            </TabsTrigger>
            <TabsTrigger value="text">
              <Braces /> Text
            </TabsTrigger>
          </TabsList>
          <TabsContent value="rows" className="flex flex-col gap-1.5 pt-2">
            <div
              aria-hidden
              className="grid grid-cols-[1.25rem_3rem_repeat(3,minmax(0,1fr))_2rem] gap-1.5 text-center font-math text-xs text-muted-foreground italic"
            >
              <span />
              <span className="font-sans not-italic">Name</span>
              <span>x</span>
              <span>y</span>
              <span>z</span>
              <span />
            </div>
            <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
              {points.rows.map((row, index) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[1.25rem_3rem_repeat(3,minmax(0,1fr))_2rem] items-center gap-1.5"
                >
                  <input
                    type="color"
                    aria-label={`Color of point ${index + 1}`}
                    value={row.color}
                    onChange={(e) => points.setColor(row.id, e.target.value)}
                    className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
                  />
                  <input
                    aria-label={`Name of point ${index + 1}`}
                    aria-invalid={!!row.nameError}
                    value={row.nameDraft}
                    maxLength={12}
                    spellCheck={false}
                    onChange={(e) => points.editName(row.id, e.target.value)}
                    onBlur={() => points.settleName(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape')
                        e.currentTarget.blur();
                    }}
                    title={row.name}
                    className={cn(
                      'h-8 w-full min-w-0 truncate rounded-md border border-input bg-input/30 px-1 text-center text-sm font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive',
                      row.nameDraft.length > 3 && 'px-0.5 text-[11px]',
                    )}
                  />
                  {row.cells.map((value, axis) => (
                    <input
                      key={axis}
                      aria-label={`${row.name} ${'xyz'[axis]}`}
                      aria-invalid={!!row.error}
                      value={value}
                      onChange={(e) =>
                        points.editCell(row.id, axis, e.target.value)
                      }
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text');
                        if (isMultiValue(text)) {
                          e.preventDefault();
                          points.pasteInto(row.id, text);
                        }
                      }}
                      className={cn(
                        'h-8 w-full min-w-0 rounded-md border border-input bg-input/30 text-center font-mono text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive',
                        value.length > 5 && 'px-0.5 text-[11px] tracking-tight',
                      )}
                    />
                  ))}
                  <IconButton
                    label={`Remove ${row.name}`}
                    onClick={() => points.remove(row.id)}
                    className="text-muted-foreground"
                  >
                    <X />
                  </IconButton>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="xs"
              className="self-start"
              disabled={points.rows.length >= MAX_POINTS}
              onClick={points.add}
            >
              <Plus /> Add point
            </Button>
          </TabsContent>
          <TabsContent value="text" className="pt-2">
            <Textarea
              aria-label="Points as text"
              aria-invalid={!!points.textError}
              spellCheck={false}
              value={points.source}
              onChange={(e) => points.editText(e.target.value)}
              placeholder="P1: (1, 2, 3) #ff7eb6"
              className="min-h-28 font-mono text-sm leading-7"
            />
          </TabsContent>
        </Tabs>
        <output
          className={cn(
            'flex items-start gap-1.5 text-xs leading-5 text-muted-foreground',
            error && 'text-destructive',
          )}
        >
          {error ? (
            <>
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {error} Showing the last valid points.
            </>
          ) : (
            <>
              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {tab === 'rows'
                ? 'Live · paste a list into any cell'
                : 'One per line, like Q: (1, 2, 3) #f0a · name and color optional'}
            </>
          )}
        </output>
      </CollapsibleContent>
    </Collapsible>
  );
}
