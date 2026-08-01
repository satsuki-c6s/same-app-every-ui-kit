import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// shared/ はこのディレクトリの外にあるため、明示的に読み取りを許可する
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [repoRoot] } },
});
