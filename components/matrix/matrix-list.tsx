'use client';
import { useState } from 'react';
import { ChevronDown, Eye, EyeOff, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { IDENTITY } from '@/lib/matrix';
import { presets } from '@/lib/presets';
import { cn } from '@/lib/utils';
import { nextDefault, type Workspace } from '@/hooks/use-matrix-workspace';
import { IconButton, IconToggle } from './icon-button';

export function MatrixList({ ws }: { ws: Workspace }) {
  const { entries, active } = ws;
  const suggestion = nextDefault(entries);

  const remove = (id: string) => {
    const removed = ws.removeMatrix(id);
    if (!removed) return;
    const toastId = toast.add({
      title: `Removed ${removed.entry.name}`,
      timeout: 6000,
      actionProps: {
        children: 'Undo',
        onClick: () => {
          ws.restoreMatrix(removed.entry, removed.index);
          toast.close(toastId);
        },
      },
    });
  };

  return (
    <section aria-labelledby="matrices-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="matrices-heading" className="text-sm font-medium">
          Matrices{' '}
          <span className="ml-1 text-xs text-muted-foreground">
            {entries.length}
          </span>
        </h2>
        <ButtonGroup>
          <Button
            variant="outline"
            size="sm"
            onClick={() => ws.addMatrix(suggestion.matrix, suggestion.name)}
          >
            <Plus /> Add {suggestion.name.toLowerCase()}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="More ways to add a matrix"
                />
              }
            >
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => ws.addMatrix(active.matrix, active.preset)}
              >
                Duplicate {active.name}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => ws.addMatrix(IDENTITY, 'Identity')}>
                Identity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {presets.map((p) => (
                <DropdownMenuItem
                  key={p.name}
                  onClick={() => ws.addMatrix(p.matrix, p.name)}
                >
                  {p.name}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {p.hint}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </div>

      <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
        {entries.map((e) => {
          const isActive = e.id === active.id;
          return (
            <li
              key={e.id}
              className={cn(
                'flex items-center rounded-lg border bg-card pr-1 transition-colors',
                isActive ? 'border-primary/70 bg-primary/5' : 'hover:bg-muted/40',
              )}
            >
              <button
                type="button"
                aria-pressed={isActive}
                aria-label={`Edit matrix ${e.name}`}
                onClick={() => ws.select(e.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-2.5 shrink-0 rounded-full',
                    !e.visible && 'opacity-40',
                  )}
                  style={{ background: e.color }}
                />
                <span
                  className={cn(
                    'truncate text-sm font-semibold',
                    !e.visible && 'text-muted-foreground line-through',
                  )}
                >
                  {e.name}
                </span>
                <span
                  className={cn(
                    'truncate text-xs text-muted-foreground',
                    e.error && 'text-destructive',
                  )}
                >
                  {e.error ? 'Invalid draft' : e.preset}
                  {!e.visible && ' · hidden'}
                </span>
              </button>
              <IconToggle
                label={e.visible ? `Hide ${e.name}` : `Show ${e.name}`}
                pressed={!e.visible}
                onPressedChange={() => ws.toggleVisible(e.id)}
                className="text-muted-foreground"
              >
                {e.visible ? <Eye /> : <EyeOff />}
              </IconToggle>
              <IconButton
                label={`Remove ${e.name}`}
                disabled={entries.length === 1}
                onClick={() => remove(e.id)}
                className="text-muted-foreground"
              >
                <X />
              </IconButton>
            </li>
          );
        })}
      </ul>

      <div className="flex items-start gap-3">
        <NameField key={active.id + active.name} ws={ws} />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Color
          <input
            type="color"
            aria-label={`Color for ${active.name}`}
            value={active.color}
            onChange={(e) => ws.setColor(e.target.value)}
            className="h-8 w-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
          />
        </label>
      </div>
    </section>
  );
}

// Validates while typing; commits on Enter/blur only when valid, Esc reverts.
function NameField({ ws }: { ws: Workspace }) {
  const [draft, setDraft] = useState(ws.active.name);
  const error = ws.validateName(draft.trim());
  const revert = () => setDraft(ws.active.name);
  const commit = () => (error ? revert() : ws.rename(draft.trim()));

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <label htmlFor="matrix-name">Name</label>
        <Input
          id="matrix-name"
          value={draft}
          maxLength={12}
          aria-invalid={!!error}
          aria-describedby={error ? 'name-error' : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') revert();
          }}
          className="h-8 font-medium text-foreground"
        />
      </div>
      {error && (
        <p id="name-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
