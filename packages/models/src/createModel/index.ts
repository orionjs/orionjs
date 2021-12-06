import initItem from './initItem'
import {CreateModel, CloneOptions, Model} from '../types'
import resolveParam from './resolveParam'
import {validate, clean} from '@orion-js/schema'
import clone from './clone'
import {modelToSchema, modelToSchemaWithModel} from './modelToSchema'

interface GetSchemaOptions {
  omitModel?: boolean
}

const createModel: CreateModel = modelOptions => {
  const name = modelOptions.name
  let resolvedSchema = null
  let resolvedCleanSchema = null
  let resolvedResolvers = null

  const getSchema = () => {
    if (!modelOptions.schema) return {}

    if (resolvedSchema) return resolvedSchema
    const schema = resolveParam(modelOptions.schema)

    resolvedSchema = modelToSchemaWithModel(schema, model)
    return resolvedSchema
  }

  const getCleanSchema = () => {
    if (!modelOptions.schema) return {}

    if (resolvedCleanSchema) return resolvedCleanSchema
    const schema = resolveParam(modelOptions.schema)

    resolvedCleanSchema = modelToSchema(schema)
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

  const model: Model = {
    __isModel: true,
    name,
    getSchema,
    getCleanSchema,
    getResolvers,
    initItem: modelInitItem,
    validate: async doc => {
      const schema = getCleanSchema()
      if (modelOptions.validate) {
        await modelOptions.validate(doc)
      }
      return await validate(schema, doc)
    },
    clean: async doc => {
      const schema = getCleanSchema()
      const cleanedDoc = modelOptions.clean ? await modelOptions.clean(doc) : doc
      return await clean(schema, cleanedDoc)
    },
    clone: (cloneOptions: CloneOptions) => {
      return clone(
        {
          createModel,
          getSchema,
          getResolvers
        },
        cloneOptions
      )
    }
  }

  return model
}

export default createModel
