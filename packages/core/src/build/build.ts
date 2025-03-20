import chalk from 'chalk'
import * as esbuild from 'esbuild'

export async function build(options: {output?: string}) {
  const {output} = options

  console.log(`Building with esbuild to ${output}`)

  await esbuild.build({
    entryPoints: ['./app/index.ts'],
    tsconfig: './tsconfig.json',
    format: 'esm',
    platform: 'node',
    outdir: output,
    bundle: true,
    target: 'node22',
    sourcemap: true,
    allowOverwrite: true,
    minify: true,
    packages: 'external',
  })

  console.log(chalk.green.bold('Build successful'))
}
