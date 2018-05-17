import {GraphQLSchema} from 'graphql'
import getQuery from './getQuery'
import getMutation from './getMutation'

export default async function(options) {
  global.resolvers = options.resolvers
  return new GraphQLSchema({
    query: await getQuery(options),
    mutation: await getMutation(options)
  })
}
