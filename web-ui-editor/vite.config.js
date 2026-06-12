import { defineConfig } from 'vite';

// The editor is a single-page static app. Vite provides the dev server
// (ES modules cannot load over file://) and a production bundle.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
