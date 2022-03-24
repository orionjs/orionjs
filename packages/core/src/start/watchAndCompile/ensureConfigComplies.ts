import getFileContents from '../../helpers/getFileContents'
import writeFile from '../../helpers/writeFile'
import {parse, stringify} from 'comment-json'

export function ensureConfigComplies(configPath) {
  try {
    const configJSON = getFileContents(configPath)
    const config = parse(configJSON)

    const newConfig = {
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        outDir: `./.orion/build/app`,
        rootDir: `./app`,
        baseUrl: `./`
      }
    }

    writeFile(configPath, stringify(newConfig, null, 2))
  } catch (error) {
    console.log(`Error reading tsconfig ${error.message}`)
  }
}
