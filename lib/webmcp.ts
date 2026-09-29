import { parseMatrix, determinant, rank, type Matrix } from './matrix';
type Context = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => Promise<unknown>;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerMatrixTool(apply: (matrix: Matrix) => void) {
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: 'set_matrix',
          title: 'Set visualization matrix',
          description:
            'Parse a 3 by 3 real matrix and update the currently selected matrix in the editor and 3D plot.',
          inputSchema: {
            type: 'object',
            properties: {
              matrix: {
                type: 'string',
                description:
                  'Rows separated by semicolons or newlines, values separated by spaces or commas.',
              },
            },
            required: ['matrix'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            if (
              !input ||
              typeof input !== 'object' ||
              !('matrix' in input) ||
              typeof input.matrix !== 'string'
            )
              throw new Error('matrix must be a string.');
            const matrix = parseMatrix(input.matrix);
            apply(matrix);
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
            return {
              matrix,
              determinant: determinant(matrix),
              rank: rank(matrix),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {
    /* Optional browser API; the visible editor remains available. */
  }
  return () => lifecycle.abort();
}
