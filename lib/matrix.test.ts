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
} from './matrix.ts';
test('safe arithmetic supports fractions, roots, signs, scientific notation and precedence', () => {
  assert.equal(scalar('1/2'), 0.5);
  assert.equal(scalar('sqrt(4) + 2^3'), 10);
  assert.equal(scalar('-2^2'), -4);
  assert.equal(scalar('1e-3'), 0.001);
  assert.equal(scalar('2^-2'), 0.25);
});
test('invalid or nonfinite input is rejected', () => {
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
test('all supported matrix formats parse consistently', () => {
  for (const value of [
    '[1 0 0;0 1 0;0 0 1]',
    'A = [[1,0,0],[0,1,0],[0,0,1]]',
    '1\t0\t0\n0\t1\t0\n0\t0\t1',
    formatMatrix(IDENTITY),
  ])
    assert.deepEqual(parseMatrix(value), IDENTITY);
});
test('malformed dimensions rejected', () => {
  assert.throws(() => parseMatrix('[1 2;3 4]'));
  assert.throws(() => parseMatrix('[1 0 0;0 1 0;0 0]'));
});
test('determinant and rank distinguish orientation, projection and collapse', () => {
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

test('composition order applies the rightmost matrix first without mutating operands', () => {
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
test('composition validates missing names, syntax and excessive magnitude', () => {
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
