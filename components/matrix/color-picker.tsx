'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { compositionColor, palette, pointColor } from '@/lib/presets';
import { cn } from '@/lib/utils';

const SWATCHES = [...palette, pointColor, compositionColor];

// #abc or #aabbcc → #aabbcc; anything else → null.
function normalize(hex: string) {
  const value = hex.trim().replace(/^#?/, '#').toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  if (/^#[0-9a-f]{3}$/.test(value))
    return `#${value.slice(1).replace(/./g, (c) => c + c)}`;
  return null;
}

type Props = {
  value: string;
  onChange: (color: string) => void;
  label: string;
  className?: string;
};

// Color dot that opens a swatch palette with a hex field.
export function ColorPicker({ value, onChange, label, className }: Props) {
  const [draft, setDraft] = useState(value);
  const invalid = normalize(draft) === null;

  return (
    <Popover onOpenChange={(open) => open && setDraft(value)}>
      <PopoverTrigger
        aria-label={label}
        className={cn(
          'grid size-6 shrink-0 cursor-pointer place-items-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <span
          aria-hidden
          className="size-2.5 rounded-full ring-1 ring-white/10"
          style={{ background: value }}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-2 p-2">
        <fieldset className="m-0 grid grid-cols-4 gap-1 border-0 p-0">
          <legend className="sr-only">{label}</legend>
          {SWATCHES.map((color) => {
            const selected = color === value.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                aria-label={color}
                aria-pressed={selected}
                onClick={() => {
                  onChange(color);
                  setDraft(color);
                }}
                className="grid size-7 place-items-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className="grid size-4.5 place-items-center rounded-full ring-1 ring-white/10"
                  style={{ background: color }}
                >
                  {selected && <Check className="size-3 text-black/70" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </fieldset>
        <Input
          aria-label="Hex color"
          aria-invalid={invalid}
          value={draft}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value);
            const color = normalize(e.target.value);
            if (color) onChange(color);
          }}
          className="h-7 w-[8.5rem] font-mono text-xs"
        />
      </PopoverContent>
    </Popover>
  );
}
