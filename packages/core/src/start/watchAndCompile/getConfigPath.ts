import ts from 'typescript'
import {ensureConfigComplies} from './ensureConfigComplies'

export function getConfigPath() {
  const appBasePath = process.cwd()

  const configPath =
    ts.findConfigFile(appBasePath, ts.sys.fileExists, 'tsconfig.server.json') ||
    ts.findConfigFile(appBasePath, ts.sys.fileExists, 'tsconfig.json')


  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.")
  }

  ensureConfigComplies(configPath)

  return configPath
}
