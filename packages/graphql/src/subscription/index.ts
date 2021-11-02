import {getPubsub} from '../pubsub'
import {Subscription} from '../types/subscription'
import getChannelName from './getChannelName'
import {checkPermissions as checkResolverPermissions} from '@orion-js/resolvers'

export default function (options) {
  // the publish function
  const subscription = async function publish(params, data) {
    const pubsub = getPubsub()
    const channelName = getChannelName(subscription.key, params)
    await pubsub.publish(channelName, {[subscription.key]: data})
  } as Subscription

  subscription.subscribe = async function (params, viewer) {
    const pubsub = getPubsub()
    try {
      await checkResolverPermissions({params, viewer}, options)

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
