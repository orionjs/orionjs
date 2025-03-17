import {getInstance, Service} from '@orion-js/services'
import {
  ResolverOptions,
  createModelResolver as createModelResolverFromResolvers,
  ModelResolver as ModelResolverType,
} from '@orion-js/resolvers'
import {getTargetMetadata} from './middlewares'

export const createModelResolver = createModelResolverFromResolvers

export interface ModelResolversOptions {
  // the model name to add resolvers. If not specified, the model name will be the schema name
  modelName?: string
}

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<
  any,
  {_serviceType: string; options: ModelResolversOptions; _modelName: string}
>()
const modelResolversMetadata = new WeakMap<any, Record<string, any>>()

export function ModelResolvers(typedSchema: any, options: ModelResolversOptions = {}) {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)
    const className = context.name

    const modelName = (() => {
      if (options.modelName) {
        return options.modelName
      }

      if (typeof typedSchema.name === 'string') {
        return typedSchema.name
      }

      if (typedSchema.__modelName) {
        return typedSchema.__modelName
      }

      throw new Error(`You must specify a model name for the model resolvers (at: ${className})`)
    })()

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {
        _serviceType: 'modelResolvers',
        options: options,
        _modelName: modelName,
      })
    })
  }
}

export function ModelResolver(): (
  method: any,
  context: ClassFieldDecoratorContext | ClassMethodDecoratorContext,
) => any
export function ModelResolver(
  options?: Omit<ResolverOptions<any>, 'resolve' | 'middlewares'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function ModelResolver(options = {}) {
  return (method: any, context: ClassMethodDecoratorContext | ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const modelResolvers = modelResolversMetadata.get(this) || {}

      if (context.kind === 'method') {
        modelResolvers[propertyKey] = createModelResolver({
          params: getTargetMetadata(method, propertyKey, 'params') || {},
          returns: getTargetMetadata(method, propertyKey, 'returns') || 'string',
          middlewares: getTargetMetadata(method, propertyKey, 'middlewares') || [],
          ...options,
          resolve: this[propertyKey].bind(this),
        })
      }

      if (context.kind === 'field') {
        modelResolvers[propertyKey] = this[propertyKey]
      }

      modelResolversMetadata.set(this, modelResolvers)
    })

    return method
  }
}

export function getServiceModelResolvers(target: any): {
  [key: string]: {
    [key: string]: ModelResolverType
  }
} {
  const instance = getInstance(target)

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error(
      'You must pass a class decorated with @ModelResolvers to getServiceModelResolvers',
    )
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'modelResolvers') {
    throw new Error(
      'You must pass a class decorated with @ModelResolvers to getServiceModelResolvers',
    )
  }

  const modelResolversMap = modelResolversMetadata.get(instance) || {}

  return {
    [instanceMetadata._modelName]: modelResolversMap,
  }
}
