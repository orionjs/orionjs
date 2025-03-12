import {Schema} from '@orion-js/schema'
import getField from './getField'

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

export default async function serializeSchema(params): Promise<Schema> {
  if (!params) return

  if (params?.[Symbol.metadata]?._getModel) {
    const model = params[Symbol.metadata]._getModel()
    params = model.getSchema()
  }

  if (typeof params === 'function' && params.getModel && params.__schemaId) {
    params = params.getModel().getSchema() // typed model
  }

  if (Object.keys(params).length === 0) return

  const fields = {}

  for (const key of Object.keys(params)) {
    const field = params[key]
    fields[key] = await getField(field)
  }

  return fields
}
