import {getSchemaFromTypedModel} from '../getSchemaFromTypedModel'
import {Blackbox, CurrentNodeInfoOptions, Schema} from '../types/schema'
import recursiveClean from './recursiveClean'

const defaultOptions = {
  autoConvert: true,
  filter: true,
  trimStrings: true,
  removeEmptyStrings: false
}

export default async function clean<TDoc = Blackbox>(
  schema: Schema | Function,
  doc: TDoc,
  opts: CurrentNodeInfoOptions = {},
  ...args
): Promise<TDoc> {
  if (!doc) return doc
  schema = getSchemaFromTypedModel(schema)

  const options = {...defaultOptions, ...opts}
  const params = {
    schema: {type: schema},
    value: doc,
    doc: options.forceDoc || doc,
    currentDoc: doc,
    options,
    args
  }
  const cleanedResult = await recursiveClean(params)
  return cleanedResult as TDoc
}
