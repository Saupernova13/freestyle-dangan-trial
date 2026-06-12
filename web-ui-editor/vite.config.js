import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The editor is a single-page static app. Vite provides the dev server
// (ES modules cannot load over file://) and a production bundle.
//
// `npm run build:single` (mode "single") inlines all JS/CSS into one
// self-contained dist/index.html that casual users can download and open
// directly. If the browser blocks the folder picker over file://, serve the
// file over HTTP instead (e.g. `npm run preview`).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'single',
  },
}));
