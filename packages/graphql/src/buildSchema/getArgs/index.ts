import {Schema} from '@orion-js/schema'
import getField from './getField'
import {StartGraphQLOptions} from '../../types'

export default function (params: Schema, options: StartGraphQLOptions) {
  if (!params) return
  if (Object.keys(params).length === 0) return

  const fields = {}

  for (const key of Object.keys(params).filter(key => !key.startsWith('__'))) {
    try {
      const type = getField(params[key].type, options)
      fields[key] = {type}
    } catch (error) {
      throw new Error(`Error creating GraphQL resolver params argument ${key}: ${error.message}`)
    }
  }
  return fields
}
