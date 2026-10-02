'use client';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  title: string;
  // Shown on the right of the header, e.g. a count or the active value.
  summary?: ReactNode;
  // One line above the content explaining what the section does.
  description?: ReactNode;
  // Controlled when opening has side effects (e.g. turns plotting on);
  // otherwise the open state is remembered per section.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: ReactNode;
};

// Collapsible sidebar section with a uniform header row.
export function InspectorSection({
  id,
  title,
  summary,
  description,
  open,
  onOpenChange,
  className,
  children,
}: Props) {
  const [stored, setStored] = usePersistedState(`matrix-space:section-${id}`, false);
  return (
    <Collapsible
      open={open ?? stored}
      onOpenChange={onOpenChange ?? setStored}
      className="border-t"
    >
      <CollapsibleTrigger className="group flex h-10 w-full items-center gap-2 px-4 text-left text-[13px] font-medium transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/60">
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
        {title}
        {summary != null && (
          <span className="ml-auto flex min-w-0 items-center gap-1.5 truncate text-label font-normal text-muted-foreground">
            {summary}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className={cn('flex flex-col gap-3 px-4 pt-1 pb-4', className)}>
        {description && (
          <p className="text-label leading-4 font-normal text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Static header for the always-open top of the sidebar.
export function SectionHeader({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-8 items-center gap-2">
      <h2 id={id} className="text-[13px] font-medium">
        {title}
      </h2>
      {count != null && (
        <span className="text-label text-muted-foreground tabular-nums">{count}</span>
      )}
      <div className="ml-auto flex items-center gap-0.5">{children}</div>
    </div>
  );
}
