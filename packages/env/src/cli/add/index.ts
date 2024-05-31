import {encryptValue} from './encryptValue'
import {getConfig} from './getConfig'
import {getParams} from './getParams'
import YAML from 'yaml'
import {writeFile} from '../../files'

const sortObjectByKeys = (object: any) => {
  if (!object) return {}
  const sorted = {}
  Object.keys(object)
    .sort()
    .forEach(key => {
      sorted[key] = object[key]
    })
  return sorted
}

export default async function envAdd({path}) {
  if (!path) {
    path = '.env.local.yml'
  }

  const config = getConfig(path)
  const {key, value} = await getParams(config)
  if (!value) return

  encryptValue(key, value, config)

  // sort keys alphabetically
  config.cleanKeys = sortObjectByKeys(config.cleanKeys)
  config.encryptedKeys = sortObjectByKeys(config.encryptedKeys)
  config.readFromSecret = sortObjectByKeys(config.readFromSecret)

  const text = YAML.stringify(config)
  writeFile(path, text)
}
