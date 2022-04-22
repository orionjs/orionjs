import {GraphQLSchema} from 'graphql'
import getQuery from './getQuery'
import getMutation from './getMutation'
import getSubscription from './getSubscription'
import {StartGraphQLOptions} from '../types/startGraphQL'

export default async function (options: StartGraphQLOptions) {
  const query = await getQuery(options)
  const mutation = await getMutation(options)
  const subscription = await getSubscription(options)
  const schema = new GraphQLSchema({query, mutation, subscription})
  return schema
}
