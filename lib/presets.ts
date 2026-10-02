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

// Fixed order, validated against the dark scene surface: the first three
// stay distinguishable in every pairing (including color-vision deficiency);
// later slots rely on the matrix name labels as well.
export const palette = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
// Default for new points; outside the matrix palette and the composition color.
export const pointColor = '#9085e9';
// Neutral color for the composition, distinct from every palette hue.
export const compositionColor = '#d4d6db';
