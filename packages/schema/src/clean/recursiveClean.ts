import {isNil} from 'rambdax'
import cleanType from './cleanType'
import {CurrentNodeInfo, SchemaNode} from '../types/schema'
import getObjectNode from './getObjectNode'
import {convertTypedSchema} from '../getValidationErrors/convertTypedSchema'

const cleanObjectFields = async ({
  schema,
  value,
  ...other
}: {
  schema: SchemaNode
  value: object
}): Promise<any> => {
  const keys = Object.keys(schema.type).filter(key => !key.startsWith('__'))
  const newDoc: object = {}

  for (const key of keys) {
    try {
      const cleanOptions = {
        ...other,
        schema: schema.type[key],
        value: value[key],
        currentDoc: value,
      }
      const newValue = await clean(cleanOptions)
      if (newValue !== undefined) {
        newDoc[key] = newValue
      }
    } catch (error) {
      throw new Error(`Error cleaning field ${key}, error: ${error.message}`)
    }
  }
  return newDoc
}

const cleanArrayItems = async ({
  schema,
  value,
  ...other
}: {
  schema: Partial<SchemaNode>
  value: any
}): Promise<any> => {
  // clean array items

  const schemaType = schema.type[0]

  const promises = value.map(async (item: any) => {
    const newValue = await clean({
      ...other,
      schema: {
        type: schemaType,
      },
      value: item,
      currentDoc: value,
    })
    return newValue
  })

  const result = await Promise.all(promises)
  return result.filter(value => value !== undefined)
}

function getArrayNode(
  schema: Partial<SchemaNode>,
  value: any | Array<any>,
): SchemaNode | undefined {
  if (Array.isArray(schema.type) && !isNil(value)) {
    const result = schema as SchemaNode
    return result
  }

  return null
}

const clean = async (info: CurrentNodeInfo): Promise<any> => {
  convertTypedSchema(info)

  const {schema, args = [], value} = info

  const currSchema: SchemaNode =
    schema.type === undefined ? ({type: schema} as SchemaNode) : (schema as SchemaNode)

  const objectSchema = getObjectNode(currSchema, value)
  if (objectSchema) {
    const newDoc = await cleanObjectFields({
      ...info,
      schema: objectSchema,
      value: value as object,
    })
    const result = await cleanType('plainObject', objectSchema, newDoc, info, ...args)
    return result
  }

  const arraySchema = getArrayNode(currSchema, value)

  if (arraySchema) {
    let updatedValue = value
    if (!Array.isArray(value)) {
      updatedValue = [value]
    }

    const newDoc = await cleanArrayItems({
      ...info,
      schema: arraySchema,
      value: updatedValue,
    })
    const result = await cleanType('array', arraySchema, newDoc, info, ...args)
    return result
  }

  const result = await cleanType(currSchema.type, currSchema, value, info, ...args)
  return result
}

export default clean
