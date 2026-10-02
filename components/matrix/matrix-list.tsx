'use client';
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { IDENTITY } from '@/lib/matrix';
import { presets } from '@/lib/presets';
import { cn } from '@/lib/utils';
import { nextDefault, type Entry, type Workspace } from '@/hooks/use-matrix-workspace';
import { ColorPicker } from './color-picker';
import { IconButton, IconToggle, WithTooltip } from './icon-button';
import { SectionHeader } from './inspector-section';
import { StatusLine } from './status-line';

export function MatrixList({ ws }: { ws: Workspace }) {
  const { entries, active } = ws;
  const suggestion = nextDefault(entries);
  const [renaming, setRenaming] = useState(false);

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
    <section aria-labelledby="matrices-heading" className="flex flex-col gap-1">
      <SectionHeader id="matrices-heading" title="Matrices" count={entries.length}>
        <DropdownMenu>
          <WithTooltip label="Add matrix">
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Add matrix"
                  className="text-muted-foreground"
                />
              }
            >
              <Plus />
            </DropdownMenuTrigger>
          </WithTooltip>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => ws.addMatrix(suggestion.matrix, suggestion.name)}
            >
              New {suggestion.name.toLowerCase()}
            </DropdownMenuItem>
            {active && (
              <DropdownMenuItem onClick={() => ws.addMatrix(active.matrix, active.preset)}>
                Duplicate {active.name}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => ws.addMatrix(IDENTITY, 'Identity')}>
              Identity
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Presets</DropdownMenuLabel>
              {presets.map((p) => (
                <DropdownMenuItem key={p.name} onClick={() => ws.addMatrix(p.matrix, p.name)}>
                  {p.name}
                  <span className="ml-auto text-label text-muted-foreground">{p.hint}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SectionHeader>

      <ul className="-mx-2 flex max-h-56 flex-col gap-px overflow-y-auto">
        {entries.map((e) => {
          const isActive = e.id === active?.id;
          return (
            <li
              key={e.id}
              className={cn(
                'group relative flex h-9 items-center gap-1 rounded-md pr-1 pl-1.5 transition-colors',
                isActive ? 'bg-accent' : 'hover:bg-muted/50',
              )}
            >
              {isActive && (
                <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />
              )}
              <ColorPicker
                label={`Color for ${e.name}`}
                value={e.color}
                onChange={(color) => ws.setColor(color, e.id)}
                className={cn(!e.visible && 'opacity-40')}
              />
              {isActive && renaming ? (
                <NameField ws={ws} entry={e} onDone={() => setRenaming(false)} />
              ) : (
                <button
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`Select matrix ${e.name}`}
                  title={
                    isActive
                      ? 'Click to deselect · double-click to rename'
                      : 'Double-click to rename'
                  }
                  // Clicking the selected matrix deselects it, so all draw equally.
                  onClick={() => ws.select(isActive ? null : e.id)}
                  onDoubleClick={() => {
                    ws.select(e.id);
                    setRenaming(true);
                  }}
                  onKeyDown={(k) => {
                    if (k.key === 'F2') {
                      ws.select(e.id);
                      setRenaming(true);
                    }
                  }}
                  className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      'truncate font-math text-[15px] italic',
                      !e.visible && 'text-muted-foreground line-through',
                    )}
                  >
                    {e.name}
                  </span>
                  <span
                    className={cn(
                      'truncate text-label font-normal text-muted-foreground',
                      e.error && 'text-destructive',
                    )}
                  >
                    {e.error ? 'Invalid draft' : e.preset}
                  </span>
                </button>
              )}
              <div
                className={cn(
                  'flex items-center text-muted-foreground transition-opacity',
                  !isActive && e.visible &&
                    'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                )}
              >
                <IconToggle
                  label={e.visible ? `Hide ${e.name}` : `Show ${e.name}`}
                  pressed={!e.visible}
                  onPressedChange={() => ws.toggleVisible(e.id)}
                  className="aria-pressed:bg-transparent"
                >
                  {e.visible ? <Eye /> : <EyeOff />}
                </IconToggle>
                <IconButton
                  label={`Remove ${e.name}`}
                  disabled={entries.length === 1}
                  onClick={() => remove(e.id)}
                >
                  <X />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Inline rename of the active matrix. Validates while typing; Enter or blur
// commits when valid (otherwise reverts), Esc cancels.
function NameField({
  ws,
  entry,
  onDone,
}: {
  ws: Workspace;
  entry: Entry;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(entry.name);
  const cancelled = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  const error = ws.validateName(draft.trim());

  return (
    <div className="relative flex min-w-0 flex-1 px-1">
      <input
        ref={input}
        aria-label={`Rename ${entry.name}`}
        aria-invalid={!!error}
        aria-describedby={error ? 'name-error' : undefined}
        value={draft}
        maxLength={12}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (!error && !cancelled.current) ws.rename(draft.trim());
          onDone();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            cancelled.current = true;
            onDone();
          }
        }}
        className="h-7 w-full min-w-0 rounded-md bg-background px-1.5 font-math text-[15px] italic outline-none ring-1 ring-ring aria-invalid:ring-destructive"
      />
      {error && (
        <div
          id="name-error"
          className="absolute top-full right-1 left-1 z-10 mt-1 rounded-md border bg-popover p-2 shadow-md"
        >
          <StatusLine error={error} />
        </div>
      )}
    </div>
  );
}
