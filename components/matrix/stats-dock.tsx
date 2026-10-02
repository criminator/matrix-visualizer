'use client';
import { forwardRef } from 'react';
import { Pause, Play } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { DisplayMode } from '@/app/scene';
import { formatEigenvalue as format, type Eigen } from '@/lib/matrix';
import type { Entry, Workspace } from '@/hooks/use-matrix-workspace';
import { IconButton, WithTooltip } from './icon-button';
import { floatingPanel } from './view-toolbar';

// Null when no matrix is selected.
type Stats = { det: number; rank: number; eigen: Eigen } | null;

type Props = {
  ws: Workspace;
  stats: Stats;
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
  className,
}: {
  label: string;
  value: string;
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="text-label text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <strong className="truncate font-mono text-[13px] font-medium">{value}</strong>
        {note && <span className="truncate text-label font-normal text-muted-foreground">{note}</span>}
      </span>
    </div>
  );
}

function Swatch({ entry }: { entry: Entry }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: entry.color }} />
      <span className="font-math text-base italic">{entry.name}</span>
      {!entry.visible && <span className="text-label text-muted-foreground">hidden</span>}
    </span>
  );
}

function EigenStat({ eigen }: { eigen: Eigen }) {
  const { value, note, defective } = eigenSummary(eigen);
  return (
    <WithTooltip
      label={
        defective
          ? `${value} (${note}). Defective: too few eigenvectors to span space, so the matrix is not diagonalizable.`
          : `${value} (${note})`
      }
    >
      <div className="min-w-0 max-w-64">
        <Stat label="Eigenvalues" value={value} note={note} />
      </div>
    </WithTooltip>
  );
}

const divider = 'hidden h-8 w-px shrink-0 bg-border sm:block';

// Statistics for the active matrix plus the transformation timeline.
export const StatsDock = forwardRef<HTMLDivElement, Props>(function StatsDock(
  { ws, stats, mode, className },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        floatingPanel,
        'flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl px-4 py-3',
        className,
      )}
    >
      {ws.active && stats ? (
        <>
          <Swatch entry={ws.active} />
          <span aria-hidden className={divider} />
          <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-2">
            <Stat
              label="Determinant"
              value={String(Number(stats.det.toFixed(3)))}
              note={orientation(stats.det)}
            />
            <Stat label="Rank" value={`${stats.rank}`} note="of 3" />
            <Stat label="Volume" value={`${Number(Math.abs(stats.det).toFixed(3))}×`} />
            <EigenStat eigen={stats.eigen} />
          </div>
        </>
      ) : (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="flex -space-x-0.5">
              {ws.entries.slice(0, 5).map((e) => (
                <span
                  key={e.id}
                  className="size-2.5 rounded-full ring-1 ring-popover"
                  style={{ background: e.color }}
                />
              ))}
            </span>
            <span className="text-[13px] font-medium">
              {ws.entries.length} {ws.entries.length === 1 ? 'matrix' : 'matrices'}
            </span>
          </span>
          <span className="text-label font-normal text-muted-foreground">
            Select one to see its determinant, rank and eigenvalues
          </span>
        </div>
      )}
      <span aria-hidden className={divider} />
      {mode === 'span' ? (
        <p className="min-w-48 flex-1 text-label font-normal text-muted-foreground">
          {stats?.rank === 0
            ? 'The zero matrix spans only the origin.'
            : 'Spans are infinite; the plot shows a finite window.'}
        </p>
      ) : (
        <div className="flex min-w-56 flex-1 items-center gap-3">
          <IconButton
            label={ws.playing ? 'Pause' : 'Animate from identity'}
            shortcut="Space"
            variant="secondary"
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
            <div className="flex justify-between text-label font-normal text-muted-foreground">
              <span>Identity</span>
              <span className="font-mono">{Math.round(ws.progress * 100)}%</span>
              <span>Applied</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
