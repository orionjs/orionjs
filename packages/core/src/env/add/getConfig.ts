import getFileContents from '../../helpers/getFileContents'
import YAML from 'yaml'

export interface Config {
  version: string
  publicKey: string
  cleanKeys: {
    [key: string]: string
  }
  encryptedKeys: {
    // keyName
    [key: string]: string
  }
}

export const getConfig = (envPath: string): Config => {
  const configFile = getFileContents(envPath)

  if (!configFile) {
    throw new Error('No config file found')
  }

  return YAML.parse(configFile)
}
