import {getSchemaFromTypedSchema} from '../getSchemaFromTypedSchema'
import {InferSchemaType} from '../types'
import {CurrentNodeInfoOptions, Schema} from '../types/schema'
import recursiveClean from './recursiveClean'

const defaultOptions = {
  autoConvert: true,
  filter: true,
  trimStrings: true,
  removeEmptyStrings: false,
}

export default async function clean<TSchema extends Schema = Schema>(
  schema: TSchema | Function,
  doc: InferSchemaType<TSchema>,
  opts: CurrentNodeInfoOptions = {},
  ...args
): Promise<InferSchemaType<TSchema>> {
  if (!doc) return doc
  schema = getSchemaFromTypedSchema(schema) as TSchema

  const options = {...defaultOptions, ...opts}
  const params = {
    schema: {type: schema},
    value: doc,
    doc: options.forceDoc || doc,
    currentDoc: doc,
    options,
    args,
  }

  const cleanedResult = await recursiveClean(params)
  return cleanedResult
}
