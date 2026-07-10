import {existsSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {ensureConfigComplies} from './ensureConfigComplies'

function findConfigFile(startDirectory: string, fileName: string): string | undefined {
  let directory = startDirectory

  while (true) {
    const candidate = join(directory, fileName)
    if (existsSync(candidate)) return candidate

    const parent = dirname(directory)
    if (parent === directory) return undefined
    directory = parent
  }
}

export function getConfigPath() {
  const appBasePath = process.cwd()

  const configPath =
    findConfigFile(appBasePath, 'tsconfig.server.json') ||
    findConfigFile(appBasePath, 'tsconfig.json')

  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.")
  }

  ensureConfigComplies(configPath)

  return configPath
}
