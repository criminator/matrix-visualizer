'use client';
import type { Matrix } from '@/lib/matrix';
import { presets } from '@/lib/presets';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/hooks/use-matrix-workspace';
import { WithTooltip } from './icon-button';
import { InspectorSection } from './inspector-section';

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
      className="h-8 w-11"
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
  const { active } = ws;
  const current = active && presets.find((p) => p.name === active.preset);
  return (
    <InspectorSection
      id="presets"
      title="Presets"
      summary={current?.name}
      description={
        active
          ? `Replace ${active.name} with a common transformation.`
          : 'Add a common transformation as a new matrix.'
      }
    >
      <div className="grid grid-cols-4 gap-1.5">
        {presets.map((p) => {
          const selected = active?.preset === p.name;
          return (
            <WithTooltip key={p.name} label={p.hint}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => ws.apply(p.matrix, p.name)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border border-transparent px-1 pt-1.5 pb-1 text-muted-foreground transition-colors outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  selected && 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
                )}
              >
                <Thumbnail matrix={p.matrix} />
                <span className="text-label text-foreground">{p.name}</span>
              </button>
            </WithTooltip>
          );
        })}
      </div>
    </InspectorSection>
  );
}
