import {GraphQLObjectType} from 'graphql'
import getResolvers from './getResolvers'
import isEmpty from 'lodash/isEmpty'

export default async function ({resolvers, ...options}) {
  const fields = await getResolvers({resolvers, mutation: true, options})
  if (isEmpty(fields)) return null
  return new GraphQLObjectType({
    name: 'Mutation',
    fields
  })
}
