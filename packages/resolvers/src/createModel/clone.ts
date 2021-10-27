import includes from 'lodash/includes'
import {OrionModels} from './ModelTypes'
import cloneDeep from 'lodash/cloneDeep'

interface CloneInfo {
  createModel: OrionModels.CreateModel
  getSchema: () => any
  getResolvers: () => any
}

const clone = (cloneInfo: CloneInfo, options: OrionModels.CloneOptions) => {
  const {createModel, getSchema, getResolvers} = cloneInfo
  return createModel({
    name: options.name,
    resolvers: () => {
      if (!options.extendResolvers) return getResolvers()

      return {
        ...getResolvers(),
        ...options.extendResolvers
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

      if (!options.extendSchema) return newSchema

      return {
        ...newSchema,
        ...options.extendSchema
      }
    }
  })
}

export default clone
