import isPlainObject from 'lodash/isPlainObject'
/* eslint-disable @typescript-eslint/ban-types */
import {PropOptions} from '../decorators/prop'
import {Schema} from '@orion-js/schema'
import {MetadataStorage} from '../storage/metadataStorage'
import {isClass} from '../utils/isClass'

function isPrimitive(type: Function) {
  return ([Boolean, Number, String, Date] as Function[]).includes(type)
}

function processSchemaForProp(prop: PropOptions) {
  if (typeof prop.type.type === 'function') {
    return processSchemaForProp(prop.type)
  }

  if (Array.isArray(prop.type)) {
    return prop.type.length > 0 ? [processSchemaForProp(prop.type[0])] : prop
  }

  if (typeof prop.type !== 'function') {
    if (isPlainObject(prop.type)) {
      const subschema = {}
      Object.keys(prop.type).forEach(key => {
        subschema[key] = processSchemaForProp({type: prop.type[key]})
      })
      return {...prop, type: subschema}
    }
    return prop
  }

  if (isPrimitive(prop.type)) {
    return prop
  }

  if (isClass(prop.type)) {
    const schema = getSchemaForClass(prop.type)
    return {
      ...prop,
      type: schema
    }
  }

  return prop
}
export interface Constructor<T> extends Function {
  new (...args: unknown[]): T
}

export function getSchemaForClass<TClass>(target: Constructor<TClass>): Schema {
  const schema: Schema = {}

  let parent: Function = target

  while (parent.prototype) {
    if (parent === Function.prototype) {
      break
    }

    const props = MetadataStorage.getSchemaMetadata(parent.name)
    if (!props) {
      parent = Object.getPrototypeOf(parent)
      continue
    }

    Object.keys(props).forEach(key => {
      schema[key] = processSchemaForProp(props[key])
    })

    parent = Object.getPrototypeOf(parent)
  }

  return schema
}
