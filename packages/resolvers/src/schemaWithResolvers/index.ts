import {Schema} from '@orion-js/schema'
import {ModelResolver, ModelResolverResolve} from '../resolver/types'

export interface SchemaWithResolversResolversMap<TSchema> {
  [key: string]: ModelResolver<ModelResolverResolve<TSchema>>
}

export interface SchemaWithResolversOptions<
  TModelName extends string,
  TSchema extends Schema,
  TTypeResolvers extends SchemaWithResolversResolversMap<TSchema>,
> {
  name: TModelName
  schema: TSchema
  resolvers?: TTypeResolvers
}

export function internal_schemaWithResolvers<
  TModelName extends string,
  TSchema extends Schema,
  TTypeResolvers extends SchemaWithResolversResolversMap<TSchema>,
>(options: SchemaWithResolversOptions<TModelName, TSchema, TTypeResolvers>) {
  const {name, schema, resolvers} = options
  return {
    __modelName: name,
    __resolvers: resolvers,
    ...schema,
  }
}

/**
 * This method is used to give backwards compatibility to models.initItem
 */
export function internal_appendResolversToItem<
  TItem,
  TSchema extends Schema,
  TTypeResolvers extends SchemaWithResolversResolversMap<TSchema>,
>(item: TItem, resolvers: TTypeResolvers) {
  const newItem = {...item} as any

  for (const resolverName in resolvers) {
    newItem[resolverName] = (...args: any[]) => resolvers[resolverName].resolve(newItem, ...args)
  }

  return newItem as TItem & {
    [key in keyof TTypeResolvers]: RemoveFirstArg<TTypeResolvers[key]>
  }
}

type RemoveFirstArg<T> = T extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never
