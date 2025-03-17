import {CreateModel, CloneOptions, CreateModelOptions, ModelResolversMap} from '../types'
import {clone as deepClone} from '@orion-js/helpers'
import {Schema} from '@orion-js/schema'

interface CloneInfo {
  createModel: CreateModel
  getSchema: () => Schema
  getResolvers: () => ModelResolversMap
  modelOptions: CreateModelOptions
}

const clone = (cloneInfo: CloneInfo, options: CloneOptions) => {
  const {createModel, getSchema, getResolvers, modelOptions} = cloneInfo
  return createModel({
    name: options.name,
    clean: modelOptions.clean,
    validate: modelOptions.validate,
    resolvers: (() => {
      if (!options.extendResolvers) return getResolvers()

      return {
        ...getResolvers(),
        ...options.extendResolvers,
      } as ModelResolversMap
    })(),
    schema: (() => {
      const oldSchema = deepClone(getSchema())
      const newSchema = {}

      const keys = Object.keys(oldSchema)
        .filter(key => {
          if (!options.omitFields) return true
          return !options.omitFields.includes(key)
        })
        .filter(key => {
          if (!options.pickFields) return true
          return options.pickFields.includes(key)
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

      const clonedSchema = {
        ...newSchema,
        ...options.extendSchema,
      } as Schema

      return clonedSchema
    })(),
  })
}

export default clone
