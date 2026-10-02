'use client';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { InspectorSection } from './inspector-section';

export type Layer = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SceneLayers({ layers }: { layers: Layer[] }) {
  const on = layers.filter((l) => l.checked).length;
  return (
    <InspectorSection
      id="display"
      title="Display"
      summary={`${on} of ${layers.length} layers`}
      className="gap-0"
    >
      {layers.map(({ label, checked, onChange }) => (
        <label
          key={label}
          className={cn(
            'flex h-8 cursor-pointer items-center justify-between text-[13px] text-muted-foreground transition-colors',
            checked && 'text-foreground',
          )}
        >
          {label}
          <Switch checked={checked} onCheckedChange={onChange} size="sm" />
        </label>
      ))}
    </InspectorSection>
  );
}
