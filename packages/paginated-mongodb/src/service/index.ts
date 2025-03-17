import {createPaginatedResolver, PaginatedResolverOpts} from '../paginatedResolver'
import {internalResolversMetadata, getTargetMetadata} from '@orion-js/graphql'

export interface PagiantedQueryDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: PaginatedResolverOpts['getCursor']
}

export function PaginatedQuery(): (method: any, context: ClassFieldDecoratorContext) => any
export function PaginatedQuery(
  options: Omit<PaginatedResolverOpts, 'getCursor'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function PaginatedQuery(options?: Omit<PaginatedResolverOpts, 'getCursor'>) {
  return (method: any, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const resolvers = internalResolversMetadata.get(this) || {}

      if (context.kind === 'method') {
        resolvers[propertyKey] = createPaginatedResolver({
          params: getTargetMetadata(method, propertyKey, 'params') || {},
          returns: getTargetMetadata(method, propertyKey, 'returns') || 'string',
          ...options,
          getCursor: this[propertyKey].bind(this),
        })
      }

      if (context.kind === 'field') {
        resolvers[propertyKey] = this[propertyKey]
      }

      internalResolversMetadata.set(this, resolvers)
    })

    return method
  }
}
