import {GraphQLSchema} from 'graphql'
import getQuery from './getQuery'
import getMutation from './getMutation'

export default async function(options) {
  return new GraphQLSchema({
    query: await getQuery(options),
    mutation: await getMutation(options)
  })
}
