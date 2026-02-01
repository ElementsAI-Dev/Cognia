import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'cli/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
