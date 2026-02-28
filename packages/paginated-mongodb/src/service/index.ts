import {createPaginatedResolver, PaginatedResolverOpts} from '../paginatedResolver'
import {registerPendingResolver, getTargetMetadata} from '@orion-js/graphql'

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

    if (context.kind === 'method') {
      const params = getTargetMetadata(method, propertyKey, 'params') || {}
      const returns = getTargetMetadata(method, propertyKey, 'returns') || 'string'
      registerPendingResolver(propertyKey, (instance: any) =>
        createPaginatedResolver({
          params,
          returns,
          ...options,
          getCursor: instance[propertyKey].bind(instance),
        }),
      )
    }

    if (context.kind === 'field') {
      registerPendingResolver(propertyKey, (instance: any) => instance[propertyKey])
    }

    return method
  }
}
