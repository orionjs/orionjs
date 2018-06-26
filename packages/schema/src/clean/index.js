import isArray from 'lodash/isArray'
import isPlainObject from 'lodash/isPlainObject'
import cleanType from './cleanType'
import isNil from 'lodash/isNil'

const clean = async function(
  type,
  fieldSchema,
  value,
  {schema, doc, currentDoc, options},
  ...args
) {
  const info = {schema, doc, currentDoc, options, fieldSchema, type}
  if (isArray(type) && !isNil(value)) {
    if (!isArray(value)) {
      value = [value]
    }

    // clean array items
    const items = []
    for (let i = 0; i < value.length; i++) {
      const newValue = await clean(
        type[0],
        type[0],
        value[i],
        {...info, currentDoc: value[i]},
        ...args
      )
      if (!isNil(newValue)) {
        items.push(newValue)
      }
    }
    return await cleanType('array', fieldSchema, items, info, ...args)
  } else if (isPlainObject(type) && isPlainObject(value)) {
    const keys = Object.keys(type).filter(key => !key.startsWith('__'))
    let fields = {}
    for (const key of keys) {
      try {
        const newValue = await clean(
          type[key].type,
          type[key],
          value[key],
          {...info, currentDoc: value},
          ...args
        )
        if (!isNil(newValue)) {
          fields[key] = newValue
        }
      } catch (error) {
        throw new Error(`Error cleaning field ${key}, error: ${error.message}`)
      }
    }
    if (typeof type.__clean === 'function') {
      fields = await type.__clean(fields, info, ...args)
    }
    return await cleanType('plainObject', fieldSchema, fields, info, ...args)
  } else {
    return await cleanType(type, fieldSchema, value, info, ...args)
  }
}

const defaultOptions = {
  autoConvert: true,
  filter: true,
  trimStrings: true,
  removeEmptyStrings: true
}

export default async function(schema, doc = {}, passedOptions = {}, ...args) {
  const options = {...defaultOptions, ...passedOptions}
  const currentDoc = doc
  return await clean(schema, schema, doc, {schema, doc, currentDoc, options}, ...args)
}
