import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom `text-label` size (globals.css) so it isn't
// mistaken for a color and dropped next to `text-muted-foreground`.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['label'] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
