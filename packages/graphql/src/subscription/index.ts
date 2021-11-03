import {getPubsub} from '../pubsub'
import {Subscription, SubscriptionOptions} from '../types/subscription'
import getChannelName from './getChannelName'
import {checkPermissions as checkResolverPermissions, ResolverOptions} from '@orion-js/resolvers'

export default function <ReturnType>(options: SubscriptionOptions): Subscription<ReturnType> {
  const subscription = {
    key: 'notInitialized'
  } as Subscription<ReturnType>

  // the publish function
  subscription.publish = async (params, data) => {
    const pubsub = getPubsub()
    const channelName = getChannelName(subscription.key, params)
    await pubsub.publish(channelName, {[subscription.key]: data})
  }

  subscription.subscribe = async (params, viewer) => {
    const pubsub = getPubsub()
    try {
      await checkResolverPermissions({params, viewer}, options as ResolverOptions)

      const channelName = getChannelName(subscription.key, params)
      return pubsub.asyncIterator(channelName)
    } catch (error) {
      return pubsub.asyncIterator('unauthorized')
    }
  }

  subscription.params = options.params
  subscription.returns = options.returns

  return subscription
}
