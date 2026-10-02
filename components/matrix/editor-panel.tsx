'use client';
import type { Workspace } from '@/hooks/use-matrix-workspace';
import type { Points } from '@/hooks/use-points';
import { CompositionCard } from './composition-card';
import { MatrixEditor } from './matrix-editor';
import { MatrixList } from './matrix-list';
import { PointsCard } from './points-card';
import { PresetGrid } from './preset-grid';
import { SceneLayers, type Layer } from './scene-layers';

type Props = {
  ws: Workspace;
  points: Points;
  highlight: number | null;
  onHighlight: (column: number | null) => void;
  layers: Layer[];
  // The mobile sheet shows the grid first so it's visible at the peek height.
  editorFirst?: boolean;
};

// Everything that edits matrices; shared by the desktop sidebar and the
// mobile bottom sheet. The list and editor stay open; the rest collapse.
export function EditorPanel({
  ws,
  points,
  highlight,
  onHighlight,
  layers,
  editorFirst,
}: Props) {
  const editor = (
    <MatrixEditor ws={ws} highlight={highlight} onHighlight={onHighlight} />
  );
  return (
    <div className="flex flex-col pb-4">
      <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
        {editorFirst && editor}
        <MatrixList ws={ws} />
        {!editorFirst && editor}
      </div>
      <PresetGrid ws={ws} />
      <CompositionCard ws={ws} />
      <PointsCard points={points} />
      <SceneLayers layers={layers} />
      <div className="border-t" />
    </div>
  );
}
