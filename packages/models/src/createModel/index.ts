import {CloneOptions, Model, CreateModelOptions, ModelResolversMap} from '../types'
import {validate, clean, Schema} from '@orion-js/schema'
import clone from './clone'
import {modelToSchema} from './modelToSchema'

export default function createModel<TSchema extends Schema>(
  modelOptions: CreateModelOptions<TSchema>,
): Model<TSchema> {
  const name = modelOptions.name

  let resolvedSchema: Schema
  const getSchema = () => {
    if (!modelOptions.schema) return {}
    if (!resolvedSchema) {
      resolvedSchema = modelToSchema({
        modelSchema: modelOptions.schema,
        modelName: model.name,
        cleanOptions: modelOptions.clean,
        validateOptions: modelOptions.validate,
      })
    }
    return resolvedSchema
  }

  let resolvedResolvers: ModelResolversMap
  const getResolvers = () => {
    if (!modelOptions.resolvers) return {}
    if (!resolvedResolvers) {
      resolvedResolvers = modelOptions.resolvers
    }
    return resolvedResolvers
  }

  const model: Model<TSchema> = {
    __isModel: true,
    __modelName: name,
    name,
    getSchema,
    getResolvers,
    validate: async doc => {
      const schema = getSchema() as any
      return await validate(schema, doc)
    },
    clean: async doc => {
      const schema = getSchema() as any
      return await clean(schema, doc)
    },
    cleanAndValidate: async doc => {
      const schema = getSchema() as any
      const cleaned = (await clean(schema, doc)) as any
      await validate(schema, cleaned)
      return cleaned
    },
    clone: (cloneOptions: CloneOptions) => {
      return clone(
        {
          createModel,
          getSchema,
          getResolvers,
          modelOptions,
        },
        cloneOptions,
      )
    },
    type: null,
  }

  return model
}
