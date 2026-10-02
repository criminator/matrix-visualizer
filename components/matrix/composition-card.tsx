'use client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { determinant } from '@/lib/matrix';
import { compositionColor } from '@/lib/presets';
import type { Workspace } from '@/hooks/use-matrix-workspace';
import { InspectorSection } from './inspector-section';
import { MatrixInput } from './matrix-input';
import { StatusLine } from './status-line';

const round = (v: number) => String(Number(v.toPrecision(4)));

// Opening the section turns plotting of the composition on.
export function CompositionCard({ ws }: { ws: Workspace }) {
  const { composition, compositionError } = ws;
  const label = ws.expression.replace(/\s/g, '');

  return (
    <InspectorSection
      id="composition"
      title="Composition"
      open={ws.showComposition}
      onOpenChange={ws.setShowComposition}
      summary={
        ws.showComposition && composition ? (
          <>
            <span aria-hidden className="size-2 rounded-full" style={{ background: compositionColor }} />
            <span className="truncate font-math text-xs italic">{label}</span>
          </>
        ) : undefined
      }
      description="Multiply matrices by name; the rightmost acts first. Plotted in grey."
    >
      <Input
        aria-label="Composition expression"
        aria-invalid={!!compositionError}
        value={ws.expression}
        onChange={(e) => ws.setExpression(e.target.value)}
        placeholder="A * B"
        spellCheck={false}
        className="h-8 font-mono text-[13px] md:text-[13px]"
      />
      <StatusLine error={compositionError} />
      {composition && (
        <>
          <MatrixInput name={label} cells={composition.map((row) => row.map(round))} />
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-label text-muted-foreground">
              det = {round(determinant(composition))}
            </span>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() => ws.addMatrix(composition, label)}
            >
              <Plus /> Save as matrix
            </Button>
          </div>
        </>
      )}
    </InspectorSection>
  );
}
