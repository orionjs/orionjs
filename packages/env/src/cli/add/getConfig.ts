import YAML from 'yaml'
import {Config} from '../../environment/getVariables'
import {readFile} from '../../files'

export const getConfig = (envPath: string): Config => {
  const configFile = readFile(envPath)

  if (!configFile) {
    throw new Error('No config file found at path ' + envPath)
  }

  return YAML.parse(configFile)
}
