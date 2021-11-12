import getSchema from './getSchema'
import {validate, clean} from '@orion-js/schema'

export default async function ({params, callParams}: {params: any; callParams: any}) {
  if (!callParams) callParams = {}

  if (params) {
    const options = {
      filter: false,
      removeEmptyStrings: false
    }
    const schema = getSchema(params)
    const cleaned = await clean(schema, callParams, options)
    await validate(schema, cleaned, options)
    return cleaned
  } else {
    return callParams
  }
}
