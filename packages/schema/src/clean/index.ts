import {getSchemaFromAnyOrionForm} from '../models'
import {InferSchemaType} from '../types'
import {CurrentNodeInfoOptions, SchemaFieldType} from '../types/schema'
import recursiveClean from './recursiveClean'

const defaultOptions = {
  autoConvert: true,
  filter: true,
  trimStrings: true,
  removeEmptyStrings: false,
}

export default async function clean<TSchema extends SchemaFieldType>(
  schema: TSchema,
  doc: InferSchemaType<TSchema>,
  opts: CurrentNodeInfoOptions = {},
  ...args
): Promise<InferSchemaType<TSchema>> {
  if (!doc) return doc
  schema = getSchemaFromAnyOrionForm(schema) as TSchema

  const options = {...defaultOptions, ...opts}
  const params = {
    schema: {type: schema},
    value: doc,
    doc: options.forceDoc || doc,
    currentDoc: doc,
    options,
    args,
  }

  const cleanedResult = await recursiveClean(params as any)
  return cleanedResult
}
