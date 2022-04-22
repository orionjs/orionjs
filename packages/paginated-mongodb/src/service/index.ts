import paginatedResolver, {PaginatedResolverOpts} from '../paginatedResolver'
import {getInstance} from '@orion-js/services'

export interface PagiantedQueryDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: PaginatedResolverOpts['getCursor']
}

export function PaginatedQuery(options: Omit<PaginatedResolverOpts<any>, 'getCursor'>) {
  return function (target: any, propertyKey: string, descriptor: PagiantedQueryDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = paginatedResolver({
      ...options,
      getCursor: async (params, viewer) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer)
      }
    })
  }
}
