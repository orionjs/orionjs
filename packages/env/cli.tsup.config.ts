import {defineConfig} from 'tsup'

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node16',
  outDir: 'dist-cli',
  outExtension({format}) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    }
  },
})
