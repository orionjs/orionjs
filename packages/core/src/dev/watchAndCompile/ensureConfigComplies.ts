import {parse, stringify} from 'comment-json'
import getFileContents from '../../helpers/getFileContents'
import writeFile from '../../helpers/writeFile'

// Define TypeScript config interface
interface TSConfig {
  compilerOptions?: {
    paths?: Record<string, string[]>
    rootDir?: string
    rootDirs?: string[]
    [key: string]: any
  }
  [key: string]: any
}

export function ensureConfigComplies(configPath: string) {
  try {
    const configJSON = getFileContents(configPath)
    const config = parse(configJSON) as TSConfig
    const {baseUrl: _baseUrl, ...compilerOptions} = config.compilerOptions ?? {}

    const newConfig = {
      ...config,
      compilerOptions: {
        ...compilerOptions,
        paths: {
          '*': ['./*'],
          ...compilerOptions.paths,
        },
        noEmit: true,
      },
    }

    if (!config.compilerOptions?.rootDir && !config.compilerOptions?.rootDirs) {
      newConfig.compilerOptions.rootDir = './app'
    }

    // are the same, no write
    if (JSON.stringify(config) === JSON.stringify(newConfig)) {
      return
    }

    writeFile(configPath, stringify(newConfig, null, 2))
  } catch (error) {
    console.log(`Error reading tsconfig: ${error.message}`)
  }
}
