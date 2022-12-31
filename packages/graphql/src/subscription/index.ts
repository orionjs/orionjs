import {getPubsub} from '../pubsub'
import {CreateOrionSubscriptionFunction, OrionSubscription} from '../types/subscription'
import getChannelName from './getChannelName'
import {
  checkPermissions as checkResolverPermissions,
  cleanParams,
  cleanReturns,
  ResolverOptions
} from '@orion-js/resolvers'

const createSubscription: CreateOrionSubscriptionFunction = function (options) {
  const subscription = {
    name: options.name
  } as OrionSubscription

  // the publish function
  subscription.publish = async (params, data) => {
    const pubsub = getPubsub()
    const channelName = getChannelName(subscription.name, params)
    await pubsub.publish(channelName, {[subscription.name]: data})
  }

  subscription.subscribe = async (params, viewer) => {
    const pubsub = getPubsub()
    try {
      await checkResolverPermissions({params, viewer}, options as ResolverOptions)

      const channelName = getChannelName(subscription.name, params)
      return pubsub.asyncIterator(channelName)
    } catch (error) {
      return pubsub.asyncIterator('unauthorized')
    }
  }

  subscription.params = cleanParams(options.params)
  subscription.returns = cleanReturns(options.returns)

  return subscription
}

export default createSubscription
