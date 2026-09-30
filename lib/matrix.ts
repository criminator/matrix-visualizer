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
export const determinant = (m: Matrix) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
// Pivoted, twice-reorthogonalized Gram-Schmidt keeps nearly dependent columns
// stable and gives both the span renderer and rank statistic the same tolerance.
export function columnSpace(m: Matrix): Vector[] {
  const columns: Vector[] = [0, 1, 2].map((c) => [m[0][c], m[1][c], m[2][c]]);
  const tolerance = Math.max(...m.flat().map(Math.abs)) * 1e-10;
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
