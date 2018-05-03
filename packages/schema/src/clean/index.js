import isArray from 'lodash/isArray'
import isPlainObject from 'lodash/isPlainObject'
import cleanType from './cleanType'
import isUndefined from 'lodash/isUndefined'

const clean = async function(type, value, {schema, doc, options}, ...args) {
  const info = {schema, doc, options, type}
  if (isArray(type) && isArray(value)) {
    const items = []
    for (let i = 0; i < value.length; i++) {
      if (!isUndefined(value[i])) {
        const newValue = await clean(type[0], value[i], info, ...args)
        if (!isUndefined(newValue)) {
          items.push(newValue)
        }
      }
    }
    return await cleanType('array', items, info, ...args)
  } else if (isPlainObject(type) && isPlainObject(value)) {
    const keys = Object.keys(type)
    const fields = {}
    for (const key of keys) {
      if (!isUndefined(value[key])) {
        const newValue = await clean(type[key].type, value[key], info, ...args)
        if (!isUndefined(newValue)) {
          fields[key] = newValue
        }
      }
    }
    return await cleanType('plainObject', fields, info, ...args)
  } else {
    return await cleanType(type, value, info, ...args)
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
  return await clean(schema, doc, {schema, doc, options}, ...args)
}
