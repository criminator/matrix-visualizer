'use client';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { determinant } from '@/lib/matrix';
import type { Workspace } from '@/hooks/use-matrix-workspace';
import { MatrixGrid } from './matrix-grid';

const round = (v: number) => String(Number(v.toPrecision(4)));

// Opening the card turns plotting of the composition on.
export function CompositionCard({ ws }: { ws: Workspace }) {
  const { composition, compositionError } = ws;
  const label = ws.expression.replace(/\s/g, '');

  return (
    <Collapsible
      open={ws.showComposition}
      onOpenChange={ws.setShowComposition}
      className="rounded-lg border bg-card"
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
        Composition
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {ws.showComposition ? 'Plotted in white' : 'Multiply matrices'}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 px-3 pb-3">
        <p className="text-xs leading-5 text-muted-foreground">
          Multiply matrices by name. The rightmost acts first, so in{' '}
          <code className="font-mono text-foreground">A * B</code>, B is applied
          before A. Hidden matrices still work.
        </p>
        <Input
          aria-label="Composition expression"
          aria-invalid={!!compositionError}
          value={ws.expression}
          onChange={(e) => ws.setExpression(e.target.value)}
          placeholder="A * B"
          className="font-mono"
        />
        {compositionError && (
          <p role="alert" className="text-xs text-destructive">
            {compositionError}
          </p>
        )}
        {composition && (
          <>
            <MatrixGrid
              name={label}
              cells={composition.map((row) => row.map(round))}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                det = {round(determinant(composition))}
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => ws.addMatrix(composition, label)}
              >
                <Plus /> Save as matrix
              </Button>
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
