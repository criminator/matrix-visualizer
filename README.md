# Matrix Space

An interactive 3D linear algebra playground built with React, TypeScript, Three.js, and Vinext.

## Run

```sh
npm install
npm run dev
```

## Validate

```sh
npx tsc --noEmit
node --experimental-strip-types --test lib/matrix.test.ts
npm run build
```

## Input and conventions

The current workspace accepts 3×3 real matrices. Matrix columns are basis vectors; points transform as column vectors `Ax`. Grid cells support arithmetic, fractions, `pi`, and `sqrt()`. Text mode accepts `[1 0 0; 0 1 0; 0 0 1]`, nested arrays, or pasted spreadsheet rows. Expressions in text mode must not contain spaces internally. Values are limited to ±10,000. Invalid edits retain the last valid visualization.

The scrubber uses linear interpolation `(1-t)I+tA`, which does not preserve rotations and may pass through singular matrices. Statistics describe the target matrix A. Rank uses relative numerical tolerance 1e-10. Fit reframes large transformations. Rendering is on demand; resources are reused and disposed on unmount.

An optional feature-detected WebMCP `set_matrix` tool uses the same editor state. No supported browser WebMCP validation context was available during implementation, so browser registration remains unverified.
