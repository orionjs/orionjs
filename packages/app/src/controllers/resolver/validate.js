import {validate} from '@orion-js/schema'
import clone from 'lodash/clone'

export default async function(resolverParams, params, viewer) {
  const schema = {}
  for (const key of Object.keys(resolverParams)) {
    const field = clone(resolverParams[key])
    if (field.type.__isModel) {
      field.type = field.type.schema
    }
    schema[key] = field
  }
  const options = {}
  return await validate(schema, params, options, viewer)
}
