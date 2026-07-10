import {execFileSync} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

const packageDir = process.cwd()
const workspaceDir = resolve(import.meta.dirname, '..')
const temporaryDir = mkdtempSync(join(tmpdir(), 'orion-declarations-'))
const temporaryConfig = join(temporaryDir, 'tsconfig.json')

try {
  writeFileSync(
    temporaryConfig,
    JSON.stringify({
      extends: join(packageDir, 'tsconfig.json'),
      compilerOptions: {
        declaration: true,
        emitDeclarationOnly: true,
        noEmit: false,
        outDir: join(packageDir, 'dist'),
        rootDir: join(packageDir, 'src'),
        typeRoots: [
          join(packageDir, 'node_modules/@types'),
          join(workspaceDir, 'node_modules/@types'),
        ],
        types: ['node'],
      },
      files: [join(packageDir, 'src/index.ts')],
      include: [],
      exclude: [],
    }),
  )

  execFileSync(join(workspaceDir, 'node_modules/.bin/tsc'), ['-p', temporaryConfig], {
    cwd: packageDir,
    stdio: 'inherit',
  })
} finally {
  rmSync(temporaryDir, {force: true, recursive: true})
}
