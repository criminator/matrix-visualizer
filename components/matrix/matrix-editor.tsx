'use client';
import { Braces, Check, Grid2X2, Info, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { IDENTITY } from '@/lib/matrix';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/hooks/use-matrix-workspace';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { MatrixGrid } from './matrix-grid';

type Props = {
  ws: Workspace;
  highlight: number | null;
  onHighlight: (column: number | null) => void;
};

export function MatrixEditor({ ws, highlight, onHighlight }: Props) {
  const [tab, setTab] = usePersistedState('matrix-space:editor-tab', 'grid');
  const { active } = ws;

  return (
    <section aria-label={`Edit matrix ${active.name}`} className="flex flex-col gap-3">
      <Tabs value={tab} onValueChange={(v: string) => setTab(v)}>
        <TabsList className="w-full">
          <TabsTrigger value="grid">
            <Grid2X2 /> Grid
          </TabsTrigger>
          <TabsTrigger value="text">
            <Braces /> Text
          </TabsTrigger>
        </TabsList>
        <TabsContent value="grid" className="pt-2">
          <MatrixGrid
            name={active.name}
            cells={active.cells}
            highlight={highlight}
            onHighlight={onHighlight}
            onCellChange={ws.editCell}
            onPaste={ws.pasteMatrix}
          />
        </TabsContent>
        <TabsContent value="text" className="pt-2">
          <Textarea
            aria-label={`${active.name} as text`}
            spellCheck={false}
            value={active.source}
            onChange={(e) => ws.editText(e.target.value)}
            className="min-h-32 font-mono text-sm leading-7"
          />
        </TabsContent>
      </Tabs>

      <div className="flex items-start justify-between gap-2">
        <output
          className={cn(
            'flex min-h-8 items-start gap-1.5 text-xs leading-5 text-muted-foreground',
            active.error && 'text-destructive',
          )}
        >
          {active.error ? (
            <>
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {active.error} Showing the last valid matrix.
            </>
          ) : (
            <>
              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {tab === 'grid'
                ? 'Live · try 1/2 or sqrt(2)'
                : 'Rows: semicolons or new lines'}
            </>
          )}
        </output>
        <Button
          variant="ghost"
          size="xs"
          className="shrink-0 text-muted-foreground"
          onClick={() => ws.apply(IDENTITY, 'Identity')}
        >
          <RotateCcw /> Identity
        </Button>
      </div>
    </section>
  );
}
