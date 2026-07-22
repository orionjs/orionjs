import {defineConfig} from 'tsup'

export default defineConfig({
  entry: {dashboard: 'src/dashboard/server.ts'},
  format: ['esm'],
  bundle: true,
  clean: true,
  dts: false,
  minify: true,
  outDir: 'assets',
  platform: 'node',
  sourcemap: false,
  target: 'node18',
  external: ['mongodb'],
  banner: {js: '#!/usr/bin/env node'},
})
