import {Schema, SchemaFieldType} from '@orion-js/schema'
import {RouteType, OrionRouteOptions} from '../types'

export function createRoute<
  TPath extends string,
  TQueryParamsSchema extends Schema | undefined,
  TBodyParamsSchema extends Schema | undefined,
  TReturnsSchema extends SchemaFieldType | undefined,
>(
  options: OrionRouteOptions<TPath, TQueryParamsSchema, TBodyParamsSchema, TReturnsSchema>,
): RouteType<TPath, TQueryParamsSchema, TBodyParamsSchema, TReturnsSchema> {
  return {
    ...options,
  }
}

/**
 * @deprecated Use createRoute instead
 */
export const route = createRoute
