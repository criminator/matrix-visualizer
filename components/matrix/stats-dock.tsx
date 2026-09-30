'use client';
import { forwardRef } from 'react';
import { Pause, Play } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { DisplayMode } from '@/app/scene';
import type { Entry, Workspace } from '@/hooks/use-matrix-workspace';
import { IconButton } from './icon-button';

type Props = {
  ws: Workspace;
  det: number;
  rank: number;
  mode: DisplayMode;
  className?: string;
};

const orientation = (det: number) =>
  Math.abs(det) < 1e-10
    ? 'Space collapsed'
    : det < 0
      ? 'Orientation flipped'
      : 'Orientation kept';

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <strong className="text-lg font-medium tabular-nums">{value}</strong>
        <span className="truncate text-xs text-muted-foreground">{note}</span>
      </span>
    </div>
  );
}

function Swatch({ entry }: { entry: Entry }) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold">
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: entry.color }} />
      {entry.name}
      {!entry.visible && <span className="text-xs font-normal text-muted-foreground">hidden</span>}
    </span>
  );
}

// Statistics for the active matrix plus the transformation timeline.
export const StatsDock = forwardRef<HTMLDivElement, Props>(function StatsDock(
  { ws, det, rank, mode, className },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'pointer-events-auto flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border bg-card/90 px-4 py-3 shadow-lg backdrop-blur',
        className,
      )}
    >
      <Swatch entry={ws.active} />
      <div className="flex gap-6">
        <Stat label="det" value={String(Number(det.toFixed(3)))} note={orientation(det)} />
        <Stat label="rank" value={String(rank)} note="of 3" />
        <Stat label="volume" value={`${Number(Math.abs(det).toFixed(3))}×`} note="scale" />
      </div>
      {mode === 'span' ? (
        <p className="min-w-48 flex-1 text-xs text-muted-foreground">
          {rank === 0
            ? 'The zero matrix spans only the origin.'
            : 'Spans are infinite; the plot shows a finite window.'}
        </p>
      ) : (
        <div className="flex min-w-56 flex-1 items-center gap-3">
          <IconButton
            label={ws.playing ? 'Pause' : 'Animate from identity'}
            shortcut="Space"
            variant="default"
            size="icon"
            className="rounded-full"
            onClick={ws.togglePlay}
          >
            {ws.playing ? <Pause /> : <Play />}
          </IconButton>
          <div className="flex flex-1 flex-col gap-1.5">
            <Slider
              aria-label="Transformation progress"
              min={0}
              max={1}
              step={0.001}
              value={[ws.progress]}
              onValueChange={(v) => ws.scrub(Array.isArray(v) ? v[0] : v)}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Identity</span>
              <span className="tabular-nums">{Math.round(ws.progress * 100)}%</span>
              <span>Matrices</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
