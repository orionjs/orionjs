import initItem from './initItem'
import {CreateModel, CloneOptions, Model, CreateModelOptions} from '../types'
import resolveParam from './resolveParam'
import {validate, clean} from '@orion-js/schema'
import clone from './clone'
import {modelToSchemaClean, modelToSchemaWithModel} from './modelToSchema'

interface GetSchemaOptions {
  omitModel?: boolean
}

export default function createModel<TSchema = any>(
  modelOptions: CreateModelOptions
): Model<TSchema> {
  const name = modelOptions.name
  let resolvedSchema = null
  let resolvedCleanSchema = null
  let resolvedResolvers = null

  const getSchema = () => {
    if (!modelOptions.schema) return {}

    if (resolvedSchema) return resolvedSchema
    const schema = resolveParam(modelOptions.schema)

    resolvedSchema = modelToSchemaWithModel(schema, model)

    if (modelOptions.clean) {
      resolvedSchema.__clean = modelOptions.clean
    }

    if (modelOptions.validate) {
      resolvedSchema.__clean = modelOptions.validate
    }

    return resolvedSchema
  }

  const getCleanSchema = () => {
    if (!modelOptions.schema) return {}

    if (resolvedCleanSchema) return resolvedCleanSchema
    const schema = resolveParam(modelOptions.schema)

    resolvedCleanSchema = modelToSchemaClean(schema)

    if (modelOptions.clean) {
      resolvedCleanSchema.__clean = modelOptions.clean
    }

    if (modelOptions.validate) {
      resolvedCleanSchema.__clean = modelOptions.validate
    }

    return resolvedCleanSchema
  }

  const getResolvers = () => {
    if (!modelOptions.resolvers) return {}

    if (resolvedResolvers) return resolvedResolvers
    resolvedResolvers = resolveParam(modelOptions.resolvers)
    return resolvedResolvers
  }

  const modelInitItem = (item: any): any => {
    const schema = getSchema()
    const resolvers = getResolvers()
    return initItem({schema, resolvers, name}, item)
  }

  const model: Model<TSchema> = {
    __isModel: true,
    name,
    getSchema,
    getCleanSchema,
    getResolvers,
    initItem: modelInitItem,
    validate: async doc => {
      const schema = getSchema()
      return await validate(schema, doc)
    },
    clean: async doc => {
      const schema = getSchema()
      return await clean(schema, doc)
    },
    cleanAndValidate: async doc => {
      const schema = getSchema()
      const cleaned = await clean(schema, doc)
      await validate(schema, cleaned)
      return cleaned
    },
    clone: (cloneOptions: CloneOptions) => {
      return clone(
        {
          createModel,
          getSchema,
          getResolvers,
          modelOptions
        },
        cloneOptions
      )
    },
    type: null
  }

  return model
}
