import {InferSchemaType, SchemaFieldType} from './types'
import clean from './clean'
import validate from './validate'

export async function cleanAndValidate<TSchema extends SchemaFieldType>(
  schema: TSchema,
  doc: InferSchemaType<TSchema>,
): Promise<InferSchemaType<TSchema>> {
  const cleaned = await clean(schema, doc)
  await validate(schema, cleaned)
  return cleaned
}
