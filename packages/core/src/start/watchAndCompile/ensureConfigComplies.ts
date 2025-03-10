import getFileContents from '../../helpers/getFileContents'
import writeFile from '../../helpers/writeFile'
import {parse, stringify} from 'comment-json'

export function ensureConfigComplies(configPath) {
  try {
    const configJSON = getFileContents(configPath)
    const config = parse(configJSON) as any

    const newConfig = {
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        outDir: `./.orion/build/app`,
        baseUrl: `./`
      }
    }

    if (!config.compilerOptions?.rootDir && !config.compilerOptions?.rootDirs) {
      newConfig.compilerOptions.rootDir = `./app`
    }

    writeFile(configPath, stringify(newConfig, null, 2))
  } catch (error) {
    console.log(`Error reading tsconfig ${error.message}`)
  }
}
