import {execSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

const packagesDir = join(import.meta.dirname, '..', 'packages')

interface PkgInfo {
  name: string
  version: string
  dir: string
  deps: Set<string>
}

function getPackages(): Map<string, PkgInfo> {
  const packages = new Map<string, PkgInfo>()

  for (const entry of readdirSync(packagesDir, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue
    const pkgDir = join(packagesDir, entry.name)
    const pkgJsonPath = join(pkgDir, 'package.json')
    if (!existsSync(pkgJsonPath)) continue

    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
    const deps = new Set<string>()

    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const dep of Object.keys(pkgJson[depType] || {})) {
        if (dep.startsWith('@orion-js/')) deps.add(dep)
      }
    }

    packages.set(pkgJson.name, {
      name: pkgJson.name,
      version: pkgJson.version,
      dir: entry.name,
      deps,
    })
  }

  return packages
}

function assertAlignedMinorVersions(packages: Map<string, PkgInfo>): void {
  const packagesByMinor = new Map<string, string[]>()

  for (const pkg of packages.values()) {
    const match = /^(\d+\.\d+)\.\d+(?:-.+)?$/.exec(pkg.version)

    if (!match) {
      throw new Error(`Invalid package version for ${pkg.name}: ${pkg.version}`)
    }

    const minor = match[1]
    const packageVersions = packagesByMinor.get(minor) ?? []
    packageVersions.push(`${pkg.name}@${pkg.version}`)
    packagesByMinor.set(minor, packageVersions)
  }

  if (packagesByMinor.size <= 1) return

  const details = [...packagesByMinor.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([minor, packageVersions]) => `  ${minor}: ${packageVersions.sort().join(', ')}`)
    .join('\n')

  throw new Error(
    `All OrionJS packages must share the same major.minor version. Found:\n${details}`,
  )
}

function topologicalSort(packages: Map<string, PkgInfo>): string[] {
  const sorted: string[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(name: string) {
    if (visited.has(name)) return
    if (visiting.has(name)) return // circular dep, skip

    visiting.add(name)
    const pkg = packages.get(name)
    if (pkg) {
      for (const dep of pkg.deps) {
        if (packages.has(dep)) visit(dep)
      }
    }
    visiting.delete(name)
    visited.add(name)
    sorted.push(name)
  }

  for (const name of packages.keys()) {
    visit(name)
  }

  return sorted
}

const packages = getPackages()
assertAlignedMinorVersions(packages)
const order = topologicalSort(packages)
let failed = false

for (const name of order) {
  const pkg = packages.get(name)
  if (!pkg) continue

  console.log(`\n=== Building ${pkg.dir} ===`)
  try {
    execSync('bun run build', {
      cwd: join(packagesDir, pkg.dir),
      stdio: 'inherit',
    })
  } catch {
    console.error(`Failed to build ${pkg.dir}, continuing...`)
    failed = true
  }
}

if (failed) {
  process.exit(1)
}
