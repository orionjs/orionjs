import {parse, stringify} from 'comment-json'
import getFileContents from '../../helpers/getFileContents'
import writeFile from '../../helpers/writeFile'

// Define TypeScript config interface
interface TSConfig {
  compilerOptions?: {
    baseUrl?: string
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

    const newConfig = {
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        baseUrl: './',
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
