import {execSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

const packagesDir = join(import.meta.dirname, '..', 'packages')

let failed = false

for (const entry of readdirSync(packagesDir, {withFileTypes: true})) {
  if (!entry.isDirectory()) continue
  const pkgDir = join(packagesDir, entry.name)
  const pkgJsonPath = join(pkgDir, 'package.json')
  if (!existsSync(pkgJsonPath)) continue

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
  if (!pkgJson.scripts?.test) continue

  console.log(`\n=== Testing ${entry.name} ===`)
  try {
    execSync('bun run test', {
      cwd: pkgDir,
      stdio: 'inherit',
    })
  } catch {
    failed = true
  }
}

if (failed) {
  process.exit(1)
}
