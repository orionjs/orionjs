import getField from './getField'
import {config} from '@orion-js/app'

export default function (params) {
  const {logger} = config()
  if (!params) return
  if (Object.keys(params).length === 0) return

  const fields = {}

  for (const key of Object.keys(params)) {
    try {
      const type = getField(params[key].type)
      fields[key] = {type}
    } catch (error) {
      logger.error(`Error creating GraphQL resolver params argument ${key}`, error)
    }
  }
  return fields
}
