'use client';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TipProps = {
  label: string;
  shortcut?: string;
  side?: ComponentProps<typeof TooltipContent>['side'];
};

function Tip({ label, shortcut, side }: TipProps) {
  return (
    <TooltipContent side={side}>
      {label}
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </TooltipContent>
  );
}

// Icon-only button: the label is both the accessible name and the tooltip.
export function IconButton({
  label,
  shortcut,
  side,
  children,
  variant = 'ghost',
  size = 'icon-sm',
  ...props
}: TipProps & ComponentProps<typeof Button> & { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant={variant} size={size} aria-label={label} {...props} />
        }
      >
        {children}
      </TooltipTrigger>
      <Tip label={label} shortcut={shortcut} side={side} />
    </Tooltip>
  );
}

export function IconToggle({
  label,
  shortcut,
  side,
  children,
  ...props
}: TipProps & ComponentProps<typeof Toggle> & { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Toggle size="sm" aria-label={label} {...props} />}
      >
        {children}
      </TooltipTrigger>
      <Tip label={label} shortcut={shortcut} side={side} />
    </Tooltip>
  );
}

// Tooltip around an arbitrary trigger element (e.g. a toggle-group item).
export function WithTooltip({
  label,
  shortcut,
  side,
  children,
}: TipProps & { children: ComponentProps<typeof TooltipTrigger>['render'] }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <Tip label={label} shortcut={shortcut} side={side} />
    </Tooltip>
  );
}
