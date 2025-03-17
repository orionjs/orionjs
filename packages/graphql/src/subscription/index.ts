import {getSchemaFromAnyOrionForm, SchemaFieldType} from '@orion-js/schema'
import {getPubsub} from '../pubsub'
import {
  CreateOrionSubscriptionFunction,
  OrionSubscription,
  OrionSubscriptionOptions,
} from '../types/subscription'
import getChannelName from './getChannelName'

const createSubscription: CreateOrionSubscriptionFunction = <
  TParamsSchema extends SchemaFieldType,
  TReturnsSchema extends SchemaFieldType,
  TViewer = any,
>(
  options: OrionSubscriptionOptions<TParamsSchema, TReturnsSchema, TViewer>,
) => {
  const subscription = {} as OrionSubscription<TParamsSchema, TReturnsSchema>

  const getSubscriptionName = () => {
    if (!subscription.name) {
      throw new Error('This subscription is not yet initialized in GraphQL')
    }

    return subscription.name
  }

  // the publish function
  subscription.publish = async (params, data) => {
    const pubsub = getPubsub()
    const channelName = getChannelName(getSubscriptionName(), params)
    await pubsub.publish(channelName, {[getSubscriptionName()]: data})
  }

  subscription.subscribe = async (params, viewer) => {
    const pubsub = getPubsub()
    try {
      if (options.canSubscribe) {
        const canSubscribe = await options.canSubscribe(params, viewer)
        if (!canSubscribe) {
          return pubsub.asyncIterator('unauthorized')
        }
      }

      const channelName = getChannelName(getSubscriptionName(), params)
      return pubsub.asyncIterator(channelName)
    } catch (_error) {
      return pubsub.asyncIterator('unauthorized')
    }
  }

  subscription.params = (getSchemaFromAnyOrionForm(options.params) ?? {}) as TParamsSchema
  subscription.returns = getSchemaFromAnyOrionForm(options.returns) as TReturnsSchema

  return subscription as OrionSubscription<TParamsSchema, TReturnsSchema>
}

export default createSubscription
