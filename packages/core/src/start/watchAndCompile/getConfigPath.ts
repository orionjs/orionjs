import ts from 'typescript'
import {getFileContents} from '../../helpers/getFileContents'
import {ensureConfigComplies} from './ensureConfigComplies'

export function getConfigPath() {
  const appBasePath = process.cwd()
  const configPath = ts.findConfigFile(appBasePath, ts.sys.fileExists, 'tsconfig.json')

  ensureConfigComplies(configPath)

  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.")
  }

  return configPath
}
