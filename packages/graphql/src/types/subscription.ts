import {ResolverOptions} from '@orion-js/resolvers'
import {InferSchemaType, SchemaFieldType} from '@orion-js/schema'

export class OrionSubscription<
  TParamsSchema extends SchemaFieldType = SchemaFieldType,
  TReturnsSchema extends SchemaFieldType = SchemaFieldType,
> {
  name: string
  params: TParamsSchema
  subscribe: (
    callParams: InferSchemaType<TParamsSchema>,
    viewer: InferSchemaType<TReturnsSchema>,
  ) => {}
  returns: TReturnsSchema
  publish: (
    params: InferSchemaType<TParamsSchema>,
    data: InferSchemaType<TReturnsSchema>,
  ) => Promise<void>
}

export type CreateOrionSubscriptionFunction = <
  TParamsSchema extends SchemaFieldType = SchemaFieldType,
  TReturnsSchema extends SchemaFieldType = SchemaFieldType,
  TViewer = any,
>(
  options: OrionSubscriptionOptions<TParamsSchema, TReturnsSchema, TViewer>,
) => OrionSubscription<TParamsSchema, TReturnsSchema>

export interface OrionSubscriptionsMap {
  [key: string]: OrionSubscription
}

export type OrionSubscriptionOptions<
  TParamsSchema extends SchemaFieldType = SchemaFieldType,
  TReturnsSchema extends SchemaFieldType = SchemaFieldType,
  TViewer = any,
> = Omit<ResolverOptions<TParamsSchema, TReturnsSchema, TViewer>, 'resolve'> & {
  /**
   * This function is used to check if the user can subscribe to the subscription.
   * If not provided, the subscription will be public.
   * @param params - The parameters of the subscription.
   * @param viewer - The viewer of the subscription.
   * @returns true if the user can subscribe to the subscription, false otherwise.
   */
  canSubscribe?: (params: InferSchemaType<TParamsSchema>, viewer: TViewer) => Promise<boolean>
}
