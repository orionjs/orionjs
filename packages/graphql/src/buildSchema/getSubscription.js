import {GraphQLObjectType} from 'graphql'
import getSubscriptions from './getSubscriptions'

export default async function({subscriptions}) {
  if (!subscriptions) return null
  const fields = await getSubscriptions({subscriptions})
  return new GraphQLObjectType({
    name: 'Subscription',
    fields
  })
}
