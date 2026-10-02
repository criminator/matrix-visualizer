'use client';
import { Box, Layers3, Move3D } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { CameraView, DisplayMode } from '@/app/scene';
import { WithTooltip } from './icon-button';

const MODES: { value: DisplayMode; label: string; icon: typeof Box; hint: string }[] = [
  { value: 'transform', label: 'Transformation', icon: Box, hint: 'Unit cube under each matrix' },
  { value: 'vectors', label: 'Vectors', icon: Move3D, hint: 'Column vectors only' },
  { value: 'span', label: 'Span', icon: Layers3, hint: 'Column space of each matrix' },
];

export const VIEWS: { value: CameraView; label: string; key: string; hint: string }[] = [
  { value: '3d', label: '3D', key: '1', hint: 'Perspective view' },
  { value: 'xy', label: 'XY', key: '2', hint: 'Look down the z axis' },
  { value: 'xz', label: 'XZ', key: '3', hint: 'Look along the y axis' },
  { value: 'yz', label: 'YZ', key: '4', hint: 'Look along the x axis' },
];

// Shared look for everything floating over the canvas.
export const floatingPanel =
  'pointer-events-auto rounded-lg border bg-popover/85 shadow-sm backdrop-blur-md';

export function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}) {
  return (
    <ToggleGroup
      aria-label="Display mode"
      value={[mode]}
      onValueChange={(v) => v[0] && onModeChange(v[0] as DisplayMode)}
      spacing={1}
      className={cn(floatingPanel, 'p-1')}
    >
      {MODES.map(({ value, label, icon: Icon, hint }) => (
        <WithTooltip key={value} label={hint} side="bottom">
          <ToggleGroupItem
            value={value}
            aria-label={label}
            size="sm"
            className="px-2.5 text-muted-foreground data-pressed:bg-accent data-pressed:text-foreground"
          >
            <Icon />
            {label}
          </ToggleGroupItem>
        </WithTooltip>
      ))}
    </ToggleGroup>
  );
}

export function CameraToolbar({
  view,
  onView,
  onFit,
  vertical,
}: {
  view: CameraView | null;
  onView: (view: CameraView) => void;
  onFit: () => void;
  vertical?: boolean;
}) {
  return (
    <div className={cn(floatingPanel, 'flex items-center gap-1 p-1', vertical && 'flex-col')}>
      <ToggleGroup
        aria-label="Camera view"
        value={view ? [view] : []}
        // Re-clicking the active view re-frames instead of un-pressing it.
        onValueChange={(v) => onView((v[0] as CameraView | undefined) ?? view ?? '3d')}
        orientation={vertical ? 'vertical' : 'horizontal'}
        spacing={1}
      >
        {VIEWS.map(({ value, label, key, hint }) => (
          <WithTooltip key={value} label={hint} shortcut={key} side={vertical ? 'left' : 'bottom'}>
            <ToggleGroupItem
              value={value}
              size="sm"
              className="data-pressed:bg-accent data-pressed:text-foreground min-w-9 font-mono text-xs text-muted-foreground"
            >
              {label}
            </ToggleGroupItem>
          </WithTooltip>
        ))}
      </ToggleGroup>
      <div aria-hidden className={cn('bg-border', vertical ? 'h-px w-6' : 'h-5 w-px')} />
      <WithTooltip label="Fit everything in view" shortcut="0" side={vertical ? 'left' : 'bottom'}>
        <Button variant="ghost" size="sm" onClick={onFit} className="min-w-9 px-2 text-xs text-muted-foreground">
          Fit
        </Button>
      </WithTooltip>
    </div>
  );
}
