'use client';
import { useState } from 'react';
import {
  MAX_POINTS,
  formatPoints,
  parsePoints,
  pointNameError,
  scalar,
  type PointSpec,
  type Vector,
} from '@/lib/matrix';
import { pointColor } from '@/lib/presets';

export type PointRow = {
  id: number;
  // Last valid name; nameDraft holds what's typed while it's invalid.
  name: string;
  nameDraft: string;
  nameError: string;
  color: string;
  cells: string[];
  // Last valid coordinates; kept while a cell holds an invalid draft.
  point: Vector;
  error: string;
};

// Suggestions for "Add point", skipping any already plotted.
const DEFAULTS: Vector[] = [
  [1, 2, 1],
  [2, -1, 1],
  [-1, 1, 2],
  [1, 1, -1],
  [0, 2, 2],
];

const toCells = (p: Vector) => p.map((v) => String(Number(v.toPrecision(6))));

// P1, P2, ...: the first unused.
function nextName(taken: Set<string>) {
  for (let n = 1; ; n++) if (!taken.has(`P${n}`)) return `P${n}`;
}

// Row ids only need to be unique for React keys.
let serial = 0;
const makeRow = ({ point, name, color }: Required<PointSpec>): PointRow => ({
  id: serial++,
  name,
  nameDraft: name,
  nameError: '',
  color,
  cells: toCells(point),
  point,
  error: '',
});

// Rows for parsed specs; unnamed points get names not in `taken` or the specs.
function toRows(specs: PointSpec[], taken: Set<string>) {
  const names = new Set([...taken, ...specs.flatMap((s) => s.name ?? [])]);
  return specs.map((spec) => {
    const name = spec.name ?? nextName(names);
    names.add(name);
    return makeRow({
      point: spec.point,
      name,
      color: spec.color ?? pointColor,
    });
  });
}

// Text omits the default color so plain lists stay plain.
const toSource = (rows: PointRow[]) =>
  formatPoints(
    rows.map(({ point, name, color }) => ({
      point,
      name,
      color: color === pointColor ? undefined : color,
    })),
  );

const INITIAL = [
  makeRow({ point: DEFAULTS[0], name: 'P1', color: pointColor }),
];

export function usePoints() {
  const [rows, setRows] = useState<PointRow[]>(INITIAL);
  const [source, setSource] = useState(() => toSource(INITIAL));
  const [textError, setTextError] = useState('');
  const [show, setShow] = useState(false);

  // Row edits rewrite the text; text edits rebuild the rows.
  const commitRows = (next: PointRow[]) => {
    setRows(next);
    setSource(toSource(next));
    setTextError('');
  };
  const patchRow = (id: number, change: (row: PointRow) => PointRow) =>
    commitRows(rows.map((r) => (r.id === id ? change(r) : r)));

  const editCell = (id: number, axis: number, value: string) =>
    patchRow(id, (r) => {
      const cells = r.cells.map((c, i) => (i === axis ? value : c));
      try {
        return { ...r, cells, point: cells.map(scalar) as Vector, error: '' };
      } catch (e) {
        return { ...r, cells, error: (e as Error).message };
      }
    });

  const nameError = (id: number, name: string) =>
    pointNameError(name) ||
    (rows.some((r) => r.id !== id && r.name === name)
      ? `${name} is already used.`
      : '');

  // Valid names apply as you type; invalid drafts keep the last valid name.
  const editName = (id: number, value: string) => {
    const draft = value.trim();
    const error = nameError(id, draft);
    patchRow(id, (r) =>
      error
        ? { ...r, nameDraft: value, nameError: error }
        : { ...r, name: draft, nameDraft: value, nameError: '' },
    );
  };

  // Leaving the field drops an invalid draft.
  const settleName = (id: number) =>
    setRows((list) =>
      list.map((r) =>
        r.id === id ? { ...r, nameDraft: r.name, nameError: '' } : r,
      ),
    );

  const setColor = (id: number, color: string) =>
    patchRow(id, (r) => ({ ...r, color }));

  const editText = (text: string) => {
    setSource(text);
    try {
      setRows(toRows(parsePoints(text), new Set()));
      setTextError('');
    } catch (e) {
      setTextError((e as Error).message);
    }
  };

  // A multi-value paste into a row cell replaces that row with the parsed points.
  const pasteInto = (id: number, text: string) => {
    try {
      const index = rows.findIndex((r) => r.id === id);
      const others = rows.filter((r) => r.id !== id);
      const parsed = parsePoints(text);
      const clash = parsed.find((p) => others.some((r) => r.name === p.name));
      if (clash) throw new Error(`${clash.name} is already used.`);
      const next = [...rows];
      next.splice(
        index,
        1,
        ...toRows(parsed, new Set(others.map((r) => r.name))),
      );
      if (next.length > MAX_POINTS)
        throw new Error(`Plot at most ${MAX_POINTS} points.`);
      commitRows(next);
    } catch (e) {
      setRows(
        rows.map((r) =>
          r.id === id ? { ...r, error: (e as Error).message } : r,
        ),
      );
    }
  };

  const add = () => {
    if (rows.length >= MAX_POINTS) return;
    const point =
      DEFAULTS.find(
        (d) => !rows.some((r) => r.point.every((v, i) => v === d[i])),
      ) ?? DEFAULTS[0];
    const name = nextName(new Set(rows.map((r) => r.name)));
    commitRows([...rows, makeRow({ point, name, color: pointColor })]);
  };

  const remove = (id: number) => commitRows(rows.filter((r) => r.id !== id));

  return {
    rows,
    source,
    textError,
    plotted: show ? rows : [],
    show,
    setShow,
    editCell,
    editName,
    settleName,
    setColor,
    editText,
    pasteInto,
    add,
    remove,
  };
}

export type Points = ReturnType<typeof usePoints>;
