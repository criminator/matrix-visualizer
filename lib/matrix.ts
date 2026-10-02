export type Matrix = number[][];
export type Vector = [number, number, number];
export const IDENTITY: Matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
export function scalar(source: string): number {
  const text = source.trim().toLowerCase();
  if (!text || text.length > 100)
    throw new Error('Enter a number in every cell.');
  const tokens =
    text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|sqrt|pi|[()+*/^−-]/g) ??
    [];
  if (tokens.join('') !== text.replace(/\s/g, ''))
    throw new Error('Use numbers, fractions, pi or sqrt().');
  let i = 0;
  const primary = (): number => {
    const t = tokens[i++];
    if (t === '(') {
      const v = sum();
      if (tokens[i++] !== ')') throw new Error('Close the parentheses.');
      return v;
    }
    if (t === 'sqrt') {
      if (tokens[i++] !== '(') throw new Error('Use sqrt(number).');
      const v = sum();
      if (tokens[i++] !== ')') throw new Error('Close the parentheses.');
      return Math.sqrt(v);
    }
    if (t === 'pi') return Math.PI;
    if (!t || !/^\d|^\./.test(t)) throw new Error('Finish the expression.');
    return Number(t);
  };
  const power = (): number => {
    const v = primary();
    if (tokens[i] === '^') {
      i++;
      return v ** unary();
    }
    return v;
  };
  const unary = (): number => {
    if (tokens[i] === '-' || tokens[i] === '−') {
      i++;
      return -unary();
    }
    if (tokens[i] === '+') {
      i++;
      return unary();
    }
    return power();
  };
  const product = (): number => {
    let v = unary();
    while (tokens[i] === '*' || tokens[i] === '/') {
      const op = tokens[i++],
        n = unary();
      v = op === '*' ? v * n : v / n;
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (['+', '-', '−'].includes(tokens[i])) {
      const op = tokens[i++],
        n = product();
      v = op === '+' ? v + n : v - n;
    }
    return v;
  };
  const value = sum();
  if (i !== tokens.length || !Number.isFinite(value))
    throw new Error('Enter a finite real number.');
  if (Math.abs(value) > 10000)
    throw new Error('Keep values between −10,000 and 10,000.');
  return value;
}
export function parseMatrix(source: string): Matrix {
  if (source.length > 3000) throw new Error('Matrix input is too long.');
  let text = source.trim().replace(/^[a-zA-Z]\s*=\s*/, '');
  text = text.replace(/\]\s*,?\s*\[/g, ';').replace(/[[\]]/g, '');
  const matrix = text
    .trim()
    .split(/[;\n]+/)
    .filter((r) => r.trim())
    .map((row) =>
      row
        .trim()
        .split(/[\s,]+/)
        .map(scalar),
    );
  if (matrix.length !== 3 || matrix.some((r) => r.length !== 3))
    throw new Error('Enter exactly 3 rows and 3 columns.');
  return matrix;
}
export const formatMatrix = (m: Matrix) =>
  '[' + m.map((r) => r.join(' ')).join(';\n ') + ']';
export const MAX_POINTS = 50;
// Closing index of the parenthesis at `open`, and whether a comma or space sits
// directly inside it. Text-mode expressions can't contain spaces, so either
// marks a point tuple like (1, 2, 3) rather than an expression like (1/2).
function parenGroup(text: string, open: number) {
  let depth = 0,
    tuple = false;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return { close: i, tuple };
    else if (depth === 1 && /[\s,]/.test(text[i])) tuple = true;
  }
  return { close: -1, tuple: false };
}
// Point names follow matrix names: a letter, then letters, digits or _.
export const POINT_NAME = /^[A-Za-z][A-Za-z0-9_]{0,11}$/;
export const pointNameError = (name: string) =>
  POINT_NAME.test(name)
    ? ''
    : 'Start point names with a letter; use letters, numbers or _ (max 12).';
// #rgb or #rrggbb, normalized to lowercase #rrggbb for color inputs.
export function parseColor(token: string): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(token);
  if (!match) throw new Error(`Use a color like #9085e9, not ${token}.`);
  const hex = match[1].toLowerCase();
  return '#' + (hex.length === 3 ? hex.replace(/./g, '$&$&') : hex);
}
export type PointSpec = { point: Vector; name?: string; color?: string };
// One point per row: P1: (1, 2, 3) #9085e9. A name before a colon or = and a
// color after the coordinates are optional. [x y z] groups, semicolons or new
// lines separate points; commas or whitespace separate coordinates.
export function parsePoints(source: string): PointSpec[] {
  if (source.length > 3000) throw new Error('Point input is too long.');
  // "P = [[...]]" or "P = [1 2 3; ...]" names the whole list, like a matrix.
  const text = source
    .trim()
    .replace(/^[A-Za-z]\w*\s*=\s*(?=\[\s*\[|\[[^\]]*[;\n])/, '');
  const rows: { values: string[]; name?: string; color?: string }[] = [];
  let row: string[] = [],
    color: string | undefined,
    name: string | undefined,
    value = '',
    depth = 0,
    tupleEnd = -1;
  const endValue = () => {
    if (value.startsWith('#')) {
      // A color belongs to the point it follows, even after a closed tuple.
      const target = row.length ? null : rows.at(-1);
      if (!row.length && !target)
        throw new Error('Put each color after its point.');
      if ((target ? target.color : color) !== undefined)
        throw new Error('Give each point at most one color.');
      if (target) target.color = parseColor(value);
      else color = parseColor(value);
    } else if (value) row.push(value);
    value = '';
  };
  const endRow = () => {
    endValue();
    if (row.length) {
      rows.push({ values: row, name, color });
      name = undefined;
    }
    row = [];
    color = undefined;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i === tupleEnd || ch === '[' || ch === ']') endRow();
    else if (depth === 0 && (ch === ';' || ch === '\n')) endRow();
    else if (depth === 0 && /[\s,]/.test(ch)) endValue();
    else if (depth === 0 && (ch === ':' || ch === '=')) {
      // The name is the word just before the colon, even across a space.
      const label = value || row.pop() || '';
      value = '';
      endRow();
      if (name !== undefined) throw new Error(`Give ${name} coordinates.`);
      const error = pointNameError(label);
      if (error) throw new Error(error);
      name = label;
    } else {
      if (ch === '(' && depth === 0 && !value && i > tupleEnd) {
        const group = parenGroup(text, i);
        if (group.tuple) {
          endRow();
          tupleEnd = group.close;
          continue;
        }
      }
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      value += ch;
    }
  }
  endRow();
  if (name !== undefined) throw new Error(`Give ${name} coordinates.`);
  if (rows.length > MAX_POINTS)
    throw new Error(`Plot at most ${MAX_POINTS} points.`);
  const names = new Set<string>();
  return rows.map(({ values, name, color }, i) => {
    if (values.length !== 3)
      throw new Error(`Point ${name ?? i + 1} needs exactly 3 coordinates.`);
    if (name !== undefined) {
      if (names.has(name)) throw new Error(`${name} is already used.`);
      names.add(name);
    }
    const spec: PointSpec = { point: values.map(scalar) as Vector };
    if (name !== undefined) spec.name = name;
    if (color !== undefined) spec.color = color;
    return spec;
  });
}
export const formatPoints = (points: PointSpec[]) =>
  points
    .map(
      ({ point, name, color }) =>
        `${name ? name + ': ' : ''}(${point.join(', ')})${color ? ' ' + color : ''}`,
    )
    .join('\n');
export const determinant = (m: Matrix) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
// Pivoted, twice-reorthogonalized Gram-Schmidt keeps nearly dependent columns
// stable and gives both the span renderer and rank statistic the same tolerance.
export function columnSpace(
  m: Matrix,
  tolerance = Math.max(...m.flat().map(Math.abs)) * 1e-10,
): Vector[] {
  const columns: Vector[] = [0, 1, 2].map((c) => [m[0][c], m[1][c], m[2][c]]);
  const basis: Vector[] = [];
  while (columns.length) {
    const residuals = columns.map((column) => {
      const residual: Vector = [...column];
      for (let pass = 0; pass < 2; pass++)
        for (const vector of basis) {
          const projection = residual.reduce(
            (sum, value, i) => sum + value * vector[i],
            0,
          );
          for (let i = 0; i < 3; i++) residual[i] -= projection * vector[i];
        }
      return residual;
    });
    let pivot = 0;
    for (let i = 1; i < residuals.length; i++)
      if (Math.hypot(...residuals[i]) > Math.hypot(...residuals[pivot]))
        pivot = i;
    const length = Math.hypot(...residuals[pivot]);
    if (length <= tolerance) break;
    basis.push(residuals[pivot].map((value) => value / length) as Vector);
    columns.splice(pivot, 1);
  }
  return basis;
}
export const rank = (m: Matrix): number => columnSpace(m).length;
// Equal spans: same dimension, and every basis vector of b lies in span(a).
// columnSpace returns an orthonormal basis, so a projection residual suffices.
export function sameSpan(a: Matrix, b: Matrix): boolean {
  const basisA = columnSpace(a),
    basisB = columnSpace(b);
  if (basisA.length !== basisB.length) return false;
  return basisB.every((vector) => {
    const residual: Vector = [...vector];
    for (const axis of basisA) {
      const projection = residual.reduce((sum, v, i) => sum + v * axis[i], 0);
      for (let i = 0; i < 3; i++) residual[i] -= projection * axis[i];
    }
    return Math.hypot(...residual) < 1e-8;
  });
}

const cross = (a: Vector, b: Vector): Vector => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v: Vector): Vector => {
  const length = Math.hypot(...v);
  return v.map((x) => x / length) as Vector;
};
const transpose = (m: Matrix): Matrix =>
  m[0].map((_, c) => m.map((row) => row[c]));
const shifted = (m: Matrix, value: number): Matrix =>
  m.map((row, r) => row.map((v, c) => (r === c ? v - value : v)));
// Eigenvector signs are arbitrary; point each one so its largest component is
// positive, which keeps them on the same side as the axes they lean toward.
function canonical(v: Vector): Vector {
  const abs = v.map(Math.abs);
  return v[abs.indexOf(Math.max(...abs))] < 0
    ? (v.map((x) => -x) as Vector)
    : v;
}
// A unit vector perpendicular to unit v, built from the axis v leans on least.
function perpendicular(v: Vector): Vector {
  const axis: Vector = [0, 0, 0];
  const abs = v.map(Math.abs);
  axis[abs.indexOf(Math.min(...abs))] = 1;
  return normalize(cross(v, axis));
}
// Orthonormal basis of {x : Mx = 0}: the complement of M's row space, where
// rows within `tolerance` of the others count as dependent.
function nullSpace(m: Matrix, tolerance: number): Vector[] {
  const rows = columnSpace(transpose(m), tolerance);
  if (rows.length === 0)
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  if (rows.length === 1) {
    const u = perpendicular(rows[0]);
    return [u, normalize(cross(rows[0], u))];
  }
  if (rows.length === 2) return [normalize(cross(rows[0], rows[1]))];
  return [];
}
// The kernel direction of a rank-2 matrix: the largest cross product of two
// rows, which stays accurate even when the rows are nearly dependent.
function kernelDirection(m: Matrix): Vector | null {
  const [r0, r1, r2] = m as Vector[];
  const candidates = [cross(r0, r1), cross(r0, r2), cross(r1, r2)];
  const best = candidates.reduce((a, b) =>
    Math.hypot(...b) > Math.hypot(...a) ? b : a,
  );
  return Math.hypot(...best) > 1e-150 ? normalize(best) : null;
}

export type Eigenspace = {
  value: number;
  // Algebraic multiplicity: how many times `value` is a root.
  multiplicity: number;
  // Orthonormal basis. Fewer vectors than `multiplicity` means the matrix is
  // defective: it has too few eigenvectors to span space.
  basis: Vector[];
};
export type Eigen = {
  // Real eigenvalues, largest first.
  spaces: Eigenspace[];
  // A complex pair re ± im·i rotates (and scales) a real invariant plane.
  complex: { re: number; im: number; plane: Vector[] } | null;
};
// Eigenvalues closer than about 1e-5 of the largest entry count as repeated;
// eigenspaces of repeated values use a matching rank tolerance.
const REPEATED = 1e-5;

// Eigenvalues from the characteristic cubic, solved on the matrix scaled to
// unit size. Repeated roots are detected from the cubic's coefficients (not by
// comparing computed roots, which split apart by ~1e-5), so shears,
// projections and scalings keep their exact multiplicities.
export function eigen(m: Matrix): Eigen {
  const scale = Math.max(...m.flat().map(Math.abs));
  if (scale === 0)
    return {
      spaces: [{ value: 0, multiplicity: 3, basis: nullSpace(m, 0) }],
      complex: null,
    };
  const b = m.map((row) => row.map((v) => v / scale));
  const trace = b[0][0] + b[1][1] + b[2][2];
  const minors =
    b[0][0] * b[1][1] -
    b[0][1] * b[1][0] +
    b[0][0] * b[2][2] -
    b[0][2] * b[2][0] +
    b[1][1] * b[2][2] -
    b[1][2] * b[2][1];
  const det = determinant(b);
  // λ³ − trace·λ² + minors·λ − det = 0; with λ = t + trace/3 it becomes
  // the depressed cubic t³ + p·t + q = 0.
  const shift = trace / 3;
  const p = minors - (trace * trace) / 3;
  const q = (-2 * trace ** 3) / 27 + (trace * minors) / 3 - det;
  const discriminant = (q / 2) ** 2 + (p / 3) ** 3;
  const size = (q / 2) ** 2 + Math.abs(p / 3) ** 3;

  // [t, multiplicity] pairs, plus a complex pair if there is one.
  let roots: [number, number][];
  let complex: { re: number; im: number } | null = null;
  if (Math.abs(p) < 1e-12 && Math.abs(q) < 1e-12) roots = [[0, 3]];
  else if (Math.abs(discriminant) <= 1e-10 * size) {
    const u = Math.cbrt(-q / 2);
    roots = [
      [2 * u, 1],
      [-u, 2],
    ];
  } else if (discriminant > 0) {
    // Cardano, choosing the larger cube root to avoid cancellation.
    const u =
      -Math.sign(q || 1) * Math.cbrt(Math.abs(q) / 2 + Math.sqrt(discriminant));
    const v = -p / (3 * u);
    roots = [[u + v, 1]];
    complex = { re: -(u + v) / 2, im: (Math.sqrt(3) / 2) * Math.abs(u - v) };
  } else {
    // Three distinct real roots: the trigonometric form.
    const r = 2 * Math.sqrt(-p / 3);
    const angle = Math.acos(Math.min(1, Math.max(-1, (3 * q) / (p * r)))) / 3;
    roots = [0, 1, 2].map((k) => [
      r * Math.cos(angle - (2 * Math.PI * k) / 3),
      1,
    ]);
  }

  const spaces = roots.map(([t, multiplicity]): Eigenspace => {
    let value = t + shift;
    if (multiplicity === 1) {
      // Newton polish on the characteristic polynomial.
      for (let i = 0; i < 2; i++) {
        const f = ((value - trace) * value + minors) * value - det;
        const slope = (3 * value - 2 * trace) * value + minors;
        if (Math.abs(slope) > 1e-8) value -= f / slope;
      }
    }
    const shiftedB = shifted(b, value);
    let basis =
      multiplicity === 1
        ? []
        : nullSpace(shiftedB, REPEATED).slice(0, multiplicity);
    if (!basis.length) {
      const direction = kernelDirection(shiftedB);
      basis = direction ? [direction] : [];
    }
    return { value: value * scale, multiplicity, basis: basis.map(canonical) };
  });
  spaces.sort((x, y) => y.value - x.value);

  let pair: Eigen['complex'] = null;
  if (complex) {
    // The invariant plane is the range of A − rI for the real eigenvalue r.
    const plane = columnSpace(shifted(b, spaces[0].value / scale), REPEATED);
    pair = {
      re: (complex.re + shift) * scale,
      im: complex.im * scale,
      plane: plane.length === 2 ? plane.map(canonical) : [],
    };
  }
  return { spaces, complex: pair };
}

// Three decimals, without trailing zeros or a negative zero.
export const formatEigenvalue = (value: number) =>
  String(Number(value.toFixed(3)) || 0);

export function multiply(a: Matrix, b: Matrix): Matrix {
  return a.map((row) =>
    b[0].map((_, c) => row.reduce((sum, value, k) => sum + value * b[k][c], 0)),
  );
}
export function compose(
  expression: string,
  matrices: Record<string, Matrix>,
): Matrix {
  if (
    expression.length > 200 ||
    !/^\s*[A-Za-z][A-Za-z0-9_]*(\s*\*\s*[A-Za-z][A-Za-z0-9_]*)*\s*$/.test(
      expression,
    )
  )
    throw new Error('Use matrix names joined by *, for example A * B.');
  const names = expression.split('*').map((name) => name.trim());
  const operands = names.map((name) => {
    if (!Object.hasOwn(matrices, name))
      throw new Error(`Matrix ${name} does not exist.`);
    return matrices[name];
  });
  const result = operands.reduce(multiply);
  if (result.flat().some((v) => !Number.isFinite(v) || Math.abs(v) > 100000))
    throw new Error('Composition is too large to display. Reduce its values.');
  return result;
}
