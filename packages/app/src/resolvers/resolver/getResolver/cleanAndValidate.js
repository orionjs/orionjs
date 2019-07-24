import getSchema from './getSchema'
import {validate, clean} from '@orion-js/schema'

export default async function({params, callParams, viewer}) {
  if (params) {
    const options = {
      filter: false,
      removeEmptyStrings: false
    }
    const schema = getSchema(params, callParams, options, viewer)
    const cleaned = await clean(schema, callParams, options, viewer)
    await validate(schema, cleaned, options, viewer)
    return cleaned
  } else {
    return callParams
  }
}
