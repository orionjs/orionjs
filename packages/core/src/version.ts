import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

function getVersion(): string {
  try {
    const dir = dirname(fileURLToPath(import.meta.url))
    const pkgPath = resolve(dir, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version
  } catch {
    return 'unknown'
  }
}

export default getVersion()
