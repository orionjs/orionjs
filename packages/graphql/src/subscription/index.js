import {getPubsub} from '../pubsub'
import getChannelName from './getChannelName'
import checkPermissions from './checkPermissions'

export default function({params, returns, requireUserId, checkPermission, roles = [], role}) {
  if (role) {
    roles.push(role)
  }

  // the publish function
  const subscription = function publish(params, data) {
    const pubsub = getPubsub()
    const channelName = getChannelName(subscription.key, params)
    pubsub.publish(channelName, {[subscription.key]: data})
  }

  subscription.subscribe = async function(params, viewer) {
    const pubsub = getPubsub()
    try {
      await checkPermissions({roles, requireUserId, checkPermission}, params, viewer)
      const channelName = getChannelName(subscription.key, params)
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
