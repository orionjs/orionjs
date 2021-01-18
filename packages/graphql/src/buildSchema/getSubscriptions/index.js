import getType from '../getType'
import getArgs from '../getArgs'

global.graphQLSubscriptions = {}

export default async function ({subscriptions, options}) {
  const fields = {}

  for (const key of Object.keys(subscriptions)) {
    const subscription = subscriptions[key]
    global.graphQLSubscriptions[key] = subscription
    subscription.key = key
    const name = key
    global.graphQLSubscriptions[name] = subscription

    const type = await getType(subscription.returns, options)
    const args = await getArgs(subscription.params)
    fields[name] = {
      type,
      args,
      async subscribe(root, params, viewer) {
        return await subscription.subscribe(params, viewer)
      }
    }
  }

  return fields
}
