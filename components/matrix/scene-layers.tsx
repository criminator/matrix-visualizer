'use client';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type Layer = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SceneLayers({ layers }: { layers: Layer[] }) {
  return (
    <section aria-labelledby="layers-heading" className="flex flex-col gap-1">
      <h2 id="layers-heading" className="mb-1 text-sm font-medium">
        Scene layers
      </h2>
      {layers.map(({ label, checked, onChange }) => (
        <label
          key={label}
          className={cn(
            'flex cursor-pointer items-center justify-between py-1.5 text-sm text-muted-foreground',
            checked && 'text-foreground',
          )}
        >
          {label}
          <Switch checked={checked} onCheckedChange={onChange} />
        </label>
      ))}
    </section>
  );
}
