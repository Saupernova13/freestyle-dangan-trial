import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The editor is a static single-page app; Vite supplies the dev server, since
// ES modules cannot load over file://.
//
// `npm run build:single` inlines all JS/CSS into one dist/index.html.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'single',
  },
}));
