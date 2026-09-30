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
