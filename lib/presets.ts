import type { Matrix } from './matrix';

export type Preset = { name: string; hint: string; matrix: Matrix };

export const presets: Preset[] = [
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

export const palette = [
  '#bafb73',
  '#83b6fc',
  '#fa9a80',
  '#d6a4ff',
  '#ffc75e',
  '#70e0d5',
];
