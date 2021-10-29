import includes from 'lodash/includes'
import {CreateModel, CloneOptions} from '../types'
import cloneDeep from 'lodash/cloneDeep'
import {Schema} from '@orion-js/schema'

interface CloneInfo {
  createModel: CreateModel
  getSchema: () => any
  getResolvers: () => any
}

const clone = (cloneInfo: CloneInfo, options: CloneOptions) => {
  const {createModel, getSchema, getResolvers} = cloneInfo
  return createModel({
    name: options.name,
    resolvers: () => {
      if (!options.extendResolvers) return getResolvers()

      return {
        default: {
          ...getResolvers(),
          ...options.extendResolvers
        }
      }
    },
    schema: () => {
      const oldSchema = cloneDeep(getSchema())
      const newSchema = {}

      const keys = Object.keys(oldSchema)
        .filter(key => {
          if (!options.omitFields) return true
          return !includes(options.omitFields, key)
        })
        .filter(key => {
          if (!options.pickFields) return true
          return includes(options.pickFields, key)
        })

      for (const key of keys) {
        const field = oldSchema[key]
        if (options.mapFields) {
          newSchema[key] = options.mapFields(field, key)
        } else {
          newSchema[key] = field
        }
      }

      if (!options.extendSchema) return {default: newSchema}

      const clonedSchema = {
        ...newSchema,
        ...options.extendSchema
      } as Schema

      return {default: clonedSchema}
    }
  })
}

export default clone
