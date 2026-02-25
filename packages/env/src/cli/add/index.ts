import YAML from 'yaml'
import {writeFile} from '../../files'
import {encryptValue} from './encryptValue'
import {getConfig} from './getConfig'
import {getParams} from './getParams'

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

export default async function envAdd({path, key: optKey, value: optValue}) {
  if (!path) {
    path = '.env.local.yml'
  }

  const config = getConfig(path)
  const {key, value} = await getParams(config, {key: optKey, value: optValue})
  if (!value) return

  encryptValue(key, value, config)

  // sort keys alphabetically
  config.cleanKeys = sortObjectByKeys(config.cleanKeys)
  config.encryptedKeys = sortObjectByKeys(config.encryptedKeys)
  config.readFromSecret = sortObjectByKeys(config.readFromSecret)

  const text = YAML.stringify(config)
  writeFile(path, text)
}
