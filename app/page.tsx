'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Box,
  RotateCcw,
  Play,
  Pause,
  ArrowUpRight,
  SlidersHorizontal,
  Braces,
  Grid2X2,
  Move3D,
  Check,
  Info,
} from 'lucide-react';
import {
  IDENTITY,
  parseMatrix,
  scalar,
  determinant,
  rank,
  formatMatrix,
  type Matrix,
  compose,
} from '../lib/matrix';
import Link from 'next/link';
import Scene, { type SceneHandle } from './scene';
import { registerMatrixTool } from '../lib/webmcp';
const presets = [
  {
    name: 'Shear',
    hint: 'Tilt space',
    matrix: [
      [1, 0.7, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  },
  {
    name: 'Rotation',
    hint: '45° around z',
    matrix: [
      [Math.SQRT1_2, -Math.SQRT1_2, 0],
      [Math.SQRT1_2, Math.SQRT1_2, 0],
      [0, 0, 1],
    ],
  },
  {
    name: 'Scale',
    hint: 'Stretch the axes',
    matrix: [
      [1.7, 0, 0],
      [0, 0.7, 0],
      [0, 0, 1.3],
    ],
  },
  {
    name: 'Projection',
    hint: 'Flatten onto xy',
    matrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
];
const initial = presets[0].matrix;
const palette = [
  '#bafb73',
  '#83b6fc',
  '#fa9a80',
  '#d6a4ff',
  '#ffc75e',
  '#70e0d5',
];
type Entry = {
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
const entry = (
  id: string,
  name: string,
  m: Matrix,
  color: string,
  preset = 'Custom',
): Entry => ({
  id,
  name,
  color,
  visible: true,
  matrix: m.map((r) => [...r]),
  cells: m.map((r) => r.map(String)),
  source: formatMatrix(m),
  error: '',
  preset,
});
export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([
    entry('matrix-1', 'A', initial, palette[0], 'Shear'),
  ]);
  const [activeId, setActiveId] = useState('matrix-1');
  const serial = useRef(2);
  const active = entries.find((e) => e.id === activeId) ?? entries[0];
  const { matrix, cells, source, error, preset: selected } = active;
  const [editor, setEditor] = useState('grid');
  const [mode, setMode] = useState<'transform' | 'vectors'>('transform'),
    [progress, setProgress] = useState(1),
    [playing, setPlaying] = useState(false);
  const [grid, setGrid] = useState(true),
    [original, setOriginal] = useState(true),
    [vectors, setVectors] = useState(true),
    [highlight, setHighlight] = useState<number | null>(null);
  const [expression, setExpression] = useState('A * B'),
    [showComposition, setShowComposition] = useState(false),
    [nameError, setNameError] = useState('');
  const patch = (changes: Partial<Entry>) =>
    setEntries((list) =>
      list.map((e) => (e.id === active.id ? { ...e, ...changes } : e)),
    );
  const setCells = (cells: string[][]) => patch({ cells });
  const setSource = (source: string) => patch({ source });
  const setMatrix = (matrix: Matrix) => patch({ matrix });
  const setError = (error: string) => patch({ error });
  const setSelected = (preset: string) => patch({ preset });
  const scene = useRef<SceneHandle>(null);
  const det = determinant(matrix);
  const apply = (m: Matrix, name = 'Custom') => {
    patch({
      matrix: m,
      cells: m.map((r) => r.map(String)),
      source: formatMatrix(m),
      error: '',
      preset: name,
    });
    setProgress(1);
    setPlaying(false);
  };
  const applyRef = useRef(apply);
  useLayoutEffect(() => {
    applyRef.current = apply;
  });
  const progressRef = useRef(progress);
  useLayoutEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => registerMatrixTool((m) => applyRef.current(m)), []);
  const addMatrix = () => {
    const n = serial.current++;
    let name =
      String.fromCharCode(65 + ((n - 1) % 26)) +
      (n > 26 ? Math.floor((n - 1) / 26) : '');
    while (entries.some((e) => e.name === name)) name += '1';
    const id = `matrix-${n}`;
    setEntries((list) => [
      ...list,
      entry(id, name, IDENTITY, palette[(n - 1) % palette.length], 'Identity'),
    ]);
    setActiveId(id);
    setNameError('');
  };
  const removeMatrix = (id: string) => {
    if (entries.length === 1) return;
    setEntries((list) => list.filter((e) => e.id !== id));
    if (active.id === id) setActiveId(entries.find((e) => e.id !== id)!.id);
    setNameError('');
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
  const plots = [
    ...entries.map((e) => ({
      id: e.id,
      name: e.name,
      color: e.color,
      matrix: e.matrix,
      visible: e.visible,
    })),
    ...(composition
      ? [
          {
            id: 'composition',
            name: expression.replace(/\s/g, ''),
            color: '#ffffff',
            matrix: composition,
            visible: true,
          },
        ]
      : []),
  ];
  useEffect(() => {
    if (!playing) return;
    let id: number;
    let last: number | null = null;
    let elapsed = progressRef.current;
    const tick = (time: number) => {
      const delta = last === null ? 0 : Math.min(time - last, 50) / 2600;
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
  const editCell = (r: number, c: number, value: string) => {
    const next = cells.map((row) => [...row]);
    next[r][c] = value;
    setCells(next);
    setSelected('Custom');
    try {
      const m = next.map((row) => row.map(scalar));
      setMatrix(m);
      setSource(formatMatrix(m));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const editText = (value: string) => {
    setSource(value);
    setSelected('Custom');
    try {
      const m = parseMatrix(value);
      setMatrix(m);
      setCells(m.map((r) => r.map(String)));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <main className="workspace">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Matrix Space home">
          <span className="brand-icon">
            <Box size={23} />
          </span>
          matrix<span className="brand-light">space</span>
          <span className="beta">LAB</span>
        </Link>
        <div className="top-caption">A little algebra. A new perspective.</div>
        <span className="live">
          <i /> Interactive 3D
        </span>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <div className="intro">
            <span className="eyebrow">LINEAR ALGEBRA PLAYGROUND</span>
            <h1>
              Give numbers
              <br />a new dimension<span>.</span>
            </h1>
            <p>Edit a matrix. See how it shapes space.</p>
          </div>
          <section className="matrix-list-section">
            <div className="section-heading">
              <h2>
                Matrices <span className="dimension">{entries.length}</span>
              </h2>
              <button className="add-matrix" onClick={addMatrix}>
                + Add matrix
              </button>
            </div>
            <div className="matrix-list">
              {entries.map((e) => (
                <div
                  className={`matrix-item ${active.id === e.id ? 'active' : ''}`}
                  key={e.id}
                >
                  <button
                    className="matrix-select"
                    aria-pressed={active.id === e.id}
                    onClick={() => {
                      setActiveId(e.id);
                      setHighlight(null);
                      setNameError('');
                    }}
                  >
                    <i style={{ background: e.color }} />
                    <strong>{e.name}</strong>
                    <small>{e.error ? 'Invalid draft' : e.preset}</small>
                  </button>
                  <button
                    className="matrix-visibility"
                    aria-label={`${e.visible ? 'Hide' : 'Show'} matrix ${e.name}`}
                    aria-pressed={e.visible}
                    onClick={() =>
                      setEntries((list) =>
                        list.map((item) =>
                          item.id === e.id
                            ? { ...item, visible: !item.visible }
                            : item,
                        ),
                      )
                    }
                  >
                    {e.visible ? 'Visible' : 'Hidden'}
                  </button>
                  <button
                    className="matrix-remove"
                    disabled={entries.length === 1}
                    aria-label={`Remove matrix ${e.name}`}
                    onClick={() => removeMatrix(e.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="matrix-properties">
              <label>
                Name
                <input
                  key={active.id + active.name}
                  aria-label="Matrix name"
                  defaultValue={active.name}
                  maxLength={12}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (
                      !/^[A-Za-z][A-Za-z0-9_]{0,11}$/.test(name) ||
                      entries.some(
                        (item) => item.id !== active.id && item.name === name,
                      )
                    ) {
                      setNameError(
                        'Use a unique name: letters, numbers or underscores.',
                      );
                      e.target.value = active.name;
                      return;
                    }
                    const old = active.name;
                    patch({ name });
                    setExpression((value) =>
                      value.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g, (token) =>
                        token === old ? name : token,
                      ),
                    );
                    setNameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
              </label>
              <label>
                Color
                <input
                  aria-label={`Color for ${active.name}`}
                  type="color"
                  value={active.color}
                  onChange={(e) => patch({ color: e.target.value })}
                />
              </label>
            </div>
            {nameError && (
              <p className="input-status error" role="alert">
                {nameError}
              </p>
            )}
          </section>
          <section>
            <div className="section-heading">
              <h2>
                <span className="matrix-symbol">{active.name}</span>{' '}
                Transformation matrix
              </h2>
              <span className="dimension">3 × 3</span>
            </div>
            <div className="editor-tabs">
              <button
                className={editor === 'grid' ? 'active' : ''}
                onClick={() => setEditor('grid')}
              >
                <Grid2X2 size={15} /> Grid
              </button>
              <button
                className={editor === 'text' ? 'active' : ''}
                onClick={() => setEditor('text')}
              >
                <Braces size={15} /> Text input
              </button>
            </div>
            {editor === 'grid' ? (
              <div className="matrix-editor">
                <span className="matrix-equals">{active.name} =</span>
                <div className="matrix-brackets">
                  <div className="column-labels">
                    <span>x</span>
                    <span>y</span>
                    <span>z</span>
                  </div>
                  <div className="matrix-cells">
                    {cells.flatMap((row, r) =>
                      row.map((value, c) => (
                        <input
                          key={`${r}-${c}`}
                          aria-label={`Row ${r + 1}, column ${c + 1}`}
                          className={highlight === c ? 'highlighted' : ''}
                          value={value}
                          onFocus={() => setHighlight(c)}
                          onBlur={() => setHighlight(null)}
                          onChange={(e) => editCell(r, c, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.currentTarget
                                .closest('.matrix-cells')
                                ?.querySelectorAll('input')
                                [(r * 3 + c + 1) % 9]?.focus();
                            }
                          }}
                          onPaste={(e) => {
                            const text = e.clipboardData.getData('text');
                            if (/[\t\n;[\]]/.test(text)) {
                              e.preventDefault();
                              try {
                                apply(parseMatrix(text));
                              } catch (err) {
                                setError((err as Error).message);
                              }
                            }
                          }}
                        />
                      )),
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <textarea
                className="text-editor"
                aria-label="Matrix text input"
                spellCheck={false}
                value={source}
                onChange={(e) => editText(e.target.value)}
              />
            )}
            <output className={`input-status ${error ? 'error' : ''}`}>
              {error ? (
                <>
                  <Info size={14} />
                  {error} Last valid matrix shown.
                </>
              ) : (
                <>
                  <Check size={14} />
                  {editor === 'grid'
                    ? 'Live updates · fractions & sqrt(2) supported'
                    : 'Rows: semicolons or newlines · paste arrays or cells'}
                </>
              )}
            </output>
            <button
              className="reset-matrix"
              onClick={() => apply(IDENTITY, 'Identity')}
            >
              <RotateCcw size={14} /> Reset to identity
            </button>
          </section>
          <section>
            <div className="section-heading">
              <h2>Try a transformation</h2>
              <ArrowUpRight size={16} />
            </div>
            <div className="presets">
              {presets.map((p, i) => (
                <button
                  key={p.name}
                  className={selected === p.name ? 'preset active' : 'preset'}
                  onClick={() => apply(p.matrix, p.name)}
                >
                  <span className="preset-glyph">
                    {['▱', '↻', '⤢', '⊥'][i]}
                  </span>
                  <strong>{p.name}</strong>
                  <small>{p.hint}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="composition-section">
            <label className="toggle-row">
              <span>Plot a composition</span>
              <input
                type="checkbox"
                checked={showComposition}
                onChange={(e) => setShowComposition(e.target.checked)}
              />
              <span className="switch" />
            </label>
            {showComposition && (
              <>
                <input
                  className="composition-input"
                  aria-label="Composition expression"
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder="A * B"
                />
                <output
                  className={`composition-help ${compositionError ? 'error' : ''}`}
                >
                  {compositionError ||
                    'Rightmost matrix acts first. Hidden matrices can still be used.'}
                </output>
                {composition && (
                  <div className="composition-result">
                    <span>
                      Result · det ={' '}
                      {Number(determinant(composition).toPrecision(5))}
                    </span>
                    <pre>
                      {composition
                        .map((row) =>
                          row
                            .map((value) => Number(value.toPrecision(5)))
                            .join('  '),
                        )
                        .join('\n')}
                    </pre>
                  </div>
                )}
              </>
            )}
          </section>
          <section>
            <div className="section-heading">
              <h2>
                <SlidersHorizontal size={15} /> Scene layers
              </h2>
            </div>
            {(
              [
                ['Reference grid', grid, setGrid],
                ['Original shape', original, setOriginal],
                ['Basis vectors', vectors, setVectors],
              ] as const
            ).map(([label, value, setter]) => (
              <label className="toggle-row" key={label}>
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setter(e.target.checked)}
                />
                <span className="switch" />
              </label>
            ))}
          </section>
          <div className="sidebar-foot">
            <span className="keycap">↵</span> next cell{' '}
            <span className="keycap">Tab</span> move through matrix
          </div>
        </aside>
        <section
          className="viewport"
          aria-label="Interactive three dimensional matrix plot"
        >
          <Scene
            ref={scene}
            plots={plots}
            activeId={active.id}
            progress={progress}
            grid={grid}
            original={original}
            vectors={vectors}
            mode={mode}
            highlight={highlight}
          />
          <div className="scene-top">
            <div className="view-tabs">
              <button
                className={mode === 'transform' ? 'active' : ''}
                onClick={() => setMode('transform')}
              >
                <Box size={16} /> Transformation
              </button>
              <button
                className={mode === 'vectors' ? 'active' : ''}
                onClick={() => setMode('vectors')}
              >
                <Move3D size={16} /> Vectors
              </button>
            </div>
            <button
              className="icon-button"
              title="Reset camera"
              aria-label="Reset camera"
              onClick={() => scene.current?.view('perspective')}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <div className="scene-title">
            <span className="eyebrow">
              {mode === 'transform' ? 'SPACE TRANSFORMED' : 'COLUMN VECTORS'}
            </span>
            <h2>
              {plots.filter((p) => p.visible).length} visible matrices
              <span> / ℝ³</span>
            </h2>
          </div>
          <div className="camera-controls">
            <span>VIEW</span>
            {['3D', 'XY', 'XZ', 'YZ'].map((v, i) => (
              <button
                key={v}
                onClick={() =>
                  scene.current?.view(['perspective', 'xy', 'xz', 'yz'][i])
                }
              >
                {v}
              </button>
            ))}
            <button onClick={() => scene.current?.view('fit')}>Fit</button>
          </div>
          <div className="legend">
            {entries.map((e) => (
              <button
                key={e.id}
                aria-pressed={active.id === e.id}
                onClick={() => setActiveId(e.id)}
                style={{ opacity: e.visible ? 1 : 0.4 }}
              >
                <i style={{ background: e.color }} />
                {e.name}
                {active.id === e.id ? ' · editing' : ''}
              </button>
            ))}
            {composition && (
              <span>
                <i style={{ background: '#fff' }} />
                Composition
              </span>
            )}
            <span>
              <i className="original-dot" />
              original
            </span>
          </div>
          <div className="bottom-panel">
            <div className="stats-caption">
              Selected matrix: {active.name}
              {!active.visible ? ' · hidden' : ''}
            </div>
            <div className="stats">
              <div>
                <span>DETERMINANT</span>
                <strong>
                  {Number(det.toFixed(4))}
                  <small>det({active.name})</small>
                </strong>
              </div>
              <div>
                <span>RANK</span>
                <strong>
                  {rank(matrix)}
                  <small>/ 3 dimensions</small>
                </strong>
              </div>
              <div>
                <span>VOLUME SCALE</span>
                <strong>
                  {Number(Math.abs(det).toFixed(3))}×
                  <small>
                    {Math.abs(det) < 1e-10
                      ? 'Collapsed space'
                      : det < 0
                        ? 'Orientation reversed'
                        : 'Orientation preserved'}
                  </small>
                </strong>
              </div>
            </div>
            <div className="timeline">
              <button
                className="play-button"
                aria-label={
                  playing ? 'Pause transformation' : 'Play transformation'
                }
                onClick={() => {
                  if (progress >= 1) setProgress(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <div className="timeline-track">
                <div>
                  <strong>Animate all matrices</strong>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <input
                  aria-label="Transformation progress"
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={progress}
                  onChange={(e) => {
                    setPlaying(false);
                    setProgress(Number(e.target.value));
                  }}
                />
                <div className="timeline-labels">
                  <span>Identity</span>
                  <span>All target matrices</span>
                </div>
              </div>
            </div>
            <div className="interpolation-note">
              Linear interpolation · A(t) = (1 − t)I + tA
            </div>
          </div>
          <div className="scene-help">
            Drag to orbit <b>·</b> Scroll to zoom <b>·</b> Right-drag to pan
          </div>
        </section>
      </div>
    </main>
  );
}
