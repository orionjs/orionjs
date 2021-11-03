import {getPubsub} from '../pubsub'
import {CreateSubscriptionFunction, Subscription, SubscriptionOptions} from '../types/subscription'
import getChannelName from './getChannelName'
import {
  checkPermissions as checkResolverPermissions,
  cleanParams,
  ResolverOptions
} from '@orion-js/resolvers'

const createSubscription: CreateSubscriptionFunction = function (options) {
  const subscription = {
    key: 'notInitialized'
  } as Subscription

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

  subscription.params = cleanParams(options.params)
  subscription.returns = options.returns

  return subscription
}

export default createSubscription
