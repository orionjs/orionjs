import {GraphQLObjectType} from 'graphql'
import getResolvers from './getResolvers'
import isEmpty from 'lodash/isEmpty'

export default async function({resolvers}) {
  const fields = await getResolvers({resolvers, mutation: false})
  if (isEmpty(fields)) return null
  return new GraphQLObjectType({
    name: 'Query',
    fields
  })
}
