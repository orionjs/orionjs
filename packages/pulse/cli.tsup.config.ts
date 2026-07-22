import {defineConfig} from 'tsup'

export default defineConfig({
  entry: {'orion-pulse': 'src/cli.ts'},
  format: ['esm'],
  bundle: true,
  clean: true,
  dts: false,
  minify: true,
  outDir: 'dist-cli',
  platform: 'node',
  target: 'node18',
  banner: {js: '#!/usr/bin/env node'},
})
