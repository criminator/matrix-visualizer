'use client';
import type { Matrix } from '@/lib/matrix';
import { presets } from '@/lib/presets';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/hooks/use-matrix-workspace';

const CUBE = [0, 1].flatMap((x) =>
  [0, 1].flatMap((y) => [0, 1].map((z) => [x, y, z])),
);
// Pairs of vertex indices differing in exactly one coordinate.
const EDGES = CUBE.flatMap((a, i) =>
  CUBE.map((b, j) => [i, j] as const).filter(
    ([, j]) => j > i && a.filter((v, k) => v !== CUBE[j][k]).length === 1,
  ),
);

// Cabinet projection with z up, matching the scene's orientation.
const project = ([x, y, z]: number[]) => [x + 0.45 * y, -(z + 0.35 * y)];

function edgesPath(m: Matrix) {
  const points = CUBE.map((v) =>
    project(m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2])),
  );
  return EDGES.map(
    ([i, j]) => `M${points[i].join(' ')}L${points[j].join(' ')}`,
  ).join('');
}

const UNIT = edgesPath([
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]);

function Thumbnail({ matrix }: { matrix: Matrix }) {
  return (
    <svg
      viewBox="-0.6 -1.95 2.85 2.2"
      className="h-9 w-12 shrink-0"
      aria-hidden
      fill="none"
      strokeLinecap="round"
    >
      <path d={UNIT} stroke="currentColor" strokeOpacity={0.25} strokeWidth={0.04} strokeDasharray="0.06 0.06" />
      <path d={edgesPath(matrix)} stroke="currentColor" strokeWidth={0.06} />
    </svg>
  );
}

export function PresetGrid({ ws }: { ws: Workspace }) {
  return (
    <section aria-labelledby="presets-heading" className="flex flex-col gap-3">
      <h2 id="presets-heading" className="text-sm font-medium">
        Try a transformation
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((p) => {
          const selected = ws.active.preset === p.name;
          return (
            <button
              key={p.name}
              type="button"
              aria-pressed={selected}
              onClick={() => ws.apply(p.matrix, p.name)}
              className={cn(
                'flex items-center gap-2 rounded-lg border bg-card p-2 text-left text-muted-foreground transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40',
                selected && 'border-primary/70 bg-primary/5 text-primary',
              )}
            >
              <Thumbnail matrix={p.matrix} />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                <span className="text-xs leading-4">{p.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
