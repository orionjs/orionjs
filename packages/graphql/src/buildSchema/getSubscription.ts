import {GraphQLObjectType} from 'graphql'
import getSubscriptions from './getSubscriptions'

export default async function ({subscriptions, ...options}) {
  if (!subscriptions) return null

  const fields = await getSubscriptions({subscriptions, options})
  return new GraphQLObjectType({
    name: 'Subscription',
    fields
  })
}
