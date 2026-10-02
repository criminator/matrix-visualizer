import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scalar,
  parseMatrix,
  determinant,
  rank,
  IDENTITY,
  formatMatrix,
  compose,
  columnSpace,
  sameSpan,
  parsePoints,
  formatPoints,
  eigen,
  type Matrix,
} from './matrix.ts';
void test('safe arithmetic supports fractions, roots, signs, scientific notation and precedence', () => {
  assert.equal(scalar('1/2'), 0.5);
  assert.equal(scalar('sqrt(4) + 2^3'), 10);
  assert.equal(scalar('-2^2'), -4);
  assert.equal(scalar('1e-3'), 0.001);
  assert.equal(scalar('2^-2'), 0.25);
});

void test('column space covers point, line, tilted plane and full space using columns', () => {
  const matrices = [
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    [
      [1, 2, -3],
      [2, 4, -6],
      [3, 6, -9],
    ],
    [
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 2],
    ],
    IDENTITY,
  ];
  matrices.forEach((matrix, dimension) => {
    const before = JSON.stringify(matrix);
    const basis = columnSpace(matrix);
    assert.equal(basis.length, dimension);
    assert.equal(rank(matrix), dimension);
    basis.forEach((a, i) =>
      basis.forEach((b, j) => {
        const dot = a.reduce((sum, value, k) => sum + value * b[k], 0);
        assert.ok(Math.abs(dot - (i === j ? 1 : 0)) < 1e-12);
      }),
    );
    for (let c = 0; c < 3; c++) {
      const column = matrix.map((row) => row[c]);
      const reconstructed = [0, 0, 0];
      basis.forEach((vector) => {
        const projection = vector.reduce(
          (sum, value, i) => sum + value * column[i],
          0,
        );
        vector.forEach((value, i) => (reconstructed[i] += projection * value));
      });
      assert.ok(
        Math.hypot(...column.map((value, i) => value - reconstructed[i])) <
          1e-12,
      );
    }
    assert.equal(JSON.stringify(matrix), before);
  });
  const column = columnSpace([
    [0, 0, 0],
    [3, 0, 0],
    [4, 0, 0],
  ])[0];
  assert.deepEqual(column, [0, 0.6, 0.8]);
});

void test('column space uses relative tolerance across tiny and large matrices', () => {
  for (const scale of [1e-12, 1, 1e4]) {
    const matrix = [
      [scale, scale, 0],
      [0, scale * 1e-12, 0],
      [0, 0, 0],
    ];
    assert.equal(columnSpace(matrix).length, 1);
    matrix[1][1] = scale * 1e-8;
    assert.equal(columnSpace(matrix).length, 2);
  }
});
void test('invalid or nonfinite input is rejected', () => {
  for (const value of [
    '',
    '1/0',
    'sqrt(-1)',
    'alert(1)',
    '2foo',
    '1+',
    '10001',
    '(1',
    '2 3',
  ])
    assert.throws(() => scalar(value), value);
});
void test('all supported matrix formats parse consistently', () => {
  for (const value of [
    '[1 0 0;0 1 0;0 0 1]',
    'A = [[1,0,0],[0,1,0],[0,0,1]]',
    '1\t0\t0\n0\t1\t0\n0\t0\t1',
    formatMatrix(IDENTITY),
  ])
    assert.deepEqual(parseMatrix(value), IDENTITY);
});
void test('malformed dimensions rejected', () => {
  assert.throws(() => parseMatrix('[1 2;3 4]'));
  assert.throws(() => parseMatrix('[1 0 0;0 1 0;0 0]'));
});
void test('determinant and rank distinguish orientation, projection and collapse', () => {
  assert.equal(determinant(IDENTITY), 1);
  assert.equal(rank(IDENTITY), 3);
  assert.equal(
    determinant([
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]),
    -1,
  );
  assert.equal(
    rank([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]),
    2,
  );
  assert.equal(
    rank([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]),
    0,
  );
  assert.equal(
    rank([
      [1, 2, 3],
      [2, 4, 6],
      [3, 6, 9],
    ]),
    1,
  );
  assert.equal(
    rank([
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ]),
    3,
  );
});

void test('composition order applies the rightmost matrix first without mutating operands', () => {
  const a = [
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    b = [
      [2, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  const before = JSON.stringify({ a, b });
  assert.deepEqual(compose('A * B', { A: a, B: b }), [
    [2, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
  assert.deepEqual(compose('B*A', { A: a, B: b }), [
    [2, 2, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
  assert.equal(JSON.stringify({ a, b }), before);
  assert.deepEqual(compose('A * A', { A: a }), [
    [1, 2, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
});
void test('composition validates missing names, syntax and excessive magnitude', () => {
  for (const expression of [
    '',
    'A + A',
    'A *',
    'Unknown',
    'toString',
    'A;alert(1)',
  ])
    assert.throws(() => compose(expression, { A: IDENTITY }));
  assert.deepEqual(compose('Renamed_2', { Renamed_2: IDENTITY }), IDENTITY);
  assert.throws(() =>
    compose('A*A', {
      A: [
        [10000, 0, 0],
        [0, 10000, 0],
        [0, 0, 10000],
      ],
    }),
  );
});
void test('sameSpan compares column spaces regardless of basis choice', () => {
  const planeXY = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ];
  const shearedXY = [
    [2, 1, 0],
    [0, 3, 0],
    [0, 0, 0],
  ];
  const planeXZ = [
    [1, 0, 0],
    [0, 0, 0],
    [0, 1, 0],
  ];
  const lineX = [
    [1, 2, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const zero = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  assert.ok(sameSpan(planeXY, shearedXY));
  assert.ok(!sameSpan(planeXY, planeXZ));
  assert.ok(!sameSpan(planeXY, lineX));
  assert.ok(sameSpan(IDENTITY, [...shearedXY.slice(0, 2), [0, 0, 5]]));
  assert.ok(sameSpan(zero, zero));
});
void test('points parse from tuples, nested arrays and spreadsheet rows', () => {
  const expected = [{ point: [1, 2, 3] }, { point: [-0.5, 0, Math.SQRT2] }];
  for (const value of [
    '(1, 2, 3); (-1/2, 0, sqrt(2))',
    '(1,2,3)(-1/2,0,sqrt(2))',
    'P = [[1,2,3],[-1/2,0,sqrt(2)]]',
    'P = [1 2 3; -1/2 0 sqrt(2)]',
    '[1 2 3; -1/2 0 sqrt(2)]',
    '1 2 3\n-1/2 0 sqrt(2)',
    '1\t2\t3\n-1/2\t0\tsqrt(2)',
    '(1 2 3)\n((-1)/2, (0), sqrt(2))',
  ])
    assert.deepEqual(parsePoints(value), expected, value);
  assert.deepEqual(parsePoints('  '), []);
});
void test('points take an optional name before and color after', () => {
  const expected = [
    { point: [1, 2, 3], name: 'Q', color: '#ff0000' },
    { point: [0, 0, 1], name: 'top_2' },
    { point: [4, 5, 6], color: '#00aabb' },
  ];
  for (const value of [
    'Q: (1, 2, 3) #f00\ntop_2: (0, 0, 1)\n(4, 5, 6) #00AABB',
    'Q = (1,2,3) #ff0000; top_2 = (0,0,1); (4,5,6) #0ab',
    'Q:(1,2,3)#f00 top_2:(0,0,1) (4,5,6)#0ab',
    'Q: 1 2 3 #f00\ntop_2 : 0 0 1\n4 5 6 #0ab',
  ])
    assert.deepEqual(parsePoints(value), expected, value);
  // "X = [[...]]" names the list, not its first point; colors ride in rows.
  assert.deepEqual(parsePoints('X = [[1,2,3,#f00],[0,0,1],[4,5,6,#0ab]]'), [
    { point: [1, 2, 3], color: '#ff0000' },
    { point: [0, 0, 1] },
    { point: [4, 5, 6], color: '#00aabb' },
  ]);
  assert.deepEqual(parsePoints(formatPoints(expected as never)), expected);
  assert.equal(
    formatPoints(expected as never),
    'Q: (1, 2, 3) #ff0000\ntop_2: (0, 0, 1)\n(4, 5, 6) #00aabb',
  );
});
void test('points reject wrong arity, bad values, names, colors and too many points', () => {
  for (const value of [
    '(1, 2)',
    '1 2 3 4',
    '(1, 2, x)',
    '(1, 2, 1/0)',
    '(1, (2, 3)',
    '1st: (1, 2, 3)',
    'Q: (1, 2, 3)\nQ: (0, 0, 0)',
    'Q: R: (1, 2, 3)',
    '(1, 2, 3)\nQ:',
    ': (1, 2, 3)',
    '(1, 2, 3) #ff00',
    '(1, 2, 3) #f00 #0f0',
    '#f00 (1, 2, 3)',
    'Q: (1, 2) #f00',
  ])
    assert.throws(() => parsePoints(value), value);
  assert.throws(() => parsePoints('(0,0,0)'.repeat(51)));
  assert.equal(parsePoints('(0,0,0)'.repeat(50)).length, 50);
});

const close = (a: number, b: number, tolerance = 1e-9) =>
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
// Every basis vector is unit, orthogonal to its siblings and satisfies Av = λv;
// multiplicities account for all three roots, which sum to the trace and
// multiply to the determinant.
function checkEigen(m: Matrix) {
  const result = eigen(m);
  const scale = Math.max(1, ...m.flat().map(Math.abs));
  let count = result.complex ? 2 : 0,
    sum = result.complex ? 2 * result.complex.re : 0,
    product = result.complex
      ? result.complex.re ** 2 + result.complex.im ** 2
      : 1;
  for (const { value, multiplicity, basis } of result.spaces) {
    assert.ok(
      basis.length >= 1 && basis.length <= multiplicity,
      JSON.stringify(m),
    );
    basis.forEach((v, i) => {
      assert.ok(close(Math.hypot(...v), 1), 'unit');
      basis
        .slice(i + 1)
        .forEach((w) =>
          assert.ok(
            Math.abs(v[0] * w[0] + v[1] * w[1] + v[2] * w[2]) < 1e-9,
            'orthogonal',
          ),
        );
      const image = m.map(
        (row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2],
      );
      const residual = Math.hypot(...image.map((x, k) => x - value * v[k]));
      assert.ok(
        residual < 1e-6 * scale,
        `Av = λv for ${JSON.stringify(m)}: ${residual}`,
      );
    });
    count += multiplicity;
    sum += value * multiplicity;
    product *= value ** multiplicity;
  }
  assert.equal(count, 3);
  const trace = m[0][0] + m[1][1] + m[2][2];
  assert.ok(Math.abs(sum - trace) < 1e-6 * scale, `trace ${JSON.stringify(m)}`);
  assert.ok(
    Math.abs(product - determinant(m)) < 1e-6 * scale ** 3,
    `det ${JSON.stringify(m)}`,
  );
  return result;
}
const shape = (m: Matrix) =>
  checkEigen(m).spaces.map((s) => [
    Number(s.value.toFixed(9)),
    s.multiplicity,
    s.basis.length,
  ]);
const along = (v: number[], axis: number) =>
  v.every((x, i) => (i === axis ? close(Math.abs(x), 1) : Math.abs(x) < 1e-9));

void test('eigen handles the presets: shear plane, rotation axis, scaling, projection', () => {
  const shearMatrix = [
    [1, 0.7, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  assert.deepEqual(shape(shearMatrix), [[1, 3, 2]]);
  const shear = checkEigen(shearMatrix);
  // The fixed plane is x–z: no y component.
  shear.spaces[0].basis.forEach((v) => assert.ok(Math.abs(v[1]) < 1e-12));

  const rotation = checkEigen([
    [Math.SQRT1_2, -Math.SQRT1_2, 0],
    [Math.SQRT1_2, Math.SQRT1_2, 0],
    [0, 0, 1],
  ]);
  assert.equal(rotation.spaces.length, 1);
  assert.ok(close(rotation.spaces[0].value, 1));
  assert.ok(along(rotation.spaces[0].basis[0], 2));
  assert.ok(
    close(rotation.complex!.re, Math.SQRT1_2) &&
      close(rotation.complex!.im, Math.SQRT1_2),
  );
  assert.equal(rotation.complex!.plane.length, 2);
  rotation.complex!.plane.forEach((v) => assert.ok(Math.abs(v[2]) < 1e-9));

  const scale = checkEigen([
    [1.7, 0, 0],
    [0, 0.7, 0],
    [0, 0, 1.3],
  ]);
  assert.deepEqual(
    scale.spaces.map((s) => Number(s.value.toFixed(9))),
    [1.7, 1.3, 0.7],
  );
  assert.ok(
    along(scale.spaces[0].basis[0], 0) && along(scale.spaces[1].basis[0], 2),
  );
  // Signs are canonical: each eigenvector's largest component is positive.
  scale.spaces.forEach(({ basis }) => assert.ok(Math.max(...basis[0]) > 0.99));

  assert.deepEqual(
    shape([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]),
    [
      [1, 2, 2],
      [0, 1, 1],
    ],
  );
});

void test('eigen covers scalar, zero, defective and reflected matrices', () => {
  assert.deepEqual(shape(IDENTITY), [[1, 3, 3]]);
  assert.deepEqual(
    shape([
      [-2, 0, 0],
      [0, -2, 0],
      [0, 0, -2],
    ]),
    [[-2, 3, 3]],
  );
  assert.deepEqual(
    shape([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]),
    [[0, 3, 3]],
  );
  // Jordan blocks have fewer eigenvectors than their multiplicity.
  assert.deepEqual(
    shape([
      [2, 1, 0],
      [0, 2, 0],
      [0, 0, -1],
    ]),
    [
      [2, 2, 1],
      [-1, 1, 1],
    ],
  );
  assert.deepEqual(
    shape([
      [3, 1, 0],
      [0, 3, 1],
      [0, 0, 3],
    ]),
    [[3, 3, 1]],
  );
  assert.deepEqual(
    shape([
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]),
    [
      [1, 2, 2],
      [-1, 1, 1],
    ],
  );
  // Rank one: a double zero eigenvalue with a full plane of eigenvectors.
  assert.deepEqual(
    shape([
      [1, 2, 3],
      [2, 4, 6],
      [3, 6, 9],
    ]),
    [
      [14, 1, 1],
      [0, 2, 2],
    ],
  );
  // Pure rotation by 90°: eigenvalue 1 on the axis, ±i on the plane.
  const quarter = checkEigen([
    [0, -1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ]);
  assert.ok(close(quarter.complex!.re + 1, 1) && close(quarter.complex!.im, 1));
});

void test('eigen separates close eigenvalues and survives large scales', () => {
  assert.deepEqual(
    shape([
      [1, 0, 0],
      [0, 1.001, 0],
      [0, 0, 2],
    ]).map(([, m, d]) => [m, d]),
    [
      [1, 1],
      [1, 1],
      [1, 1],
    ],
  );
  assert.deepEqual(
    shape([
      [5000, 3000, 0],
      [0, 5000, 0],
      [0, 0, -2000],
    ]),
    [
      [5000, 2, 1],
      [-2000, 1, 1],
    ],
  );
  checkEigen([
    [1e-4, 2e-4, 0],
    [0, 3e-4, 0],
    [1e-4, 0, -2e-4],
  ]);
});

void test('eigen holds for random integer matrices, including repeated roots', () => {
  let seed = 7;
  const random = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return ((seed >>> 16) % 11) - 5;
  };
  let repeated = 0,
    complex = 0;
  for (let n = 0; n < 2000; n++) {
    // Mix in sparse matrices, which often have exactly repeated eigenvalues.
    const m = [0, 1, 2].map(() =>
      [0, 1, 2].map(() => (n % 3 === 0 && random() > 0 ? 0 : random())),
    );
    const result = checkEigen(m);
    if (result.spaces.some((s) => s.multiplicity > 1)) repeated++;
    if (result.complex) complex++;
  }
  assert.ok(
    repeated > 50 && complex > 200,
    `${repeated} repeated, ${complex} complex`,
  );
});
