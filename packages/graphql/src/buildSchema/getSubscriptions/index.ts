import getType from '../getType'
import getArgs from '../getArgs'
import {StartGraphQLOptions} from '../../types/startGraphQL'

export default async function (options: StartGraphQLOptions) {
  const {subscriptions} = options
  const fields = {}

  for (const key of Object.keys(subscriptions)) {
    const subscription = subscriptions[key]
    subscription.name = subscription.name || key

    const type = await getType(subscription.returns, options)
    const args = await getArgs(subscription.params as any, options)
    fields[subscription.name] = {
      type,
      args,
      async subscribe(root, params, viewer) {
        return await subscription.subscribe(params, viewer)
      },
    }
  }

  return fields
}
