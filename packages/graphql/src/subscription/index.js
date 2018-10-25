import {getPubsub} from '../pubsub'
import getChannelName from './getChannelName'
import {checkResolverPermissions} from '@orion-js/app'

export default function(options) {
  const {params, returns, checkPermission, ...otherOptions} = options

  // the publish function
  const subscription = function publish(params, data) {
    const pubsub = getPubsub()
    const channelName = getChannelName(subscription.key, params)
    pubsub.publish(channelName, {[subscription.key]: data})
  }

  subscription.subscribe = async function(callParams, viewer) {
    const pubsub = getPubsub()
    try {
      await checkResolverPermissions({callParams, viewer, checkPermission, otherOptions})

      const channelName = getChannelName(subscription.key, callParams)
      return pubsub.asyncIterator(channelName)
    } catch (error) {
      // console.log('Unauthorized user', error)
      return pubsub.asyncIterator('unauthorized')
    }
  }

  subscription.params = params
  subscription.returns = returns

  return subscription
}
