import {Schema} from '.'
import {isClass} from './getValidationErrors/convertTypedModel'

export const getSchemaFromTypedModel = (schema: Schema | Function): Schema => {
  const item = schema as any
  if (typeof item !== 'function') return item
  if (!isClass(item)) return item
  if (!item.getModel || !item.__schemaId) return item

  return item.getModel().getCleanSchema()
}
