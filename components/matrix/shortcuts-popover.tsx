'use client';
import { Keyboard } from 'lucide-react';
import { Kbd } from '@/components/ui/kbd';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause animation'],
  ['1 – 4', 'Camera: 3D, XY, XZ, YZ'],
  ['0', 'Fit to view'],
  ['F', 'Toggle focus mode'],
  ['E', 'Toggle eigenvectors'],
  ['S', 'Toggle sidebar'],
  ['?', 'Show shortcuts'],
  ['↑ ↓ ← →', 'Move between matrix cells'],
  ['Enter', 'Next cell down the column'],
  ['Drag', 'Orbit · right-drag pans · scroll zooms'],
];

export function ShortcutsPopover({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Keyboard shortcuts" />
        }
      >
        <Keyboard />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <h2 className="text-sm font-medium">Shortcuts</h2>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-xs">
          {SHORTCUTS.map(([key, action]) => (
            <div key={key} className="contents">
              <dt>
                <Kbd>{key}</Kbd>
              </dt>
              <dd className="text-muted-foreground">{action}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
