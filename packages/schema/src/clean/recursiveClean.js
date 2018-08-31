import isPlainObject from 'lodash/isPlainObject'
import isUndefined from 'lodash/isUndefined'
import isArray from 'lodash/isArray'
import cleanType from './cleanType'
import isNil from 'lodash/isNil'

const cleanObjectFields = async function({schema, value, ...other}) {
  const keys = Object.keys(schema.type).filter(key => !key.startsWith('__'))
  let newDoc = {}
  for (const key of keys) {
    try {
      const cleanOptions = {
        ...other,
        schema: schema.type[key],
        value: value[key],
        currentDoc: value
      }
      const newValue = await clean(cleanOptions)
      if (!isUndefined(newValue)) {
        newDoc[key] = newValue
      }
    } catch (error) {
      throw new Error(`Error cleaning field ${key}, error: ${error.message}`)
    }
  }
  return newDoc
}

const cleanArrayItems = async function({schema, value, ...other}) {
  // clean array items
  const newDoc = []
  for (let i = 0; i < value.length; i++) {
    const newValue = await clean({
      ...other,
      schema: {
        type: schema.type[0]
      },
      value: value[i],
      currentDoc: value
    })
    if (!isUndefined(newValue)) {
      newDoc.push(newValue)
    }
  }
  return newDoc
}

const clean = async function(info) {
  let {schema, args, value} = info

  if (isPlainObject(schema.type) && isPlainObject(value)) {
    let newDoc = await cleanObjectFields(info)
    const result = await cleanType('plainObject', schema, newDoc, info, ...args)
    return result
  } else if (isArray(schema.type) && !isNil(info.value)) {
    if (!isArray(value)) info.value = [value]
    const newDoc = await cleanArrayItems(info)
    return await cleanType('array', schema, newDoc, info, ...args)
  } else {
    const result = await cleanType(schema.type, schema, value, info, ...args)
    return result
  }
}

export default clean
