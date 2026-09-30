'use client';
import { Separator } from '@/components/ui/separator';
import type { Workspace } from '@/hooks/use-matrix-workspace';
import { CompositionCard } from './composition-card';
import { MatrixEditor } from './matrix-editor';
import { MatrixList } from './matrix-list';
import { PresetGrid } from './preset-grid';
import { SceneLayers, type Layer } from './scene-layers';

type Props = {
  ws: Workspace;
  highlight: number | null;
  onHighlight: (column: number | null) => void;
  layers: Layer[];
  // The mobile sheet shows the grid first so it's visible at the peek height.
  editorFirst?: boolean;
};

// Everything that edits matrices; shared by the desktop sidebar and the
// mobile bottom sheet.
export function EditorPanel({
  ws,
  highlight,
  onHighlight,
  layers,
  editorFirst,
}: Props) {
  const editor = (
    <MatrixEditor ws={ws} highlight={highlight} onHighlight={onHighlight} />
  );
  return (
    <div className="flex flex-col gap-5 p-5">
      {editorFirst && editor}
      <MatrixList ws={ws} />
      {!editorFirst && editor}
      <Separator />
      <PresetGrid ws={ws} />
      <CompositionCard ws={ws} />
      <Separator />
      <SceneLayers layers={layers} />
    </div>
  );
}
