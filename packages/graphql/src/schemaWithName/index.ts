// import {ModelResolver, ModelResolverResolve} from '@orion-js/resolvers'
import {Schema} from '@orion-js/schema'

// export interface TypeResolversMap<TSchema> {
//   [key: string]: ModelResolver<ModelResolverResolve<TSchema>>
// }

// export interface CreateTypeOptions<
//   TModelName extends string,
//   TSchema extends Schema,
//   // TTypeResolvers extends TypeResolversMap<TSchema>,
// > {
//   name: TModelName
//   schema: TSchema
//   // resolvers?: TTypeResolvers
// }

/**
 * Assigns a name to a schema for GraphQL type generation.
 *
 * This function associates a name with a schema object by setting an internal
 * `__modelName` property. This name is used when generating GraphQL types.
 *
 * @param name - The name to assign to the schema
 * @param schema - The schema object to name
 * @returns The same schema object with the internal name property added
 *
 * Note: The schema object is modified in-place, so the name will persist
 * even if you don't use the returned value.
 */
export function schemaWithName<TModelName extends string, TSchema extends Schema>(
  name: TModelName,
  schema: TSchema,
): TSchema {
  // @ts-ignore Internal property not included in type definition
  schema.__modelName = name
  return schema
}
