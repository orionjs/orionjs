import {GraphQLObjectType} from 'graphql'
import {StartGraphQLOptions} from '../types/startGraphQL'
import getSubscriptions from './getSubscriptions'

export default async function (options: StartGraphQLOptions): Promise<GraphQLObjectType> {
  if (!options.subscriptions) return null

  const fields = await getSubscriptions(options)
  return new GraphQLObjectType({
    name: 'Subscription',
    fields
  })
}
