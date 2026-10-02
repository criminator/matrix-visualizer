'use client';
import { forwardRef } from 'react';
import { Pause, Play } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { DisplayMode } from '@/app/scene';
import { formatEigenvalue as format, type Eigen } from '@/lib/matrix';
import type { Entry, Workspace } from '@/hooks/use-matrix-workspace';
import { IconButton } from './icon-button';

type Props = {
  ws: Workspace;
  det: number;
  rank: number;
  eigen: Eigen;
  mode: DisplayMode;
  className?: string;
};

const orientation = (det: number) =>
  Math.abs(det) < 1e-10
    ? 'Space collapsed'
    : det < 0
      ? 'Orientation flipped'
      : 'Orientation kept';

// Eigenvalues (repeats as ×2) and the shape of their eigenspaces.
function eigenSummary({ spaces, complex }: Eigen) {
  const values = spaces.map(({ value, multiplicity }) =>
    multiplicity > 1 ? `${format(value)} ×${multiplicity}` : format(value),
  );
  if (complex) values.push(`${format(complex.re)} ± ${format(complex.im)}i`);
  const dims = spaces.map((s) => s.basis.length);
  const count = (d: number, one: string, many: string) => {
    const n = dims.filter((x) => x === d).length;
    return n === 0 ? [] : [n === 1 ? one : `${n} ${many}`];
  };
  let note = complex
    ? 'axis + rotation'
    : dims[0] === 3
      ? 'every vector'
      : [...count(2, 'plane', 'planes'), ...count(1, 'line', 'lines')].join(' + ');
  const defective = spaces.some((s) => s.basis.length < s.multiplicity);
  if (defective) note += ', defective';
  return { value: values.join(', '), note, defective };
}

function Stat({
  label,
  value,
  note,
  title,
}: {
  label: string;
  value: string;
  note: string;
  title?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col" title={title}>
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

function EigenStat({ eigen }: { eigen: Eigen }) {
  const { value, note, defective } = eigenSummary(eigen);
  return (
    <Stat
      label="eigenvalues"
      value={value}
      note={note}
      title={
        defective
          ? 'Defective: too few eigenvectors to span space, so the matrix is not diagonalizable.'
          : undefined
      }
    />
  );
}

// Statistics for the active matrix plus the transformation timeline.
export const StatsDock = forwardRef<HTMLDivElement, Props>(function StatsDock(
  { ws, det, rank, eigen, mode, className },
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
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Stat label="det" value={String(Number(det.toFixed(3)))} note={orientation(det)} />
        <Stat label="rank" value={String(rank)} note="of 3" />
        <Stat label="volume" value={`${Number(Math.abs(det).toFixed(3))}×`} note="scale" />
        <EigenStat eigen={eigen} />
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
