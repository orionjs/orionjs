import {getInstance, Service} from '@orion-js/services'
import {
  GlobalResolverResolve,
  ResolverOptions,
  modelResolver,
  ModelResolver as ModelResolverType,
} from '@orion-js/resolvers'

export interface ModelResolversOptions {
  // the model name to add resolvers. If not specified, the model name will be the schema name
  modelName?: string
}

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<
  any,
  {_serviceType: string; options: ModelResolversOptions; _typedSchema: any}
>()
const modelResolversMetadata = new WeakMap<any, Record<string, any>>()

export function ModelResolvers(typedSchema: any, options: ModelResolversOptions = {}) {
  return function (target: any, context: ClassDecoratorContext<any>) {
    Service()(target, context)

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {
        _serviceType: 'modelResolvers',
        options: options,
        _typedSchema: typedSchema,
      })
    })
  }
}

export function ModelResolver<This, TArgs extends any[], TReturn extends any>(
  options?: Omit<ResolverOptions<any>, 'resolve' | 'middlewares'>,
) {
  return function (
    method: (this: This, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<This, typeof method>,
  ) {
    const propertyKey = String(context.name)

    context.addInitializer(function (this: This) {
      const modelResolvers = modelResolversMetadata.get(this) || {}

      modelResolvers[propertyKey] = modelResolver({
        //   params: getTargetMetadata(target, propertyKey, 'params'),
        // returns: getTargetMetadata(target, propertyKey, 'returns'),
        // middlewares: getTargetMetadata(target, propertyKey, 'middlewares'),
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

  return modelResolversMap
}
