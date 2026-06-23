import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { rari } from 'rari/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [rari(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
