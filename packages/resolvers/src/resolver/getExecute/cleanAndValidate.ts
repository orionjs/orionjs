import getSchema from './getSchema'
import {validate, clean} from '@orion-js/schema'

export default async function cleanAndValidate({
  params,
  callParams,
}: {params: any; callParams: any}) {
  if (!callParams) callParams = {}

  if (params) {
    const options = {
      filter: false,
      removeEmptyStrings: false,
    }
    const schema = getSchema(params)
    const cleaned = await clean(schema, callParams, options)
    console.log('cleaned', {cleaned, schema, callParams})
    await validate(schema, cleaned, options)
    return cleaned
  }

  return callParams
}
