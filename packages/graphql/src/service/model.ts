import {getInstance, Service} from '@orion-js/services'
import {
  GlobalResolverResolve,
  ResolverOptions,
  modelResolver,
  ModelResolver as ModelResolverType,
} from '@orion-js/resolvers'
import {InternalModelResolverResolveAtDecorator} from './types'
import {getTargetMetadata} from './middlewares'

export interface ModelResolversOptions {
  // the model name to add resolvers. If not specified, the model name will be the schema name
  modelName?: string
}

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<
  any,
  {_serviceType: string; options: ModelResolversOptions; _typedSchema: any; _modelName: string}
>()
const modelResolversMetadata = new WeakMap<any, Record<string, any>>()

export function ModelResolvers(typedSchema: any, options: ModelResolversOptions = {}) {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)

    const modelName = options.modelName || typedSchema.name

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {
        _serviceType: 'modelResolvers',
        options: options,
        _typedSchema: typedSchema,
        _modelName: modelName,
      })
    })
  }
}

export function ModelResolver<This, TItem, TParams, TReturns, TViewer, TInfo>(
  options?: Omit<ResolverOptions<any>, 'resolve' | 'middlewares'>,
) {
  return (
    method: InternalModelResolverResolveAtDecorator<This, TItem, TParams, TReturns, TViewer, TInfo>,
    context: ClassMethodDecoratorContext<This, typeof method>,
  ) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this: This) {
      const modelResolvers = modelResolversMetadata.get(this) || {}

      modelResolvers[propertyKey] = modelResolver({
        params: getTargetMetadata(method, propertyKey, 'params') || {},
        returns: getTargetMetadata(method, propertyKey, 'returns') || 'string',
        middlewares: getTargetMetadata(method, propertyKey, 'middlewares') || [],
        ...options,
        resolve: this[propertyKey].bind(this),
      })

      modelResolversMetadata.set(this, modelResolvers)
    })

    return method
  }
}

export function getServiceModelResolvers(target: any): {
  [key: string]: {
    [key: string]: ModelResolverType<GlobalResolverResolve>
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
