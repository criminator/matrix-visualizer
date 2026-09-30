import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig(({ command, mode, isPreview }) => ({
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [
    tailwindcss(),
    vinext(),
    // Nitro's dev environments lack the runner required by Vinext's RSC handler.
    // Use Vinext for local development and Nitro for production builds/previews.
    (command === 'build' || isPreview) &&
      nitro(mode === 'vercel' ? { preset: 'vercel' } : {}),
  ],
}));
