import {GraphQLSchema} from 'graphql'
import getQuery from './getQuery'
import getMutation from './getMutation'
import getSubscription from './getSubscription'

export default async function (options) {
  global.resolvers = options.resolvers
  const query = await getQuery(options)
  const mutation = await getMutation(options)
  const subscription = await getSubscription(options)
  const schema = new GraphQLSchema({query, mutation, subscription})
  return schema
}
