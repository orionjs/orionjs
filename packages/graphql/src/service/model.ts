import {getInstance, Service} from '@orion-js/services'
import {
  GlobalResolverResolve,
  ResolverOptions,
  ModelResolverResolve,
  modelResolver,
  ModelResolver as ModelResolverType,
} from '@orion-js/resolvers'
import {UserError} from '@orion-js/helpers'
import {getTargetMetadata} from './otherParams'
import {GraphQLResolveInfo} from 'graphql'

export interface ModelResolverPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: ModelResolverResolve
}

export function ModelResolver(options?: Omit<ResolverOptions<any>, 'resolve' | 'middlewares'>) {
  return (target: any, propertyKey: string, descriptor: ModelResolverPropertyDescriptor) => {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = modelResolver({
      params: getTargetMetadata(target, propertyKey, 'params'),
      returns: getTargetMetadata(target, propertyKey, 'returns'),
      middlewares: getTargetMetadata(target, propertyKey, 'middlewares'),
      ...options,
      resolve: async (item, params, viewer, info: GraphQLResolveInfo) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](item, params, viewer, info)
      },
    })
  }
}

export interface ModelResolversOptions {
  // the model name to add resolvers. If not specified, the model name will be the schema name
  modelName?: string
}

export function ModelResolvers(
  typedSchema: any,
  options: ModelResolversOptions = {},
): ClassDecorator {
  return (target: any) => {
    Service()(target)

    target.prototype.modelName = options.modelName || typedSchema.name

    if (!target.prototype.modelName) {
      throw new Error('The specified model has no name or is not a model')
    }

    target.prototype.typedSchema = typedSchema
    target.prototype.service = target

    // @ts-expect-error this is a trick to make it work in resolvers without having to call getModelForClass
    target.getModel = () => getModelForClass(target)
  }
}

export function getServiceModelResolvers(target: any): {
  [key: string]: {
    [key: string]: ModelResolverType<GlobalResolverResolve>
  }
} {
  if (!target.prototype) {
    throw new UserError('You must pass a class to getResolvers')
  }

  return {
    [target.prototype.modelName]: target.prototype.resolvers || {},
  }
}
