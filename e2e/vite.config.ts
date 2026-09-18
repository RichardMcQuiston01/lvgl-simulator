import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./fixtures', import.meta.url)),
  resolve: {
    alias: {
      '@lvgl-simulator': fileURLToPath(new URL('../src', import.meta.url)),
    },
  },
});
