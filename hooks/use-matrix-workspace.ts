'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  IDENTITY,
  compose,
  formatMatrix,
  parseMatrix,
  scalar,
  type Matrix,
} from '@/lib/matrix';
import { compositionColor, palette, presets } from '@/lib/presets';

export type Entry = {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  matrix: Matrix;
  cells: string[][];
  source: string;
  error: string;
  preset: string;
};

export type Plot = Pick<Entry, 'id' | 'name' | 'color' | 'matrix' | 'visible'>;

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,11}$/;
const ANIMATION_MS = 2600;

// Cell text for a computed matrix; 6 significant digits keeps cells readable.
const toCells = (m: Matrix) =>
  m.map((r) => r.map((v) => String(Number(v.toPrecision(6)))));

const makeEntry = (
  id: string,
  name: string,
  m: Matrix,
  color: string,
  preset: string,
): Entry => ({
  id,
  name,
  color,
  visible: true,
  matrix: m.map((r) => [...r]),
  cells: toCells(m),
  source: formatMatrix(m),
  error: '',
  preset,
});

// First unused single letter, then A1, B1, ... so names stay short.
function nextName(entries: Entry[]) {
  const taken = new Set(entries.map((e) => e.name));
  for (let suffix = 0; ; suffix++)
    for (let i = 0; i < 26; i++) {
      const name = String.fromCharCode(65 + i) + (suffix || '');
      if (!taken.has(name)) return name;
    }
}

const nextColor = (entries: Entry[]) =>
  palette.find((c) => !entries.some((e) => e.color === c)) ??
  palette[entries.length % palette.length];

// Default for "Add matrix": the first preset nobody uses yet, so new matrices
// don't land exactly on top of existing ones.
export const nextDefault = (entries: Entry[]) =>
  presets.find((p) => !entries.some((e) => e.preset === p.name)) ?? {
    name: 'Identity',
    matrix: IDENTITY,
  };

export function useMatrixWorkspace() {
  const serial = useRef(2);
  const [entries, setEntries] = useState<Entry[]>(() => [
    makeEntry('matrix-1', 'A', presets[0].matrix, palette[0], presets[0].name),
  ]);
  const [activeId, setActiveId] = useState<string | null>('matrix-1');
  // Null when nothing is selected; every matrix is then drawn with equal weight.
  const active = entries.find((e) => e.id === activeId) ?? null;

  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [expression, setExpression] = useState('A * B');
  const [showComposition, setShowComposition] = useState(false);

  const patch = (changes: Partial<Entry>, id = active?.id) =>
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));

  // Replaces the selected matrix, or adds one when nothing is selected.
  const apply = (m: Matrix, preset = 'Custom') => {
    if (!active) {
      addMatrix(m, preset);
      return;
    }
    patch({
      matrix: m,
      cells: toCells(m),
      source: formatMatrix(m),
      error: '',
      preset,
    });
    setProgress(1);
    setPlaying(false);
  };

  const editCell = (r: number, c: number, value: string) => {
    if (!active) return;
    const cells = active.cells.map((row) => [...row]);
    cells[r][c] = value;
    try {
      const m = cells.map((row) => row.map(scalar));
      patch({ cells, matrix: m, source: formatMatrix(m), error: '', preset: 'Custom' });
    } catch (e) {
      patch({ cells, error: (e as Error).message, preset: 'Custom' });
    }
  };

  const editText = (source: string) => {
    try {
      const m = parseMatrix(source);
      patch({ source, matrix: m, cells: toCells(m), error: '', preset: 'Custom' });
    } catch (e) {
      patch({ source, error: (e as Error).message, preset: 'Custom' });
    }
  };

  const pasteMatrix = (text: string) => {
    try {
      apply(parseMatrix(text));
    } catch (e) {
      patch({ error: (e as Error).message });
    }
  };

  const addMatrix = (m: Matrix, preset: string) => {
    const id = `matrix-${serial.current++}`;
    setEntries((list) => [
      ...list,
      makeEntry(id, nextName(list), m, nextColor(list), preset),
    ]);
    setActiveId(id);
  };

  // Returns what's needed to undo the removal.
  const removeMatrix = (id: string) => {
    if (entries.length === 1) return null;
    const index = entries.findIndex((e) => e.id === id);
    const removed = entries[index];
    setEntries((list) => list.filter((e) => e.id !== id));
    if (activeId === id) setActiveId(entries[index === 0 ? 1 : index - 1].id);
    return { entry: removed, index };
  };

  const restoreMatrix = (entry: Entry, index: number) => {
    setEntries((list) => {
      const name = list.some((e) => e.name === entry.name)
        ? nextName(list)
        : entry.name;
      const next = [...list];
      next.splice(Math.min(index, next.length), 0, { ...entry, name });
      return next;
    });
    setActiveId(entry.id);
  };

  const toggleVisible = (id: string) =>
    setEntries((list) =>
      list.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)),
    );

  const validateName = (name: string) => {
    if (!NAME_PATTERN.test(name))
      return 'Start with a letter; use letters, numbers or _ (max 12).';
    if (entries.some((e) => e.id !== activeId && e.name === name))
      return `${name} is already used.`;
    return '';
  };

  // Renames the active matrix and rewrites references in the composition.
  const rename = (name: string) => {
    if (!active) return;
    const old = active.name;
    if (name === old || validateName(name)) return;
    patch({ name });
    setExpression((value) =>
      value.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g, (token) =>
        token === old ? name : token,
      ),
    );
  };

  let composition: Matrix | null = null;
  let compositionError = '';
  if (showComposition) {
    try {
      composition = compose(
        expression,
        Object.fromEntries(entries.map((e) => [e.name, e.matrix])),
      );
    } catch (e) {
      compositionError = (e as Error).message;
    }
  }

  const plots: Plot[] = [
    ...entries.map(({ id, name, color, matrix, visible }) => ({
      id,
      name,
      color,
      matrix,
      visible,
    })),
    ...(composition
      ? [
          {
            id: 'composition',
            name: expression.replace(/\s/g, ''),
            color: compositionColor,
            matrix: composition,
            visible: true,
          },
        ]
      : []),
  ];

  const togglePlay = () => {
    if (!playing && progress >= 1) setProgress(0);
    setPlaying((p) => !p);
  };

  const scrub = (value: number) => {
    setPlaying(false);
    setProgress(value);
  };

  const progressRef = useRef(progress);
  useLayoutEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    if (!playing) return;
    let id: number;
    let last: number | null = null;
    let elapsed = progressRef.current;
    const tick = (time: number) => {
      const delta = last === null ? 0 : Math.min(time - last, 50) / ANIMATION_MS;
      last = time;
      elapsed = Math.min(1, elapsed + delta);
      setProgress(elapsed);
      if (elapsed === 1) {
        setPlaying(false);
        return;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  return {
    entries,
    active,
    select: setActiveId,
    apply,
    editCell,
    editText,
    pasteMatrix,
    addMatrix,
    removeMatrix,
    restoreMatrix,
    toggleVisible,
    setColor: (color: string, id?: string) => patch({ color }, id),
    validateName,
    rename,
    expression,
    setExpression,
    showComposition,
    setShowComposition,
    composition,
    compositionError,
    plots,
    progress,
    playing,
    setPlaying,
    togglePlay,
    scrub,
  };
}

export type Workspace = ReturnType<typeof useMatrixWorkspace>;
