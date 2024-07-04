import {getConfig} from '../cli/add/getConfig'
import {readFile, writeFile} from '../files'
import {Config} from './getVariables'

export function getDts(config: Config) {
  const keys = [
    ...Object.keys(config.cleanKeys),
    ...Object.keys(config.encryptedKeys),
    ...Object.values(config.readFromSecret).flat()
  ]
  return `declare module '@orion-js/env' {
  export const env: {
${keys.map(key => `    ${key}: string`).join('\n')}
  }
}
`
}

export function writeDtsFile(config: Config, path: string) {
  const currentFile = readFile(path)
  const dts = getDts(config)
  if (currentFile !== dts) {
    writeFile(path, dts)
  }
}

export function writeDtsFileFromConfigFile(configFilePath: string, path: string) {
  const config = getConfig(configFilePath)
  writeDtsFile(config, path)
}
