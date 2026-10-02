'use client';
import { Braces, Eye, EyeOff, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MAX_POINTS } from '@/lib/matrix';
import type { Points } from '@/hooks/use-points';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { CellInput, moveFocus } from './cell-input';
import { ColorPicker } from './color-picker';
import { IconButton, IconToggle } from './icon-button';
import { InspectorSection } from './inspector-section';
import { StatusLine } from './status-line';

// Several values in one paste (a row or a list) go to the point parser.
const isMultiValue = (text: string) =>
  /[\t\n;,[\]]/.test(text) || /\S\s+\S/.test(text.trim());

const COLUMNS =
  'grid grid-cols-[1.5rem_3rem_repeat(3,minmax(0,1fr))_1.75rem_1.75rem] items-center gap-1';

// Points are always plotted; each can be hidden or removed.
export function PointsCard({ points }: { points: Points }) {
  const [tab, setTab] = usePersistedState('matrix-space:points-tab', 'rows');
  const asText = tab === 'text';
  const rowError = points.rows.map((r) => r.nameError || r.error).find(Boolean);
  const error = asText ? points.textError : rowError;
  const colors = [...new Set(points.plotted.map((r) => r.color))];
  const hiddenCount = points.rows.length - points.plotted.length;

  return (
    <InspectorSection
      id="points"
      title="Points"
      summary={
        points.rows.length ? (
          <>
            <span aria-hidden className="flex -space-x-0.5">
              {colors.slice(0, 4).map((color) => (
                <span
                  key={color}
                  className="size-2 rounded-full ring-1 ring-card"
                  style={{ background: color }}
                />
              ))}
            </span>
            {points.plotted.length}
            {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
          </>
        ) : (
          'None'
        )
      }
      description="Fixed landmarks in space; matrices don't move them."
    >
      {asText ? (
        <Textarea
          aria-label="Points as text"
          aria-invalid={!!points.textError}
          spellCheck={false}
          value={points.source}
          onChange={(e) => points.editText(e.target.value)}
          placeholder="P1: (1, 2, 3) #9085e9"
          className="min-h-28 resize-none font-mono text-[13px] leading-6"
        />
      ) : points.rows.length === 0 ? null : (
        <div data-cell-scope className="flex flex-col gap-0.5">
          <div
            aria-hidden
            className={`${COLUMNS} text-center font-math text-xs text-muted-foreground italic`}
          >
            <span />
            <span className="text-left font-sans text-label not-italic">Name</span>
            <span className="text-axis-x/80">x</span>
            <span className="text-axis-y/80">y</span>
            <span className="text-axis-z/80">z</span>
            <span />
            <span />
          </div>
          <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {points.rows.map((row, index) => (
              <li
                key={row.id}
                className={`group ${COLUMNS} ${row.visible ? '' : '[&>input]:opacity-45'}`}
              >
                <ColorPicker
                  label={`Color of ${row.name}`}
                  value={row.color}
                  onChange={(color) => points.setColor(row.id, color)}
                />
                <input
                  aria-label={`Name of point ${index + 1}`}
                  aria-invalid={!!row.nameError}
                  value={row.nameDraft}
                  maxLength={12}
                  spellCheck={false}
                  onChange={(e) => points.editName(row.id, e.target.value)}
                  onBlur={() => points.settleName(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                  }}
                  title={row.name}
                  className="h-8 w-full min-w-0 truncate rounded-md bg-transparent px-1 text-[13px] font-medium transition-colors outline-none hover:bg-muted/70 focus:bg-muted focus-visible:ring-1 focus-visible:ring-ring aria-invalid:text-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/60"
                />
                {row.cells.map((value, axis) => (
                  <CellInput
                    key={axis}
                    row={index}
                    column={axis}
                    value={value}
                    aria-label={`${row.name} ${'xyz'[axis]}`}
                    aria-invalid={!!row.error}
                    onChange={(e) => points.editCell(row.id, axis, e.target.value)}
                    onKeyDown={(e) =>
                      moveFocus(e, [index, axis], [points.rows.length, 3], 'row')
                    }
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (isMultiValue(text)) {
                        e.preventDefault();
                        points.pasteInto(row.id, text);
                      }
                    }}
                  />
                ))}
                <IconToggle
                  label={row.visible ? `Hide ${row.name}` : `Show ${row.name}`}
                  pressed={!row.visible}
                  onPressedChange={() => points.toggleVisible(row.id)}
                  className={`text-muted-foreground aria-pressed:bg-transparent ${
                    row.visible
                      ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100'
                      : ''
                  }`}
                >
                  {row.visible ? <Eye /> : <EyeOff />}
                </IconToggle>
                <IconButton
                  label={`Remove ${row.name}`}
                  onClick={() => points.remove(row.id)}
                  className="text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                >
                  <X />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-2">
        {!asText && (
          <Button
            variant="ghost"
            size="xs"
            className="-ml-1.5 text-muted-foreground"
            disabled={points.rows.length >= MAX_POINTS}
            onClick={points.add}
          >
            <Plus /> Add point
          </Button>
        )}
        <StatusLine
          error={error && `${error} Showing the last valid points.`}
          className="flex-1 pt-1"
        />
        <IconToggle
          label={asText ? 'Edit as rows' : 'Edit as text'}
          pressed={asText}
          onPressedChange={(on) => setTab(on ? 'text' : 'rows')}
          className="ml-auto text-muted-foreground"
        >
          <Braces />
        </IconToggle>
      </div>
    </InspectorSection>
  );
}
