import {getFileContents} from '../../helpers/getFileContents'
import writeFile from '../../helpers/writeFile'

export function ensureConfigComplies(configPath) {
  try {
    const configJSON = getFileContents(configPath)
    const config = JSON.parse(configJSON)

    const newConfig = {
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        outDir: `./.orion/build/app`,
        rootDir: `./app`,
        baseUrl: `./`
      }
    }

    writeFile(configPath, JSON.stringify(newConfig, null, 2))
  } catch (error) {
    console.log(`Error reading tsconfig.json ${error.message}`)
  }
}
